const express = require("express");
const { body } = require("express-validator");
const {
  getUsers, getUser, createUser, updateUser, deleteUser, transferSuperAdmin,
} = require("../controllers/userController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect, authorize("admin"));

const createValidation = [
  body("name").trim().notEmpty().isLength({ min: 2, max: 50 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("role").optional().isIn(["viewer", "analyst", "admin"]),
];

const updateValidation = [
  body("name").optional().trim().isLength({ min: 2, max: 50 }),
  body("role").optional().isIn(["viewer", "analyst", "admin"]),
  body("status").optional().isIn(["active", "inactive"]),
];

router.get("/",    getUsers);
router.get("/:id", getUser);
router.post("/",   createValidation, createUser);
router.put("/:id", updateValidation, updateUser);
router.delete("/:id", deleteUser);

// Super admin only — transfer super admin to another admin
router.post("/:id/transfer-superadmin", transferSuperAdmin);

module.exports = router;
