# MCP UI current usage guide

This guide documents how `mcp-ui` should be used now, after the MCP Apps compatibility improvements.

It focuses on:

- recommended host-side setup
- recommended iframe/client-side setup
- MCP Apps-style tool calling and host context
- packaging choices for app resources
- the current CSS variable set apps should use

This document describes the recommended current approach, including when the older byte-bridge resource loading model is still the better choice.

## Recommended model

Use `mcp-ui` as:

- a host-side web component that renders an app resource into a sandboxed iframe
- a bridge that exposes an MCP Apps-style `App` API inside the iframe
- a host that delivers:
	- tool input
	- tool results
	- host context
	- theme/style variables

For app resources, there are two valid modes:

### Mode A: bundled/self-contained app HTML

Use this when your app is mostly a single HTML payload, or when its scripts/styles are bundled inline or otherwise work well with the existing byte bridge.

This is often the simpler and safer default.

### Mode B: multi-file app resources through `resource-base`

Use this when your app has a multi-file resource graph and you want more native browser loading behavior for:

- `<script src>`
- `<script type="module">`
- `<link href>`
- images/media subresources

Recommended architecture for this mode:

1. Your MCP server exposes UI resources such as `ui://app/index.html`.
2. Your host makes those resources browser-loadable through an HTTP endpoint.
3. `<mcp-view>` loads the root UI resource.
4. `resource-base` rewrites `ui://` asset references to your HTTP endpoint.
5. The iframe app uses `new App(...)`, `app.connect()`, `app.callServerTool(...)`, and host-context helpers.

## Host-side usage

## Basic host examples

### Example A: bundled/self-contained app HTML

```html
<mcp-view
	src="ui://app/index.html"
	auto-height="true"
	style="display:block; width:100%; min-height:320px;"></mcp-view>
```

In this mode, `mcp-ui` uses its existing byte bridge for `ui://` subresources. This can still be the better option for bundled or self-contained apps.

### Example B: multi-file app with `resource-base`

```html
<mcp-view
	src="ui://app/index.html"
	resource-base="/mcp/resources/{path}"
	auto-height="true"
	style="display:block; width:100%; min-height:320px;"></mcp-view>
```

If no custom `resolver` is set, `resource-base` is also used as the default resolver for the root `src` document.

```js
const view = document.querySelector("mcp-view");

view.toolCaller = async(params) => {
	return await runMcpTool(params);
};

view.data = {
	id: "123",
	mode: "summary",
};
```

## Host responsibilities

The host embedding `<mcp-view>` is responsible for:

1. Choosing the root UI resource via `src`
2. Deciding whether to use:
	- the built-in byte bridge for bundled/self-contained apps, or
	- `resource-base` for multi-file apps
3. Providing tool execution through `view.toolCaller`
4. Providing tool input or other initial state through `view.data`
5. Optionally supplying host theme/style values through host context in the bridge

## Host configuration reference

### `src`

The root UI document.

Example:

```html
<mcp-view src="ui://app/index.html"></mcp-view>
```

### `resource-base`

Optional host feature for multi-file apps.

This tells `mcp-ui` how to rewrite `ui://` resource URLs into browser-loadable URLs.

Recommended example:

```html
<mcp-view resource-base="/mcp/resources/{path}"></mcp-view>
```

Supported patterns:

- `/mcp/resources/{path}`
- `/mcp/resources/{uri}`
- `/mcp/resources?uri={uri}`
- `/mcp/resources/` (path appended automatically)

Behavior:

- if no custom `resolver` is set, `resource-base` is also used as the default resolver for the root `src` document
- subresources inside the HTML like scripts/styles/images are rewritten to browser-loadable URLs
- native browser loading is preserved for those tags

This is useful when you want multi-file app resources to load with more native browser semantics. It is not required for every MCP Apps-compatible server.

### Why `{path}` is the recommended example

For apps that use normal JavaScript module loading, path-based rewritten URLs are safer.

Example source HTML:

```html
<script type="module" src="ui://app/app.js"></script>
```

If `resource-base` is path-based:

```html
<mcp-view resource-base="/mcp/resources/{path}"></mcp-view>
```

then the rewritten module URL looks like a normal file path:

```text
/mcp/resources/app/app.js
```

Now an import inside `app.js` like:

```js
import "./chunk.js";
```

naturally resolves to:

```text
/mcp/resources/app/chunk.js
```

That matches normal browser module behavior.

By contrast, a query-only pattern such as:

```html
<mcp-view resource-base="/mcp/resources?uri={uri}"></mcp-view>
```

can be risky for module graphs, because the browser resolves relative imports from the rewritten browser URL, not from the original `ui://` resource identity.

Use `{path}` when possible, especially for apps with:

- `<script type="module">`
- relative `import "./..."`
- multi-file app bundles

### `toolCaller`

A host-side function used when the iframe app calls tools.

Example:

```js
view.toolCaller = async(params) => {
	return await runMcpTool(params);
};
```

Recommended return shape:

```js
return {
	content: [{ type: "text", text: "Rendered in the app." }],
	structuredContent: { items: rows },
	_meta: {},
	isError: false,
};
```

This should be treated as the preferred contract.

### `data`

Initial tool input or other host-provided data.

Example:

```js
view.data = {
	query: "search term",
	limit: 20,
};
```

Inside the iframe this is delivered through `app.ontoolinput`.

### `theme`

Optional stylesheet URL for additional host-side theme CSS.

Example:

```html
<mcp-view theme="/assets/mcp-theme.css"></mcp-view>
```

If `theme` is a `ui://` URL and `resource-base` is set, it will also be rewritten to a browser-loadable URL.

### `css`

Optional property for direct CSS overrides or variable overrides.

Example string override:

```js
view.css = `.mcp-card { border-width: 2px; }`;
```

Example variable override:

```js
view.css = {
	"--color-background-primary": "#ffffff",
	"--color-text-primary": "#161616",
};
```

### `auto-height`

If enabled, the iframe reports content height and the host element resizes.

Example:

```html
<mcp-view auto-height="true"></mcp-view>
```

### `max-height`

Optional height cap for auto-height mode.

Example:

```html
<mcp-view auto-height="true" max-height="900"></mcp-view>
```

## When to prefer the byte bridge instead

The older byte-bridge loader can still be the better option when:

- your app is mostly a single bundled HTML document
- your scripts and styles are already self-contained
- you want to avoid exposing a browser-loadable resource endpoint
- you want a tighter default loading surface for sandboxed apps
- you do not need native multi-file module loading semantics

In other words, `resource-base` is a useful option, not an automatic replacement for the older model.

## What the `resource-base` endpoint must do

Your `resource-base` endpoint must:

1. accept a request that identifies the `ui://` resource
2. load that resource from the MCP server
3. return the exact bytes
4. return the correct MIME type

Because `resource-base` may also resolve the root `src` document when no custom `resolver` is set, the endpoint should be able to serve both HTML documents and subresources.

Recommended request shape:

```text
GET /mcp/resources/app/app.js
```

Alternate request shape:

```text
GET /mcp/resources?uri=ui%3A%2F%2Fapp%2Fapp.js
```

Example responsibilities:

- `ui://app/index.html` -> `text/html`
- `ui://app/app.js` -> `text/javascript`
- `ui://app/app.css` -> `text/css`
- `ui://app/logo.svg` -> `image/svg+xml`

## Client-side usage inside the iframe

Inside the iframe app, use the MCP Apps-style bridge.

## Basic client example

```js
const app = new App({ name: "My App", version: "1.0.0" });

app.ontoolinput = (params) => {
	console.log("tool input", params.arguments);
};

app.ontoolresult = (result) => {
	console.log("tool result", result.structuredContent);
};

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

const hostContext = app.getHostContext();
if (hostContext?.theme) {
	applyDocumentTheme(hostContext.theme);
}
if (hostContext?.styles?.variables) {
	applyHostStyleVariables(hostContext.styles.variables);
}
if (hostContext?.styles?.css?.fonts) {
	applyHostFonts(hostContext.styles.css.fonts);
}
```

## Tool calls

Use `app.callServerTool(...)`.

Example:

```js
const result = await app.callServerTool({
	name: "search_documents",
	arguments: { query: "polymr" },
});

if (result.isError) {
	console.error(result.content);
}
else {
	renderResults(result.structuredContent);
}
```

Expected result fields:

- `content`
- `structuredContent`
- `_meta`
- `isError`

## Sending messages back to the host

Use `app.sendMessage(...)`.

Example:

```js
await app.sendMessage({
	role: "user",
	content: [{ type: "text", text: "Use this selection." }],
});
```

## Host context and theming

Use host context as the primary source of theme and style information.

Recommended pattern:

```js
function applyContext(ctx) {
	if (!ctx) return;
	if (ctx.theme) {
		applyDocumentTheme(ctx.theme);
	}
	if (ctx.styles?.variables) {
		applyHostStyleVariables(ctx.styles.variables);
	}
	if (ctx.styles?.css?.fonts) {
		applyHostFonts(ctx.styles.css.fonts);
	}
}

const app = new App({ name: "My App", version: "1.0.0" });
app.onhostcontextchanged = applyContext;
await app.connect();
applyContext(app.getHostContext());
```

## CSS variables apps should use now

Use the MCP Apps-style variables below.

These are the variables new apps should read and, when needed, hosts should set.

## Color variables

### Background colors

- `--color-background-primary`
	- Main app/page background
- `--color-background-secondary`
	- Secondary surfaces, muted panels, toolbars
- `--color-background-tertiary`
	- Tertiary surfaces, nested areas
- `--color-background-accent`
	- Accent-filled actions, highlighted states
- `--color-background-success`
	- Success surface/background
- `--color-background-warning`
	- Warning surface/background
- `--color-background-danger`
	- Danger/error surface/background

### Text colors

- `--color-text-primary`
	- Main readable text
- `--color-text-secondary`
	- Secondary text, descriptions, subdued labels
- `--color-text-tertiary`
	- Very subtle text, helper text, placeholders
- `--color-text-accent`
	- Text placed on accent backgrounds
- `--color-text-success`
	- Text placed on success surfaces
- `--color-text-warning`
	- Text placed on warning surfaces
- `--color-text-danger`
	- Text placed on danger surfaces

### Border colors

- `--color-border-primary`
	- Standard borders and separators
- `--color-border-secondary`
	- Stronger or alternate borders
- `--color-border-accent`
	- Accent border state
- `--color-border-success`
	- Success border state
- `--color-border-warning`
	- Warning border state
- `--color-border-danger`
	- Danger border state

## Font family variables

- `--font-sans`
	- Default UI font family
- `--font-serif`
	- Optional serif font family
- `--font-mono`
	- Monospace/code font family

## Typography scale variables

These should be used when the host wants to control app typography more precisely.

### Body sizes

- `--font-body-sm`
	- Small body text size
- `--font-body-md`
	- Default body text size
- `--font-body-lg`
	- Large body text size

### Heading sizes

- `--font-heading-xs`
	- Small heading size
- `--font-heading-sm`
	- Compact section headings
- `--font-heading-md`
	- Standard headings
- `--font-heading-lg`
	- Large headings
- `--font-heading-xl`
	- Extra-large headings
- `--font-heading-2xl`
	- Prominent headings
- `--font-heading-3xl`
	- Hero/display heading size

### Line heights

- `--font-body-sm-line-height`
- `--font-body-md-line-height`
- `--font-body-lg-line-height`
- `--font-heading-xs-line-height`
- `--font-heading-sm-line-height`
- `--font-heading-md-line-height`
- `--font-heading-lg-line-height`
- `--font-heading-xl-line-height`
- `--font-heading-2xl-line-height`
- `--font-heading-3xl-line-height`

Use these to control readability and spacing rhythm for their matching text sizes.

## Radius variables

- `--border-radius-xs`
	- Tiny controls or chips
- `--border-radius-sm`
	- Small inputs and buttons
- `--border-radius-md`
	- Standard cards, buttons, inputs
- `--border-radius-lg`
	- Larger panels and containers
- `--border-radius-xl`
	- Very rounded panels or dialogs
- `--border-radius-full`
	- Pills, badges, circular shapes

## Border width variables

- `--border-width-regular`
	- Standard border thickness

## Shadow variables

- `--shadow-hairline`
	- Very subtle edge shadow
- `--shadow-xs`
	- Minimal depth
- `--shadow-sm`
	- Small cards/popovers
- `--shadow-md`
	- Standard elevated surfaces
- `--shadow-lg`
	- Strong elevation for modals/popovers

## Fonts CSS payload

Host context may also supply:

- `styles.css.fonts`

This is CSS that can contain:

- `@font-face`
- `@import`
- other font declarations needed to make `--font-sans`, `--font-serif`, and `--font-mono` meaningful

Apply it with:

```js
applyHostFonts(ctx.styles.css.fonts);
```

## Recommended CSS example

```css
:root {
	background: var(--color-background-primary, #ffffff);
	color: var(--color-text-primary, #111111);
	font-family: var(--font-sans, system-ui, sans-serif);
}

.card {
	background: var(--color-background-secondary, #f6f6f6);
	border: var(--border-width-regular, 1px) solid var(--color-border-primary, #dddddd);
	border-radius: var(--border-radius-md, 0.5rem);
	box-shadow: var(--shadow-sm, 0 2px 6px rgba(0, 0, 0, 0.12));
}

.title {
	font-size: var(--font-heading-md, 1.125rem);
	line-height: var(--font-heading-md-line-height, 1.3);
}

.code {
	font-family: var(--font-mono, monospace);
}
```

## Recommended resource loading pattern for apps

When possible, author app HTML with normal web tags:

```html
<link rel="stylesheet" href="ui://app/app.css">
<script type="module" src="ui://app/app.js"></script>
```

Then configure the host with `resource-base` so those `ui://` URLs are rewritten into browser-loadable URLs.

This gives the best compatibility with existing MCP Apps bundles.

## Current best practices

## For hosts

1. Use the byte bridge for bundled/self-contained apps when it keeps the setup simpler.
2. Use `resource-base` for multi-file apps that need more native browser loading behavior.
3. If you use `resource-base`, prefer path-based values such as `/mcp/resources/{path}` for JavaScript module compatibility.
4. Return correct MIME types from your resource endpoint.
5. Make `toolCaller` return full MCP result envelopes.
6. Provide host context theme/style/font values where possible.
7. Keep legacy `base`/resolver mode only as fallback where needed.

## For iframe apps

1. Use `new App(...)`.
2. Register `ontoolinput`, `ontoolresult`, and `onhostcontextchanged` before `connect()`.
3. Use `app.callServerTool(...)` for tool execution.
4. Use `app.sendMessage(...)` for host/chat messages.
5. Use MCP Apps CSS variables directly.
6. Apply theme/variables/fonts from host context.
7. Treat `structuredContent` as the primary UI data payload.

## Compatibility note

`mcp-ui` still contains compatibility support for:

- old `window.mcp.*` usage
- old bridge-based resource loading
- old `--mcp-*` CSS variable usage

Those exist to support gradual migration.

For new development, prefer the MCP Apps-style model described in this document.
