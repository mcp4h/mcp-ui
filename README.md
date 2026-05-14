# MCP UI

Minimal web component host for loading MCP-related UI content into a sandboxed iframe using srcdoc and a message-based resource/toolcall bridge.

## Features

- Native web components (no framework dependencies).
- `<mcp-view>` resolves `ui://` resources via your resolver.
- By default, HTML is rewritten to use `mcp-*` components for resource loading.
- Optional `resource-base` mode rewrites `ui://` assets to native browser-loadable URLs.
- Iframe bootstraps a small bridge script and utility CSS.
- Theme system with `--mcp-` variables and built-in `.mcp-*` utility classes.
- Remote allowlist support for optional https/http resources.
- Optional autoheight mode for content-driven sizing.

## Install

```bash
npm install mcp-view
```

## Basic usage (ESM)

```html
<script type="module">
	import "mcp-view";
</script>
<mcp-view
	src="ui://index.html"
	base="/mcp/resources/"
	style="display:block; width: 100%; height: 420px;"></mcp-view>
```

## Basic usage (UMD)

```html
<script src="./dist/mcp-view.umd.min.js"></script>
<mcp-view
	src="ui://index.html"
	base="/mcp/resources/"
	style="display:block; width: 100%; height: 420px;"></mcp-view>
```

The default fetch resolver uses `base` (or `/mcp/resources/` when omitted).

## Native resource loading with `resource-base`

By default, `mcp-ui` loads `ui://` scripts, styles, and media through its message bridge.

If you provide `resource-base`, `mcp-ui` keeps native tags like `<script>`, `<link>`, and `<img>` in the iframe document and rewrites `ui://` URLs to browser-loadable URLs instead. If no custom `resolver` is set, `resource-base` is also used as the default resolver for the root `src` document.

```html
<mcp-view
	src="ui://index.html"
	resource-base="/mcp/resources?uri={uri}"></mcp-view>
```

This is the recommended mode when you want better compatibility with existing MCP Apps, especially for normal script loading and module imports.

`resource-base` supports the same URL patterns as `base`:

- `{path}` replaces the stripped `ui://` path
- `{uri}` replaces the full encoded `ui://` URI
- if the value contains `?`, `&uri=` is appended
- otherwise the stripped path is appended to the base path

If `resource-base` is not set, `mcp-ui` keeps the legacy bridge-based loader for backwards compatibility.

## Deferring initial render

If the host needs to set properties like `css`, `csp`, `resolver`, or `toolCaller` before the iframe loads, you can defer the initial render.

```html
<mcp-view
	defer
	src="ui://review/index.html"
	resource-base="/mcp/resources?uri={uri}"></mcp-view>
```

Then, after you set properties, call `render()` once:

```js
const view = document.querySelector("mcp-view");
view.css = { "--mcp-color-bg": "#111" };
view.csp = "default-src 'none'; style-src 'unsafe-inline'";
view.resolver = async(uri) => fetch(`/mcp/resources?uri=${encodeURIComponent(uri)}`);
view.render();
```

## Theming

The component injects default CSS variables and utility classes first, then your overrides.

### Theme URL (attribute)

```html
<mcp-view theme="https://example.com/theme.css"></mcp-view>
```

`theme` is loaded as a stylesheet link. For `ui://` URLs it uses the legacy resolver bridge by default, or `resource-base` when native resource loading is enabled. For http/https it is always allowed and does not require manual allowlisting. Relative URLs resolve against the host page.

### CSS override (property)

```js
view.css = `.mcp-button { border-radius: 999px; }`;
```

### CSS variables (object)

```js
view.css = {
  "--mcp-color-primary": "#2d5bff",
  "--mcp-color-bg": "#ffffff",
};
```

Functions are not supported for `css`; pass a string or variables object.

### Syntax variables

Default syntax highlighting tokens are provided as CSS variables:

- `--mcp-syntax-comment`
- `--mcp-syntax-constant`
- `--mcp-syntax-keyword`
- `--mcp-syntax-entity`
- `--mcp-syntax-tag`
- `--mcp-syntax-variable`
- `--mcp-syntax-string`
- `--mcp-syntax-number`
- `--mcp-syntax-operator`
- `--mcp-syntax-punctuation`

### Toolbar utility

```html
<div class="mcp-toolbar">
	<button class="mcp-button mcp-button-secondary">One</button>
	<button class="mcp-button mcp-button-secondary active" aria-pressed="true">Two</button>
	<button class="mcp-button mcp-button-secondary">Three</button>
</div>
```

## Passing data to the iframe

Set the `data` property on the host. The iframe can access `window.mcpData` and listen for `mcp-data` events.

```js
view.data = { input: "hello", output: null };
```

## Passing a completed tool result to the iframe

If the host already has a completed MCP tool result and wants to render UI after the tool call, set the `toolResult` property on the host. The iframe receives it through the same guest-side result handlers used for live tool calls:

- `window.mcp.ontoolresult`
- `app.ontoolresult`

```js
view.toolResult = {
  content: [{ type: "text", text: "Rendered in the app" }],
  structuredContent: { items: [] },
  _meta: { some: "value" },
  isError: false,
};
```

This is intended for practical MCP Apps compatibility for embedded apps: the app receives the same result envelope shape it would normally see after a tool call, without needing to replay the tool call from inside the iframe.

This is not full wire-level MCP Apps protocol compliance yet. Internally, `mcp-ui` still uses its own bridge messages such as `mcp:tool-result` rather than emitting the exact MCP Apps JSON-RPC notification names.

## Autoheight

Enable the iframe to report its content height so the host element resizes itself:

```html
<mcp-view src="ui://index.html" auto-height="true"></mcp-view>
```

You can cap the height with `max-height` (pixels):

```html
<mcp-view src="ui://index.html" auto-height="true" max-height="800"></mcp-view>
```

Note: if your content sets `html, body { height: 100%; }` or `min-height: 100%`, the reported height may stay at least the viewport height.

## MCP Apps compatibility

The iframe bridge now exposes an MCP Apps-style guest API.

Important distinction:

- `mcp-ui` aims for practical MCP Apps compatibility at the app boundary: embedded apps can use MCP Apps-style APIs and receive MCP-style result envelopes including `structuredContent`.
- `mcp-ui` does not yet claim full wire-level MCP Apps protocol compliance. The internal host/iframe bridge still uses `postMessage` message types such as `mcp:tool-result`, `mcp:tool-input`, and `mcp:connect`.

The current goal is that existing MCP Apps-compatible client code inside the iframe can run correctly. Exact protocol and notification naming can be aligned later if needed.

The iframe bridge now exposes an MCP Apps-style guest API:

```js
const app = new App({ name: "My App", version: "1.0.0" });
await app.connect();
```

Supported guest-side APIs:

- `app.connect()`
- `app.callServerTool(...)`
- `app.sendMessage(...)`
- `app.ontoolinput`
- `app.ontoolresult`
- `app.onhostcontextchanged`
- `app.getHostContext()`

Helper functions are also available in the iframe and from the package export:

- `applyHostStyleVariables(...)`
- `applyHostFonts(...)`
- `applyDocumentTheme(...)`

The older `window.mcp.*` API still exists as a compatibility layer, but new clients should prefer the `App` API.

## Host styles and CSS variables

`mcp-ui` now supports MCP Apps-style host theming via host context:

- `hostContext.theme`
- `hostContext.styles.variables`
- `hostContext.styles.css.fonts`

Inside the iframe, apps can apply them like this:

```js
const app = new App({ name: "My App", version: "1.0.0" });
app.onhostcontextchanged = (ctx) => {
	if (ctx.theme) {
		applyDocumentTheme(ctx.theme);
	}
	if (ctx.styles?.variables) {
		applyHostStyleVariables(ctx.styles.variables);
	}
	if (ctx.styles?.css?.fonts) {
		applyHostFonts(ctx.styles.css.fonts);
	}
};
await app.connect();
const ctx = app.getHostContext();
if (ctx?.styles?.variables) {
	applyHostStyleVariables(ctx.styles.variables);
}
```

For backwards compatibility, `mcp-ui` also maps the MCP Apps tokens onto the older `--mcp-*` variables used by existing apps. That means older apps can continue using `--mcp-color-*`, `--mcp-font-*`, `--mcp-radius-*`, and `--mcp-shadow-*` while newer apps can use MCP Apps variables such as `--color-background-primary`, `--font-sans`, and `--border-radius-md` directly.

## Tool calling

Inside the iframe, the bootstrap injects both the legacy `window.mcp.callTool(params)` helper and an MCP Apps-compatible `App` bridge. Tool responses preserve the MCP result envelope so `structuredContent` is available directly in the iframe.

Host side:

```js
const view = document.querySelector("mcp-view");
view.toolCaller = async (params) => {
  return await runTool(params);
};
```

Iframe side:

```js
const result = await window.mcp.callTool({
  name: "read_file",
  arguments: { path: "src/main.ts" },
});

// If the host tool returns an MCP Apps-style envelope, the iframe receives it.
console.log(result.structuredContent);
```

If the host-side `toolCaller` returns a plain value, legacy `callTool()` usage still resolves that value directly. If it returns an object shaped like an MCP tool result, such as:

```js
{
  content: [{ type: "text", text: "Rendered in the app" }],
  structuredContent: { items: [] },
  _meta: { some: "value" },
  isError: false,
}
```

then that envelope is forwarded to the iframe unchanged.

## Layer order

By default the cascade is: defaults → ui:// content → app overrides. You can override the layer order via the `layers` property.

```js
view.layers = ["mcp-default", "mcp-content", "mcp-user"];
```

To target a custom layer for a `ui://` stylesheet, add `layer="custom"` on the original `<link>`:

```html
<link
	rel="stylesheet"
	href="ui://application/app.css"
	layer="bob">
```

## Remote allowlist

Remote resources are blocked by default. Enable them with either:

```js
view.allowedOrigins = ["https://example.com", "cdn.example.com"];
```

or

```js
view.allowedRemote = (url) => url.startsWith("https://cdn.example.com/");
```

## Resolver return types

The resolver can return:

- `Response`
- `Blob`
- `string`
- `ArrayBuffer`
- `Uint8Array`

## Build

```bash
npm run build
```

## Bundle usage (UMD/IIFE)

```html
<script src="./dist/mcp-view.umd.js"></script>
<script>
	McpView.defineMcpView();
	const view = document.querySelector("mcp-view");
	view.src = "ui://application/index.html";
	view.resolver = async() => "<html><body>...</body></html>";
</script>
```

Minified builds are available at:

- `dist/mcp-view.esm.min.js`
- `dist/mcp-view.umd.min.js`

## Examples

- UMD: `examples/basic.html`
- ESM: `examples/basic-esm.html` (requires serving over HTTP)

To run the ESM example locally:

```bash
npx serve
```

## Attributes vs properties

- Attributes are string-only and work in HTML markup.
- Properties are JavaScript values (functions, objects, arrays).

Use `src` for the root document.
Use `css` for inline overrides (string or variables object).
Use `resolver` (property) for custom resolution.
Use `base` to enable the default fetch resolver. It resolves relative URLs against the host page.

### Resolver (property)

```js
view.resolver = (uri) => fetch(`/mcp-ui?uri=${encodeURIComponent(uri)}`);
```

### Default resolver (attribute)

If you set `base`, the component will resolve `ui://` URIs using these rules (in order):

- `{path}` is replaced with the stripped path (no `ui://`).
- `{uri}` is replaced with the full URI (URL-encoded).
- If `base` contains `?`, it appends `&uri=` with the full URI (URL-encoded).
- Otherwise it appends the stripped path to the base.

```html
<mcp-view src="ui://index.html" base="/mcp/resources/"></mcp-view>
```

```html
<mcp-view src="ui://index.html" base="/mcp/resources/{path}"></mcp-view>
```

```html
<mcp-view src="ui://index.html" base="/mcp/resources?uri="></mcp-view>
```

```html
<mcp-view src="ui://index.html" base="/mcp/resources/{uri}"></mcp-view>
```

If no resolver is provided and no `base` is set, it defaults to `/mcp/resources/`.
`ui://` prefixes are stripped when constructing `{path}`.
