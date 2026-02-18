import { normalizeResolverResult, inferMime, type ResourceKind } from "./bridge";
import { getIframeBootstrapScript } from "./iframe-bootstrap";
import { rewriteHtml } from "./rewrite";
import { buildThemeCss, type CssInput } from "./theme";
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
	error?: string;
};
export class McpViewElement extends HTMLElement {
	static get observedAttributes(): string[] {
		return ["src", "theme", "base"];
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
	private _layers: string[] | null = null
	;
	private _iframe: HTMLIFrameElement | null = null
	;
	private _loadToken = 0
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
		iframe.addEventListener("load", () => this.sendDataUpdate());
		root.appendChild(iframe);
		this._iframe = iframe;
	}
	connectedCallback(): void {
		window.addEventListener("message", this._boundMessageHandler);
		this.render();
	}
	disconnectedCallback(): void {
		window.removeEventListener("message", this._boundMessageHandler);
	}
	attributeChangedCallback(name: string): void {
		if (name === "src" || name === "theme" || name === "base") {
			this.render();
		}
	}
	get resolver(): Resolver | null {
		return this._resolver;
	}
	set resolver(value: Resolver | null) {
		this._resolver = value;
		this.render();
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
		this.render();
	}
	get css(): CssInput | null {
		return this._css;
	}
	set css(value: CssInput | null) {
		this._css = value;
		this.render();
	}
	get data(): unknown {
		return this._data;
	}
	set data(value: unknown) {
		this._data = value;
		this.sendDataUpdate();
	}
	private render(): void {
		if (!this.isConnected) return;
		const uri = this.getRootUri();
		if (!uri) return;
		void this.load(uri);
	}
	private async load(uri: string): Promise<void> {
		const token = ++this._loadToken;
		const root = await this.resolveResource(uri, "document");
		if (!root.ok) return;
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
				response = { ok: true, result };
			}
			catch (error) {
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
		this._iframe.contentWindow.postMessage({ type: "mcp-data:update", payload: this._data }, "*");
	}
	private getActiveResolver(): Resolver | null {
		if (this._resolver) return this._resolver;
		const base = this.base || DEFAULT_BASE;
		return this.buildDefaultResolver(base);
	}
	private buildDefaultResolver(base: string): Resolver {
		const resolvedBase = resolveBaseUrl(base);
		return async(uri) => {
			const url = buildResolverUrl(resolvedBase, uri);
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
