const sheets = require("./googleSheets");

async function createChecklistRows(checklist) {

    const values = checklist.map(item => [

        item.clientId,
        item.clientName,
        item.email,
        item.document,
        item.checklistId,
        item.status,
        item.uploadedFile,
        item.uploadDate,
        "",     // Verified By
        "",     // File URL
        ""      // Drive File ID

    ]);

    await sheets.spreadsheets.values.append({

        spreadsheetId: process.env.GOOGLE_SHEET_ID,

        range: "'Document Checklist'!A:K",

        valueInputOption: "USER_ENTERED",

        requestBody: {
            values
        }

    });

}
async function getChecklistByClientId(clientId) {

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "Document Checklist!A:Z"
    });

    const rows = response.data.values || [];

    if (rows.length < 2) {
        return [];
    }

    const headers = rows[0];

    const checklist = [];

    for (let i = 1; i < rows.length; i++) {

        const row = rows[i];

        const item = {};

        headers.forEach((header, index) => {
            item[header] = row[index] || "";
        });

        if (item["Client ID"] === clientId) {
            item.row_number = i + 1; // rows[] is 0-indexed and rows[0] is the header, so data row i is sheet row i+1
            checklist.push(item);
        }

    }

    return checklist;

}
/**
 * Updates the Status / Uploaded File / Upload Date / Verified By / File URL /
 * Drive File ID cells for a single checklist row after a document is uploaded.
 * rowNumber is the 1-based sheet row (as produced by getChecklistByClientId's
 * row_number field or by checklistFinder's matching output).
 */
async function updateChecklistRow(rowNumber, updates) {

    await sheets.spreadsheets.values.update({

        spreadsheetId: process.env.GOOGLE_SHEET_ID,

        range: `'Document Checklist'!F${rowNumber}:K${rowNumber}`,

        valueInputOption: "USER_ENTERED",

        requestBody: {
            values: [[
                updates.status,
                updates.uploadedFile,
                updates.uploadDate,
                updates.verifiedBy,
                updates.fileUrl,
                updates.driveFileId
            ]]
        }

    });

}
module.exports = {

    createChecklistRows,
    getChecklistByClientId,
    updateChecklistRow

};