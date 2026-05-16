import { normalizeResolverResult, inferMime, type ResourceKind } from "./bridge";
import { getIframeBootstrapScript } from "./iframe-bootstrap";
import { rewriteHtml } from "./rewrite";
import { buildThemeCss, mcpAppsDefaultVariables, type CssInput } from "./theme";
export type ResolverResult = Response | Blob | string | ArrayBuffer | Uint8Array;
export type Resolver = (uri: string) => Promise<ResolverResult>;
export type ToolCaller = (params: unknown) => Promise<unknown>;
type PendingRequest = {
	id: number;
	uri: string;
	kind: ResourceKind;
	source: MessageEventSource | null;
};
type PendingToolCall = {
	id: number;
	params: unknown;
	source: MessageEventSource | null;
};
type ResolveResult = {
	ok: boolean;
	mime: string;
	body: Uint8Array;
	error?: string;
};
type ToolResult = {
	ok: boolean;
	result?: unknown;
	structuredContent?: unknown;
	content?: unknown;
	_meta?: unknown;
	isError?: boolean;
	error?: string;
};
export class McpViewElement extends HTMLElement {
	static get observedAttributes(): string[] {
		return ["src", "theme", "base", "resource-base", "auto-height", "max-height", "defer"];
	}
	private _resolver: Resolver | null = null
	;
	private _toolCaller: ToolCaller | null = null
	;
	private _css: CssInput | null = null
	;
	private _allowedOrigins: string[] = []
	;
	private _allowedRemote: ((url: string) => boolean) | null = null
	;
	private _data: unknown = null
	;
	private _toolResult: unknown = null
	;
	private _connected = false
	;
	private _hostContext: Record<string, unknown> = {
		theme: "light",
		styles: {
			variables: { ...mcpAppsDefaultVariables },
			css: {}
		}
	}
	;
	private _csp: string | null = null
	;
	private _layers: string[] | null = null
	;
	private _iframe: HTMLIFrameElement | null = null
	;
	private _loadToken = 0
	;
	private _renderScheduled = false
	;
	private _boundMessageHandler = (event: MessageEvent) => this.handleMessage(event)
	;
	constructor() {
		super();
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
		iframe.addEventListener("load", () => {
			this._connected = false;
			this.sendDataUpdate();
		});
		root.appendChild(iframe);
		this._iframe = iframe;
	}
	connectedCallback(): void {
		window.addEventListener("message", this._boundMessageHandler);
		console.info("[mcp] view connected", { src: this.getAttribute("src"), resourceBase: this.resourceBase || null });
		this.scheduleRender();
	}
	disconnectedCallback(): void {
		window.removeEventListener("message", this._boundMessageHandler);
	}
	attributeChangedCallback(name: string): void {
		if (name === "src" || name === "theme" || name === "base" || name === "resource-base") {
			this.scheduleRender();
			return;
		}
		if (name === "auto-height") {
			this.scheduleRender();
		}
	}
	get resolver(): Resolver | null {
		return this._resolver;
	}
	set resolver(value: Resolver | null) {
		this._resolver = value;
		this.scheduleRender();
	}
	get themeUrl(): string {
		return this.getAttribute("theme") || "";
	}
	get toolCaller(): ToolCaller | null {
		return this._toolCaller;
	}
	set toolCaller(value: ToolCaller | null) {
		this._toolCaller = value;
	}
	get base(): string {
		return this.getAttribute("base") || "";
	}
	set base(value: string) {
		if (value) {
			this.setAttribute("base", value);
		}
		else {
			this.removeAttribute("base");
		}
	}
	get resourceBase(): string {
		return this.getAttribute("resource-base") || "";
	}
	set resourceBase(value: string) {
		if (value) {
			this.setAttribute("resource-base", value);
		}
		else {
			this.removeAttribute("resource-base");
		}
	}
	get src(): string {
		return this.getAttribute("src") || "";
	}
	set src(value: string) {
		if (value) {
			this.setAttribute("src", value);
		}
		else {
			this.removeAttribute("src");
		}
	}
	get allowedOrigins(): string[] {
		return this._allowedOrigins;
	}
	set allowedOrigins(value: string[]) {
		this._allowedOrigins = Array.isArray(value) ? value : [];
	}
	get allowedRemote(): ((url: string) => boolean) | null {
		return this._allowedRemote;
	}
	set allowedRemote(value: ((url: string) => boolean) | null) {
		this._allowedRemote = value;
	}
	get layers(): string[] | null {
		return this._layers;
	}
	set layers(value: string[] | null) {
		this._layers = Array.isArray(value) ? value : null;
		this.scheduleRender();
	}
	get css(): CssInput | null {
		return this._css;
	}
	set css(value: CssInput | null) {
		this._css = value;
		this.scheduleRender();
	}
	get data(): unknown {
		return this._data;
	}
	set data(value: unknown) {
		this._data = value;
		this.sendDataUpdate();
	}
	get hostTheme(): string | null {
		return typeof (this._hostContext as Record<string, unknown> | null)?.theme === "string"
			? String((this._hostContext as Record<string, unknown>).theme)
			: null;
	}
	set hostTheme(value: string | null) {
		const next = value === "light" || value === "dark" ? value : null;
		this.updateHostContext({ theme: next });
	}
	get hostStyleVariables(): Record<string, string> | null {
		const styles = (this._hostContext as { styles?: { variables?: Record<string, string> | null } | null } | null)?.styles;
		return styles?.variables || null;
	}
	set hostStyleVariables(value: Record<string, string> | null) {
		this.updateHostContext({ styles: { variables: value || null } });
	}
	get hostFonts(): string | null {
		const styles = (this._hostContext as { styles?: { css?: { fonts?: string | null } | null } | null } | null)?.styles;
		return styles?.css?.fonts || null;
	}
	set hostFonts(value: string | null) {
		this.updateHostContext({ styles: { css: { fonts: value || null } } });
	}
	get csp(): string | null {
		return this._csp;
	}
	set csp(value: string | null) {
		this._csp = value;
		this.scheduleRender();
	}
	get deferRender(): boolean {
		return this.readBooleanAttribute("defer");
	}
	set deferRender(value: boolean) {
		if (value) {
			this.setAttribute("defer", "true");
		}
		else {
			this.removeAttribute("defer");
		}
	}
	get toolResult(): unknown {
		return this._toolResult;
	}
	set toolResult(value: unknown) {
		this._toolResult = value;
		this.sendToolResult();
	}
	get autoHeight(): boolean {
		return this.readBooleanAttribute("auto-height");
	}
	set autoHeight(value: boolean) {
		if (value) {
			this.setAttribute("auto-height", "true");
		}
		else {
			this.removeAttribute("auto-height");
		}
	}
	get maxHeight(): number | null {
		const raw = this.getAttribute("max-height");
		if (!raw) return null;
		const parsed = Number(raw);
		if (!Number.isFinite(parsed) || parsed <= 0) return null;
		return parsed;
	}
	private scheduleRender(): void {
		if (!this.isConnected) return;
		if (this.deferRender) return;
		if (this._renderScheduled) return;
		this._renderScheduled = true;
		window.requestAnimationFrame(
			() => {
				this._renderScheduled = false;
				this.render();
			}
		);
	}
	public render(): void {
		if (!this.isConnected) return;
		const uri = this.getRootUri();
		if (!uri) return;
		console.info("[mcp] render", { uri });
		void this.load(uri);
	}
	private async load(uri: string): Promise<void> {
		const token = ++this._loadToken;
		const root = await this.resolveResource(uri, "document");
		if (!root.ok) return;
		console.info("[mcp] load", { uri, mime: root.mime, size: root.body?.length ?? 0 });
		const html = new TextDecoder().decode(root.body);
		const hostVariables = (this._hostContext as { styles?: { variables?: Record<string, string> } } | null)?.styles
			?.variables || null;
		const themeCss = buildThemeCss({ css: this._css, layers: this._layers, hostVariables });
		const bootstrapScript = getIframeBootstrapScript(this._data, { autoHeight: this.autoHeight });
		const rewritten = rewriteHtml(
			{
				html,
				rootUri: uri,
				themeCss,
				themeLink: this.themeUrl || null,
				bootstrapScript,
				allowRemote: (url) => this.isRemoteAllowed(url),
				resourceBase: this.resourceBase || null,
				csp: this._csp
			}
		);
		if (token !== this._loadToken) return;
		if (this._iframe) {
			this._iframe.srcdoc = rewritten;
		}
	}
	private getRootUri(): string {
		return this.getAttribute("src") || "";
	}
	private handleMessage(event: MessageEvent): void {
		if (!this._iframe || event.source !== this._iframe.contentWindow) return;
		const data = event.data;
		if (!data) return;
		if (data.type === "mcp:request") {
			const uri = typeof data.uri === "string" ? data.uri : "";
			const kind = (data.kind as ResourceKind) || "document";
			const id = typeof data.id === "number" ? data.id : 0;
			if (!uri || !id) {
				console.error("[mcp] invalid request", { uri, id, kind });
				return;
			}
			const request: PendingRequest = {
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
			const request: PendingToolCall = { id, params, source: event.source };
			void this.fulfillToolCall(request);
			return;
		}
		if (data.type === "mcp:height") {
			if (!this.autoHeight) return;
			const height = typeof data.height === "number" ? data.height : 0;
			if (!Number.isFinite(height) || height <= 0) return;
			const maxHeight = this.maxHeight;
			const nextHeight = maxHeight ? Math.min(height, maxHeight) : height;
			this.style.height = `${Math.ceil(nextHeight)}px`;
			return;
		}
		if (data.type === "mcp:connect") {
			const id = typeof data.id === "number" ? data.id : 0;
			if (!id) {
				console.error("[mcp] invalid connect", { id });
				return;
			}
			this._connected = true;
			console.info("[mcp] connect", { id });
			this.postMessageToSource(
				event.source,
				{
					type: "mcp:connect-result",
					id,
					ok: true,
					hostCapabilities: {
						callServerTool: true,
						sendMessage: true,
						toolInput: true,
						toolResult: true,
						data: true,
						hostContext: true,
						styles: true
					},
					hostContext: this._hostContext
				},
				[]
			);
			this.sendHostContext();
			this.sendToolInput();
			this.sendToolResult();
			return;
		}
		if (data.type === "mcp:send-message") {
			const id = typeof data.id === "number" ? data.id : 0;
			if (!id) {
				console.error("[mcp] invalid send message", { id });
				return;
			}
			this.postMessageToSource(event.source, { type: "mcp:send-message-result", id, ok: true }, []);
			return;
		}
	}
	private async fulfillRequest(request: PendingRequest): Promise<void> {
		let response: ResolveResult;
		try {
			response = await this.resolveResource(request.uri, request.kind);
		}
		catch (error) {
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
	private async fulfillToolCall(request: PendingToolCall): Promise<void> {
		let response: ToolResult;
		const caller = this._toolCaller;
		if (!caller) {
			response = { ok: false, error: "No tool caller" };
		}
		else {
			try {
				const result = await caller(request.params);
				if (result && typeof result === "object" && !Array.isArray(result)) {
					response = { ok: true, ...(result as Record<string, unknown>) };
				}
				else {
					response = { ok: true, result };
				}
			}
			catch (error) {
				response = { ok: false, error: error instanceof Error ? error.message : "Tool call failed" };
			}
		}
		if (!response.ok) {
			console.error("[mcp] tool call failed", { error: response.error || "Unknown error" });
		}
		const envelope = {
			result: response.result,
			structuredContent: response.structuredContent,
			content: response.content,
			_meta: response._meta,
			isError: response.isError
		};
		const message = {
			type: "mcp:tool-result",
			id: request.id,
			ok: response.ok,
			...envelope,
			error: response.error
		};
		this.postMessageToSource(request.source, message, []);
	}
	private async resolveResource(uri: string, kind: ResourceKind): Promise<ResolveResult> {
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
			}
			catch (error) {
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
	private isRemoteAllowed(url: string): boolean {
		if (this._allowedRemote) {
			return this._allowedRemote(url);
		}
		if (!this._allowedOrigins.length) return false;
		try {
			const parsed = new URL(url);
			return this._allowedOrigins
				.some(
					(origin) => {
						if (origin.includes("://")) {
							return parsed.origin === origin;
						}
						return parsed.hostname === origin;
					}
				);
		}
		catch {
			return false;
		}
	}
	private postMessageToSource(source: MessageEventSource | null, message: unknown, transfer: Transferable[] = []): void {
		if (!source) {
			console.error("[mcp] missing message source", message);
			return;
		}
		const postMessage = (source as { postMessage?: unknown }).postMessage;
		if (typeof postMessage !== "function") {
			console.error("[mcp] invalid message source", source);
			return;
		}
		try {
			(source as Window).postMessage(message, "*", transfer);
			return;
		}
		catch (error) {
			try {
				(source as MessagePort).postMessage(message, transfer);
			}
			catch (fallbackError) {
				console.error("[mcp] postMessage failed", { error, fallbackError });
			}
		}
	}
	private sendDataUpdate(): void {
		if (!this._iframe || !this._iframe.contentWindow) return;
		console.info("[mcp] data update", { connected: this._connected });
		this._iframe.contentWindow.postMessage({ type: "mcp-data:update", payload: this._data }, "*");
		this.sendHostContext();
		this.sendToolInput();
		this.sendToolResult();
	}
	private sendHostContext(): void {
		if (!this._connected || !this._iframe || !this._iframe.contentWindow) return;
		this._iframe.contentWindow.postMessage({ type: "mcp:host-context-changed", context: this._hostContext }, "*");
	}
	private updateHostContext(update: {
		theme?: string | null;
		styles?: {
			variables?: Record<string, string> | null;
			css?: { fonts?: string | null } | null;
		} | null;
	}): void {
		const next: Record<string, unknown> = { ...(this._hostContext || {}) };
		if (Object.prototype.hasOwnProperty.call(update, "theme")) {
			if (update.theme) {
				next.theme = update.theme;
			}
			else {
				delete next.theme;
			}
		}
		if (Object.prototype.hasOwnProperty.call(update, "styles")) {
			const currentStyles = (next.styles as Record<string, unknown> | null) || {};
			const nextStyles: Record<string, unknown> = { ...currentStyles };
			const styles = update.styles;
			if (styles && Object.prototype.hasOwnProperty.call(styles, "variables")) {
				const mergedVariables = { ...mcpAppsDefaultVariables, ...(styles.variables || {}) };
				nextStyles.variables = mergedVariables;
			}
			if (styles && Object.prototype.hasOwnProperty.call(styles, "css")) {
				const currentCss = (nextStyles.css as Record<string, unknown> | null) || {};
				const nextCss: Record<string, unknown> = { ...currentCss };
				if (styles.css && Object.prototype.hasOwnProperty.call(styles.css, "fonts")) {
					if (styles.css.fonts) {
						nextCss.fonts = styles.css.fonts;
					}
					else {
						delete nextCss.fonts;
					}
				}
				if (Object.keys(nextCss).length > 0) {
					nextStyles.css = nextCss;
				}
				else {
					delete nextStyles.css;
				}
			}
			if (Object.keys(nextStyles).length > 0) {
				next.styles = nextStyles;
			}
			else {
				delete next.styles;
			}
		}
		this._hostContext = next;
		this.sendHostContext();
	}
	private sendToolInput(): void {
		if (!this._connected || !this._iframe || !this._iframe.contentWindow) return;
		console.info("[mcp] tool input", { hasInput: this._data != null });
		this._iframe.contentWindow.postMessage({ type: "mcp:tool-input", input: this._data }, "*");
	}
	private sendToolResult(): void {
		if (!this._connected || !this._iframe || !this._iframe.contentWindow) return;
		const result = this._toolResult;
		if (result === undefined || result === null) return;
		console.info("[mcp] send tool result", { resultType: typeof result });
		if (result && typeof result === "object" && !Array.isArray(result)) {
			this._iframe.contentWindow.postMessage({ type: "mcp:tool-result", id: 0, ok: true, ...(result as Record<string, unknown>) }, "*");
			return;
		}
		this._iframe.contentWindow.postMessage({ type: "mcp:tool-result", id: 0, ok: true, result }, "*");
	}
	private readBooleanAttribute(name: string): boolean {
		const raw = this.getAttribute(name);
		if (raw === null) return false;
		if (raw === "") return true;
		const normalized = raw.toLowerCase().trim();
		if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") return true;
		return false;
	}
	private getActiveResolver(): Resolver | null {
		if (this._resolver) return this._resolver;
		const base = this.resourceBase || this.base || DEFAULT_BASE;
		return this.buildDefaultResolver(base);
	}
	private buildDefaultResolver(base: string): Resolver {
		return async(uri) => {
			const url = resolveBaseUrl(buildResolverUrl(base, uri));
			return fetch(url);
		};
	}
}
const DEFAULT_BASE = "/mcp/resources/";
function resolveBaseUrl(base: string): string {
	if (!base) return base;
	if (typeof window === "undefined" || !window.location) return base;
	try {
		return new URL(base, window.location.href).toString();
	}
	catch {
		return base;
	}
}
function buildResolverUrl(base: string, uri: string): string {
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
function stripUiScheme(uri: string): string {
	if (!uri.startsWith("ui://")) return uri;
	return uri.slice("ui://".length);
}
export function defineMcpView(): void {
	if (!customElements.get("mcp-view")) {
		customElements.define("mcp-view", McpViewElement);
	}
}
