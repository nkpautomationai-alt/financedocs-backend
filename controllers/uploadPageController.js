const { getClientById } = require("../services/clientService");
const { getChecklistByClientId } = require("../services/checklistService");

/**
 * Maps a checklist row (keyed by the Google Sheet's column headers) to the
 * flat, camelCase shape the client portal frontend expects. Keeps the sheet's
 * own column names ("Document", "Status", etc.) fully internal to the backend.
 */
function normalizeChecklistItem(item) {
    return {
        document: item["Document"] || "",
        status: item["Status"] || "",
        uploadedFile: item["Uploaded File"] || "",
        uploadDate: item["Upload Date"] || "",
        verifiedBy: item["Verified By"] || "",
        fileUrl: item["File URL"] || "",
        driveFileId: item["Drive File ID"] || "",
        checklistId: item["Checklist ID"] || ""
    };
}

async function getUploadPage(req, res) {

    try {

        const { client, token } = req.query;

        if (!client || !token) {
            return res.status(400).json({
                success: false,
                message: "Missing client or token."
            });
        }

        const clientData = await getClientById(client);

        if (!clientData) {
            return res.status(404).json({
                success: false,
                message: "Client not found."
            });
        }

        if (clientData["Access Token"] !== token) {
            return res.status(403).json({
                success: false,
                message: "Invalid or expired link."
            });
        }

        const checklist = await getChecklistByClientId(client);
        const documents = checklist.map(normalizeChecklistItem);

        res.json({
            success: true,
            client: {
                clientId: clientData["Client ID"],
                clientName: clientData["Client Name"],
                email: clientData["Email"]
            },
            documents
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

}

module.exports = {
    getUploadPage
};
