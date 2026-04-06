const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: {
    type:     String,
    required: true,
    lowercase: true,
    trim:     true,
    index:    true,
  },
  otp: {
    type:     String,
    required: true,
  },
  verified: {
    type:    Boolean,
    default: false,
  },
  attempts: {
    type:    Number,
    default: 0,
  },
  createdAt: {
    type:    Date,
    default: Date.now,
    // MongoDB TTL index — document auto-deleted after 10 minutes
    expires: 600,
  },
});

module.exports = mongoose.model("OTP", otpSchema);
