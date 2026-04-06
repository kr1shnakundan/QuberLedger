const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, "Name is required"],
      trim:      true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type:     String,
      required: [true, "Email is required"],
      unique:   true,
      lowercase: true,
      trim:     true,
      match:    [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type:      String,
      required:  [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select:    false,
    },
    role: {
      type:    String,
      enum:    { values: ["viewer", "analyst", "admin"], message: "Role must be viewer, analyst, or admin" },
      default: "viewer",
    },
    isSuperAdmin: {
      type:    Boolean,
      default: false,
    },
    status: {
      type:    String,
      enum:    ["active", "inactive"],
      default: "active",
    },
    // Profile image stored on Cloudinary
    profileImage: {
      url:      { type: String, default: "" },
      publicId: { type: String, default: "" }, // For deletion/replacement
    },
    lastLogin: {
      type:    Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Enforce single super admin
userSchema.pre("save", async function (next) {
  if (this.isModified("isSuperAdmin") && this.isSuperAdmin) {
    const existing = await this.constructor.findOne({ isSuperAdmin: true, _id: { $ne: this._id } });
    if (existing) return next(new Error("A Super Admin already exists. Transfer the role first."));
  }
  next();
});

// Hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model("User", userSchema);
