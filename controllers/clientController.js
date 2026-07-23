const { createClient: saveClient } = require("../services/clientService");
const generateClientId = require("../helpers/clientId");
const getTemplateDocuments = require("../helpers/templateReader");
const { createClientFolder } = require("../services/googleDrive");
const generateChecklist = require("../helpers/checklistGenerator");
const { createChecklistRows } = require("../services/checklistService");
const { searchClients } = require("../services/clientService");
const { getClientById } = require("../services/clientService");
const { getClientActivityTimeline } = require("../services/clientService");
const { getClientAuditLog } = require("../services/clientService");

async function search(req, res) {
    try {

        const { name } = req.query;

        const clients = await searchClients(name || "");

        const formattedClients = clients.map(client => ({
            clientId: client["Client ID"] || "",
            name: client["Client Name"] || "",
            email: client["Email"] || "",
            phone: client["Phone"] || "",
            status: client["Status"] || ""
        }));

        res.json({
            success: true,
            clients: formattedClients
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
}
async function getClient(req, res) {
    try {

        const { id } = req.query;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Missing client id."
            });
        }

        const clientData = await getClientById(id);

        if (!clientData) {
            return res.status(404).json({
                success: false,
                message: "Client not found."
            });
        }

        res.json({
            success: true,
            client: {
                clientId: clientData["Client ID"] || "",
                name: clientData["Client Name"] || "",
                email: clientData["Email"] || "",
                phone: clientData["Phone"] || "",
                accessToken: clientData["Access Token"] || ""
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
}
async function createClient(req, res) {

    try {

        const {
            clientName,
            email,
            phone,
            address,
            advisor,
            template
        } = req.body;

        const clientId = generateClientId();

        const folder = await createClientFolder(clientName);

        const documents = await getTemplateDocuments(template);

        await saveClient({
            clientId,
            clientName,
            email,
            phone,
            address,
            advisor,
            template,
            folderId: folder.folderId,
            folderLink: folder.folderLink
        });

        const requiredDocuments = documents
            .map(doc => doc["Document"])
            .join(",");

        const checklist = generateChecklist({
            clientId,
            clientName,
            email,
            requiredDocuments
        });

        await createChecklistRows(checklist);

        res.json({
            success: true,
            client: {
                clientId,
                clientName,
                email,
                phone,
                address,
                advisor,
                template
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

async function getActivity(req, res) {
    try {

        const { client } = req.query;

        if (!client) {
            return res.status(400).json({
                success: false,
                message: "Missing client id."
            });
        }

        // Sourced from the Activity Timeline sheet — this is the exact
        // shape the existing client profile timeline UI already renders
        // (Activity Type, Description, Performed By, Date & Time), so
        // entries are returned as-is with no reshaping/renaming.
        const activities = await getClientActivityTimeline(client);

        res.json({
            success: true,
            activities
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
}

// Separate from getActivity above — this reads the Audit Log sheet
// (Timestamp, Client ID, Client Name, Action, Document, File URL,
// Performed By) for reporting/compliance/export/AI use cases. Not
// currently consumed by any UI.
async function getAuditLog(req, res) {
    try {

        const { client } = req.query;

        if (!client) {
            return res.status(400).json({
                success: false,
                message: "Missing client id."
            });
        }

        const rawEntries = await getClientAuditLog(client);

        const entries = rawEntries.map(e => ({
            timestamp: e["Timestamp"] || "",
            clientId: e["Client ID"] || "",
            clientName: e["Client Name"] || "",
            action: e["Action"] || "",
            document: e["Document"] || "",
            fileUrl: e["File URL"] || "",
            performedBy: e["Performed By"] || ""
        }));

        res.json({
            success: true,
            activities: entries
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
    createClient,
    search,
    getClient,
    getActivity,
    getAuditLog
};
