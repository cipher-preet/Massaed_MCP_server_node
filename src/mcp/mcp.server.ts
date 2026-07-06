import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { env } from "../config/env.js";
import { registerTools } from "./register-tools.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: env.MCP_SERVER_NAME,
    version: env.MCP_SERVER_VERSION
  });

  registerTools(server);
  return server;
}

export async function startStdioMcpServer(): Promise<McpServer> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}

export async function startHttpMcpServer(): Promise<never> {
  throw new Error("HTTP transport is not enabled yet. Add a streamable HTTP transport here when needed.");
}
