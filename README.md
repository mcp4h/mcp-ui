# Flux UI

Minimal web component host for loading MCP-related UI content into a sandboxed iframe using srcdoc and a message-based resource/toolcall bridge.

## Features

- Native web components (no framework dependencies).
- `<mcp-view>` resolves `ui://` resources via your resolver.
- HTML is rewritten to use `mcp-*` components for resource loading.
- Iframe bootstraps a small bridge script and utility CSS.
- Theme system with `--mcp-` variables and built-in `.mcp-*` utility classes.
- Remote allowlist support for optional https/http resources.

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

## Theming

The component injects default CSS variables and utility classes first, then your overrides.

### Theme URL (attribute)

```html
<mcp-view theme="https://example.com/theme.css"></mcp-view>
```

`theme` is loaded as a stylesheet link. For `ui://` URLs it uses the resolver via `<mcp-link>`. For http/https it is always allowed and does not require manual allowlisting. Relative URLs resolve against the host page.

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

## Tool calling

Inside the iframe, the bootstrap injects `window.mcp.callTool(params)`. It returns a Promise and rejects on errors.

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
```

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
