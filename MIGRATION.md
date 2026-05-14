# MCP UI migration to MCP Apps compatibility

This document explains what changed in `mcp-ui` to align the iframe bridge with MCP Apps, and what existing clients need to update.

## Summary

`mcp-ui` previously exposed a custom bridge API:

- `window.mcp.callTool(...)`
- `window.mcpData`
- `window` `mcp-data` events
- custom internal `postMessage` message types

`mcp-ui` now also exposes an MCP Apps-compatible guest API:

- `new App(...)`
- `await app.connect()`
- `await app.callServerTool(...)`
- `app.ontoolinput = ...`
- `app.ontoolresult = ...`
- `await app.sendMessage(...)`

The old API is still present as a compatibility layer, but clients should migrate to the MCP Apps API.

## What was wrong before

### 1. Tool results did not preserve the MCP tool result envelope

Before, `window.mcp.callTool(...)` always resolved only the raw `result` payload.

That meant MCP-style tool results such as:

```js
{
	content: [{ type: "text", text: "Rendered in app" }],
	structuredContent: { items: [] },
	_meta: { some: "value" },
	isError: false,
}
```

were not exposed to iframe code in a standard way.

### 2. Tool input used a custom data channel

Before, clients read input from:

- `window.mcpData`
- `window.addEventListener("mcp-data", ...)`

This was custom to `mcp-ui` and not MCP Apps-compatible.

### 3. There was no App-style lifecycle

Before, there was no standard:

- `App`
- `app.connect()`
- `app.callServerTool()`
- `app.ontoolinput`
- `app.ontoolresult`
- `app.sendMessage()`

Clients built for MCP Apps could not run unchanged.

## What changed

### Native browser resource loading is now available

`mcp-ui` now supports an optional `resource-base` mode.

When `resource-base` is set, `ui://` resources in HTML are rewritten to normal browser-loadable URLs instead of being converted to `mcp-*` loader elements. This preserves native loading semantics for:

- `<script src>`
- `<link href>`
- `<img src>`
- `<audio src>`
- `<video src>`
- `<source src>`

This mode is recommended for better MCP Apps compatibility.

If `resource-base` is not set, the old bridge-based resource loader remains active for backwards compatibility.


### Host styles now follow MCP Apps conventions

`mcp-ui` now supports MCP Apps-style host theming through host context:

- `theme`
- `styles.variables`
- `styles.css.fonts`

Apps should prefer the MCP Apps helper pattern:

```js
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
```

For existing `mcp-ui` apps, the old `--mcp-*` variables still work. `mcp-ui` now maps the MCP Apps variables onto those legacy tokens so older apps continue to render correctly.


## Guest-side bridge API

Inside the iframe, `mcp-ui` now provides:

```js
const app = new App({ name: "My App", version: "1.0.0" });
await app.connect();
```

Supported methods and callbacks:

- `app.connect()`
- `app.callServerTool(params)`
- `app.sendMessage(params)`
- `app.ontoolinput = (params) => { ... }`
- `app.ontoolresult = (result) => { ... }`

## Tool input delivery

When the host has input data for the iframe, `mcp-ui` now delivers it through:

```js
app.ontoolinput = (params) => {
	console.log(params.arguments);
};
```

The old `window.mcpData` and `mcp-data` event are still updated for compatibility, but they are no longer the preferred API.

## Tool result delivery

When tools are called through the bridge, results now preserve MCP result fields:

- `content`
- `structuredContent`
- `_meta`
- `isError`

Example:

```js
const result = await app.callServerTool({
	name: "search",
	arguments: { query: "hello" },
});

console.log(result.structuredContent);
```

## Host-side behavior

The host-side `toolCaller` contract remains:

```js
view.toolCaller = async(params) => {
	...
};
```

But to be MCP Apps-compatible, it should now return full MCP-style tool result envelopes when appropriate:

```js
return {
	content: [{ type: "text", text: "Search results rendered." }],
	structuredContent: { items: rows },
	_meta: {},
	isError: false,
};
```

Plain return values still work, but they are considered legacy bridge behavior.

## Host/embedder migration notes

Existing host/embedder integrations can keep working without changes.

If you do nothing:

- existing `base` + resolver behavior continues to work
- `mcp-ui` keeps using the older bridge-based resource loader
- this preserves backwards compatibility

If you want better compatibility with MCP Apps-style app bundles, you should set `resource-base` on `<mcp-view>` and point it at a browser-loadable endpoint for `ui://` resources.

Example:

```html
<mcp-view
	src="ui://index.html"
	resource-base="/mcp/resources?uri={uri}"></mcp-view>
```

### What `resource-base` changes

When `resource-base` is set:

- if no custom `resolver` is provided, `resource-base` is also used to resolve the root `src` document
- `ui://` URLs in `<script>`, `<link>`, `<img>`, `<audio>`, `<video>`, and `<source>` are rewritten to browser-loadable URLs
- the iframe keeps native HTML tags instead of using `mcp-*` resource loader elements
- script and stylesheet loading behaves much more like a normal web app
- this is the recommended mode for running MCP Apps-compatible MCP servers

When `resource-base` is not set:

- `mcp-ui` keeps the older custom resource bridge
- native tags are replaced with `mcp-*` loader elements
- older apps keep working, but browser-native loading semantics are reduced

### What the `resource-base` endpoint must do

The endpoint behind `resource-base` must:

1. accept a `ui://` resource reference
2. fetch/read that resource from the MCP server
3. return the correct bytes
4. return the correct MIME type

Example patterns:

- `/mcp/resources?uri={uri}`
- `/mcp/resources/{path}`

### Host migration checklist

1. Keep your existing `toolCaller` contract.
2. Keep your existing resolver for legacy mode if needed.
3. Add a browser-loadable resource endpoint for `ui://` assets.
4. Set `resource-base` on `<mcp-view>`.
5. Verify that scripts/styles now load natively in the iframe.

## Required client changes

## 1. Replace `window.mcp.callTool(...)`

Old:

```js
const result = await window.mcp.callTool({
	name: "my_tool",
	arguments: { a: 1 },
});
```

New:

```js
const app = new App({ name: "My App", version: "1.0.0" });
await app.connect();

const result = await app.callServerTool({
	name: "my_tool",
	arguments: { a: 1 },
});
```

## 2. Replace `window.mcpData`

Old:

```js
const input = window.mcpData;
window.addEventListener("mcp-data", (event) => {
	render(event.detail);
});
```

New:

```js
const app = new App({ name: "My App", version: "1.0.0" });

app.ontoolinput = (params) => {
	render(params.arguments);
};

await app.connect();
```

## 3. Read MCP result envelopes

Old clients often assumed the useful value was the direct return value.

New clients should read MCP fields explicitly:

```js
const result = await app.callServerTool(...);

if (result.isError) {
	showError(result.content);
}
else {
	render(result.structuredContent);
}
```

## 4. Use `app.ontoolresult` for host-pushed tool results

If your UI expects the host to push the result of the original tool invocation into the iframe, use:

```js
app.ontoolresult = (result) => {
	render(result.structuredContent);
};
```

## 5. CSS migration notes

Existing app CSS does not need to change immediately.

If you do nothing:

- existing `--mcp-*` variables continue to work
- `mcp-ui` now maps MCP Apps host style variables onto those older tokens
- older apps should continue to render correctly

If you want to align with MCP Apps styling conventions, update your app CSS to use MCP Apps tokens directly.

Old `mcp-ui` tokens often looked like:

- `--mcp-color-bg`
- `--mcp-color-fg`
- `--mcp-color-border`
- `--mcp-font-sans`
- `--mcp-radius-m`
- `--mcp-shadow-s`

New MCP Apps-style tokens look like:

- `--color-background-primary`
- `--color-text-primary`
- `--color-border-primary`
- `--font-sans`
- `--border-radius-md`
- `--shadow-sm`

### Recommended CSS migration approach

1. Leave old `--mcp-*` usage in place if you want zero-risk migration.
2. For new UI code, prefer MCP Apps tokens directly.
3. Gradually replace old variables as files are touched.
4. Use host-context helpers to apply theme, variables, and fonts.

Example:

```js
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
```

### CSS compatibility summary

- Old `--mcp-*` variables: still supported
- MCP Apps variables: now supported
- Recommended for new apps: MCP Apps variables

## 6. Replace custom host messaging hacks with `app.sendMessage(...)`

Old clients may have used custom `postMessage` calls or parent-window integrations.

New:

```js
await app.sendMessage({
	role: "user",
	content: [{ type: "text", text: "Continue with this selection." }],
});
```

## Compatibility notes

The following legacy APIs still exist for now:

- `window.mcp.callTool(...)`
- `window.mcp.callServerTool(...)`
- `window.mcpData`
- `mcp-data` events

These remain only to avoid breaking current clients immediately. New clients should not use them.

## Recommended migration checklist

1. Create an `App` instance in the iframe.
2. Register `app.ontoolinput` before `app.connect()`.
3. Register `app.ontoolresult` if the UI should react to host-pushed results.
4. Replace `window.mcp.callTool(...)` with `app.callServerTool(...)`.
5. Replace `window.mcpData` reads with `app.ontoolinput`.
6. Update result handling to read `structuredContent`, `content`, `_meta`, and `isError`.
7. If desired, update CSS to use MCP Apps host variables directly instead of only `--mcp-*` aliases.
8. Replace any custom parent messaging with `app.sendMessage(...)`.

## Minimal migrated example

```js
const app = new App({ name: "Tasks App", version: "1.0.0" });

app.ontoolinput = (params) => {
	populateForm(params.arguments || {});
};

app.ontoolresult = (result) => {
	if (result?.isError) {
		showError(result.content);
		return;
	}
	renderResult(result.structuredContent);
};

await app.connect();

document.getElementById("refresh").addEventListener("click", async() => {
	const result = await app.callServerTool({
		name: "list_tasks",
		arguments: {},
	});
	renderResult(result.structuredContent);
});
```
