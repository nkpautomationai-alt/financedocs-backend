const express = require("express");
const router = express.Router();

const {
    getUploadPage
} = require("../controllers/uploadPageController");

router.get("/", getUploadPage);

module.exports = router;