type RewriteOptions = {
	html: string;
	rootUri?: string | null;
	themeCss: string;
	themeLink?: string | null;
	bootstrapScript: string;
	allowRemote: (url: string) => boolean;
};
const BLOCKED_ATTR = "data-mcp-blocked";
export function rewriteHtml(options: RewriteOptions): string {
	const parser = new DOMParser();
	const doc = parser.parseFromString(options.html, "text/html");
	addRootClass(doc.documentElement, "mcp-root");
	if (doc.body) addRootClass(doc.body, "mcp-root");
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
	let bootstrapAnchor: ChildNode | null = themeStyle.nextSibling;
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
	return `${doctype}\n${doc.documentElement.outerHTML}`;
}
function rewriteElement(doc: Document, tagName: string, attrName: string, replacementTag: string, options: RewriteOptions): void {
	const elements = Array.from(doc.getElementsByTagName(tagName));
	for (const el of elements) {
		const raw = el.getAttribute(attrName);
		if (!raw) continue;
		const info = resolveUrl(raw, options.rootUri || undefined);
		if (!info) continue;
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
function resolveUrl(raw: string, base?: string): { url: string; scheme: string } | null {
	const value = raw.trim();
	if (!value) return null;
	if (value.startsWith("#")) return null;
	const schemeMatch = value.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:/);
	if (schemeMatch) {
		const scheme = schemeMatch[0].slice(0, -1).toLowerCase();
		if (isIgnoredScheme(scheme)) return null;
		return { url: value, scheme };
	}
	if (!base) return null;
	try {
		const resolved = new URL(value, base).toString();
		const scheme = new URL(resolved).protocol.replace(":", "").toLowerCase();
		if (isIgnoredScheme(scheme)) return null;
		return { url: resolved, scheme };
	}
	catch {
		return null;
	}
}
function isIgnoredScheme(scheme: string): boolean {
	return ["data", "blob", "mailto", "tel", "javascript", "about"].includes(scheme);
}
function copyAttributes(from: Element, to: Element): void {
	for (const attr of Array.from(from.attributes)) {
		to.setAttribute(attr.name, attr.value);
	}
}
function addRootClass(el: Element | null, className: string): void {
	if (!el) return;
	const existing = el.getAttribute("class");
	if (!existing) {
		el.setAttribute("class", className);
		return;
	}
	const classes = new Set(existing.split(/\s+/).filter(Boolean));
	classes.add(className);
	el.setAttribute("class", Array.from(classes).join(" "));
}
function ensureHead(doc: Document): HTMLHeadElement {
	if (doc.head) return doc.head;
	const head = doc.createElement("head");
	const html = doc.documentElement;
	if (html.firstChild) {
		html.insertBefore(head, html.firstChild);
	}
	else {
		html.appendChild(head);
	}
	return head;
}
function buildThemeLink(doc: Document, url: string, options: RewriteOptions): HTMLElement | null {
	const trimmed = url.trim();
	const info = trimmed.startsWith("ui://") ? resolveUrl(trimmed, options.rootUri || undefined) : resolveUrlWithWindow(trimmed);
	if (!info) return null;
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
function resolveUrlWithWindow(raw: string): { url: string; scheme: string } | null {
	if (typeof window === "undefined" || !window.location) return null;
	try {
		const resolved = new URL(raw, window.location.href).toString();
		const scheme = new URL(resolved).protocol.replace(":", "").toLowerCase();
		if (isIgnoredScheme(scheme)) return null;
		return { url: resolved, scheme };
	}
	catch {
		return null;
	}
}
