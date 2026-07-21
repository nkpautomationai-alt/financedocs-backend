function generateChecklist(client) {

    const output = [];

    const documents = client.requiredDocuments
        .split(",")
        .map(doc => doc.trim());

    for (const document of documents) {

        const documentKey = document.replace(/[^a-zA-Z0-9]/g, "");

        output.push({

            checklistId: `${client.clientId}-${documentKey}`,

            clientId: client.clientId,

            clientName: client.clientName,

            email: client.email,

            document,

            status: "Pending",

            uploadedFile: "",

            uploadDate: ""

        });

    }

    return output;

}

module.exports = generateChecklist;