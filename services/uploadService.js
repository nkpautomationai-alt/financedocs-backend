const sheets = require("./googleSheets");
const { getClientById, updateClientStatus } = require("./clientService");
const { getChecklistByClientId, updateChecklistRow } = require("./checklistService");
const { uploadFileToFolder } = require("./googleDrive");
const findMatchingChecklist = require("../helpers/checklistFinder");
const calculateClientStatus = require("../helpers/calculateClientStatus");

/**
 * NOTE ON ASSUMPTIONS (please confirm/adjust these three things):
 *
 * 1. File naming: since document upload previously lived entirely in n8n,
 *    there's no existing Express code defining the naming convention. This
 *    builds "<Client ID>-<Document>-<original filename>". Change buildFileName()
 *    below if the old workflow used something else (e.g. just the original
 *    filename, or a checklist-ID-based name).
 *
 * 2. Audit Log sheet: assumed tab name "Audit Log" with columns
 *    Timestamp | Client ID | Client Name | Action | Document | File URL | Performed By
 *    (range 'Audit Log'!A:G below). Update the range and the values array
 *    together if your actual tab name or column order differs.
 *
 * 3. Response shape: since the old response was produced by n8n (not visible
 *    to me), the shape below is inferred from the sibling upload-page
 *    endpoint's conventions. Compare against what the upload-page frontend
 *    actually reads from the response and adjust processDocumentUpload's
 *    return value if it expects different keys.
 */

function buildFileName(clientId, document, originalName) {
    return `${clientId}-${document}-${originalName}`;
}

async function appendAuditLogRow({ clientId, clientName, document, fileUrl }) {

    await sheets.spreadsheets.values.append({

        spreadsheetId: process.env.GOOGLE_SHEET_ID,

        range: "'Audit Log'!A:G",

        valueInputOption: "USER_ENTERED",

        requestBody: {
            values: [[
                new Date().toISOString(),
                clientId,
                clientName,
                "Document Uploaded",
                document,
                fileUrl,
                "Automation"
            ]]
        }

    });

}

async function processDocumentUpload({ clientId, token, document, file }) {

    // 1. Validate client + secure upload token
    const clientData = await getClientById(clientId);

    if (!clientData) {
        const err = new Error("Client not found.");
        err.statusCode = 404;
        throw err;
    }

    if (clientData["Access Token"] !== token) {
        const err = new Error("Invalid or expired link.");
        err.statusCode = 403;
        throw err;
    }

    // 2. Upload the document into the client's Drive folder
    const uploadDate = new Date().toISOString().split("T")[0];
    const fileName = buildFileName(clientId, document, file.originalname);

    const driveResult = await uploadFileToFolder(
        clientData["Folder ID"],
        fileName,
        file.mimetype,
        file.buffer
    );

    // 3. Find the matching checklist row for this client + document
    const checklistRows = await getChecklistByClientId(clientId);

    const matches = findMatchingChecklist(
        [{ document, uploadedFile: fileName }],
        checklistRows
    );

    if (matches.length === 0) {
        const err = new Error(
            "No matching checklist item found for this document."
        );
        err.statusCode = 400;
        throw err;
    }

    const match = matches[0];

    // 4. Update that checklist row: Status, Uploaded File, Upload Date,
    //    Verified By, Drive File ID, File URL
    await updateChecklistRow(match.rowNumber, {
        status: "Received",
        uploadedFile: fileName,
        uploadDate: match.uploadDate,
        verifiedBy: "Automation",
        fileUrl: driveResult.fileUrl,
        driveFileId: driveResult.driveFileId
    });

    // 5. Re-read every checklist row for the client and recalculate overall status
    const refreshedChecklist = await getChecklistByClientId(clientId);
    const overallStatus = calculateClientStatus(refreshedChecklist);

    // 6. Update the Clients sheet with the new overall status
    await updateClientStatus(clientId, overallStatus);

    // 7. Append an Audit Log row
    await appendAuditLogRow({
        clientId,
        clientName: clientData["Client Name"],
        document,
        fileUrl: driveResult.fileUrl
    });

    // 8. Response shape expected by the upload page (see assumptions above)
    return {
        success: true,
        client: {
            clientId: clientData["Client ID"],
            clientName: clientData["Client Name"],
            status: overallStatus
        },
        document: {
            name: document,
            status: "Received",
            uploadedFile: fileName,
            uploadDate,
            fileUrl: driveResult.fileUrl
        }
    };

}

module.exports = {
    processDocumentUpload
};
