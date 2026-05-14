type RewriteOptions = {
    html: string;
    rootUri?: string | null;
    themeCss: string;
    themeLink?: string | null;
    bootstrapScript: string;
    allowRemote: (url: string) => boolean;
    resourceBase?: string | null;
    csp?: string | null;
};
export declare function rewriteHtml(options: RewriteOptions): string;
export {};
