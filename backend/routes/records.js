const express = require("express");
const { body } = require("express-validator");
const {
  getRecords, getRecord, createRecord, updateRecord, deleteRecord,
} = require("../controllers/recordController");
const { protect, authorize } = require("../middleware/auth");
const { CATEGORIES } = require("../models/FinancialRecord");

const router = express.Router();

router.use(protect);

const recordValidation = [
  body("amount").isFloat({ min: 0.01 }).withMessage("Amount must be a positive number"),
  body("type").isIn(["income", "expense"]).withMessage("Type must be income or expense"),
  body("category").isIn(CATEGORIES).withMessage("Invalid category"),
  body("date")
    .optional()
    .isISO8601().withMessage("Date must be a valid ISO 8601 date")
    .custom((value) => {
      const inputDate = new Date(value);
      const today     = new Date();
      // Strip time — compare date only
      today.setHours(23, 59, 59, 999);
      if (inputDate > today) {
        throw new Error("Date cannot be in the future.");
      }
      return true;
    }),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
];

// READ — all roles
router.get("/",    authorize("viewer", "analyst", "admin"), getRecords);
router.get("/:id", authorize("viewer", "analyst", "admin"), getRecord);

// WRITE — admin only
router.post("/",   authorize("admin"), recordValidation, createRecord);
router.put("/:id", authorize("admin"), recordValidation, updateRecord);
router.delete("/:id", authorize("admin"), deleteRecord);

module.exports = router;
