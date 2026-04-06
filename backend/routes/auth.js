const express = require("express");
const { body } = require("express-validator");
const { sendOTP, verifyOTP, register, login, getMe } = require("../controllers/authController");
const { updateProfile } = require("../controllers/profileController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/send-otp", [
  body("email").isEmail().withMessage("A valid email address is required.").normalizeEmail(),
], sendOTP);

router.post("/verify-otp", [
  body("email").isEmail().withMessage("A valid email address is required.").normalizeEmail(),
  body("otp").isLength({ min: 6, max: 6 }).isNumeric().withMessage("OTP must be 6 digits."),
], verifyOTP);

router.post("/register", [
  body("name").trim().notEmpty().isLength({ min: 2, max: 50 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
], register);

router.post("/login", [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
], login);

router.get("/me", protect, getMe);

// Profile update of name and image
router.put("/profile", protect, [
  body("name").optional().trim().isLength({ min: 2, max: 50 }).withMessage("Name must be 2–50 characters."),
], updateProfile);

module.exports = router;
