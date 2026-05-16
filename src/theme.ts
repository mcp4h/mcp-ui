export type CssInput = string | Record<string, string>;
export type McpHostTheme = "light" | "dark";
export type McpHostStyleVariables = Record<string, string>;
export type McpHostStyles = {
	variables?: McpHostStyleVariables | null;
	css?: {
		fonts?: string | null;
	} | null;
};
export type ThemeInputs = {
	css?: CssInput | null;
	layers?: string[] | null;
	hostVariables?: McpHostStyleVariables | null;
};
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
export const mcpAppsDefaultVariables: Record<string, string> = {
	"--color-background-primary": "light-dark(rgba(255, 255, 255, 1), rgba(48, 48, 46, 1))",
	"--color-background-secondary": "light-dark(rgba(245, 244, 237, 1), rgba(38, 38, 36, 1))",
	"--color-background-tertiary": "light-dark(rgba(250, 249, 245, 1), rgba(20, 20, 19, 1))",
	"--color-background-inverse": "light-dark(rgba(20, 20, 19, 1), rgba(250, 249, 245, 1))",
	"--color-background-ghost": "light-dark(rgba(255, 255, 255, 0), rgba(48, 48, 46, 0))",
	"--color-background-info": "light-dark(rgba(214, 228, 246, 1), rgba(37, 62, 95, 1))",
	"--color-background-danger": "light-dark(rgba(247, 236, 236, 1), rgba(96, 42, 40, 1))",
	"--color-background-success": "light-dark(rgba(233, 241, 220, 1), rgba(27, 70, 20, 1))",
	"--color-background-warning": "light-dark(rgba(246, 238, 223, 1), rgba(72, 58, 15, 1))",
	"--color-background-disabled": "light-dark(rgba(255, 255, 255, 0.5), rgba(48, 48, 46, 0.5))",
	"--color-text-primary": "light-dark(rgba(20, 20, 19, 1), rgba(250, 249, 245, 1))",
	"--color-text-secondary": "light-dark(rgba(61, 61, 58, 1), rgba(194, 192, 182, 1))",
	"--color-text-tertiary": "light-dark(rgba(115, 114, 108, 1), rgba(156, 154, 146, 1))",
	"--color-text-inverse": "light-dark(rgba(255, 255, 255, 1), rgba(20, 20, 19, 1))",
	"--color-text-ghost": "light-dark(rgba(115, 114, 108, 0.5), rgba(156, 154, 146, 0.5))",
	"--color-text-info": "light-dark(rgba(50, 102, 173, 1), rgba(128, 170, 221, 1))",
	"--color-text-danger": "light-dark(rgba(127, 44, 40, 1), rgba(238, 136, 132, 1))",
	"--color-text-success": "light-dark(rgba(38, 91, 25, 1), rgba(122, 185, 72, 1))",
	"--color-text-warning": "light-dark(rgba(90, 72, 21, 1), rgba(209, 160, 65, 1))",
	"--color-text-disabled": "light-dark(rgba(20, 20, 19, 0.5), rgba(250, 249, 245, 0.5))",
	"--color-border-primary": "light-dark(rgba(31, 30, 29, 0.4), rgba(222, 220, 209, 0.4))",
	"--color-border-secondary": "light-dark(rgba(31, 30, 29, 0.3), rgba(222, 220, 209, 0.3))",
	"--color-border-tertiary": "light-dark(rgba(31, 30, 29, 0.15), rgba(222, 220, 209, 0.15))",
	"--color-border-inverse": "light-dark(rgba(255, 255, 255, 0.3), rgba(20, 20, 19, 0.15))",
	"--color-border-ghost": "light-dark(rgba(31, 30, 29, 0), rgba(222, 220, 209, 0))",
	"--color-border-info": "light-dark(rgba(70, 130, 213, 1), rgba(70, 130, 213, 1))",
	"--color-border-danger": "light-dark(rgba(167, 61, 57, 1), rgba(205, 92, 88, 1))",
	"--color-border-success": "light-dark(rgba(67, 116, 38, 1), rgba(89, 145, 48, 1))",
	"--color-border-warning": "light-dark(rgba(128, 92, 31, 1), rgba(168, 120, 41, 1))",
	"--color-border-disabled": "light-dark(rgba(31, 30, 29, 0.1), rgba(222, 220, 209, 0.1))",
	"--color-ring-primary": "light-dark(rgba(20, 20, 19, 0.7), rgba(250, 249, 245, 0.7))",
	"--color-ring-secondary": "light-dark(rgba(61, 61, 58, 0.7), rgba(194, 192, 182, 0.7))",
	"--color-ring-inverse": "light-dark(rgba(255, 255, 255, 0.7), rgba(20, 20, 19, 0.7))",
	"--color-ring-info": "light-dark(rgba(50, 102, 173, 0.5), rgba(128, 170, 221, 0.5))",
	"--color-ring-danger": "light-dark(rgba(167, 61, 57, 0.5), rgba(205, 92, 88, 0.5))",
	"--color-ring-success": "light-dark(rgba(67, 116, 38, 0.5), rgba(89, 145, 48, 0.5))",
	"--color-ring-warning": "light-dark(rgba(128, 92, 31, 0.5), rgba(168, 120, 41, 0.5))",
	"--font-sans": "Anthropic Sans, sans-serif",
	"--font-mono": "ui-monospace, monospace",
	"--font-weight-normal": "400",
	"--font-weight-medium": "500",
	"--font-weight-semibold": "600",
	"--font-weight-bold": "700",
	"--font-text-xs-size": "12px",
	"--font-text-sm-size": "14px",
	"--font-text-md-size": "16px",
	"--font-text-lg-size": "20px",
	"--font-heading-xs-size": "12px",
	"--font-heading-sm-size": "14px",
	"--font-heading-md-size": "16px",
	"--font-heading-lg-size": "20px",
	"--font-heading-xl-size": "24px",
	"--font-heading-2xl-size": "28px",
	"--font-heading-3xl-size": "36px",
	"--font-text-xs-line-height": "1.4",
	"--font-text-sm-line-height": "1.4",
	"--font-text-md-line-height": "1.4",
	"--font-text-lg-line-height": "1.25",
	"--font-heading-xs-line-height": "1.4",
	"--font-heading-sm-line-height": "1.4",
	"--font-heading-md-line-height": "1.4",
	"--font-heading-lg-line-height": "1.25",
	"--font-heading-xl-line-height": "1.25",
	"--font-heading-2xl-line-height": "1.1",
	"--font-heading-3xl-line-height": "1",
	"--border-radius-xs": "4px",
	"--border-radius-sm": "6px",
	"--border-radius-md": "8px",
	"--border-radius-lg": "10px",
	"--border-radius-xl": "12px",
	"--border-radius-full": "9999px",
	"--border-width-regular": "0.5px",
	"--shadow-hairline": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
	"--shadow-sm": "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
	"--shadow-md": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
	"--shadow-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)"
};
const mcpAppsAliasVariables: Record<string, string> = {
	"--mcp-color-bg": "var(--color-background-primary, #f7f7f5)",
	"--mcp-surface": "var(--color-background-primary, #ffffff)",
	"--mcp-surface-alt": "var(--color-background-secondary, #f0f0ec)",
	"--mcp-color-muted": "var(--color-background-secondary, #e7e6e2)",
	"--mcp-color-fg": "var(--color-text-primary, #1f1f1b)",
	"--mcp-color-muted-fg": "var(--color-text-secondary, #4b4a44)",
	"--mcp-color-border": "var(--color-border-primary, #d1d0ca)",
	"--mcp-color-border-strong": "var(--color-border-secondary, #b5b3ab)",
	"--mcp-color-primary": "var(--color-background-accent, #3b5ccc)",
	"--mcp-color-primary-fg": "var(--color-text-accent, #f8f9ff)",
	"--mcp-color-secondary": "var(--color-background-secondary, #5b6478)",
	"--mcp-color-secondary-fg": "var(--color-text-secondary, #f5f7fb)",
	"--mcp-color-accent": "var(--color-background-accent, #2f7f6b)",
	"--mcp-color-accent-fg": "var(--color-text-accent, #f1fffb)",
	"--mcp-color-success": "var(--color-background-success, #2f7f6b)",
	"--mcp-color-success-fg": "var(--color-text-success, #f1fffb)",
	"--mcp-color-warning": "var(--color-background-warning, #b26a1f)",
	"--mcp-color-warning-fg": "var(--color-text-warning, #fff6ea)",
	"--mcp-color-danger": "var(--color-background-danger, #b3343a)",
	"--mcp-color-danger-fg": "var(--color-text-danger, #fff1f2)",
	"--mcp-font-sans": "var(--font-sans, \"IBM Plex Sans\", \"Source Sans 3\", sans-serif)",
	"--mcp-font-serif": "var(--font-serif, \"IBM Plex Serif\", \"Source Serif 4\", serif)",
	"--mcp-font-mono": "var(--font-mono, \"IBM Plex Mono\", \"Source Code Pro\", monospace)",
	"--mcp-radius-xs": "var(--border-radius-xs, 0.125rem)",
	"--mcp-radius-s": "var(--border-radius-sm, 0.25rem)",
	"--mcp-radius-m": "var(--border-radius-md, 0.5rem)",
	"--mcp-radius-l": "var(--border-radius-lg, 0.75rem)",
	"--mcp-radius-xl": "var(--border-radius-xl, 1rem)",
	"--mcp-radius-round": "var(--border-radius-full, 9999px)",
	"--mcp-shadow-xs": "var(--shadow-xs, 0 1px 2px rgba(0, 0, 0, 0.08))",
	"--mcp-shadow-s": "var(--shadow-sm, 0 2px 6px rgba(0, 0, 0, 0.12))",
	"--mcp-shadow-m": "var(--shadow-md, 0 6px 16px rgba(0, 0, 0, 0.16))",
	"--mcp-shadow-l": "var(--shadow-lg, 0 12px 32px rgba(0, 0, 0, 0.2))"
};
const utilityCss = [".mcp-root{", `  ${serializeVariables(defaultVariables)}`, `  ${serializeVariables(mcpAppsAliasVariables)}`, "  color: var(--mcp-color-fg);", "  background: var(--mcp-color-bg);", "  font-family: var(--mcp-font-sans);", "  font-size: var(--mcp-text-m);", "  line-height: var(--mcp-leading-normal);", "  font-weight: var(--mcp-weight-regular);", "  margin: 0;", "}", ".mcp-button{", "  display: inline-flex;", "  align-items: center;", "  justify-content: center;", "  gap: var(--mcp-space-2xs);", "  padding: var(--mcp-space-xs) var(--mcp-space-m);", "  border: 1px solid var(--mcp-color-border);", "  border-radius: var(--mcp-radius-m);", "  background: var(--mcp-color-bg);", "  color: var(--mcp-color-fg);", "  font-size: var(--mcp-text-s);", "  line-height: var(--mcp-leading-normal);", "  text-decoration: none;", "  cursor: pointer;", "  transition: background var(--mcp-duration-fast) var(--mcp-ease-standard), border-color " + "var(--mcp-duration-fast) var(--mcp-ease-standard), transform var(--mcp-duration-fast) " + "var(--mcp-ease-standard);", "}", ".mcp-button:where(:hover){", "  background: var(--mcp-color-muted);", "}", ".mcp-button:where(:active){", "  transform: translateY(1px);", "}", ".mcp-button:where(.active, [aria-pressed='true']){", "  filter: brightness(0.98);", "}", ".mcp-button-primary{", "  background: var(--mcp-color-primary);", "  color: var(--mcp-color-primary-fg);", "  border-color: var(--mcp-color-primary);", "}", ".mcp-button-primary:where(:hover){", "  filter: brightness(0.98);", "}", ".mcp-button-secondary{", "  background: var(--mcp-color-secondary);", "  color: var(--mcp-color-secondary-fg);", "  border-color: var(--mcp-color-secondary);", "}", ".mcp-button-ghost{", "  background: transparent;", "  border-color: transparent;", "}", ".mcp-button-danger{", "  background: var(--mcp-color-danger);", "  color: var(--mcp-color-danger-fg);", "  border-color: var(--mcp-color-danger);", "}", ".mcp-toolbar{", "  display: inline-flex;", "  align-items: center;", "  border: 1px solid var(--mcp-color-border);", "  border-radius: var(--mcp-radius-m);", "}", ".mcp-toolbar .mcp-button{", "  border: 0;", "  border-radius: 0;", "}", ".mcp-toolbar .mcp-button + .mcp-button{", "  border-left: 1px solid var(--mcp-color-border);", "}", ".mcp-toolbar .mcp-button:first-child{", "  border-top-left-radius: var(--mcp-radius-m);", "  border-bottom-left-radius: var(--mcp-radius-m);", "}", ".mcp-toolbar .mcp-button:last-child{", "  border-top-right-radius: var(--mcp-radius-m);", "  border-bottom-right-radius: var(--mcp-radius-m);", "}", ".mcp-toolbar .mcp-button:where(.active, [aria-pressed='true']){", "  position: relative;", "  z-index: 1;", "}", ".mcp-input, .mcp-textarea, .mcp-select{", "  width: 100%;", "  padding: var(--mcp-space-xs) var(--mcp-space-s);", "  border: 1px solid var(--mcp-color-border);", "  border-radius: var(--mcp-radius-s);", "  background: var(--mcp-color-bg);", "  color: var(--mcp-color-fg);", "  font-size: var(--mcp-text-s);", "  line-height: var(--mcp-leading-normal);", "}", ".mcp-input:where(:focus), .mcp-textarea:where(:focus), .mcp-select:where(:focus){", "  outline: none;", "  border-color: var(--mcp-color-primary);", "  box-shadow: var(--mcp-ring) var(--mcp-ring-color);", "}", ".mcp-label{", "  display: block;", "  margin-bottom: var(--mcp-space-3xs);", "  font-size: var(--mcp-text-xs);", "  color: var(--mcp-color-muted-fg);", "}", ".mcp-card{", "  background: var(--mcp-surface);", "  border: 1px solid var(--mcp-color-border);", "  border-radius: var(--mcp-radius-l);", "  padding: var(--mcp-space-l);", "  box-shadow: var(--mcp-shadow-xs);", "}", ".mcp-panel{", "  background: var(--mcp-surface);", "  border: 1px solid var(--mcp-color-border);", "  border-radius: var(--mcp-radius-l);", "  padding: var(--mcp-space-l);", "  box-shadow: var(--mcp-shadow-xs);", "}", ".mcp-field{", "  display: flex;", "  flex-direction: column;", "  gap: var(--mcp-space-3xs);", "}", ".mcp-divider{", "  height: 1px;", "  background: var(--mcp-color-border);", "  border: 0;", "}", ".mcp-surface{", "  background: var(--mcp-color-muted);", "  border-radius: var(--mcp-radius-m);", "  padding: var(--mcp-space-m);", "}", ".mcp-badge{", "  display: inline-flex;", "  align-items: center;", "  padding: 0 var(--mcp-space-xs);", "  border-radius: var(--mcp-radius-round);", "  background: var(--mcp-color-secondary);", "  color: var(--mcp-color-secondary-fg);", "  font-size: var(--mcp-text-2xs);", "  line-height: 1.6;", "}", ".mcp-tag{", "  display: inline-flex;", "  align-items: center;", "  padding: 0 var(--mcp-space-xs);", "  border-radius: var(--mcp-radius-s);", "  background: var(--mcp-color-muted);", "  color: var(--mcp-color-muted-fg);", "  font-size: var(--mcp-text-2xs);", "  line-height: 1.6;", "}", ".mcp-divider{", "  height: 1px;", "  background: var(--mcp-color-border);", "}", ".mcp-text-muted{", "  color: var(--mcp-color-muted-fg);", "}", ".mcp-title{", "  font-size: var(--mcp-text-xl);", "  line-height: var(--mcp-leading-tight);", "  font-weight: var(--mcp-weight-bold);", "}", ".mcp-subtitle{", "  font-size: var(--mcp-text-l);", "  line-height: var(--mcp-leading-normal);", "  font-weight: var(--mcp-weight-medium);", "  color: var(--mcp-color-muted-fg);", "}"].join("\n");
export function buildThemeCss(inputs: ThemeInputs): string {
	const parts: string[] = [];
	const order = buildLayerOrder(inputs.layers);
	parts.push(`@layer ${order.join(", ")};`);
	parts.push(wrapLayer("mcp-default", utilityCss));
	const hostOverrides = normalizeCssInput(inputs.hostVariables);
	const overrides = normalizeCssInput(inputs.css);
	const combined = [hostOverrides, overrides].filter(Boolean).join("\n");
	if (combined) {
		parts.push(wrapLayer("mcp-user", combined));
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
export function applyHostStyleVariables(vars: McpHostStyleVariables, root: HTMLElement = document.documentElement): void {
	if (!vars || typeof vars !== "object" || !root?.style) {
		return;
	}
	for (const [key, value] of Object.entries(vars)) {
		if (!key.startsWith("--") || typeof value !== "string") {
			continue;
		}
		root.style.setProperty(key, value);
	}
}
export function applyHostFonts(fontCss: string, doc: Document = document): void {
	if (!fontCss || !doc) {
		return;
	}
	const styleId = "mcp-host-fonts";
	let style = doc.getElementById(styleId);
	if (!style) {
		style = doc.createElement("style");
		style.id = styleId;
		(doc.head || doc.documentElement).appendChild(style);
	}
	if (style.textContent !== fontCss) {
		style.textContent = fontCss;
	}
}
export function applyDocumentTheme(theme: McpHostTheme, root: HTMLElement = document.documentElement): void {
	if (!root) {
		return;
	}
	if (theme !== "light" && theme !== "dark") {
		return;
	}
	root.setAttribute("data-theme", theme);
	root.style.colorScheme = theme;
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
		if (key.startsWith("--mcp-") || key.startsWith("--color-") || key.startsWith("--font-") || key.startsWith("--border-") || key.startsWith("--shadow-")) {
			filtered[key] = value;
		}
	}
	return filtered;
}
