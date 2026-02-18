const nameEl = document.getElementById("operator");
const queueEl = document.getElementById("queue");
function applyData(data) {
	if (!data) return;
	if (nameEl) nameEl.textContent = data.name || "Unknown";
	if (queueEl) queueEl.textContent = String(data.queue ?? "-");
}
applyData(window.mcpData);
window.addEventListener("mcp-data", (event) => applyData(event.detail));
