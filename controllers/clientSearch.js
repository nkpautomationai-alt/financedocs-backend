const { searchClients } = require("../services/clientService");

async function search(req, res) {

    try {

        const { name } = req.query;

        const clients = await searchClients(name || "");

        res.json({
            success: true,
            clients
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
    search
};