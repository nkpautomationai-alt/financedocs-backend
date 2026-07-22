const { google } = require("googleapis");
const { Readable } = require("stream");
const path = require("path");

let auth;

if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    // Render
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

    auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
            "https://www.googleapis.com/auth/drive"
        ]
    });
} else {
    // Local development
    auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, "../credentials/financedocs-service-account.json"),
        scopes: [
            "https://www.googleapis.com/auth/drive"
        ]
    });
}

const drive = google.drive({
    version: "v3",
    auth
});

async function createClientFolder(clientName) {

    const folderMetadata = {

        name: clientName,

        mimeType: "application/vnd.google-apps.folder",

        parents: [
            process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID
        ]

    };

    const response = await drive.files.create({

        resource: folderMetadata,

        fields: "id, webViewLink"

    });

    return {

        folderId: response.data.id,

        folderLink:
            `https://drive.google.com/drive/folders/${response.data.id}`

    };

}

/**
 * Uploads an in-memory file buffer (e.g. from multer memoryStorage) into an
 * existing Drive folder.
 */
async function uploadFileToFolder(folderId, fileName, mimeType, buffer) {

    const response = await drive.files.create({

        resource: {
            name: fileName,
            parents: [folderId]
        },

        media: {
            mimeType,
            body: Readable.from(buffer)
        },

        fields: "id, webViewLink"

    });

    return {

        driveFileId: response.data.id,

        fileUrl: response.data.webViewLink

    };

}

module.exports = {

    createClientFolder,
    uploadFileToFolder

};
