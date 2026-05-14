# MCP UI cleanup after full MCP Apps migration

This document lists the code and compatibility layers that can be removed once:

1. hosts embedding `mcp-ui` are MCP Apps-compatible
2. MCP servers consistently expose MCP Apps-compatible resources and tool results
3. iframe apps no longer depend on the legacy `mcp-ui` bridge API

The goal is to simplify `mcp-ui` back down to a clean MCP Apps-oriented host, rather than carrying both the old custom bridge and the new compatibility layer indefinitely.

## Assumptions before cleanup

Do not remove the items below until all of these are true:

- Hosts are using `resource-base` or an equivalent browser-loadable resource endpoint for `ui://` assets.
- Hosts are no longer depending on the legacy bridge-based resource loader.
- Iframe apps use `new App(...)` and MCP Apps-style callbacks instead of `window.mcp.*` legacy APIs.
- Tool results are returned in MCP-style envelopes with `content`, `structuredContent`, optional `_meta`, and `isError`.
- Host theming is provided through MCP Apps host context (`theme`, `styles.variables`, `styles.css.fonts`).
- Existing apps no longer rely on `--mcp-*`-only styling.

## 1. Remove the legacy bridge-based resource loader

Current legacy behavior:

- HTML is rewritten to use:
	- `mcp-link`
	- `mcp-script`
	- `mcp-img`
	- `mcp-audio`
	- `mcp-video`
	- `mcp-source`
- The iframe requests resource bytes over the old message bridge.
- The host resolves those bytes with `resolver` / `base`.

Once all hosts use browser-loadable resource URLs via `resource-base`, remove:

- the `mcp-*` resource-loading elements in `src/iframe-bootstrap.ts`
- the old `mcp:request` / `mcp:response` resource path in `src/mcp-view.ts`
- the legacy branch in `src/rewrite.ts` that swaps native tags for `mcp-*` tags

Target state:

- `rewriteHtml(...)` only rewrites URLs for native browser loading
- scripts/styles/media load through normal browser semantics

## 2. Remove the legacy guest-side API shims

Current compatibility shims:

- `window.mcp.callTool(...)`
- `window.mcp.callServerTool(...)`
- `window.mcp.connect(...)`
- `window.mcp.sendMessage(...)`
- `window.mcp.ontoolinput`
- `window.mcp.ontoolresult`
- `window.mcp.onhostcontextchanged`
- `window.mcpData`
- `mcp-data` custom events

Once iframe apps have moved to MCP Apps conventions, remove:

- the legacy `window.mcp.*` API surface in `src/iframe-bootstrap.ts`
- the `window.mcpData` compatibility state
- the `mcp-data` custom event dispatching

Target state:

- iframe apps interact through the MCP Apps-style `App` API only

## 3. Replace the internal custom message names with MCP Apps wire semantics

Current internal transport still uses custom message types such as:

- `mcp:tool-call`
- `mcp:tool-result`
- `mcp:connect`
- `mcp:connect-result`
- `mcp:send-message`
- `mcp:send-message-result`
- `mcp:tool-input`
- `mcp:host-context-changed`
- plus the old resource bridge messages

Once hosts and iframe apps are fully migrated, clean up the transport layer so it matches MCP Apps more directly.

This likely means:

- replacing custom internal message names with MCP Apps JSON-RPC-style method names
- removing the custom fallback semantics used only for backwards compatibility
- consolidating initialization, tool input, tool result, and host context changes into one coherent MCP Apps protocol layer

Target state:

- one transport model
- no split between “legacy bridge” and “MCP Apps bridge”

## 4. Remove CSS compatibility aliases for legacy `--mcp-*` tokens

Current behavior:

- MCP Apps-style host variables are supported
- those variables are aliased back into legacy `--mcp-*` tokens so older apps still render correctly

Once iframe apps have migrated their CSS, remove:

- the compatibility alias mapping in `src/theme.ts` from MCP Apps variables to `--mcp-*`

Examples of legacy tokens that can eventually be removed:

- `--mcp-color-*`
- `--mcp-font-*`
- `--mcp-radius-*`
- `--mcp-shadow-*`

Potentially removable later as well:

- old spacing/motion/focus token families if they are only present for legacy utility CSS

Target state:

- app CSS uses MCP Apps host variables directly
- `mcp-ui` does not need to maintain a second token namespace purely for compatibility

## 5. Reevaluate the built-in `mcp-ui` utility CSS layer

Current behavior:

- `mcp-ui` injects its own utility classes and design tokens
- examples include `.mcp-button`, `.mcp-toolbar`, `.mcp-card`, etc.

Once apps are fully MCP Apps-native, decide whether these should remain.

Possible cleanup paths:

### Option A: keep them

Keep the utility layer if `mcp-ui` still wants to offer a convenience design system.

### Option B: slim them down

Reduce the utility layer to only the minimum needed for host defaults.

### Option C: remove them entirely

If apps are expected to bring their own CSS, remove the utility classes and keep only host-style helpers.

Target state depends on product direction, but this should be revisited after migration rather than preserved by accident.

## 6. Remove legacy plain-result tool call assumptions

Current behavior:

- host `toolCaller` may return arbitrary plain values
- bridge code preserves old behavior for non-MCP-style results

Once hosts and servers consistently return MCP-style tool result envelopes, remove:

- branches that treat plain return values as the primary contract
- legacy promise resolution behavior that exists only for raw non-envelope results

Target state:

- tool results have one shape
- iframe apps can consistently rely on `content`, `structuredContent`, `_meta`, and `isError`

## 7. Tighten host-facing API surface

Current host-facing public API still supports transitional patterns such as:

- `base` for the older fetch resolver mode
- `resolver` as the legacy direct resource byte path

Once all hosts have adopted browser-loadable resource endpoints, reevaluate:

- whether `base` still needs to exist
- whether `resolver` should remain public or become a niche/advanced fallback
- whether `resource-base` should become the primary documented host integration path

Target state:

- one clearly preferred host resource-loading contract
- old resource-loading paths either removed or explicitly marked advanced-only

## 8. Reduce duplicated theming paths

Current theming support includes both:

- old `mcp-ui` theme CSS variable conventions
- MCP Apps host context theme/style/font helpers

After migration, simplify toward MCP Apps host context as the primary theme source.

Possible cleanup:

- remove compatibility-only theme indirection
- reduce legacy defaults that exist only to support older apps
- make `applyDocumentTheme`, `applyHostStyleVariables`, and `applyHostFonts` the primary documented theming path

## 9. Update docs to remove transition language

Once cleanup is performed, update docs to remove references like:

- “legacy mode”
- “backwards compatibility”
- “old bridge still supported”
- “use `resource-base` for better compatibility”

Target documentation should describe only the intended final architecture.

Files likely needing cleanup:

- `README.md`
- `MIGRATION.md`
- examples that demonstrate old `window.mcp.*` APIs
- examples that omit `resource-base`

## Suggested cleanup order

1. Make `resource-base` the standard host integration path.
2. Remove legacy resource bridge loading.
3. Remove `window.mcp.*` compatibility shims.
4. Standardize transport on MCP Apps wire semantics.
5. Remove legacy plain-result tool call behavior.
6. Remove CSS variable aliases for `--mcp-*`.
7. Reevaluate utility CSS and host-facing fallback APIs.
8. Simplify docs and examples.

## Things to verify before each removal

Before removing any compatibility path, verify with real apps that:

- scripts load natively through `resource-base`
- tool calls succeed through the MCP Apps bridge
- host context updates apply correctly
- theming works without `--mcp-*` aliases
- no iframe apps still consume `window.mcpData` or `mcp-data`
- no hosts depend on the old resource-byte bridge

## Final desired state

A cleaned-up `mcp-ui` should ideally be:

- a lightweight MCP Apps-compatible iframe host
- browser-native for app resource loading
- MCP Apps-style for tool calls, tool input/result, and host context
- free of the old custom bridge semantics except where intentionally retained as product features
