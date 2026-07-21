const sheets = require("../services/googleSheets");

async function getSettings() {

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "Settings!A:H"
    });

    const rows = response.data.values || [];

    if (rows.length < 2) {
        throw new Error("Settings sheet is empty.");
    }

    const headers = rows[0];
    const values = rows[1];

    const settings = {};

    headers.forEach((header, index) => {
        settings[header] = values[index] || "";
    });

    return settings;
}

module.exports = getSettings;