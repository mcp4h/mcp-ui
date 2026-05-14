type BootstrapOptions = {
	autoHeight?: boolean;
};
export function getIframeBootstrapScript(initialData: unknown, options: BootstrapOptions = {}): string {
	const serialized = safeSerialize(initialData);
	const autoHeightEnabled = options.autoHeight ? "true" : "false";
	return `(() => {
  const initialData = ${serialized};
  const autoHeightEnabled = ${autoHeightEnabled};
  window.mcpData = initialData;
  const pending = new Map();
  const toolPending = new Map();
  const rpcPending = new Map();
  let nextId = 1;
  let nextToolId = 1;
  let nextRpcId = 1;
  let connected = false;
  let hostContext = null;
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
      window.parent.postMessage({ type: "mcp:tool-call", id, params, method: "tools/call" }, "*");
    });
  }

  function connectApp() {
    if (connected) {
      return Promise.resolve({});
    }
    return new Promise((resolve, reject) => {
      const id = nextRpcId++;
      console.info("[mcp] connect request", { id });
      rpcPending.set(id, { type: "connect", resolve, reject });
      window.parent.postMessage({ type: "mcp:connect", id }, "*");
    });
  }

  function sendMessage(params) {
    return new Promise((resolve, reject) => {
      const id = nextRpcId++;
      rpcPending.set(id, { type: "send-message", resolve, reject });
      window.parent.postMessage({ type: "mcp:send-message", id, params }, "*");
    });
  }

  function applyDocumentTheme(theme, root = document.documentElement) {
    if (!root) return;
    if (theme !== "light" && theme !== "dark") return;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
  }

  function applyHostStyleVariables(vars, root = document.documentElement) {
    if (!vars || !root || !root.style) return;
    for (const [key, value] of Object.entries(vars)) {
      if (!key.startsWith("--") || typeof value !== "string") continue;
      root.style.setProperty(key, value);
    }
  }

  function applyHostFonts(fontCss, doc = document) {
    if (!fontCss || !doc) return;
    const styleId = "mcp-host-fonts";
    let style = doc.getElementById(styleId);
    if (!style) {
      style = doc.createElement("style");
      style.id = styleId;
      (doc.head || doc.documentElement).appendChild(style);
    }
    if (style.textContent !== fontCss) {
      style.textContent = fontCss;
    }
  }

  function applyHostContext(ctx) {
    if (!ctx || typeof ctx !== "object") return;
    hostContext = { ...(hostContext || {}), ...ctx };
    if (hostContext.theme) {
      applyDocumentTheme(hostContext.theme);
    }
    if (hostContext.styles?.variables) {
      applyHostStyleVariables(hostContext.styles.variables);
    }
    if (hostContext.styles?.css?.fonts) {
      applyHostFonts(hostContext.styles.css.fonts);
    }
    if (window.mcp && typeof window.mcp.onhostcontextchanged === "function") {
      window.mcp.onhostcontextchanged(hostContext);
    }
    if (window.App && typeof window.App.__deliverHostContextChanged === "function") {
      window.App.__deliverHostContextChanged(hostContext);
    }
  }

  function deliverToolInput(input) {
    window.mcpData = input;
    window.dispatchEvent(new CustomEvent("mcp-data", { detail: input }));
    if (window.mcp && typeof window.mcp.ontoolinput === "function") {
      window.mcp.ontoolinput({ arguments: input });
    }
    if (window.App && typeof window.App.__deliverToolInput === "function") {
      window.App.__deliverToolInput(input);
    }
  }

  function deliverToolResult(result) {
    if (window.mcp && typeof window.mcp.ontoolresult === "function") {
      window.mcp.ontoolresult(result);
    }
    if (window.App && typeof window.App.__deliverToolResult === "function") {
      window.App.__deliverToolResult(result);
    }
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
      console.info("[mcp] tool result received", { ok: data.ok, hasId: Boolean(data.id) });
      const entry = toolPending.get(data.id);
      const result = (
        Object.prototype.hasOwnProperty.call(data, "structuredContent") ||
        Object.prototype.hasOwnProperty.call(data, "content") ||
        Object.prototype.hasOwnProperty.call(data, "_meta") ||
        Object.prototype.hasOwnProperty.call(data, "isError")
      )
        ? {
            structuredContent: data.structuredContent,
            content: data.content,
            _meta: data._meta,
            isError: data.isError === true,
          }
        : data.result;
      if (data.ok) {
        if (entry) {
          toolPending.delete(data.id);
          entry.resolve(result);
        }
        console.info("[mcp] deliver tool result", { hasEntry: Boolean(entry) });
        deliverToolResult(result);
      } else if (entry) {
        toolPending.delete(data.id);
        const message = data.error || "Tool call failed";
        entry.reject(new Error(message));
      }
      return;
    }
    if (data.type === "mcp:connect-result") {
      const entry = rpcPending.get(data.id);
      if (!entry) return;
      rpcPending.delete(data.id);
      if (!data.ok) {
        entry.reject(new Error(data.error || "Connect failed"));
        return;
      }
      connected = true;
      console.info("[mcp] connected", { ok: data.ok, hostCapabilities: data.hostCapabilities || {} });
      applyHostContext(data.hostContext || {});
      entry.resolve({ hostCapabilities: data.hostCapabilities || {}, hostContext: hostContext || {} });
      if (window.parent) {
        window.parent.postMessage({ type: "mcp:initialized" }, "*");
      }
      return;
    }
    if (data.type === "mcp:send-message-result") {
      const entry = rpcPending.get(data.id);
      if (!entry) return;
      rpcPending.delete(data.id);
      if (!data.ok) {
        entry.reject(new Error(data.error || "Send message failed"));
        return;
      }
      entry.resolve({});
      return;
    }
    if (data.type === "mcp:tool-input") {
      deliverToolInput(data.input);
      return;
    }
    if (data.type === "mcp:host-context-changed") {
      applyHostContext(data.context || {});
      return;
    }
    if (data.type === "mcp-data:update") {
      deliverToolInput(data.payload);
    }
  });

  function initAutoHeight() {
    if (!autoHeightEnabled) return;
    let scheduled = false;
    let lastHeight = 0;
    const doc = document.documentElement;
    const report = () => {
      scheduled = false;
      const body = document.body;
      if (!doc) return;
      const height = Math.ceil(
        Math.max(
          doc.scrollHeight,
          doc.offsetHeight,
          body ? body.scrollHeight : 0,
          body ? body.offsetHeight : 0
        )
      );
      if (!height || height === lastHeight) return;
      lastHeight = height;
      window.parent.postMessage({ type: "mcp:height", height }, "*");
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(report);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", schedule, { once: true });
    }
    window.addEventListener("load", schedule, { once: true });
    window.addEventListener("resize", schedule);
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(schedule);
      if (doc) observer.observe(doc);
      const body = document.body;
      if (body) observer.observe(body);
    }
    schedule();
  }

  initAutoHeight();

  window.mcp = window.mcp || {};
  window.mcp.callTool = callTool;
  window.mcp.connect = connectApp;
  window.mcp.callServerTool = callTool;
  window.mcp.sendMessage = sendMessage;
  window.mcp.applyDocumentTheme = applyDocumentTheme;
  window.mcp.applyHostStyleVariables = applyHostStyleVariables;
  window.mcp.applyHostFonts = applyHostFonts;
  window.mcp.getHostContext = () => hostContext;
  window.mcp.ontoolinput = null;
  window.mcp.ontoolresult = null;
  window.mcp.onhostcontextchanged = null;

  class App {
    constructor() {
      this.ontoolinput = null;
      this.ontoolresult = null;
      this.onhostcontextchanged = null;
      App.__instances.push(this);
    }

    async connect() {
      return connectApp();
    }

    async callServerTool(params) {
      return callTool(params);
    }

    async sendMessage(params) {
      return sendMessage(params);
    }

    getHostContext() {
      return hostContext;
    }

    static __deliverToolInput(input) {
      for (const app of App.__instances) {
        if (typeof app.ontoolinput === "function") {
          app.ontoolinput({ arguments: input });
        }
      }
    }

    static __deliverToolResult(result) {
      for (const app of App.__instances) {
        if (typeof app.ontoolresult === "function") {
          app.ontoolresult(result);
        }
      }
    }

    static __deliverHostContextChanged(context) {
      for (const app of App.__instances) {
        if (typeof app.onhostcontextchanged === "function") {
          app.onhostcontextchanged(context);
        }
      }
    }
  }

  App.__instances = [];
  window.App = App;
  window.applyDocumentTheme = applyDocumentTheme;
  window.applyHostStyleVariables = applyHostStyleVariables;
  window.applyHostFonts = applyHostFonts;

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
