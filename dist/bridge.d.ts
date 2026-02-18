export type ResourceKind = "document" | "style" | "script" | "img" | "media";
export type NormalizedResource = {
    ok: boolean;
    mime: string;
    body: Uint8Array;
    error?: string;
};
export declare function normalizeResolverResult(result: unknown, kind: ResourceKind, uri: string): Promise<NormalizedResource>;
export declare function inferMime(kind: ResourceKind, uri: string): string;
