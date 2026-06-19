const express = require("express");

const { verifyToken } = require("../middlewares/authMiddleware");
const { analyzeScript } = require("../controllers/aiController");

const router = express.Router();

router.use(verifyToken);
router.post("/script-insights", analyzeScript);

module.exports = router;
