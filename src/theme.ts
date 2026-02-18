export type CssInput = string | Record<string, string>;
export type ThemeInputs = { css?: CssInput | null; layers?: string[] | null };
const DEFAULT_LAYERS = ["mcp-default", "mcp-content", "mcp-user"];
const defaultVariables: Record<string, string> = {
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
	"--mcp-font-sans": '"IBM Plex Sans", "Source Sans 3", "Assistant", "Noto Sans", "Apple Color ' + 'Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
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
const utilityCss = [".mcp-root{", `  ${serializeVariables(defaultVariables)}`, "  color: var(--mcp-color-fg);", "  background: var(--mcp-color-bg);", "  font-family: var(--mcp-font-sans);", "  font-size: var(--mcp-text-m);", "  line-height: var(--mcp-leading-normal);", "  font-weight: var(--mcp-weight-regular);", "  margin: 0;", "}", ".mcp-button{", "  display: inline-flex;", "  align-items: center;", "  justify-content: center;", "  gap: var(--mcp-space-2xs);", "  padding: var(--mcp-space-xs) var(--mcp-space-m);", "  border: 1px solid var(--mcp-color-border);", "  border-radius: var(--mcp-radius-m);", "  background: var(--mcp-color-bg);", "  color: var(--mcp-color-fg);", "  font-size: var(--mcp-text-s);", "  line-height: var(--mcp-leading-normal);", "  text-decoration: none;", "  cursor: pointer;", "  transition: background var(--mcp-duration-fast) var(--mcp-ease-standard), border-color " + "var(--mcp-duration-fast) var(--mcp-ease-standard), transform var(--mcp-duration-fast) " + "var(--mcp-ease-standard);", "}", ".mcp-button:where(:hover){", "  background: var(--mcp-color-muted);", "}", ".mcp-button:where(:active){", "  transform: translateY(1px);", "}", ".mcp-button:where(.active, [aria-pressed='true']){", "  filter: brightness(0.98);", "}", ".mcp-button-primary{", "  background: var(--mcp-color-primary);", "  color: var(--mcp-color-primary-fg);", "  border-color: var(--mcp-color-primary);", "}", ".mcp-button-primary:where(:hover){", "  filter: brightness(0.98);", "}", ".mcp-button-secondary{", "  background: var(--mcp-color-secondary);", "  color: var(--mcp-color-secondary-fg);", "  border-color: var(--mcp-color-secondary);", "}", ".mcp-button-ghost{", "  background: transparent;", "  border-color: transparent;", "}", ".mcp-button-danger{", "  background: var(--mcp-color-danger);", "  color: var(--mcp-color-danger-fg);", "  border-color: var(--mcp-color-danger);", "}", ".mcp-toolbar{", "  display: inline-flex;", "  align-items: center;", "  border: 1px solid var(--mcp-color-border);", "  border-radius: var(--mcp-radius-m);", "}", ".mcp-toolbar .mcp-button{", "  border: 0;", "  border-radius: 0;", "}", ".mcp-toolbar .mcp-button + .mcp-button{", "  border-left: 1px solid var(--mcp-color-border);", "}", ".mcp-toolbar .mcp-button:first-child{", "  border-top-left-radius: var(--mcp-radius-m);", "  border-bottom-left-radius: var(--mcp-radius-m);", "}", ".mcp-toolbar .mcp-button:last-child{", "  border-top-right-radius: var(--mcp-radius-m);", "  border-bottom-right-radius: var(--mcp-radius-m);", "}", ".mcp-toolbar .mcp-button:where(.active, [aria-pressed='true']){", "  position: relative;", "  z-index: 1;", "}", ".mcp-input, .mcp-textarea, .mcp-select{", "  width: 100%;", "  padding: var(--mcp-space-xs) var(--mcp-space-s);", "  border: 1px solid var(--mcp-color-border);", "  border-radius: var(--mcp-radius-s);", "  background: var(--mcp-color-bg);", "  color: var(--mcp-color-fg);", "  font-size: var(--mcp-text-s);", "  line-height: var(--mcp-leading-normal);", "}", ".mcp-input:where(:focus), .mcp-textarea:where(:focus), .mcp-select:where(:focus){", "  outline: none;", "  border-color: var(--mcp-color-primary);", "  box-shadow: var(--mcp-ring) var(--mcp-ring-color);", "}", ".mcp-label{", "  display: block;", "  margin-bottom: var(--mcp-space-3xs);", "  font-size: var(--mcp-text-xs);", "  color: var(--mcp-color-muted-fg);", "}", ".mcp-card{", "  background: var(--mcp-surface);", "  border: 1px solid var(--mcp-color-border);", "  border-radius: var(--mcp-radius-l);", "  padding: var(--mcp-space-l);", "  box-shadow: var(--mcp-shadow-xs);", "}", ".mcp-panel{", "  background: var(--mcp-surface);", "  border: 1px solid var(--mcp-color-border);", "  border-radius: var(--mcp-radius-l);", "  padding: var(--mcp-space-l);", "  box-shadow: var(--mcp-shadow-xs);", "}", ".mcp-field{", "  display: flex;", "  flex-direction: column;", "  gap: var(--mcp-space-3xs);", "}", ".mcp-divider{", "  height: 1px;", "  background: var(--mcp-color-border);", "  border: 0;", "}", ".mcp-surface{", "  background: var(--mcp-color-muted);", "  border-radius: var(--mcp-radius-m);", "  padding: var(--mcp-space-m);", "}", ".mcp-badge{", "  display: inline-flex;", "  align-items: center;", "  padding: 0 var(--mcp-space-xs);", "  border-radius: var(--mcp-radius-round);", "  background: var(--mcp-color-secondary);", "  color: var(--mcp-color-secondary-fg);", "  font-size: var(--mcp-text-2xs);", "  line-height: 1.6;", "}", ".mcp-tag{", "  display: inline-flex;", "  align-items: center;", "  padding: 0 var(--mcp-space-xs);", "  border-radius: var(--mcp-radius-s);", "  background: var(--mcp-color-muted);", "  color: var(--mcp-color-muted-fg);", "  font-size: var(--mcp-text-2xs);", "  line-height: 1.6;", "}", ".mcp-divider{", "  height: 1px;", "  background: var(--mcp-color-border);", "}", ".mcp-text-muted{", "  color: var(--mcp-color-muted-fg);", "}", ".mcp-title{", "  font-size: var(--mcp-text-xl);", "  line-height: var(--mcp-leading-tight);", "  font-weight: var(--mcp-weight-bold);", "}", ".mcp-subtitle{", "  font-size: var(--mcp-text-l);", "  line-height: var(--mcp-leading-normal);", "  font-weight: var(--mcp-weight-medium);", "  color: var(--mcp-color-muted-fg);", "}"].join("\n");
export function buildThemeCss(inputs: ThemeInputs): string {
	const parts: string[] = [];
	const order = buildLayerOrder(inputs.layers);
	parts.push(`@layer ${order.join(", ")};`);
	parts.push(wrapLayer("mcp-default", utilityCss));
	const overrides = normalizeCssInput(inputs.css);
	if (overrides) {
		parts.push(wrapLayer("mcp-user", overrides));
	}
	return parts.join("\n\n");
}
function buildLayerOrder(layers?: string[] | null): string[] {
	const order: string[] = [];
	if (layers && layers.length > 0) {
		for (const layer of layers) {
			const trimmed = layer.trim();
			if (!trimmed) continue;
			if (!order.includes(trimmed)) order.push(trimmed);
		}
	}
	for (let i = DEFAULT_LAYERS.length - 1; i >= 0; i -= 1) {
		const layer = DEFAULT_LAYERS[i];
		if (!order.includes(layer)) order.unshift(layer);
	}
	return order;
}
function wrapLayer(name: string, css: string): string {
	return `@layer ${name} {\n${css}\n}`;
}
function serializeVariables(vars: Record<string, string>): string {
	return Object.entries(vars).map(([key, value]) => `${key}: ${value};`).join("\n  ");
}
function normalizeCssInput(input?: CssInput | null): string | null {
	if (!input) return null;
	const value = input;
	if (!value) return null;
	if (typeof value === "string") return value;
	if (typeof value === "object") {
		const filtered = filterVariables(value);
		if (Object.keys(filtered).length === 0) return null;
		return `.mcp-root{${serializeVariables(filtered)}}`;
	}
	return null;
}
function filterVariables(vars: Record<string, string>): Record<string, string> {
	const filtered: Record<string, string> = {};
	for (const [key, value] of Object.entries(vars)) {
		if (key.startsWith("--mcp-")) {
			filtered[key] = value;
		}
	}
	return filtered;
}
