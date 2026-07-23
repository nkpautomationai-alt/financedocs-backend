const express = require("express");
const sheets = require("../services/googleSheets");

const router = express.Router();

// Column headers expected in row 1 of the Settings sheet, mapped to the
// camelCase field names the frontend already sends/expects. These match
// the real Settings sheet: Setting ID | Firm Name | Advisor Name |
// Advisor Email | Client Portal URL | Sales Email | Support Email |
// Current Edition. "Setting ID" isn't mapped on purpose — it's a row key,
// not an editable setting, so it's preserved untouched on every save.
// "Demo Booking Link" has no column in the sheet yet; it's left mapped
// here so it starts working the moment that column is added, but until
// then it will always read back as "".
const SETTINGS_FIELD_MAP = {
  "Firm Name": "firmName",
  "Advisor Name": "advisorName",
  "Advisor Email": "advisorEmail",
  "Client Portal URL": "clientPortalBaseUrl",
  "Sales Email": "salesEmail",
  "Support Email": "supportEmail",
  "Current Edition": "plan",
  "Demo Booking Link": "demoBookingLink",
};

const SETTINGS_HEADERS = Object.keys(SETTINGS_FIELD_MAP);
const VALID_PLANS = ["basic", "professional", "premium"];

// The sheet stores the edition as a human-readable label ("Basic",
// "Professional", "Premium"); the app's internal plan gating (planAtLeast,
// etc.) works with lowercase keys. These two helpers are the only place
// that translates between them.
function planFromSheetValue(raw) {
  const normalized = String(raw || "").trim().toLowerCase();
  return VALID_PLANS.includes(normalized) ? normalized : "basic";
}
function planToSheetValue(planKey) {
  return planKey.charAt(0).toUpperCase() + planKey.slice(1);
}

// GET /api/settings
// Reads the single settings row (row 2) the same way license.js assumes
// one deployment = one license row.
router.get("/", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Settings!A:Z",
    });

    const rows = response.data.values || [];

    // No header row yet, or header-only — nothing to read. Return an
    // empty-but-successful settings object (frontend already falls back
    // to its own DEFAULT_SETTINGS for anything blank).
    if (rows.length <= 1) {
      const settings = {};
      SETTINGS_HEADERS.forEach(header => {
        settings[SETTINGS_FIELD_MAP[header]] = (header === "Current Edition") ? "basic" : "";
      });
      return res.json({ success: true, settings });
    }

    const headers = rows[0];
    const row = rows[1];

    const settings = {};
    SETTINGS_HEADERS.forEach(header => {
      const colIndex = headers.indexOf(header);
      const rawValue = colIndex === -1 ? "" : (row[colIndex] || "");
      const apiKey = SETTINGS_FIELD_MAP[header];
      settings[apiKey] = (header === "Current Edition") ? planFromSheetValue(rawValue) : rawValue;
    });

    res.json({
      success: true,
      settings,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST /api/settings
// Updates the existing settings row in place — never appends a
// duplicate. Any field not present in the request body keeps its
// current value, so partial saves never wipe out the rest.
router.post("/", async (req, res) => {
  try {
    const incoming = req.body;

    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
      return res.status(400).json({
        success: false,
        message: "Request body must be a settings object.",
      });
    }

    if (incoming.plan !== undefined && !VALID_PLANS.includes(incoming.plan)) {
      return res.status(400).json({
        success: false,
        message: `"plan" must be one of: ${VALID_PLANS.join(", ")}.`,
      });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Settings!A:Z",
    });

    const rows = response.data.values || [];
    const headers = rows.length ? rows[0] : SETTINGS_HEADERS;
    const existingRow = rows[1] || [];

    const mergedRow = headers.map((header, i) => {
      const apiKey = SETTINGS_FIELD_MAP[header];
      if (apiKey && incoming[apiKey] !== undefined) {
        return header === "Current Edition" ? planToSheetValue(incoming[apiKey]) : incoming[apiKey];
      }
      return existingRow[i] || "";
    });

    if (rows.length === 0) {
      // Sheet is completely empty — write the header row and the first
      // data row together.
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "Settings!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [headers, mergedRow] },
      });
    } else if (rows.length === 1) {
      // Header exists, no settings row yet — add the first one.
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "Settings!A:Z",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [mergedRow] },
      });
    } else {
      // Update row 2 in place.
      const lastColLetter = String.fromCharCode(64 + headers.length);
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Settings!A2:${lastColLetter}2`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [mergedRow] },
      });
    }

    res.json({
      success: true,
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
