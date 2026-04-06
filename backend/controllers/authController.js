const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const User  = require("../models/User");
const OTP   = require("../models/OTP");
const { isBurnerEmail } = require("../utils/burnerDomains");
const { sendOTPEmail }  = require("../utils/emailService");
const otpGenerator = require("otp-generator")
 

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || "7d" });
 
 
const MAX_OTP_ATTEMPTS = 5;
 

const sendOTP = async (req, res, next) => {
  const session = await mongoose.startSession();
 
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
 
    const email = req.body.email.toLowerCase().trim();
 
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
 
    let otp;
 
    await session.withTransaction(async () => {
      await OTP.deleteMany({ email }, { session });

        otp = otpGenerator.generate(6, {
            digits: true,
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });

        // ensure uniqueness in DB (small chance of collision). Re-query inside loop.
        let exists = await OTP.findOne({ otp });
        let attempts = 0;
        while (exists && attempts < 5) {
            otp = otpGenerator.generate(6, {
                digits: true,
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            });
            exists = await OTP.findOne({ otp });
            attempts++;
        }
      await OTP.create([{ email, otp }], { session });
      
    });
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
 
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await OTP.deleteMany({ email });
      return res.status(400).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new verification code.",
      });
    }
 
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
 

const register = async (req, res, next) => {
  const session = await mongoose.startSession();
 
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
 
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase().trim();
 
    
    if (isBurnerEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Disposable email addresses are not allowed.",
      });
    }
 
    const otpRecord = await OTP.findOne({ email, verified: true });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Email not verified. Please complete the verification step first.",
      });
    }
 
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }
 
    let newUser;
 
    await session.withTransaction(async () => {

      const created = await User.create([{ name, email, password, role: "viewer" }], { session });
      newUser = created[0];
 
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
 

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });
 
    const { email, password } = req.body;
 
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
 
// req.user is already populated by the protect middleware — no DB call needed.
const getMe = (req, res) => {
  res.json({ success: true, user: req.user });
};
 
module.exports = { sendOTP, verifyOTP, register, login, getMe };
 