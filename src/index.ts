import { McpViewElement, defineMcpView } from "./mcp-view";
export { McpViewElement, defineMcpView };
export type { Resolver, ResolverResult } from "./mcp-view";
if (typeof window !== "undefined" && "customElements" in window) {
	defineMcpView();
}
