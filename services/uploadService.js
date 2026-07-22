const sheets = require("./googleSheets");
const { getClientById, updateClientStatus } = require("./clientService");
const { getChecklistByClientId, updateChecklistRow } = require("./checklistService");
const { uploadDocumentToCloudinary } = require("./cloudinary");
const findMatchingChecklist = require("../helpers/checklistFinder");
const calculateClientStatus = require("../helpers/calculateClientStatus");

/**
 * NOTE ON ASSUMPTIONS (please confirm/adjust these three things):
 *
 * 1. File naming: "<Client ID>-<Document>-<original filename>". Change
 *    buildFileName() below if a different convention is needed.
 *
 * 2. Audit Log sheet: assumed tab name "Audit Log" with columns
 *    Timestamp | Client ID | Client Name | Action | Document | File URL | Performed By
 *
 * 3. Response shape: inferred from the client portal's expectations.
 */

function buildFileName(clientId, document, originalName) {
    const safeDocument = document.replace(/\s+/g, "");

    // Strip the file extension (Cloudinary tracks format separately)
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");

    // Replace spaces and any unsafe characters with underscores
    const safeOriginalName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]+/g, "_");

    return `${clientId}-${safeDocument}-${safeOriginalName}`;
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

    // 2. Upload the document to Cloudinary (FinanceDocs/{clientId})
    const uploadDate = new Date().toISOString().split("T")[0];
    const fileName = buildFileName(clientId, document, file.originalname);

    const uploadResult = await uploadDocumentToCloudinary(
        clientId,
        fileName,
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

    // 4. Update that checklist row (Drive File ID column now holds the
    //    Cloudinary public_id - column/field name kept unchanged)
    await updateChecklistRow(match.rowNumber, {
        status: "Received",
        uploadedFile: fileName,
        uploadDate: uploadDate,
        verifiedBy: "Automation",
        fileUrl: uploadResult.fileUrl,
        driveFileId: uploadResult.publicId
    });

    // 5. Re-read every checklist row and recalculate overall status
    const refreshedChecklist = await getChecklistByClientId(clientId);
    const overallStatus = calculateClientStatus(refreshedChecklist);

    // 6. Update the Clients sheet with the new overall status
    await updateClientStatus(clientId, overallStatus);

    // 7. Append an Audit Log row
    await appendAuditLogRow({
        clientId,
        clientName: clientData["Client Name"],
        document,
        fileUrl: uploadResult.fileUrl
    });

    // 8. Response shape expected by the upload page (unchanged)
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
            fileUrl: uploadResult.fileUrl
        }
    };

}

module.exports = {
    processDocumentUpload
};
