const express = require("express");
const multer = require("multer");

const { verifyToken } = require("../middlewares/authMiddleware");
const { parseScript } = require("../controllers/importController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

router.use(verifyToken);

router.post("/parse", upload.single("file"), parseScript);

module.exports = router;
