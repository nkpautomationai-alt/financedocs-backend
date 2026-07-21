const crypto = require("crypto");

const LINK_SECRET = process.env.LINK_SECRET;

function generateToken(clientId) {
    return crypto
        .createHmac("sha256", LINK_SECRET)
        .update(clientId)
        .digest("hex");
}

function verifyToken(clientId, token) {
    return generateToken(clientId) === token;
}

module.exports = {
    generateToken,
    verifyToken
};