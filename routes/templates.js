const express = require("express");
const sheets = require("../services/googleSheets");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Document Templates!A:Z",
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      return res.json({
        success: true,
        templates: [],
      });
    }

    const headers = rows[0];

    const templates = rows.slice(1).map((row) => {
      const template = {};

      headers.forEach((header, index) => {
        template[header] = row[index] || "";
      });

      return template;
    });

    res.json({
      success: true,
      totalTemplates: templates.length,
      templates,
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