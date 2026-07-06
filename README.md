# Generic ERP Analytics MCP Server

Reusable Node.js + TypeScript MCP server for safe, read-only analytics over MongoDB-backed ERP databases.

The server is intentionally not ERP-specific. To use it with a different ERP database, change only:

- `.env`
- `src/catalog/schema-catalog.json`
- `src/catalog/relationship-map.json`

## Features

- MCP stdio server for LangGraph or other MCP clients
- MongoDB official driver with one reusable connection pool
- Zod validation for environment, catalog, and tool inputs
- Catalog-driven collection allowlist
- Read-only `find` and `aggregate` tools only
- Blocks system collections and write-like/dangerous operators
- Enforces `DEFAULT_QUERY_LIMIT`, `MAX_QUERY_LIMIT`, and `MAX_TIME_MS`
- Applies catalog default projections and rejects sensitive/non-analytics projected fields
- Structured JSON responses without raw stack traces

## Install

```bash
npm install
```

## Configure

Create a local `.env` from the example:

```bash
cp .env.example .env
```

Required variables:

```env
MONGO_URI=mongodb://readonly_user:change_me@localhost:27017/?authSource=admin
MONGO_DB_NAME=erp_database
MCP_SERVER_NAME=generic-erp-analytics
MCP_SERVER_VERSION=1.0.0
DEFAULT_QUERY_LIMIT=50
MAX_QUERY_LIMIT=500
MAX_TIME_MS=10000
```

## Create a Read-Only MongoDB User

Use a MongoDB account with permission to create users, then create a dedicated read-only user:

```javascript
use erp_database

db.createUser({
  user: "readonly_user",
  pwd: "change_me",
  roles: [
    { role: "read", db: "erp_database" }
  ]
})
```

Use that user in `MONGO_URI`. The application also enforces read-only access, but database-level read-only credentials are still required.

## Run

Development:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Start compiled server:

```bash
npm start
```

Typecheck:

```bash
npm run typecheck
```

## MCP Tools

`list_collections`

Returns only collection names defined in `schema-catalog.json`.

`describe_collection`

Input:

```json
{
  "collectionName": "example_records"
}
```

Returns catalog metadata, fields, allowed operations, default projection, and relations.

`get_schema_catalog`

Returns the full schema catalog.

`get_relationship_map`

Returns all catalog-defined relationships.

`run_find_query`

Input:

```json
{
  "collectionName": "example_records",
  "filter": {},
  "projection": {},
  "sort": {},
  "limit": 50
}
```

`run_aggregation_query`

Input:

```json
{
  "collectionName": "example_records",
  "pipeline": [],
  "limit": 50
}
```

The server automatically appends a safe `$project` when no aggregation projection is present and appends `$limit` when no `$limit` exists.

## Add a New ERP Schema

Edit `src/catalog/schema-catalog.json`:

```json
{
  "collections": {
    "collection_name": {
      "description": "What this collection stores",
      "primaryKey": "_id",
      "fields": {
        "fieldName": {
          "type": "string",
          "description": "Meaning of this field",
          "sensitive": false,
          "analytics": true
        }
      },
      "allowedOperations": ["find", "aggregate"],
      "defaultProjection": {},
      "relations": [
        {
          "targetCollection": "other_collection",
          "localField": "fieldName",
          "foreignField": "_id",
          "type": "many-to-one",
          "description": "How these records are connected"
        }
      ]
    }
  }
}
```

Edit `src/catalog/relationship-map.json`:

```json
{
  "relations": [
    {
      "fromCollection": "collection_a",
      "toCollection": "collection_b",
      "localField": "fieldName",
      "foreignField": "_id",
      "type": "many-to-one",
      "description": "Business meaning of relation"
    }
  ]
}
```

Restart the MCP server after changing the catalog. No TypeScript code changes are needed.

## FastAPI LangGraph MCP Client

This server starts with stdio transport. A FastAPI LangGraph process can launch it as a subprocess and connect through an MCP stdio client.

Conceptually:

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

server_params = StdioServerParameters(
    command="node",
    args=["dist/server.js"],
    env={
        "MONGO_URI": "...",
        "MONGO_DB_NAME": "...",
        "MCP_SERVER_NAME": "generic-erp-analytics",
        "MCP_SERVER_VERSION": "1.0.0",
        "DEFAULT_QUERY_LIMIT": "50",
        "MAX_QUERY_LIMIT": "500",
        "MAX_TIME_MS": "10000"
    }
)

async with stdio_client(server_params) as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()
        tools = await session.list_tools()
```

HTTP transport can be added later in `src/mcp/mcp.server.ts` without changing the tool or service layers.

## Security Notes

- Never use an admin MongoDB user for this server.
- Keep every collection allowlisted in `schema-catalog.json`.
- Mark sensitive fields with `"sensitive": true` and `"analytics": false`.
- Do not add write operations to `allowedOperations`; only `find` and `aggregate` are supported.
- Blocked operators include `$out`, `$merge`, `$function`, `$where`, and `$accumulator`.
