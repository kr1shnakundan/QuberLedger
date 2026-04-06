const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized. No token provided." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id); 
    if (!user) return res.status(401).json({ success: false, message: "Token is no longer valid." });
    if (user.status === "inactive") return res.status(403).json({ success: false, message: "Account is deactivated." });
    req.user = user;
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"  ? "Token has expired. Please login again." :
      err.name === "JsonWebTokenError"  ? "Invalid token." : "Not authorized.";
    return res.status(401).json({ success: false, message });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Role '${req.user.role}' is not authorized to perform this action.`,
    });
  }
  next();
};

module.exports = { protect, authorize };
