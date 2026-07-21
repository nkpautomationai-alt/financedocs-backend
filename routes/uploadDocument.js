const express = require("express");
const multer = require("multer");
const router = express.Router();
const { uploadDocument } = require("../controllers/uploadController");

// Memory storage: file stays in a buffer, streamed straight to Google Drive
// (no temp files written to disk).
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

router.post("/", upload.single("file"), uploadDocument);

module.exports = router;
