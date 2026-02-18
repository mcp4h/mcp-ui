export type CssInput = string | Record<string, string>;
export type ThemeInputs = {
    css?: CssInput | null;
    layers?: string[] | null;
};
export declare function buildThemeCss(inputs: ThemeInputs): string;
