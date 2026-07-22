const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
// ===== TEMPORARY DEBUG ROUTE - DELETE AFTER TESTING =====
app.get("/debug-cloudinary", async (req, res) => {
    const cloudinary = require("cloudinary").v2;
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const info = {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret_length: process.env.CLOUDINARY_API_SECRET?.length,
        api_secret_has_whitespace: /\s/.test(process.env.CLOUDINARY_API_SECRET || ""),
        api_secret_first_char: process.env.CLOUDINARY_API_SECRET?.[0],
        api_secret_last_char: process.env.CLOUDINARY_API_SECRET?.slice(-1)
    };

    try {
        const result = await cloudinary.uploader.upload(
            "https://res.cloudinary.com/demo/image/upload/sample.jpg",
            { folder: "FinanceDocs/test", public_id: "rendertest123", overwrite: true }
        );
        info.upload_result = "SUCCESS";
        info.secure_url = result.secure_url;
    } catch (err) {
        info.upload_result = "FAILED";
        info.error_message = err.message;
    }

    res.json(info);
});
// ===== END DEBUG ROUTE =====
// Import routes
const dashboardRoutes = require("./routes/dashboard");
const clientsRoutes = require("./routes/clients");
const templatesRoutes = require("./routes/templates");
const licenseRoutes = require("./routes/license");
const uploadPageRoutes = require("./routes/uploadPage");
const uploadDocumentRoutes = require("./routes/uploadDocument");
//const uploadRoutes = require("./routes/uploadDocument");

// Use routes
app.use("/api/clients", clientsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/license-status", licenseRoutes);
app.use("/api/upload-page", uploadPageRoutes);
app.use("/api/upload-document", uploadDocumentRoutes);
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
