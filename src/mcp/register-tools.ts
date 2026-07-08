import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describeCollectionTool } from "../tools/describeCollection.tool.js";
import { getRelationshipMapByDomainTool } from "../tools/getRelationshipMapByDomain.tool.js";
import { getRelationshipMapTool } from "../tools/getRelationshipMap.tool.js";
import { getSchemaCatalogByDomainTool } from "../tools/getSchemaCatalogByDomain.tool.js";
import { getSchemaCatalogTool } from "../tools/getSchemaCatalog.tool.js";
import { listCollectionsTool } from "../tools/listCollections.tool.js";
import { runAggregationQueryTool } from "../tools/runAggregationQuery.tool.js";
import { runFindQueryTool } from "../tools/runFindQuery.tool.js";

const tools = [
  listCollectionsTool,
  describeCollectionTool,
  getSchemaCatalogTool,
  getSchemaCatalogByDomainTool,
  getRelationshipMapTool,
  getRelationshipMapByDomainTool,
  runFindQueryTool,
  runAggregationQueryTool
];

export function registerTools(server: McpServer): void {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema
      },
      tool.handler as Parameters<typeof server.registerTool>[2]
    );
  }
}
