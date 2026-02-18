export type ResourceKind = "document" | "style" | "script" | "img" | "media";
export type NormalizedResource = {
	ok: boolean;
	mime: string;
	body: Uint8Array;
	error?: string;
};
export async function normalizeResolverResult(result: unknown, kind: ResourceKind, uri: string): Promise<NormalizedResource> {
	try {
		if (result instanceof Response) {
			if (!result.ok) {
				return {
					ok: false,
					mime: "text/plain",
					body: new Uint8Array(),
					error: `HTTP ${result.status}`
				};
			}
			const body = new Uint8Array(await result.arrayBuffer());
			const mime = result.headers.get("content-type") || inferMime(kind, uri);
			return { ok: true, mime, body };
		}
		if (result instanceof Blob) {
			const body = new Uint8Array(await result.arrayBuffer());
			const mime = result.type || inferMime(kind, uri);
			return { ok: true, mime, body };
		}
		if (typeof result === "string") {
			const encoder = new TextEncoder();
			const body = encoder.encode(result);
			const mime = inferMime(kind, uri);
			return { ok: true, mime, body };
		}
		if (result instanceof ArrayBuffer) {
			const body = new Uint8Array(result);
			const mime = inferMime(kind, uri);
			return { ok: true, mime, body };
		}
		if (result instanceof Uint8Array) {
			const mime = inferMime(kind, uri);
			return { ok: true, mime, body: result };
		}
	}
	catch (error) {
		return {
			ok: false,
			mime: "text/plain",
			body: new Uint8Array(),
			error: error instanceof Error ? error.message : "Unknown error"
		};
	}
	return {
		ok: false,
		mime: "text/plain",
		body: new Uint8Array(),
		error: "Unsupported resolver result"
	};
}
export function inferMime(kind: ResourceKind, uri: string): string {
	if (kind === "document") return "text/html";
	if (kind === "style") return "text/css";
	if (kind === "script") return "text/javascript";
	const ext = getExtension(uri);
	if (ext) {
		const lookup: Record<string, string> = {
			css: "text/css",
			js: "text/javascript",
			mjs: "text/javascript",
			cjs: "text/javascript",
			json: "application/json",
			svg: "image/svg+xml",
			png: "image/png",
			jpg: "image/jpeg",
			jpeg: "image/jpeg",
			gif: "image/gif",
			webp: "image/webp",
			avif: "image/avif",
			woff: "font/woff",
			woff2: "font/woff2",
			ttf: "font/ttf",
			otf: "font/otf",
			mp3: "audio/mpeg",
			wav: "audio/wav",
			mp4: "video/mp4",
			webm: "video/webm"
		};
		if (lookup[ext]) return lookup[ext];
	}
	if (kind === "img") return "image/png";
	return "application/octet-stream";
}
function getExtension(uri: string): string | null {
	try {
		const url = new URL(uri);
		const path = url.pathname;
		const last = path.split("/").pop();
		if (!last || !last.includes(".")) return null;
		return last.split(".").pop()?.toLowerCase() || null;
	}
	catch {
		return null;
	}
}
