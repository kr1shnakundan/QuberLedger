const FinancialRecord = require("../models/FinancialRecord");

// @desc    Get overall summary (totals, net balance)
// @route   GET /api/dashboard/summary
// @access  Viewer, Analyst, Admin
const getSummary = async (req, res, next) => {
  try {
    const result = await FinancialRecord.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalIncome = 0, totalExpenses = 0, incomeCount = 0, expenseCount = 0;
    result.forEach(({ _id, total, count }) => {
      if (_id === "income")  { totalIncome   = total; incomeCount  = count; }
      if (_id === "expense") { totalExpenses = total; expenseCount = count; }
    });

    const totalRecords = await FinancialRecord.countDocuments({ isDeleted: false });

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        totalRecords,
        incomeCount,
        expenseCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get category-wise totals
// @route   GET /api/dashboard/by-category
// @access  Analyst, Admin
const getByCategory = async (req, res, next) => {
  try {
    const filter = { isDeleted: false };
    if (req.query.type) filter.type = req.query.type;

    const data = await FinancialRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { category: "$category", type: "$type" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      {
        $project: {
          _id: 0,
          category: "$_id.category",
          type: "$_id.type",
          total: 1,
          count: 1,
        },
      },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// @desc    Get monthly/weekly trends
// @route   GET /api/dashboard/trends
// @access  Analyst, Admin
const getTrends = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const data = await FinancialRecord.aggregate([
      {
        $match: {
          isDeleted: false,
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year:  { $year:  "$date" },
            month: { $month: "$date" },
            type:  "$type",
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          year:  "$_id.year",
          month: "$_id.month",
          type:  "$_id.type",
          total: 1,
          count: 1,
        },
      },
    ]);

    // Transform into a unified structure: [{month, income, expense}]
    const monthMap = {};
    data.forEach(({ year, month, type, total }) => {
      const key = `${year}-${String(month).padStart(2, "0")}`;
      if (!monthMap[key]) monthMap[key] = { period: key, year, month, income: 0, expense: 0 };
      monthMap[key][type] = total;
    });

    res.json({ success: true, data: Object.values(monthMap) });
  } catch (err) {
    next(err);
  }
};

// @desc    Get recent transactions
// @route   GET /api/dashboard/recent
// @access  Viewer, Analyst, Admin
const getRecent = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const records = await FinancialRecord.find()
      .populate("createdBy", "name")
      .sort({ date: -1 })
      .limit(limit);

    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

// @desc    Get full dashboard data in one request
// @route   GET /api/dashboard
// @access  Viewer, Analyst, Admin
const getDashboard = async (req, res, next) => {
  try {
    const months = 6;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const [summaryRaw, categoryData, trendsRaw, recent] = await Promise.all([
      FinancialRecord.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      FinancialRecord.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: { category: "$category", type: "$type" }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $project: { _id: 0, category: "$_id.category", type: "$_id.type", total: 1, count: 1 } },
      ]),
      FinancialRecord.aggregate([
        { $match: { isDeleted: false, date: { $gte: startDate } } },
        { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" }, type: "$type" }, total: { $sum: "$amount" } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        { $project: { _id: 0, year: "$_id.year", month: "$_id.month", type: "$_id.type", total: 1 } },
      ]),
      FinancialRecord.find().populate("createdBy", "name").sort({ date: -1 }).limit(5),
    ]);

    // Process summary
    let totalIncome = 0, totalExpenses = 0;
    summaryRaw.forEach(({ _id, total }) => {
      if (_id === "income")  totalIncome   = total;
      if (_id === "expense") totalExpenses = total;
    });

    // Process trends
    const monthMap = {};
    trendsRaw.forEach(({ year, month, type, total }) => {
      const key = `${year}-${String(month).padStart(2, "0")}`;
      if (!monthMap[key]) monthMap[key] = { period: key, income: 0, expense: 0 };
      monthMap[key][type] = total;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalIncome,
          totalExpenses,
          netBalance: totalIncome - totalExpenses,
        },
        categoryBreakdown: categoryData,
        trends: Object.values(monthMap),
        recentTransactions: recent,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSummary, getByCategory, getTrends, getRecent, getDashboard };
