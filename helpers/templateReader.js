const sheets = require("../services/googleSheets");

async function getTemplateDocuments(templateName) {

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "'Document Templates'!A:Z",
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
        return [];
    }

    const headers = rows[0];

    const data = rows.slice(1).map(row => {
        const obj = {};

        headers.forEach((header, index) => {
            obj[header] = row[index] || "";
        });

        return obj;
    });

    return data.filter(
        row => row["Template Name"] === templateName
    );

}

module.exports = getTemplateDocuments;