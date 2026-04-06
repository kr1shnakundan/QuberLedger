const FinancialRecord = require("../models/FinancialRecord");

// Bucket Mapping
// Based on 50/30/20 rule:
//   Needs   (50%) — essential living expenses
//   Wants   (30%) — lifestyle / discretionary
//   Savings (20%) — investment / future
const BUCKET_MAP = {
  // NEEDS
  housing:       "needs",
  utilities:     "needs",
  food:          "needs",
  transport:     "needs",
  healthcare:    "needs",
  insurance:     "needs",
  education:     "needs",
  // WANTS
  entertainment: "wants",
  shopping:      "wants",
  travel:        "wants",
  dining:        "wants",
  subscriptions: "wants",
  other:         "wants",
  // SAVINGS
  savings:       "savings",
  investment:    "savings",  
};

// Ideal 50/30/20 targets (as fraction of total expenses)
const TARGETS = { needs: 0.50, wants: 0.30, savings: 0.20 };

// Alert thresholds
const ALERTS_CONFIG = {
  wantsIncomeRatio:    0.35,   
  wantsCritical:       0.50,   
  categoryGrowthWarn:  0.20,   
  categoryGrowthAlert: 0.50,   
  needsUnderTarget:    0.40,   
};

// Helper
const monthKey = (year, month) => `${year}-${String(month).padStart(2, "0")}`;

const pct = (num, denom) => (denom === 0 ? 0 : +((num / denom) * 100).toFixed(1));

const growthRate = (prev, curr) =>
  prev === 0 ? (curr > 0 ? 100 : 0) : +((((curr - prev) / prev) * 100).toFixed(1));

//Full categorical analysis
const getCategoricalAnalysis = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const expenseByMonthCategory = await FinancialRecord.aggregate([
      {
        $match: {
          isDeleted: false,
          type: "expense",
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year:     { $year:  "$date" },
            month:    { $month: "$date" },
            category: "$category",
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const incomeByMonth = await FinancialRecord.aggregate([
      {
        $match: {
          isDeleted: false,
          type: "income",
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" } },
          total: { $sum: "$amount" },
        },
      },
    ]);

    const incomeMap = {};
    incomeByMonth.forEach(({ _id, total }) => {
      incomeMap[monthKey(_id.year, _id.month)] = total;
    });

    //Build per-month bucket totals

    const monthlyData = {};

    expenseByMonthCategory.forEach(({ _id, total }) => {
      const key      = monthKey(_id.year, _id.month);
      const bucket   = BUCKET_MAP[_id.category] || "wants";

      if (!monthlyData[key]) {
        monthlyData[key] = {
          period:     key,
          year:       _id.year,
          month:      _id.month,
          needs:      0,
          wants:      0,
          savings:    0,
          total:      0,
          categories: {},
        };
      }

      monthlyData[key][bucket]           += total;
      monthlyData[key].total             += total;
      monthlyData[key].categories[_id.category] =
        (monthlyData[key].categories[_id.category] || 0) + total;
    });

    const sortedMonths = Object.values(monthlyData).sort((a, b) =>
      a.period.localeCompare(b.period)
    );

    // Enrich each month with ratios + income
    const enriched = sortedMonths.map((m) => {
      const income = incomeMap[m.period] || 0;
      return {
        ...m,
        income,
        needsPct:   pct(m.needs,   m.total),
        wantsPct:   pct(m.wants,   m.total),
        savingsPct: pct(m.savings, m.total),
        
        needsVsIncome:   pct(m.needs,   income),
        wantsVsIncome:   pct(m.wants,   income),
        savingsVsIncome: pct(m.savings, income),
      };
    });

    //Category growth analysis (MoM for each category
    const allCategories = [
      ...new Set(expenseByMonthCategory.map((r) => r._id.category)),
    ];

    const categoryTrends = allCategories.map((cat) => {
      const monthlyAmounts = sortedMonths.map((m) => ({
        period: m.period,
        amount: m.categories[cat] || 0,
      }));

      //Compute MoM growth rates
      const growthRates = monthlyAmounts.slice(1).map((curr, i) => ({
        period:     curr.period,
        amount:     curr.amount,
        prevAmount: monthlyAmounts[i].amount,
        growth:     growthRate(monthlyAmounts[i].amount, curr.amount),
      }));

      // Latest month vs previous month
      const last  = monthlyAmounts[monthlyAmounts.length - 1]?.amount || 0;
      const prev  = monthlyAmounts[monthlyAmounts.length - 2]?.amount || 0;
      const latestGrowth = growthRate(prev, last);

      // Average monthly spend
      const avgSpend = monthlyAmounts.length
        ? +(monthlyAmounts.reduce((s, m) => s + m.amount, 0) / monthlyAmounts.length).toFixed(2)
        : 0;

      return {
        category:     cat,
        bucket:       BUCKET_MAP[cat] || "wants",
        monthlyAmounts,
        growthRates,
        latestAmount: last,
        prevAmount:   prev,
        latestGrowth,
        avgSpend,
        trend:
          latestGrowth >  ALERTS_CONFIG.categoryGrowthAlert ? "spike"    :
          latestGrowth >  ALERTS_CONFIG.categoryGrowthWarn  ? "rising"   :
          latestGrowth < -ALERTS_CONFIG.categoryGrowthWarn  ? "falling"  : "stable",
      };
    });

    // Sort by latest amount descending
    categoryTrends.sort((a, b) => b.latestAmount - a.latestAmount);

  
    const totalNeeds   = enriched.reduce((s, m) => s + m.needs,   0);
    const totalWants   = enriched.reduce((s, m) => s + m.wants,   0);
    const totalSavings = enriched.reduce((s, m) => s + m.savings, 0);
    const totalExpense = totalNeeds + totalWants + totalSavings;
    const totalIncome  = enriched.reduce((s, m) => s + m.income,  0);

    const overallSummary = {
      totalNeeds,   needsPct:   pct(totalNeeds,   totalExpense),   needsTarget:   50,
      totalWants,   wantsPct:   pct(totalWants,   totalExpense),   wantsTarget:   30,
      totalSavings, savingsPct: pct(totalSavings, totalExpense),   savingsTarget: 20,
      totalExpense,
      totalIncome,
     
      needsVsIncome:   pct(totalNeeds,   totalIncome),
      wantsVsIncome:   pct(totalWants,   totalIncome),
      savingsVsIncome: pct(totalSavings, totalIncome),
    };

    //Alert generation
    const alerts = [];

    enriched.forEach((m) => {
      if (m.income > 0) {
        const ratio = m.wants / m.income;
        if (ratio >= ALERTS_CONFIG.wantsCritical) {
          alerts.push({
            severity: "critical",
            type:     "wants_vs_income",
            period:   m.period,
            message:  `Wants spending hit ${pct(m.wants, m.income)}% of income in ${m.period} — well above the 30% guideline.`,
            value:    m.wants,
            income:   m.income,
            ratio:    +(ratio * 100).toFixed(1),
          });
        } else if (ratio >= ALERTS_CONFIG.wantsIncomeRatio) {
          alerts.push({
            severity: "warning",
            type:     "wants_vs_income",
            period:   m.period,
            message:  `Wants reached ${pct(m.wants, m.income)}% of income in ${m.period} (target: 30%).`,
            value:    m.wants,
            income:   m.income,
            ratio:    +(ratio * 100).toFixed(1),
          });
        }
      }
    });

    // Category spike alerts
    categoryTrends
      .filter((c) => c.trend === "spike" || c.trend === "rising")
      .forEach((c) => {
        const bucket = c.bucket;
        const sev    = c.trend === "spike" ? "critical" : "warning";
        alerts.push({
          severity: sev,
          type:     "category_growth",
          category: c.category,
          bucket,
          message: `${c.category.charAt(0).toUpperCase() + c.category.slice(1)} spending ${
            sev === "critical" ? "spiked" : "grew"
          } by ${c.latestGrowth}% vs last month (₹${c.prevAmount.toFixed(0)} → ₹${c.latestAmount.toFixed(0)}).`,
          growth:   c.latestGrowth,
          current:  c.latestAmount,
          previous: c.prevAmount,
        });
      });

    // Overall wants overrun
    if (overallSummary.wantsPct > 40) {
      alerts.push({
        severity: "critical",
        type:     "overall_wants_overrun",
        message:  `Over the past ${months} months, Wants consumed ${overallSummary.wantsPct}% of all spending — significantly over the 30% target.`,
        value:    overallSummary.wantsPct,
        target:   30,
      });
    }

    // Savings under target
    if (overallSummary.savingsPct < 10 && totalExpense > 0) {
      alerts.push({
        severity: "warning",
        type:     "low_savings",
        message:  `Savings represent only ${overallSummary.savingsPct}% of expenses — the 50/30/20 rule targets 20%.`,
        value:    overallSummary.savingsPct,
        target:   20,
      });
    }

    // Sort alerts: critical first
    alerts.sort((a, b) =>
      a.severity === "critical" && b.severity !== "critical" ? -1 :
      a.severity !== "critical" && b.severity === "critical" ?  1 : 0
    );

    res.json({
      success: true,
      data: {
        overallSummary,
        monthlyBreakdown: enriched,
        categoryTrends,
        alerts,
        bucketMap:    BUCKET_MAP,
        targets:      TARGETS,
        periodMonths: months,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCategoricalAnalysis };
