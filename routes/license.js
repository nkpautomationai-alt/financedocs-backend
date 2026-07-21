const express = require("express");
const sheets = require("../services/googleSheets");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
     range: "Licenses sheet!A:Z",
    });

    const rows = response.data.values || [];

    if (rows.length <= 1) {
      return res.status(404).json({
        success: false,
        message: "No license found",
      });
    }

    const headers = rows[0];

    // Assuming one deployment = one license (first data row)
    const row = rows[1];

    const license = {};

    headers.forEach((header, index) => {
      license[header] = row[index] || "";
    });

    res.json({
      success: true,
      license,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;