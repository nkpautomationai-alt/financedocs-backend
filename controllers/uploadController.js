const { processDocumentUpload } = require("../services/uploadService");

async function uploadDocument(req, res) {

    try {

        const { clientId, token, documentName } = req.body;

        if (!clientId || !token || !documentName) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: clientId, token, documentName."
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded."
            });
        }

        const result = await processDocumentUpload({
            clientId,
            token,
            document: documentName,
            file: req.file
        });

        res.json(result);

    } catch (error) {

        console.error(error);

        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });

    }

}

module.exports = {
    uploadDocument
};
