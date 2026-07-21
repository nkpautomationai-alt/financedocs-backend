/**
 * Calculates a client's overall status from their checklist rows, using the
 * same rule already used for dashboard aggregate counts (routes/dashboard.js):
 *   - no documents received yet        -> "Waiting"
 *   - received, but some still pending  -> "In Progress"
 *   - none pending (all received)       -> "Completed"
 *
 * NOTE: "Waiting" matches the literal string already written by
 * clientService.createClient. "In Progress" / "Completed" are assumed to
 * match your existing Status conventions - adjust the two return strings
 * below if your sheet uses different casing/wording.
 */
function calculateClientStatus(checklistRows) {

    const pending = checklistRows.filter(
        doc => doc.Status === "Pending"
    ).length;

    const received = checklistRows.filter(
        doc => doc.Status === "Received"
    ).length;

    if (received === 0) {
        return "Waiting";
    }

    if (pending === 0) {
        return "Completed";
    }

    return "In Progress";

}

module.exports = calculateClientStatus;
