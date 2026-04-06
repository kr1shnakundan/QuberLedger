const mongoose = require("mongoose");

const CATEGORIES = [
  "salary", "freelance", "investment", "business",
  "food", "transport", "housing", "utilities",
  "healthcare", "entertainment", "shopping", "education",
  "travel", "insurance", "savings", "other",
];

const financialRecordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    type: {
      type: String,
      required: [true, "Type is required"],
      enum: {
        values: ["income", "expense"],
        message: "Type must be income or expense",
      },
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: CATEGORIES,
        message: "Invalid category",
      },
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false, // Soft delete flag
    },
  },
  {
    timestamps: true,
  }
);

// Index for common query patterns
financialRecordSchema.index({ type: 1, date: -1 });
financialRecordSchema.index({ category: 1 });
financialRecordSchema.index({ date: -1 });
financialRecordSchema.index({ isDeleted: 1 });

// Filter out soft-deleted records by default
financialRecordSchema.pre(/^find/, function (next) {
  if (!this._conditions.isDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

module.exports = mongoose.model("FinancialRecord", financialRecordSchema);
module.exports.CATEGORIES = CATEGORIES;
