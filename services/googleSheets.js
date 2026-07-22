const { google } = require("googleapis");
const path = require("path");

let auth;

if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    // Render
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

    auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive"
        ]
    });
} else {
    // Local development
    auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, "../credentials/financedocs-service-account.json"),
        scopes: [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive"
        ]
    });
}

const sheets = google.sheets({
    version: "v4",
    auth
});

module.exports = sheets;
