#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { registerAll } from "./handlers/mcp-handlers.js";
import { checkEnvironment } from "./utils/env.js";
import { MemoryService } from "./core/memory-service.js";
import { logError, logInfo } from "./utils/logging.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

/**
 * N2N Memory MCP Server
 * Version is automatically read from package.json to ensure consistency.
 */
export const server = new McpServer({
    name: "n2n-memory",
    version: pkg.version,
}, {
    capabilities: {
        tools: {},
        resources: {}
    }
});

// Register all tools and resources defined in handlers
registerAll(server);

async function main() {
    checkEnvironment();
    const transport = new StdioServerTransport();

    // Graceful shutdown handlers
    const shutdown = async () => {
        logInfo("\n[System] Shutdown signal received...");
        await MemoryService.getInstance().shutdown();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // Use the internal server instance for connection
    await server.connect(transport);
    logInfo(`N2N Memory MCP server v${pkg.version} running on stdio`);
}

function isCliEntrypoint(): boolean {
    if (!process.argv[1]) return false;

    try {
        return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(path.resolve(process.argv[1]));
    } catch {
        return fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
    }
}

if (isCliEntrypoint()) {
    main().catch(async (error) => {
        logError("Fatal Server Error.", error);
        await MemoryService.getInstance().shutdown();
        process.exit(1);
    });
}
