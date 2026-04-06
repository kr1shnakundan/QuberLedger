const { validationResult } = require("express-validator");
const User = require("../models/User");

// ─── Permission helpers ────────────────────────────────────────────────────────

// Can the actor edit the target user?
const canEdit = (actor, target) => {
  // Nobody can ever edit the super admin (except super admin editing themselves
  // for non-role/non-superadmin fields — handled separately)
  if (target.isSuperAdmin && actor._id.toString() !== target._id.toString()) {
    return { ok: false, message: "The Super Admin's role and status cannot be changed by anyone else." };
  }
  // Regular admin cannot edit another admin
  if (!actor.isSuperAdmin && actor.role === "admin" && target.role === "admin") {
    return { ok: false, message: "Admins cannot edit other admins. Only the Super Admin can do that." };
  }
  return { ok: true };
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// @desc    Get all users (with pagination + filters)
// @route   GET /api/users
// @access  Admin, Super Admin
const getUsers = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.role)   filter.role   = req.query.role;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.$or = [
        { name:  { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ isSuperAdmin: -1, createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get a single user
// @route   GET /api/users/:id
// @access  Admin
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new user (admin creates with any role)
// @route   POST /api/users
// @access  Admin
const createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, password, role } = req.body;

    // Only super admin can create another admin
    if (role === "admin" && !req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the Super Admin can create users with the Admin role.",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, message: "Email already in use." });

    const user = await User.create({ name, email, password, role: role || "viewer" });
    res.status(201).json({ success: true, message: "User created successfully.", data: user });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user role or status
// @route   PUT /api/users/:id
// @access  Admin (with restrictions), Super Admin (unrestricted)
const updateUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: "User not found." });

    // Self-edit guard — nobody demotes themselves
    if (req.params.id === req.user._id.toString()) {
      if (req.body.role && req.body.role !== req.user.role) {
        return res.status(400).json({ success: false, message: "You cannot change your own role." });
      }
      if (req.body.status === "inactive") {
        return res.status(400).json({ success: false, message: "You cannot deactivate your own account." });
      }
    }

    // Permission check
    const check = canEdit(req.user, target);
    if (!check.ok) return res.status(403).json({ success: false, message: check.message });

    // Regular admin cannot promote someone TO admin
    if (!req.user.isSuperAdmin && req.body.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Only the Super Admin can assign the Admin role.",
      });
    }

    // If target is being demoted from admin → must be done by super admin
    if (target.role === "admin" && req.body.role && req.body.role !== "admin" && !req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the Super Admin can demote an Admin.",
      });
    }

    const allowedUpdates = ["name", "role", "status"];
    const updates = {};
    allowedUpdates.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const updated = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, message: "User updated successfully.", data: updated });
  } catch (err) {
    next(err);
  }
};

// @desc    Transfer super admin status to another admin
// @route   POST /api/users/:id/transfer-superadmin
// @access  Super Admin only
const transferSuperAdmin = async (req, res, next) => {
  try {
    // Must be super admin to call this
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the current Super Admin can transfer this role.",
      });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You are already the Super Admin.",
      });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: "User not found." });

    // Target must already be an admin
    if (target.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: `Only an Admin can receive Super Admin status. "${target.name}" is currently a ${target.role}. Promote them to Admin first.`,
      });
    }

    if (target.status === "inactive") {
      return res.status(400).json({
        success: false,
        message: "Cannot transfer Super Admin to an inactive user.",
      });
    }

    // Atomic transfer: strip from current super admin, assign to target
    // Using Promise.all but with findByIdAndUpdate (bypasses pre-save unique check)
    // We manually ensure atomicity by doing it in sequence
    await User.findByIdAndUpdate(req.user._id, { isSuperAdmin: false });
    await User.findByIdAndUpdate(target._id,   { isSuperAdmin: true  });

    res.json({
      success: true,
      message: `Super Admin role successfully transferred to ${target.name}. You are now a regular Admin.`,
      data: { previousSuperAdmin: req.user._id, newSuperAdmin: target._id },
    });
  } catch (err) {
    // Rollback: if second update failed, restore super admin to original
    await User.findByIdAndUpdate(req.user._id, { isSuperAdmin: true }).catch(() => {});
    next(err);
  }
};

// @desc    Delete a user (hard delete)
// @route   DELETE /api/users/:id
// @access  Admin (non-admins), Super Admin (anyone)
const deleteUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: "User not found." });

    // Cannot delete yourself
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account." });
    }

    // Cannot delete the super admin
    if (target.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "The Super Admin account cannot be deleted. Transfer the role first.",
      });
    }

    // Regular admin cannot delete another admin
    const check = canEdit(req.user, target);
    if (!check.ok) return res.status(403).json({ success: false, message: check.message });

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted successfully." });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser, transferSuperAdmin };
