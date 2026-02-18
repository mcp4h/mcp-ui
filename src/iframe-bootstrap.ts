export function getIframeBootstrapScript(initialData: unknown): string {
	const serialized = safeSerialize(initialData);
	return `(() => {
  const initialData = ${serialized};
  window.mcpData = initialData;
  const pending = new Map();
  const toolPending = new Map();
  let nextId = 1;
  let nextToolId = 1;
  const decoder = new TextDecoder();
  const deferredScripts = [];
  let deferredReady = document.readyState !== "loading";
  let deferredListenerAttached = false;

  function sanitizeLayerName(name) {
    if (!name) return null;
    const trimmed = String(name).trim();
    if (!trimmed) return null;
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return null;
    return trimmed;
  }

  function requestResource(uri, kind) {
    return new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      window.parent.postMessage({ type: "mcp:request", id, uri, kind }, "*");
    });
  }

  function enqueueDeferredScript(run) {
    if (!deferredReady && document.readyState !== "loading") {
      deferredReady = true;
    }
    deferredScripts.push(run);
    if (!deferredReady && !deferredListenerAttached) {
      deferredListenerAttached = true;
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          deferredReady = true;
          flushDeferredScripts();
        },
        { once: true }
      );
    }
    if (deferredReady) {
      flushDeferredScripts();
    }
  }

  function flushDeferredScripts() {
    while (deferredScripts.length) {
      const run = deferredScripts.shift();
      if (typeof run === "function") run();
    }
  }

  function callTool(params) {
    return new Promise((resolve, reject) => {
      const id = nextToolId++;
      toolPending.set(id, { resolve, reject });
      window.parent.postMessage({ type: "mcp:tool-call", id, params }, "*");
    });
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data) return;
    if (data.type === "mcp:response") {
      const resolve = pending.get(data.id);
      if (!resolve) return;
      pending.delete(data.id);
      resolve(data);
      return;
    }
    if (data.type === "mcp:tool-result") {
      const entry = toolPending.get(data.id);
      if (!entry) return;
      toolPending.delete(data.id);
      if (data.ok) {
        entry.resolve(data.result);
      } else {
        const message = data.error || "Tool call failed";
        entry.reject(new Error(message));
      }
      return;
    }
    if (data.type === "mcp-data:update") {
      window.mcpData = data.payload;
      window.dispatchEvent(new CustomEvent("mcp-data", { detail: data.payload }));
    }
  });

  window.mcp = window.mcp || {};
  window.mcp.callTool = callTool;

  function toText(body) {
    const buffer = body || new ArrayBuffer(0);
    return decoder.decode(new Uint8Array(buffer));
  }

  function toBlobUrl(body, mime) {
    const buffer = body || new ArrayBuffer(0);
    const blob = new Blob([buffer], { type: mime || "application/octet-stream" });
    return URL.createObjectURL(blob);
  }

  function copyAttributes(from, to, skip) {
    const skipSet = new Set(skip || []);
    for (const attr of Array.from(from.attributes)) {
      if (skipSet.has(attr.name)) continue;
      to.setAttribute(attr.name, attr.value);
    }
  }

  class McpLink extends HTMLElement {
    connectedCallback() {
      if (this.hasAttribute("data-mcp-blocked")) return;
      const href = this.getAttribute("href");
      if (!href) return;
      const rel = (this.getAttribute("rel") || "").toLowerCase();
      if (rel && rel !== "stylesheet") return;
      requestResource(href, "style").then((res) => {
        if (!res || !res.ok) return;
        const style = document.createElement("style");
        const media = this.getAttribute("media");
        if (media) style.setAttribute("media", media);
        const layer = sanitizeLayerName(this.getAttribute("layer")) || "mcp-content";
        style.textContent = "@layer " + layer + " {\\n" + toText(res.body) + "\\n}";
        if (this.hasAttribute("data-mcp-head")) {
          (document.head || document.documentElement).appendChild(style);
          this.remove();
          return;
        }
        this.replaceWith(style);
      });
    }
  }

  class McpScript extends HTMLElement {
    connectedCallback() {
      if (this.hasAttribute("data-mcp-blocked")) {
        console.error("[mcp] script blocked", this.getAttribute("src"));
        return;
      }
      const src = this.getAttribute("src");
      if (!src) {
        console.error("[mcp] script missing src", this);
        return;
      }
      const isDefer = this.hasAttribute("defer");
      requestResource(src, "script").then((res) => {
        if (!res || !res.ok) {
          console.error("[mcp] script resolve failed", src, res?.error || "unknown");
          return;
        }
        const script = document.createElement("script");
        const type = this.getAttribute("type");
        if (type) script.setAttribute("type", type);
        script.textContent = toText(res.body);
        console.debug("[mcp] script injected", src);
        const placeScript = () => {
          if (this.hasAttribute("data-mcp-head")) {
            (document.head || document.documentElement).appendChild(script);
            this.remove();
            return;
          }
          this.replaceWith(script);
        };
        if (isDefer) {
          enqueueDeferredScript(placeScript);
          return;
        }
        placeScript();
      });
    }
  }

  class McpImg extends HTMLElement {
    connectedCallback() {
      if (this.hasAttribute("data-mcp-blocked")) return;
      const src = this.getAttribute("src");
      if (!src) return;
      requestResource(src, "img").then((res) => {
        if (!res || !res.ok) return;
        const img = document.createElement("img");
        copyAttributes(this, img, ["src"]);
        const url = toBlobUrl(res.body, res.mime);
        img.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
        img.addEventListener("error", () => URL.revokeObjectURL(url), { once: true });
        img.setAttribute("src", url);
        this.replaceWith(img);
      });
    }
  }

  class McpMedia extends HTMLElement {
    connectedCallback() {
      if (this.hasAttribute("data-mcp-blocked")) return;
      const src = this.getAttribute("src");
      if (!src) return;
      const tag = this.tagName.toLowerCase().replace("mcp-", "");
      requestResource(src, "media").then((res) => {
        if (!res || !res.ok) return;
        const node = document.createElement(tag);
        copyAttributes(this, node, ["src"]);
        const url = toBlobUrl(res.body, res.mime);
        if (tag === "source") {
          node.setAttribute("src", url);
        } else {
          node.setAttribute("src", url);
          node.addEventListener("loadeddata", () => URL.revokeObjectURL(url), { once: true });
          node.addEventListener("error", () => URL.revokeObjectURL(url), { once: true });
        }
        this.replaceWith(node);
      });
    }
  }

  class McpAudio extends McpMedia {}
  class McpVideo extends McpMedia {}
  class McpSource extends McpMedia {}

  customElements.define("mcp-link", McpLink);
  customElements.define("mcp-script", McpScript);
  customElements.define("mcp-img", McpImg);
  customElements.define("mcp-audio", McpAudio);
  customElements.define("mcp-video", McpVideo);
  customElements.define("mcp-source", McpSource);
})();`;
}
function sanitizeLayerName(name: string | null): string | null {
	if (!name) return null;
	const trimmed = name.trim();
	if (!trimmed) return null;
	if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return null;
	return trimmed;
}
function safeSerialize(value: unknown): string {
	try {
		return JSON.stringify(value ?? null)
			.replace(/</g, "\\u003c")
			.replace(/>/g, "\\u003e")
			.replace(/\u2028/g, "\\u2028")
			.replace(/\u2029/g, "\\u2029");
	}
	catch {
		return "null";
	}
}
