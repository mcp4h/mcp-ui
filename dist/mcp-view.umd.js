"use strict";
var McpView = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    McpViewElement: () => McpViewElement,
    defineMcpView: () => defineMcpView
  });

  // src/bridge.ts
  async function normalizeResolverResult(result, kind, uri) {
    try {
      if (result instanceof Response) {
        if (!result.ok) {
          return {
            ok: false,
            mime: "text/plain",
            body: new Uint8Array(),
            error: `HTTP ${result.status}`
          };
        }
        const body = new Uint8Array(await result.arrayBuffer());
        const mime = result.headers.get("content-type") || inferMime(kind, uri);
        return { ok: true, mime, body };
      }
      if (result instanceof Blob) {
        const body = new Uint8Array(await result.arrayBuffer());
        const mime = result.type || inferMime(kind, uri);
        return { ok: true, mime, body };
      }
      if (typeof result === "string") {
        const encoder = new TextEncoder();
        const body = encoder.encode(result);
        const mime = inferMime(kind, uri);
        return { ok: true, mime, body };
      }
      if (result instanceof ArrayBuffer) {
        const body = new Uint8Array(result);
        const mime = inferMime(kind, uri);
        return { ok: true, mime, body };
      }
      if (result instanceof Uint8Array) {
        const mime = inferMime(kind, uri);
        return { ok: true, mime, body: result };
      }
    } catch (error) {
      return {
        ok: false,
        mime: "text/plain",
        body: new Uint8Array(),
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
    return {
      ok: false,
      mime: "text/plain",
      body: new Uint8Array(),
      error: "Unsupported resolver result"
    };
  }
  function inferMime(kind, uri) {
    if (kind === "document")
      return "text/html";
    if (kind === "style")
      return "text/css";
    if (kind === "script")
      return "text/javascript";
    const ext = getExtension(uri);
    if (ext) {
      const lookup = {
        css: "text/css",
        js: "text/javascript",
        mjs: "text/javascript",
        cjs: "text/javascript",
        json: "application/json",
        svg: "image/svg+xml",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        avif: "image/avif",
        woff: "font/woff",
        woff2: "font/woff2",
        ttf: "font/ttf",
        otf: "font/otf",
        mp3: "audio/mpeg",
        wav: "audio/wav",
        mp4: "video/mp4",
        webm: "video/webm"
      };
      if (lookup[ext])
        return lookup[ext];
    }
    if (kind === "img")
      return "image/png";
    return "application/octet-stream";
  }
  function getExtension(uri) {
    try {
      const url = new URL(uri);
      const path = url.pathname;
      const last = path.split("/").pop();
      if (!last || !last.includes("."))
        return null;
      return last.split(".").pop()?.toLowerCase() || null;
    } catch {
      return null;
    }
  }

  // src/iframe-bootstrap.ts
  function getIframeBootstrapScript(initialData) {
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
  function safeSerialize(value) {
    try {
      return JSON.stringify(value ?? null).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    } catch {
      return "null";
    }
  }

  // src/rewrite.ts
  var BLOCKED_ATTR = "data-mcp-blocked";
  function rewriteHtml(options) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(options.html, "text/html");
    addRootClass(doc.documentElement, "mcp-root");
    if (doc.body)
      addRootClass(doc.body, "mcp-root");
    rewriteElement(doc, "link", "href", "mcp-link", options);
    rewriteElement(doc, "script", "src", "mcp-script", options);
    rewriteElement(doc, "img", "src", "mcp-img", options);
    rewriteElement(doc, "source", "src", "mcp-source", options);
    rewriteElement(doc, "audio", "src", "mcp-audio", options);
    rewriteElement(doc, "video", "src", "mcp-video", options);
    const head = ensureHead(doc);
    const themeStyle = doc.createElement("style");
    themeStyle.setAttribute("data-mcp", "theme");
    themeStyle.textContent = options.themeCss;
    head.insertBefore(themeStyle, head.firstChild);
    let bootstrapAnchor = themeStyle.nextSibling;
    if (options.themeLink) {
      const linkNode = buildThemeLink(doc, options.themeLink, options);
      if (linkNode) {
        head.insertBefore(linkNode, themeStyle.nextSibling);
        bootstrapAnchor = linkNode.nextSibling;
      }
    }
    const bootstrap = doc.createElement("script");
    bootstrap.setAttribute("data-mcp", "bootstrap");
    bootstrap.textContent = options.bootstrapScript;
    head.insertBefore(bootstrap, bootstrapAnchor);
    const doctype = doc.doctype ? `<!doctype ${doc.doctype.name}>` : "<!doctype html>";
    return `${doctype}
${doc.documentElement.outerHTML}`;
  }
  function rewriteElement(doc, tagName, attrName, replacementTag, options) {
    const elements = Array.from(doc.getElementsByTagName(tagName));
    for (const el of elements) {
      const raw = el.getAttribute(attrName);
      if (!raw)
        continue;
      const info = resolveUrl(raw, options.rootUri || void 0);
      if (!info)
        continue;
      if (info.scheme !== "ui" && info.scheme !== "http" && info.scheme !== "https") {
        continue;
      }
      const replacement = doc.createElement(replacementTag);
      copyAttributes(el, replacement);
      replacement.setAttribute(attrName, info.url);
      if (el.ownerDocument?.head && el.ownerDocument.head.contains(el)) {
        replacement.setAttribute("data-mcp-head", "true");
      }
      if (info.scheme === "http" || info.scheme === "https") {
        if (!options.allowRemote(info.url)) {
          replacement.setAttribute(BLOCKED_ATTR, "true");
        }
      }
      el.replaceWith(replacement);
    }
  }
  function resolveUrl(raw, base) {
    const value = raw.trim();
    if (!value)
      return null;
    if (value.startsWith("#"))
      return null;
    const schemeMatch = value.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:/);
    if (schemeMatch) {
      const scheme = schemeMatch[0].slice(0, -1).toLowerCase();
      if (isIgnoredScheme(scheme))
        return null;
      return { url: value, scheme };
    }
    if (!base)
      return null;
    try {
      const resolved = new URL(value, base).toString();
      const scheme = new URL(resolved).protocol.replace(":", "").toLowerCase();
      if (isIgnoredScheme(scheme))
        return null;
      return { url: resolved, scheme };
    } catch {
      return null;
    }
  }
  function isIgnoredScheme(scheme) {
    return ["data", "blob", "mailto", "tel", "javascript", "about"].includes(scheme);
  }
  function copyAttributes(from, to) {
    for (const attr of Array.from(from.attributes)) {
      to.setAttribute(attr.name, attr.value);
    }
  }
  function addRootClass(el, className) {
    if (!el)
      return;
    const existing = el.getAttribute("class");
    if (!existing) {
      el.setAttribute("class", className);
      return;
    }
    const classes = new Set(existing.split(/\s+/).filter(Boolean));
    classes.add(className);
    el.setAttribute("class", Array.from(classes).join(" "));
  }
  function ensureHead(doc) {
    if (doc.head)
      return doc.head;
    const head = doc.createElement("head");
    const html = doc.documentElement;
    if (html.firstChild) {
      html.insertBefore(head, html.firstChild);
    } else {
      html.appendChild(head);
    }
    return head;
  }
  function buildThemeLink(doc, url, options) {
    const trimmed = url.trim();
    const info = trimmed.startsWith("ui://") ? resolveUrl(trimmed, options.rootUri || void 0) : resolveUrlWithWindow(trimmed);
    if (!info)
      return null;
    if (info.scheme === "ui") {
      const node = doc.createElement("mcp-link");
      node.setAttribute("rel", "stylesheet");
      node.setAttribute("href", info.url);
      node.setAttribute("layer", "mcp-user");
      return node;
    }
    if (info.scheme === "http" || info.scheme === "https") {
      const node = doc.createElement("link");
      node.setAttribute("rel", "stylesheet");
      node.setAttribute("href", info.url);
      node.setAttribute("layer", "mcp-user");
      return node;
    }
    return null;
  }
  function resolveUrlWithWindow(raw) {
    if (typeof window === "undefined" || !window.location)
      return null;
    try {
      const resolved = new URL(raw, window.location.href).toString();
      const scheme = new URL(resolved).protocol.replace(":", "").toLowerCase();
      if (isIgnoredScheme(scheme))
        return null;
      return { url: resolved, scheme };
    } catch {
      return null;
    }
  }

  // src/theme.ts
  var DEFAULT_LAYERS = ["mcp-default", "mcp-content", "mcp-user"];
  var defaultVariables = {
    "--mcp-color-bg": "#f7f7f5",
    "--mcp-color-fg": "#1f1f1b",
    "--mcp-color-muted": "#e7e6e2",
    "--mcp-color-muted-fg": "#4b4a44",
    "--mcp-color-border": "#d1d0ca",
    "--mcp-color-border-strong": "#b5b3ab",
    "--mcp-surface": "#ffffff",
    "--mcp-surface-alt": "#f0f0ec",
    "--mcp-color-primary": "#3b5ccc",
    "--mcp-color-primary-fg": "#f8f9ff",
    "--mcp-color-secondary": "#5b6478",
    "--mcp-color-secondary-fg": "#f5f7fb",
    "--mcp-color-accent": "#2f7f6b",
    "--mcp-color-accent-fg": "#f1fffb",
    "--mcp-color-success": "#2f7f6b",
    "--mcp-color-success-fg": "#f1fffb",
    "--mcp-color-warning": "#b26a1f",
    "--mcp-color-warning-fg": "#fff6ea",
    "--mcp-color-danger": "#b3343a",
    "--mcp-color-danger-fg": "#fff1f2",
    "--mcp-syntax-comment": "color-mix(in srgb, var(--mcp-color-muted-fg) 75%, var(--mcp-color-fg))",
    "--mcp-syntax-constant": "color-mix(in srgb, var(--mcp-color-accent) 70%, var(--mcp-color-fg))",
    "--mcp-syntax-keyword": "color-mix(in srgb, var(--mcp-color-primary) 75%, var(--mcp-color-fg))",
    "--mcp-syntax-entity": "color-mix(in srgb, var(--mcp-color-secondary) 70%, var(--mcp-color-fg))",
    "--mcp-syntax-tag": "color-mix(in srgb, var(--mcp-color-accent) 75%, var(--mcp-color-fg))",
    "--mcp-syntax-variable": "color-mix(in srgb, var(--mcp-color-fg) 85%, var(--mcp-color-muted-fg))",
    "--mcp-syntax-string": "color-mix(in srgb, var(--mcp-color-success) 75%, var(--mcp-color-fg))",
    "--mcp-syntax-number": "color-mix(in srgb, var(--mcp-color-warning) 75%, var(--mcp-color-fg))",
    "--mcp-syntax-operator": "color-mix(in srgb, var(--mcp-color-fg) 80%, var(--mcp-color-muted-fg))",
    "--mcp-syntax-punctuation": "color-mix(in srgb, var(--mcp-color-fg) 70%, var(--mcp-color-muted-fg))",
    "--mcp-font-sans": '"IBM Plex Sans", "Source Sans 3", "Assistant", "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
    "--mcp-font-serif": '"IBM Plex Serif", "Source Serif 4", "Noto Serif", serif',
    "--mcp-font-mono": '"IBM Plex Mono", "Source Code Pro", "Fira Mono", monospace',
    "--mcp-text-2xs": "0.625rem",
    "--mcp-text-xs": "0.75rem",
    "--mcp-text-s": "0.875rem",
    "--mcp-text-m": "1rem",
    "--mcp-text-l": "1.125rem",
    "--mcp-text-xl": "1.25rem",
    "--mcp-text-2xl": "1.5rem",
    "--mcp-leading-tight": "1.2",
    "--mcp-leading-normal": "1.5",
    "--mcp-leading-relaxed": "1.75",
    "--mcp-weight-regular": "400",
    "--mcp-weight-medium": "500",
    "--mcp-weight-bold": "700",
    "--mcp-space-3xs": "0.125rem",
    "--mcp-space-2xs": "0.25rem",
    "--mcp-space-xs": "0.375rem",
    "--mcp-space-s": "0.5rem",
    "--mcp-space-m": "0.75rem",
    "--mcp-space-l": "1rem",
    "--mcp-space-xl": "1.5rem",
    "--mcp-space-2xl": "2rem",
    "--mcp-radius-0": "0",
    "--mcp-radius-xs": "0.125rem",
    "--mcp-radius-s": "0.25rem",
    "--mcp-radius-m": "0.5rem",
    "--mcp-radius-l": "0.75rem",
    "--mcp-radius-xl": "1rem",
    "--mcp-radius-round": "9999px",
    "--mcp-shadow-none": "none",
    "--mcp-shadow-xs": "0 1px 2px rgba(0, 0, 0, 0.08)",
    "--mcp-shadow-s": "0 2px 6px rgba(0, 0, 0, 0.12)",
    "--mcp-shadow-m": "0 6px 16px rgba(0, 0, 0, 0.16)",
    "--mcp-shadow-l": "0 12px 32px rgba(0, 0, 0, 0.2)",
    "--mcp-layer-0": "0",
    "--mcp-layer-1": "10",
    "--mcp-layer-2": "20",
    "--mcp-layer-3": "30",
    "--mcp-layer-4": "40",
    "--mcp-duration-instant": "0ms",
    "--mcp-duration-fast": "120ms",
    "--mcp-duration-normal": "200ms",
    "--mcp-duration-slow": "320ms",
    "--mcp-ease-standard": "cubic-bezier(0.2, 0, 0, 1)",
    "--mcp-ease-emphasized": "cubic-bezier(0.2, 0, 0, 1.4)",
    "--mcp-ring": "0 0 0 2px",
    "--mcp-ring-color": "rgba(59, 92, 204, 0.2)"
  };
  var utilityCss = [".mcp-root{", `  ${serializeVariables(defaultVariables)}`, "  color: var(--mcp-color-fg);", "  background: var(--mcp-color-bg);", "  font-family: var(--mcp-font-sans);", "  font-size: var(--mcp-text-m);", "  line-height: var(--mcp-leading-normal);", "  font-weight: var(--mcp-weight-regular);", "  margin: 0;", "}", ".mcp-button{", "  display: inline-flex;", "  align-items: center;", "  justify-content: center;", "  gap: var(--mcp-space-2xs);", "  padding: var(--mcp-space-xs) var(--mcp-space-m);", "  border: 1px solid var(--mcp-color-border);", "  border-radius: var(--mcp-radius-m);", "  background: var(--mcp-color-bg);", "  color: var(--mcp-color-fg);", "  font-size: var(--mcp-text-s);", "  line-height: var(--mcp-leading-normal);", "  text-decoration: none;", "  cursor: pointer;", "  transition: background var(--mcp-duration-fast) var(--mcp-ease-standard), border-color var(--mcp-duration-fast) var(--mcp-ease-standard), transform var(--mcp-duration-fast) var(--mcp-ease-standard);", "}", ".mcp-button:where(:hover){", "  background: var(--mcp-color-muted);", "}", ".mcp-button:where(:active){", "  transform: translateY(1px);", "}", ".mcp-button:where(.active, [aria-pressed='true']){", "  filter: brightness(0.98);", "}", ".mcp-button-primary{", "  background: var(--mcp-color-primary);", "  color: var(--mcp-color-primary-fg);", "  border-color: var(--mcp-color-primary);", "}", ".mcp-button-primary:where(:hover){", "  filter: brightness(0.98);", "}", ".mcp-button-secondary{", "  background: var(--mcp-color-secondary);", "  color: var(--mcp-color-secondary-fg);", "  border-color: var(--mcp-color-secondary);", "}", ".mcp-button-ghost{", "  background: transparent;", "  border-color: transparent;", "}", ".mcp-button-danger{", "  background: var(--mcp-color-danger);", "  color: var(--mcp-color-danger-fg);", "  border-color: var(--mcp-color-danger);", "}", ".mcp-toolbar{", "  display: inline-flex;", "  align-items: center;", "  border: 1px solid var(--mcp-color-border);", "  border-radius: var(--mcp-radius-m);", "}", ".mcp-toolbar .mcp-button{", "  border: 0;", "  border-radius: 0;", "}", ".mcp-toolbar .mcp-button + .mcp-button{", "  border-left: 1px solid var(--mcp-color-border);", "}", ".mcp-toolbar .mcp-button:first-child{", "  border-top-left-radius: var(--mcp-radius-m);", "  border-bottom-left-radius: var(--mcp-radius-m);", "}", ".mcp-toolbar .mcp-button:last-child{", "  border-top-right-radius: var(--mcp-radius-m);", "  border-bottom-right-radius: var(--mcp-radius-m);", "}", ".mcp-toolbar .mcp-button:where(.active, [aria-pressed='true']){", "  position: relative;", "  z-index: 1;", "}", ".mcp-input, .mcp-textarea, .mcp-select{", "  width: 100%;", "  padding: var(--mcp-space-xs) var(--mcp-space-s);", "  border: 1px solid var(--mcp-color-border);", "  border-radius: var(--mcp-radius-s);", "  background: var(--mcp-color-bg);", "  color: var(--mcp-color-fg);", "  font-size: var(--mcp-text-s);", "  line-height: var(--mcp-leading-normal);", "}", ".mcp-input:where(:focus), .mcp-textarea:where(:focus), .mcp-select:where(:focus){", "  outline: none;", "  border-color: var(--mcp-color-primary);", "  box-shadow: var(--mcp-ring) var(--mcp-ring-color);", "}", ".mcp-label{", "  display: block;", "  margin-bottom: var(--mcp-space-3xs);", "  font-size: var(--mcp-text-xs);", "  color: var(--mcp-color-muted-fg);", "}", ".mcp-card{", "  background: var(--mcp-surface);", "  border: 1px solid var(--mcp-color-border);", "  border-radius: var(--mcp-radius-l);", "  padding: var(--mcp-space-l);", "  box-shadow: var(--mcp-shadow-xs);", "}", ".mcp-panel{", "  background: var(--mcp-surface);", "  border: 1px solid var(--mcp-color-border);", "  border-radius: var(--mcp-radius-l);", "  padding: var(--mcp-space-l);", "  box-shadow: var(--mcp-shadow-xs);", "}", ".mcp-field{", "  display: flex;", "  flex-direction: column;", "  gap: var(--mcp-space-3xs);", "}", ".mcp-divider{", "  height: 1px;", "  background: var(--mcp-color-border);", "  border: 0;", "}", ".mcp-surface{", "  background: var(--mcp-color-muted);", "  border-radius: var(--mcp-radius-m);", "  padding: var(--mcp-space-m);", "}", ".mcp-badge{", "  display: inline-flex;", "  align-items: center;", "  padding: 0 var(--mcp-space-xs);", "  border-radius: var(--mcp-radius-round);", "  background: var(--mcp-color-secondary);", "  color: var(--mcp-color-secondary-fg);", "  font-size: var(--mcp-text-2xs);", "  line-height: 1.6;", "}", ".mcp-tag{", "  display: inline-flex;", "  align-items: center;", "  padding: 0 var(--mcp-space-xs);", "  border-radius: var(--mcp-radius-s);", "  background: var(--mcp-color-muted);", "  color: var(--mcp-color-muted-fg);", "  font-size: var(--mcp-text-2xs);", "  line-height: 1.6;", "}", ".mcp-divider{", "  height: 1px;", "  background: var(--mcp-color-border);", "}", ".mcp-text-muted{", "  color: var(--mcp-color-muted-fg);", "}", ".mcp-title{", "  font-size: var(--mcp-text-xl);", "  line-height: var(--mcp-leading-tight);", "  font-weight: var(--mcp-weight-bold);", "}", ".mcp-subtitle{", "  font-size: var(--mcp-text-l);", "  line-height: var(--mcp-leading-normal);", "  font-weight: var(--mcp-weight-medium);", "  color: var(--mcp-color-muted-fg);", "}"].join("\n");
  function buildThemeCss(inputs) {
    const parts = [];
    const order = buildLayerOrder(inputs.layers);
    parts.push(`@layer ${order.join(", ")};`);
    parts.push(wrapLayer("mcp-default", utilityCss));
    const overrides = normalizeCssInput(inputs.css);
    if (overrides) {
      parts.push(wrapLayer("mcp-user", overrides));
    }
    return parts.join("\n\n");
  }
  function buildLayerOrder(layers) {
    const order = [];
    if (layers && layers.length > 0) {
      for (const layer of layers) {
        const trimmed = layer.trim();
        if (!trimmed)
          continue;
        if (!order.includes(trimmed))
          order.push(trimmed);
      }
    }
    for (let i = DEFAULT_LAYERS.length - 1; i >= 0; i -= 1) {
      const layer = DEFAULT_LAYERS[i];
      if (!order.includes(layer))
        order.unshift(layer);
    }
    return order;
  }
  function wrapLayer(name, css) {
    return `@layer ${name} {
${css}
}`;
  }
  function serializeVariables(vars) {
    return Object.entries(vars).map(([key, value]) => `${key}: ${value};`).join("\n  ");
  }
  function normalizeCssInput(input) {
    if (!input)
      return null;
    const value = input;
    if (!value)
      return null;
    if (typeof value === "string")
      return value;
    if (typeof value === "object") {
      const filtered = filterVariables(value);
      if (Object.keys(filtered).length === 0)
        return null;
      return `.mcp-root{${serializeVariables(filtered)}}`;
    }
    return null;
  }
  function filterVariables(vars) {
    const filtered = {};
    for (const [key, value] of Object.entries(vars)) {
      if (key.startsWith("--mcp-")) {
        filtered[key] = value;
      }
    }
    return filtered;
  }

  // src/mcp-view.ts
  var McpViewElement = class extends HTMLElement {
    constructor() {
      super();
      this._resolver = null;
      this._toolCaller = null;
      this._css = null;
      this._allowedOrigins = [];
      this._allowedRemote = null;
      this._data = null;
      this._layers = null;
      this._iframe = null;
      this._loadToken = 0;
      this._boundMessageHandler = (event) => this.handleMessage(event);
      const root = this.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = [":host{display:block;height:100%;width:100%;}", "iframe{width:100%;height:100%;border:0;}"].join("\n");
      root.appendChild(style);
      const iframe = document.createElement("iframe");
      iframe.setAttribute("sandbox", "allow-scripts");
      iframe.setAttribute("referrerpolicy", "no-referrer");
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "0";
      iframe.addEventListener("load", () => this.sendDataUpdate());
      root.appendChild(iframe);
      this._iframe = iframe;
    }
    static get observedAttributes() {
      return ["src", "theme", "base"];
    }
    connectedCallback() {
      window.addEventListener("message", this._boundMessageHandler);
      this.render();
    }
    disconnectedCallback() {
      window.removeEventListener("message", this._boundMessageHandler);
    }
    attributeChangedCallback(name) {
      if (name === "src" || name === "theme" || name === "base") {
        this.render();
      }
    }
    get resolver() {
      return this._resolver;
    }
    set resolver(value) {
      this._resolver = value;
      this.render();
    }
    get themeUrl() {
      return this.getAttribute("theme") || "";
    }
    get toolCaller() {
      return this._toolCaller;
    }
    set toolCaller(value) {
      this._toolCaller = value;
    }
    get base() {
      return this.getAttribute("base") || "";
    }
    set base(value) {
      if (value) {
        this.setAttribute("base", value);
      } else {
        this.removeAttribute("base");
      }
    }
    get src() {
      return this.getAttribute("src") || "";
    }
    set src(value) {
      if (value) {
        this.setAttribute("src", value);
      } else {
        this.removeAttribute("src");
      }
    }
    get allowedOrigins() {
      return this._allowedOrigins;
    }
    set allowedOrigins(value) {
      this._allowedOrigins = Array.isArray(value) ? value : [];
    }
    get allowedRemote() {
      return this._allowedRemote;
    }
    set allowedRemote(value) {
      this._allowedRemote = value;
    }
    get layers() {
      return this._layers;
    }
    set layers(value) {
      this._layers = Array.isArray(value) ? value : null;
      this.render();
    }
    get css() {
      return this._css;
    }
    set css(value) {
      this._css = value;
      this.render();
    }
    get data() {
      return this._data;
    }
    set data(value) {
      this._data = value;
      this.sendDataUpdate();
    }
    render() {
      if (!this.isConnected)
        return;
      const uri = this.getRootUri();
      if (!uri)
        return;
      void this.load(uri);
    }
    async load(uri) {
      const token = ++this._loadToken;
      const root = await this.resolveResource(uri, "document");
      if (!root.ok)
        return;
      const html = new TextDecoder().decode(root.body);
      const themeCss = buildThemeCss({ css: this._css, layers: this._layers });
      const bootstrapScript = getIframeBootstrapScript(this._data);
      const rewritten = rewriteHtml(
        {
          html,
          rootUri: uri,
          themeCss,
          themeLink: this.themeUrl || null,
          bootstrapScript,
          allowRemote: (url) => this.isRemoteAllowed(url)
        }
      );
      if (token !== this._loadToken)
        return;
      if (this._iframe) {
        this._iframe.srcdoc = rewritten;
      }
    }
    getRootUri() {
      return this.getAttribute("src") || "";
    }
    handleMessage(event) {
      if (!this._iframe || event.source !== this._iframe.contentWindow)
        return;
      const data = event.data;
      if (!data)
        return;
      if (data.type === "mcp:request") {
        const uri = typeof data.uri === "string" ? data.uri : "";
        const kind = data.kind || "document";
        const id = typeof data.id === "number" ? data.id : 0;
        if (!uri || !id) {
          console.error("[mcp] invalid request", { uri, id, kind });
          return;
        }
        const request = {
          id,
          uri,
          kind,
          source: event.source
        };
        void this.fulfillRequest(request);
        return;
      }
      if (data.type === "mcp:tool-call") {
        const id = typeof data.id === "number" ? data.id : 0;
        const params = data.params;
        const method = typeof data.method === "string" ? data.method : "tools/call";
        if (!id) {
          console.error("[mcp] invalid tool call", { id });
          return;
        }
        if (method !== "tools/call") {
          console.error("[mcp] unsupported tool method", { method });
          const message = {
            type: "mcp:tool-result",
            id,
            ok: false,
            error: `Unsupported tool method: ${method}`
          };
          this.postMessageToSource(event.source, message, []);
          return;
        }
        const request = { id, params, source: event.source };
        void this.fulfillToolCall(request);
      }
    }
    async fulfillRequest(request) {
      let response;
      try {
        response = await this.resolveResource(request.uri, request.kind);
      } catch (error) {
        response = {
          ok: false,
          mime: "text/plain",
          body: new Uint8Array(),
          error: error instanceof Error ? error.message : "Resolver error"
        };
      }
      if (!response.ok) {
        console.error("[mcp] resolve failed", { uri: request.uri, kind: request.kind, error: response.error || "Unknown error" });
      }
      const body = response.body || new Uint8Array();
      const buffer = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
      const message = {
        type: "mcp:response",
        id: request.id,
        ok: response.ok,
        mime: response.mime,
        body: buffer,
        error: response.error
      };
      this.postMessageToSource(request.source, message, [buffer]);
    }
    async fulfillToolCall(request) {
      let response;
      const caller = this._toolCaller;
      if (!caller) {
        response = { ok: false, error: "No tool caller" };
      } else {
        try {
          const result = await caller(request.params);
          response = { ok: true, result };
        } catch (error) {
          response = { ok: false, error: error instanceof Error ? error.message : "Tool call failed" };
        }
      }
      if (!response.ok) {
        console.error("[mcp] tool call failed", { error: response.error || "Unknown error" });
      }
      const message = {
        type: "mcp:tool-result",
        id: request.id,
        ok: response.ok,
        result: response.result,
        error: response.error
      };
      this.postMessageToSource(request.source, message, []);
    }
    async resolveResource(uri, kind) {
      if (uri.startsWith("ui://")) {
        const resolver = this.getActiveResolver();
        if (!resolver) {
          return {
            ok: false,
            mime: "text/plain",
            body: new Uint8Array(),
            error: "No resolver"
          };
        }
        const result = await normalizeResolverResult(await resolver(uri), kind, uri);
        return result;
      }
      if (uri.startsWith("http://") || uri.startsWith("https://")) {
        if (!this.isRemoteAllowed(uri)) {
          return {
            ok: false,
            mime: "text/plain",
            body: new Uint8Array(),
            error: "Remote blocked"
          };
        }
        try {
          const res = await fetch(uri);
          const normalized = await normalizeResolverResult(res, kind, uri);
          return normalized;
        } catch (error) {
          return {
            ok: false,
            mime: "text/plain",
            body: new Uint8Array(),
            error: error instanceof Error ? error.message : "Remote fetch failed"
          };
        }
      }
      return {
        ok: false,
        mime: inferMime(kind, uri),
        body: new Uint8Array(),
        error: "Unsupported URI"
      };
    }
    isRemoteAllowed(url) {
      if (this._allowedRemote) {
        return this._allowedRemote(url);
      }
      if (!this._allowedOrigins.length)
        return false;
      try {
        const parsed = new URL(url);
        return this._allowedOrigins.some(
          (origin) => {
            if (origin.includes("://")) {
              return parsed.origin === origin;
            }
            return parsed.hostname === origin;
          }
        );
      } catch {
        return false;
      }
    }
    postMessageToSource(source, message, transfer = []) {
      if (!source) {
        console.error("[mcp] missing message source", message);
        return;
      }
      const postMessage = source.postMessage;
      if (typeof postMessage !== "function") {
        console.error("[mcp] invalid message source", source);
        return;
      }
      try {
        source.postMessage(message, "*", transfer);
        return;
      } catch (error) {
        try {
          source.postMessage(message, transfer);
        } catch (fallbackError) {
          console.error("[mcp] postMessage failed", { error, fallbackError });
        }
      }
    }
    sendDataUpdate() {
      if (!this._iframe || !this._iframe.contentWindow)
        return;
      this._iframe.contentWindow.postMessage({ type: "mcp-data:update", payload: this._data }, "*");
    }
    getActiveResolver() {
      if (this._resolver)
        return this._resolver;
      const base = this.base || DEFAULT_BASE;
      return this.buildDefaultResolver(base);
    }
    buildDefaultResolver(base) {
      const resolvedBase = resolveBaseUrl(base);
      return async (uri) => {
        const url = buildResolverUrl(resolvedBase, uri);
        return fetch(url);
      };
    }
  };
  var DEFAULT_BASE = "/mcp/resources/";
  function resolveBaseUrl(base) {
    if (!base)
      return base;
    if (typeof window === "undefined" || !window.location)
      return base;
    try {
      return new URL(base, window.location.href).toString();
    } catch {
      return base;
    }
  }
  function buildResolverUrl(base, uri) {
    const path = stripUiScheme(uri);
    if (base.includes("{path}")) {
      return base.split("{path}").join(encodeURI(path));
    }
    if (base.includes("{uri}")) {
      return base.split("{uri}").join(encodeURIComponent(uri));
    }
    if (base.includes("?")) {
      return `${base}&uri=${encodeURIComponent(uri)}`;
    }
    if (base.endsWith("/")) {
      return `${base}${encodeURI(path)}`;
    }
    return `${base}/${encodeURI(path)}`;
  }
  function stripUiScheme(uri) {
    if (!uri.startsWith("ui://"))
      return uri;
    return uri.slice("ui://".length);
  }
  function defineMcpView() {
    if (!customElements.get("mcp-view")) {
      customElements.define("mcp-view", McpViewElement);
    }
  }

  // src/index.ts
  if (typeof window !== "undefined" && "customElements" in window) {
    defineMcpView();
  }
  return __toCommonJS(src_exports);
})();
//# sourceMappingURL=mcp-view.umd.js.map
