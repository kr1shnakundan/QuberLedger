const { validationResult } = require("express-validator");
const FinancialRecord = require("../models/FinancialRecord");

const buildFilter = (query) => {
  const filter = {};

  if (query.type) filter.type = query.type;
  if (query.category) filter.category = query.category;

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(query.startDate);
    if (query.endDate)   filter.date.$lte = new Date(query.endDate);
  }

  if (query.minAmount || query.maxAmount) {
    filter.amount = {};
    if (query.minAmount) filter.amount.$gte = parseFloat(query.minAmount);
    if (query.maxAmount) filter.amount.$lte = parseFloat(query.maxAmount);
  }

  if (query.search) {
    filter.description = { $regex: query.search, $options: "i" };
  }

  return filter;
};

//Get all records (with filtering + pagination)n
const getRecords = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
    const sort  = req.query.sortBy === "amount" ? { amount: -1 } : { date: -1 };

    const filter = buildFilter(req.query);

    const [records, total] = await Promise.all([
      FinancialRecord.find(filter)
        .populate("createdBy", "name email")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      FinancialRecord.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: records,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// Get single record
const getRecord = async (req, res, next) => {
  try {
    const record = await FinancialRecord.findById(req.params.id).populate("createdBy", "name email");
    if (!record) return res.status(404).json({ success: false, message: "Record not found." });
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

// Create a new financial record
const createRecord = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { amount, type, category, date, description } = req.body;

    const record = await FinancialRecord.create({
      amount,
      type,
      category,
      date: date || new Date(),
      description,
      createdBy: req.user._id,
    });

    await record.populate("createdBy", "name email");
    res.status(201).json({ success: true, message: "Record created successfully.", data: record });
  } catch (err) {
    next(err);
  }
};

// Update a financial record
const updateRecord = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const allowedFields = ["amount", "type", "category", "date", "description"];
    const updates = {};
    allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const record = await FinancialRecord.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name email");

    if (!record) return res.status(404).json({ success: false, message: "Record not found." });
    res.json({ success: true, message: "Record updated successfully.", data: record });
  } catch (err) {
    next(err);
  }
};

//  Soft delete a record
const deleteRecord = async (req, res, next) => {
  try {
    const record = await FinancialRecord.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    if (!record) return res.status(404).json({ success: false, message: "Record not found." });
    res.json({ success: true, message: "Record deleted successfully." });
  } catch (err) {
    next(err);
  }
};

module.exports = { getRecords, getRecord, createRecord, updateRecord, deleteRecord };
