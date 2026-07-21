const express = require("express");
const sheets = require("../services/googleSheets");

const router = express.Router();

router.get("/", async (req, res) => {
  try {

    // -------------------------
    // Get Clients
    // -------------------------
    const clientsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Clients!A:Z",
    });

    // -------------------------
    // Get Document Checklist
    // -------------------------
    const checklistResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "'Document Checklist'!A:Z",
    });

    const clientRows = clientsResponse.data.values || [];
    const checklistRows = checklistResponse.data.values || [];

    if (clientRows.length === 0) {
      return res.json({
        success: true,
        dashboard: {
          totalClients: 0,
          completedClients: 0,
          waitingClients: 0,
          inProgressClients: 0,
          pendingDocuments: 0,
          receivedDocuments: 0,
        },
      });
    }

    //-----------------------------------
    // Convert rows to objects
    //-----------------------------------

    const clientHeaders = clientRows[0];
    const checklistHeaders = checklistRows[0];

    const clients = clientRows.slice(1).map(row => {
      const obj = {};
      clientHeaders.forEach((h, i) => obj[h] = row[i] || "");
      return obj;
    });

    const checklist = checklistRows.slice(1).map(row => {
      const obj = {};
      checklistHeaders.forEach((h, i) => obj[h] = row[i] || "");
      return obj;
    });

    //-----------------------------------
    // Remove duplicate Checklist IDs
    //-----------------------------------

    const uniqueChecklist = [
      ...new Map(
        checklist.map(item => [
          item["Checklist ID"],
          item
        ])
      ).values()
    ];

    //-----------------------------------
    // Dashboard Calculation
    //-----------------------------------

    const totalClients = clients.length;

    let completedClients = 0;
    let waitingClients = 0;
    let inProgressClients = 0;

    for (const client of clients) {

      const clientId = client["Client ID"];

      const clientDocs = uniqueChecklist.filter(
        doc => doc["Client ID"] === clientId
      );

      const pending = clientDocs.filter(
        doc => doc.Status === "Pending"
      ).length;

      const received = clientDocs.filter(
        doc => doc.Status === "Received"
      ).length;

      if (received === 0) {
        waitingClients++;
      }
      else if (pending === 0) {
        completedClients++;
      }
      else {
        inProgressClients++;
      }

    }

    const pendingDocuments = uniqueChecklist.filter(
      doc => doc.Status === "Pending"
    ).length;

    const receivedDocuments = uniqueChecklist.filter(
      doc => doc.Status === "Received"
    ).length;

    //-----------------------------------
    // Response
    //-----------------------------------

    res.json({
      success: true,
      dashboard: {
        totalClients,
        completedClients,
        waitingClients,
        inProgressClients,
        pendingDocuments,
        receivedDocuments
      }
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
});

module.exports = router;