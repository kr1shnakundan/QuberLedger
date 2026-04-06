const { validationResult } = require("express-validator");
const User = require("../models/User");
const { uploadImageToCloudinary, deleteImageFromCloudinary } = require("../utils/imageUploader");

// @desc    Update profile — name and/or profile image
// @route   PUT /api/auth/profile
// @access  Private (any logged-in user)
const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const user   = await User.findById(req.user._id);
    const updates = {};

    // ── Name update ────────────────────────────────────────────────────────────
    if (req.body.name && req.body.name.trim() !== user.name) {
      updates.name = req.body.name.trim();
    }

    // ── Profile image upload ───────────────────────────────────────────────────
    if (req.files?.profileImage) {
      const file = req.files.profileImage;

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "Only JPG, PNG, or WEBP images are allowed.",
        });
      }

      // Validate file size — max 2MB
      if (file.size > 2 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "Image size must be under 2MB.",
        });
      }

      // Delete old image from Cloudinary if it exists
      if (user.profileImage?.publicId) {
        await deleteImageFromCloudinary(user.profileImage.publicId);
      }

      // Upload new image — square crop, 400px, 80% quality
      const uploaded = await uploadImageToCloudinary(file, process.env.PROFILE_FOLDER, 400, 80);

      updates.profileImage = {
        url:      uploaded.secure_url,
        publicId: uploaded.public_id,
      };
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "Nothing to update." });
    }

    const updated = await User.findByIdAndUpdate(req.user._id, updates, {
      new:            true,
      runValidators:  true,
    });

    res.json({
      success: true,
      message: "Profile updated successfully.",
      user:    updated,
    });
  } catch (err) {
    console.log("Error in updateProfile...",err)
    next(err);
  }
};

module.exports = { updateProfile };
