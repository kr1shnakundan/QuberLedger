const { validationResult } = require("express-validator");
const User = require("../models/User");
const { uploadImageToCloudinary, deleteImageFromCloudinary } = require("../utils/imageUploader");

// Update profile — name and/or profile image
// PUT /api/auth/profile
//Private (any logged-in user)
const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const user   = await User.findById(req.user._id);
    const updates = {};

    if (req.body.name && req.body.name.trim() !== user.name) {
      updates.name = req.body.name.trim();
    }

    if (req.files?.profileImage) {
      const file = req.files.profileImage;


      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "Only JPG, PNG, or WEBP images are allowed.",
        });
      }
      if (file.size > 2 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "Image size must be under 2MB.",
        });
      }

      if (user.profileImage?.publicId) {
        await deleteImageFromCloudinary(user.profileImage.publicId);
      }

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
