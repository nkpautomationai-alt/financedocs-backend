const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
// Import routes
const dashboardRoutes = require("./routes/dashboard");
const clientsRoutes = require("./routes/clients");
const templatesRoutes = require("./routes/templates");
const licenseRoutes = require("./routes/license");
const uploadPageRoutes = require("./routes/uploadPage");
const uploadDocumentRoutes = require("./routes/uploadDocument");
const settingsRoutes = require("./routes/settings");
//const uploadRoutes = require("./routes/uploadDocument");

// Use routes
app.use("/api/clients", clientsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/license-status", licenseRoutes);
app.use("/api/upload-page", uploadPageRoutes);
app.use("/api/upload-document", uploadDocumentRoutes);
app.use("/api/settings", settingsRoutes);
//app.use("/api", uploadRoutes);
// Home route
/*app.get("/", (req, res) => {
    res.send("FinanceDocs Backend Running 🚀");
});*/

const PORT = process.env.PORT || 3000;
app.get("/test", (req, res) => {
    res.send("Server is working");
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
