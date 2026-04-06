const express      = require("express");
const mongoose     = require("mongoose");
const cors         = require("cors");
const rateLimit    = require("express-rate-limit");
const fileUpload   = require("express-fileupload");
require("dotenv").config();

const {cloudinaryConnect} = require("./config/cloudinary");
const cookieParser = require("cookie-parser");

const { setupEtherealAccount } = require("./utils/emailService");
const authRoutes      = require("./routes/auth");
const userRoutes      = require("./routes/users");
const recordRoutes    = require("./routes/records");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

//middlewares  
app.use(cookieParser()); 

app.get("/test-cookie", (req, res) => {
    console.log("Setting test cookie...");
    res.cookie("test", "hello", {
        httpOnly: true,
        sameSite: 'lax'
    }).json({ message: "Cookie set" });
});

//cloudinary connection
cloudinaryConnect();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());

// express-fileupload — stores uploaded files in OS temp dir (required for Cloudinary's tempFilePath)
app.use(fileUpload({
  useTempFiles:   true,
  tempFileDir:    "/tmp/",
  limits:         { fileSize: 2 * 1024 * 1024 }, // 2MB global limit
  abortOnLimit:   true,
  limitHandler:   (req, res) =>
    res.status(413).json({ success: false, message: "File too large. Max size is 2MB." }),
}));

// Rate limiting — global
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests, please try again later." },
}));

// Stricter limit on OTP endpoint
app.use("/api/auth/send-otp", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many OTP requests. Please wait before trying again." },
}));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/users",     userRoutes);
app.use("/api/records",   recordRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "QuberLedger API is running", timestamp: new Date() })
);

app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const database = require("./config/database")

const startServer = async () => {
    try {
        await database.connect();
        app.listen(PORT, () => {
            console.log(`Server is running at port: ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
