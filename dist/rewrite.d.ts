type RewriteOptions = {
    html: string;
    rootUri?: string | null;
    themeCss: string;
    themeLink?: string | null;
    bootstrapScript: string;
    allowRemote: (url: string) => boolean;
};
export declare function rewriteHtml(options: RewriteOptions): string;
export {};
