#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRequire } from "module";
import { registerAll } from "./handlers/mcp-handlers.js";
import { checkEnvironment } from "./utils/env.js";
import { MemoryService } from "./core/memory-service.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

/**
 * N2N Memory MCP Server
 * Version is automatically read from package.json to ensure consistency.
 */
export const server = new McpServer({
    name: "n2n-memory",
    version: pkg.version,
});

// Register all tools and resources defined in handlers
registerAll(server);

async function main() {
    checkEnvironment();
    const transport = new StdioServerTransport();

    // Graceful shutdown handlers
    const shutdown = async () => {
        console.error("\n[System] Shutdown signal received...");
        await MemoryService.getInstance().shutdown();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // Use the internal server instance for connection
    await server.connect(transport);
    console.error(`N2N Memory MCP server v${pkg.version} running on stdio`);
}

main().catch(async (error) => {
    console.error("Fatal Server Error:", error);
    await MemoryService.getInstance().shutdown();
    process.exit(1);
});
