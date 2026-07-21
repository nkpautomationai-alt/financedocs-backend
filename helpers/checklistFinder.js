function findMatchingChecklist(uploadedFiles, checklistRows) {

    const results = [];

    for (const uploaded of uploadedFiles) {

        const uploadedDocument =
            (uploaded.document || "").trim().toLowerCase();

        for (const row of checklistRows) {

            const checklistDocument =
                (row.Document || "").trim().toLowerCase();

            if (
                checklistDocument &&
                uploadedDocument.includes(checklistDocument)
            ) {

                results.push({

                    rowNumber: row.row_number,

                    checklistId: row["Checklist ID"],

                    status: "Received",

                    uploadedFile: uploaded.uploadedFile,

                    uploadDate:
                        new Date().toISOString().split("T")[0],

                    verifiedBy: "Automation"

                });

            }

        }

    }

    return results;

}

module.exports = findMatchingChecklist;