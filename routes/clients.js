const express = require("express");
const router = express.Router();
const { search } = require("../controllers/clientController");
const { createClient } = require("../controllers/clientController");
const { getClient } = require("../controllers/clientController");
const { getActivity } = require("../controllers/clientController");
const { getAuditLog } = require("../controllers/clientController");

router.post("/create", createClient);
router.get("/search", search);
router.get("/client", getClient);
router.get("/activity", getActivity);
router.get("/audit-log", getAuditLog);

module.exports = router;
