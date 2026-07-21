const crypto = require("crypto");

/**
 * Generates a cryptographically secure, URL-safe access token.
 * Used for the secure client upload-portal links (?client=...&token=...).
 */
function generateAccessToken() {
    return crypto.randomBytes(32).toString("hex");
}

module.exports = generateAccessToken;
