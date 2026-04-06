require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const FinancialRecord = require("../models/FinancialRecord");

const CATEGORIES_INCOME  = ["salary", "freelance", "investment", "business"];
const CATEGORIES_EXPENSE = ["food", "transport", "housing", "utilities", "healthcare", "entertainment", "shopping", "education"];

const rand = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateRecords = (adminId) => {
  const records = [];
  const now = new Date();
  for (let m = 0; m < 6; m++) {
    for (let i = 0; i < Math.ceil(Math.random() * 2) + 1; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - m, Math.ceil(Math.random() * 28));
      records.push({ amount: rand(1000, 8000), type: "income", category: pick(CATEGORIES_INCOME), date, description: `Income for ${date.toLocaleString("default", { month: "long" })}`, createdBy: adminId });
    }
    for (let i = 0; i < Math.ceil(Math.random() * 3) + 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - m, Math.ceil(Math.random() * 28));
      records.push({ amount: rand(50, 2000), type: "expense", category: pick(CATEGORIES_EXPENSE), date, description: `Expense: ${pick(CATEGORIES_EXPENSE)}`, createdBy: adminId });
    }
  }
  return records;
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    await User.deleteMany({});
    await FinancialRecord.deleteMany({});
    console.log("Cleared existing data.");

    // First admin is the Super Admin — isSuperAdmin: true
    const superAdmin = await User.create({
      name: "Super Admin",
      email: "admin@finance.com",
      password: "adminsuper_123",
      role: "admin",
      isSuperAdmin: true,
    });

    // Regular admin — can manage viewers/analysts but NOT other admins
    const regularAdmin = await User.create({
      name: "Regular Admin",
      email: "admin2@finance.com",
      password: "admin123",
      role: "admin",
      isSuperAdmin: false,
    });

    await User.create({ name: "Alice Analyst", email: "analyst@finance.com", password: "analyst123", role: "analyst" });
    await User.create({ name: "Bob Viewer",    email: "viewer@finance.com",  password: "viewer123",  role: "viewer"  });

    console.log("✅ Created 4 demo users.");

    const records = generateRecords(superAdmin._id);
    await FinancialRecord.insertMany(records);
    console.log(`✅ Created ${records.length} financial records.`);

    console.log("\n🎉 Seed complete! Demo credentials:");
    console.log("   Regular Admin: admin2@finance.com   / admin123   (cannot edit other admins)");
    console.log("   Analyst:       analyst@finance.com  / analyst123");
    console.log("   Viewer:        viewer@finance.com   / viewer123\n");

    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
};

seed();
