const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const User  = require("../models/User");
const OTP   = require("../models/OTP");
const { isBurnerEmail } = require("../utils/burnerDomains");
const { sendOTPEmail }  = require("../utils/emailService");
 

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || "7d" });
 
const generateOTP = () =>
  crypto.randomInt(100000, 999999).toString();
 
const MAX_OTP_ATTEMPTS = 5;
 

const sendOTP = async (req, res, next) => {
  const session = await mongoose.startSession();
 
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
 
    const email = req.body.email.toLowerCase().trim();
 
    // ── Pre-transaction checks (read-only, no need to be inside transaction) ──
 
    if (isBurnerEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Disposable or temporary email addresses are not allowed. Please use a real email.",
      });
    }
 
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please log in instead.",
      });
    }
 
    const recentOTP = await OTP.findOne({ email }).sort({ createdAt: -1 });
    if (recentOTP) {
      const ageSeconds = (Date.now() - new Date(recentOTP.createdAt).getTime()) / 1000;
      if (ageSeconds < 120) {
        const waitSeconds = Math.ceil(120 - ageSeconds);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
          retryAfter: waitSeconds,
        });
      }
    }
 
    // ── Transaction: invalidate old OTPs and create new one atomically ────────
    let otp;
 
    await session.withTransaction(async () => {
      // Delete any previous OTPs for this email inside the transaction
      await OTP.deleteMany({ email }, { session });
 
      // Generate and save the new OTP
      otp = generateOTP();
      await OTP.create([{ email, otp }], { session });
      // Note: OTP.create with a session requires an array as the first argument
    });
 
    // ── Send email AFTER transaction commits ──────────────────────────────────
    // Email delivery is outside MongoDB — we send only once the record is
    // safely committed. If sending fails, the OTP record exists and the user
    // can request a resend.
    await sendOTPEmail(email, otp);
 
    res.json({
      success: true,
      message: `Verification code sent to ${email}. It expires in 10 minutes.`,
    });
  } catch (err) {
    console.error("sendOTP error:", err.message);
    if (err.message?.includes("SMTP") || err.message?.includes("connect")) {
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again later.",
      });
    }
    next(err);
  } finally {
    session.endSession();
  }
};
 
// ─── Verify OTP ───────────────────────────────────────────────────────────────
// @route   POST /api/auth/verify-otp
// @access  Public
//
// No transaction needed here — each branch is a single document operation.
// Incrementing attempts and marking verified are both single atomic saves
// on the same document, so a transaction would add overhead with no benefit.
const verifyOTP = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
 
    const email = req.body.email.toLowerCase().trim();
    const { otp } = req.body;
 
    const record = await OTP.findOne({ email }).sort({ createdAt: -1 });
 
    if (!record) {
      return res.status(400).json({
        success: false,
        message: "No verification code found for this email. Please request a new one.",
      });
    }
 
    // Too many wrong attempts — invalidate and force a resend
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await OTP.deleteMany({ email });
      return res.status(400).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new verification code.",
      });
    }
 
    // Wrong OTP — increment attempt counter
    if (record.otp !== otp.trim()) {
      record.attempts += 1;
      await record.save();
      const remaining = MAX_OTP_ATTEMPTS - record.attempts;
      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        attemptsRemaining: remaining,
      });
    }
 
    // Correct — mark as verified
    record.verified = true;
    await record.save();
 
    res.json({
      success: true,
      message: "Email verified successfully. You can now complete your registration.",
    });
  } catch (err) {
    next(err);
  }
};
 
// ─── Register ─────────────────────────────────────────────────────────────────
// @route   POST /api/auth/register
// @access  Public
//
// Transaction wraps: User.create + OTP.deleteMany
// Reason: if the user is created but OTP cleanup fails, the verified OTP
// record stays in the database. That's inconsistent state — another request
// could theoretically reuse it. Rolling back the user creation if cleanup
// fails keeps the database clean and consistent.
const register = async (req, res, next) => {
  const session = await mongoose.startSession();
 
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
 
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase().trim();
 
    // ── Pre-transaction checks ─────────────────────────────────────────────────
 
    // Defence-in-depth burner check (also checked at send-otp step)
    if (isBurnerEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Disposable email addresses are not allowed.",
      });
    }
 
    // Must have completed email verification
    const otpRecord = await OTP.findOne({ email, verified: true });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Email not verified. Please complete the verification step first.",
      });
    }
 
    // Duplicate account check
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }
 
    // ── Transaction: create user and clean up OTP atomically ──────────────────
    let newUser;
 
    await session.withTransaction(async () => {
      // Create the user inside the transaction
      const created = await User.create([{ name, email, password, role: "viewer" }], { session });
      newUser = created[0];
 
      // Remove the verified OTP record — it has served its purpose
      await OTP.deleteMany({ email }, { session });
    });
 
    const token = generateToken(newUser._id);
 
    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: newUser,
    });
  } catch (err) {
    next(err);
  } finally {
    session.endSession();
  }
};
 
// ─── Login ────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/login
// @access  Public
//
// No transaction needed — updating lastLogin is a single best-effort write.
// If it fails the user is still authenticated; we use validateBeforeSave: false
// to avoid running the full schema validation on every login.
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
 
    const { email, password } = req.body;
 
    // password field is select: false — must explicitly request it
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
 
    if (user.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact an administrator.",
      });
    }
 
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
 
    const token = generateToken(user._id);
    res.json({ success: true, message: "Login successful.", token, user });
  } catch (err) {
    next(err);
  }
};
 
// ─── Get Me ───────────────────────────────────────────────────────────────────
// @route   GET /api/auth/me
// @access  Private
//
// req.user is already populated by the protect middleware — no DB call needed.
const getMe = (req, res) => {
  res.json({ success: true, user: req.user });
};
 
module.exports = { sendOTP, verifyOTP, register, login, getMe };
 