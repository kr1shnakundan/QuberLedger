const express = require("express");
const { getSummary, getByCategory, getTrends, getRecent, getDashboard } = require("../controllers/dashboardController");
const { getCategoricalAnalysis } = require("../controllers/categoricalController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", authorize("viewer", "analyst", "admin"), getDashboard);
router.get("/summary", authorize("viewer", "analyst", "admin"), getSummary);
router.get("/recent", authorize("viewer", "analyst", "admin"), getRecent);
router.get("/by-category", authorize("analyst", "admin"), getByCategory);
router.get("/trends", authorize("analyst", "admin"), getTrends);
router.get("/categorical-analysis", authorize("analyst", "admin"), getCategoricalAnalysis);

module.exports = router;

