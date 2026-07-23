const sheets = require("./googleSheets");
const generateAccessToken = require("../utils/accessToken");

/**
 * Converts a zero-based column index to its A1-notation letter(s).
 * e.g. 0 -> "A", 18 -> "S", 26 -> "AA"
 */
function columnIndexToLetter(colIndex) {
    let letter = "";
    let n = colIndex + 1;
    while (n > 0) {
        const rem = (n - 1) % 26;
        letter = String.fromCharCode(65 + rem) + letter;
        n = Math.floor((n - 1) / 26);
    }
    return letter;
}

/**
 * Scans the Clients rows for a matching Client ID and returns both the
 * zero-based row index (within `rows`, header included) and the
 * header-mapped client object. Shared by getClientById and updateClientStatus
 * so the row-matching logic only lives in one place.
 */
function locateClientRow(rows, headers, clientId) {

    for (let i = 1; i < rows.length; i++) {

        const row = rows[i];

        const client = {};

        headers.forEach((header, index) => {
            client[header] = row[index] || "";
        });

        if (client["Client ID"] === clientId) {
            return { rowIndex: i, client };
        }

    }

    return null;
}

async function createClient(client) {

    const accessToken = generateAccessToken();


    await sheets.spreadsheets.values.append({

        spreadsheetId: process.env.GOOGLE_SHEET_ID,

        range: "Clients!A:Q",

        valueInputOption: "USER_ENTERED",

        requestBody: {

            values: [[

                client.clientId,
                client.clientName,
                client.email,
                client.folderLink,                // Folder Link
                "Waiting",          // Status
                "",                 // Required Documents
                client.folderId,                 // Folder ID
                client.template,
                new Date().toISOString().split("T")[0],
                "0",                // Reminder Count
                "",                 // Last Reminder Date
                client.phone,
                client.address,
                client.advisor,
                "",                 // Last Activity
                "",                 // Notes
                "",                 // Created At
                "",                 // Updated At
                accessToken         // Access Token (new column - see notes)

            ]]

        }

    });

}
async function getClientById(clientId) {

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "Clients!A:Z"
    });

    const rows = response.data.values || [];

    if (rows.length < 2) {
        return null;
    }

    const headers = rows[0];
    const tokenColIndex = headers.indexOf("Access Token");

    const found = locateClientRow(rows, headers, clientId);

    if (!found) {
        return null;
    }

    const { rowIndex, client } = found;

    if (!client["Access Token"]) {

        if (tokenColIndex === -1) {
            throw new Error(
                'Cannot generate an Access Token: the Clients sheet has no "Access Token" column header. ' +
                'Please add a column titled exactly "Access Token" to the header row (row 1) of the Clients sheet, ' +
                `for example in column ${columnIndexToLetter(headers.length)}.`
            );
        }

        const newToken = generateAccessToken();
        const sheetRow = rowIndex + 1; // rows[] is 0-indexed and rows[0] is the header, so data row i is sheet row i+1
        const columnLetter = columnIndexToLetter(tokenColIndex);

        await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `Clients!${columnLetter}${sheetRow}`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [[newToken]]
            }
        });

        client["Access Token"] = newToken;
    }

    return client;
}

/**
 * Recalculates and persists a client's overall Status cell in the Clients
 * sheet (e.g. "Waiting" / "In Progress" / "Completed"). Used after a document
 * upload changes the client's checklist completion state.
 */
async function updateClientStatus(clientId, status) {

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "Clients!A:Z"
    });

    const rows = response.data.values || [];

    if (rows.length < 2) {
        return;
    }

    const headers = rows[0];
    const statusColIndex = headers.indexOf("Status");

    if (statusColIndex === -1) {
        throw new Error(
            'Cannot update client status: the Clients sheet has no "Status" column header.'
        );
    }

    const found = locateClientRow(rows, headers, clientId);

    if (!found) {
        return;
    }

    const sheetRow = found.rowIndex + 1;
    const columnLetter = columnIndexToLetter(statusColIndex);

    await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Clients!${columnLetter}${sheetRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [[status]]
        }
    });

}
async function searchClients(searchText) {

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "Clients!A:Z"
    });

    const rows = response.data.values || [];

    if (rows.length < 2) {
        return [];
    }

    const headers = rows[0];

    const results = [];

    const search = (searchText || "").toLowerCase();

    for (let i = 1; i < rows.length; i++) {

        const row = rows[i];

        const client = {};

        headers.forEach((header, index) => {
            client[header] = row[index] || "";
        });

        const clientName = (client["Client Name"] || "").toLowerCase();
        const clientId = (client["Client ID"] || "").toLowerCase();

        if (
            clientName.includes(search) ||
            clientId.includes(search)
        ) {
            results.push(client);
        }

    }

    return results;

}
/**
 * Reads every row from the Activity Timeline sheet belonging to the
 * given client, newest first. This is the sheet the existing client
 * profile timeline UI already renders from (Activity Type, Description,
 * Performed By, Date & Time) — kept exactly as the frontend expects it,
 * no reshaping.
 */
async function getClientActivityTimeline(clientId) {

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "Activity Timeline!A:Z"
    });

    const rows = response.data.values || [];

    if (rows.length < 2) {
        return [];
    }

    const headers = rows[0];

    const activities = [];

    for (let i = 1; i < rows.length; i++) {

        const row = rows[i];

        const entry = {};

        headers.forEach((header, index) => {
            entry[header] = row[index] || "";
        });

        if (entry["Client ID"] === clientId) {
            activities.push(entry);
        }

    }

    activities.sort((a, b) => new Date(b["Date & Time"]) - new Date(a["Date & Time"]));

    return activities;

}

/**
 * Reads every row from the Audit Log sheet belonging to the given
 * client, newest first. Separate from the Activity Timeline sheet above —
 * this is the fuller audit trail (Timestamp, Action, Document, File URL)
 * meant for reporting/compliance/exports, not the profile timeline UI.
 */
async function getClientAuditLog(clientId) {

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "Audit Log!A:Z"
    });

    const rows = response.data.values || [];

    if (rows.length < 2) {
        return [];
    }

    const headers = rows[0];

    const entries = [];

    for (let i = 1; i < rows.length; i++) {

        const row = rows[i];

        const entry = {};

        headers.forEach((header, index) => {
            entry[header] = row[index] || "";
        });

        if (entry["Client ID"] === clientId) {
            entries.push(entry);
        }

    }

    entries.sort((a, b) => new Date(b["Timestamp"]) - new Date(a["Timestamp"]));

    return entries;

}

module.exports = {
    createClient,
    getClientById,
    updateClientStatus,
    searchClients,
    getClientActivityTimeline,
    getClientAuditLog
};
