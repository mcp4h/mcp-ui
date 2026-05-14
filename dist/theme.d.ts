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
};
export declare const mcpAppsDefaultVariables: Record<string, string>;
export declare function buildThemeCss(inputs: ThemeInputs): string;
export declare function applyHostStyleVariables(vars: McpHostStyleVariables, root?: HTMLElement): void;
export declare function applyHostFonts(fontCss: string, doc?: Document): void;
export declare function applyDocumentTheme(theme: McpHostTheme, root?: HTMLElement): void;
