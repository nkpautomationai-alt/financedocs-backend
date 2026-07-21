const express = require("express");
const router = express.Router();

const { uploadDocument } = require("../controllers/uploadController");

// POST /api/upload-document
router.post("/upload-document", uploadDocument);

module.exports = router;