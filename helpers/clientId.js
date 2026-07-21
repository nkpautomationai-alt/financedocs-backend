function generateClientId() {
    return `CLI-${Date.now()}`;
}

module.exports = generateClientId;