import { closeMongo, connectMongo } from "./db/mongo.client.js";
import { startStdioMcpServer } from "./mcp/mcp.server.js";
import { logger } from "./utils/logger.js";

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info(`Received ${signal}, shutting down`);
  await closeMongo();
  process.exit(0);
}

async function main(): Promise<void> {
  await connectMongo();
  await startStdioMcpServer();
  logger.info("MCP server started with stdio transport");
}

process.on("SIGINT", (signal) => {
  void shutdown(signal);
});

process.on("SIGTERM", (signal) => {
  void shutdown(signal);
});

main().catch(async (error: unknown) => {
  if (error instanceof Error) {
    logger.error("Failed to start MCP server", { message: error.message, stack: error.stack });
  } else {
    logger.error("Failed to start MCP server", { error });
  }

  await closeMongo();
  process.exit(1);
});
