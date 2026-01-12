import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    ErrorCode,
    McpError,
    CallToolResult,
    ReadResourceResult
} from "@modelcontextprotocol/sdk/types.js";
import { TOOL_DEFINITIONS } from "../tools/definitions.js";
import * as Schemas from "../tools/schemas.js";
import { MemoryService } from "../core/memory-service.js";
import { MemoryManager } from "../core/memory-manager.js";
import { findProjectRoot } from "../utils/path-utils.js";
import { z } from "zod";

/**
 * N2N-SYNC Protocol reminders embedded in tool responses.
 * These are visible to ALL AI assistants regardless of client.
 */
const PROTOCOL = {
    AFTER_READ: {
        action: "MEMORY_LOADED",
        reminder: "Before 'git commit': call n2n_update_context to sync your progress.",
        policy: "Update memory when you learn new facts about this project."
    },
    AFTER_WRITE: {
        action: "MEMORY_UPDATED",
        reminder: "Remember to call n2n_update_context before 'git commit'.",
        tip: "Use n2n_read_graph at session start to restore context."
    },
    AFTER_CONTEXT_UPDATE: {
        action: "CONTEXT_SYNCED",
        reminder: "Context saved. You may now proceed with 'git commit'.",
        tip: "Call n2n_read_graph in your next session to restore this context."
    }
};

/**
 * Handlers object containing the core logic for each tool/resource.
 */
export const Handlers = {
    /**
     * Handles the Project Root Handshake.
     * Strictly enforces that memory is only initialized at project roots.
     */
    async resolveRootWithHandshake(args: any): Promise<string | CallToolResult> {
        const { projectPath, confirmNewProjectRoot } = args;
        let discovery;
        try {
            discovery = await findProjectRoot(projectPath);
        } catch (error) {
            // Strict rejection for non-project folders
            return {
                content: [{
                    type: "text",
                    text: error instanceof Error ? error.message : String(error)
                }],
                isError: true
            };
        }

        if (discovery.hasMcp) {
            return discovery.rootPath;
        }

        // New project initialization
        if (confirmNewProjectRoot === discovery.rootPath) {
            return discovery.rootPath;
        }

        // Handshake required for recognized projects that lack .mcp
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    status: "AWAITING_CONFIRMATION",
                    detectedRoot: discovery.rootPath,
                    markersFound: discovery.markersFound,
                    message: `N2N-Memory detected a valid project root at [${discovery.rootPath}]. ` +
                        `To initialize memory for this project, please call the tool again and include the 'confirmNewProjectRoot' parameter set to the 'detectedRoot' path above.`
                }, null, 2)
            }],
            isError: true
        };
    },

    async addEntities(args: any): Promise<CallToolResult> {
        const parsed = Schemas.AddEntitiesSchema.parse(args);
        const root = await this.resolveRootWithHandshake(parsed);
        if (typeof root !== 'string') return root;

        await MemoryService.getInstance().addEntities(root, parsed.entities);
        const response = {
            status: "success",
            message: `Added ${parsed.entities.length} entities to root: ${root}`,
            _protocol: PROTOCOL.AFTER_WRITE
        };
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
    },

    async addObservations(args: any): Promise<CallToolResult> {
        const parsed = Schemas.AddObservationsSchema.parse(args);
        const root = await this.resolveRootWithHandshake(parsed);
        if (typeof root !== 'string') return root;

        const addedCount = await MemoryService.getInstance().addObservations(root, parsed.observations);
        const response = {
            status: "success",
            message: `Added ${addedCount} observation fragments to root: ${root}`,
            _protocol: PROTOCOL.AFTER_WRITE
        };
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
    },

    async createRelations(args: any): Promise<CallToolResult> {
        const parsed = Schemas.CreateRelationsSchema.parse(args);
        const root = await this.resolveRootWithHandshake(parsed);
        if (typeof root !== 'string') return root;

        await MemoryService.getInstance().createRelations(root, parsed.relations);
        const response = {
            status: "success",
            message: `Created ${parsed.relations.length} relations in root: ${root}`,
            _protocol: PROTOCOL.AFTER_WRITE
        };
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
    },

    async readGraph(args: any): Promise<CallToolResult> {
        const parsed = Schemas.ReadGraphSchema.parse(args);
        const root = await this.resolveRootWithHandshake(parsed);
        if (typeof root !== 'string') return root;

        const state = await MemoryService.getInstance().getCompleteState(root, {
            summaryMode: parsed.summaryMode,
            limit: parsed.limit,
            offset: parsed.offset
        });

        // Embed protocol reminder in response (visible to all AI assistants)
        const response = {
            ...state,
            _protocol: PROTOCOL.AFTER_READ
        };

        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
    },

    async getGraphSummary(args: any): Promise<CallToolResult> {
        const parsed = Schemas.GetGraphSummarySchema.parse(args);
        const root = await this.resolveRootWithHandshake(parsed);
        if (typeof root !== 'string') return root;

        const result = await MemoryService.getInstance().getGraphSummary(root, {
            limit: parsed.limit,
            offset: parsed.offset
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },

    async updateContext(args: any): Promise<CallToolResult> {
        const parsed = Schemas.UpdateContextSchema.parse(args);
        const root = await this.resolveRootWithHandshake(parsed);
        if (typeof root !== 'string') return root;

        const { projectPath: _, confirmNewProjectRoot: __, ...updates } = parsed;
        await MemoryService.getInstance().updateContext(root, updates);
        const response = {
            status: "success",
            message: `Project context (hot-state) updated for root: ${root}`,
            _protocol: PROTOCOL.AFTER_CONTEXT_UPDATE
        };
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
    },

    async search(args: any): Promise<CallToolResult> {
        const parsed = Schemas.SearchSchema.parse(args);
        const root = await this.resolveRootWithHandshake(parsed);
        if (typeof root !== 'string') return root;

        const result = await MemoryService.getInstance().search(root, parsed.query, {
            limit: parsed.limit,
            offset: parsed.offset,
            fuzzy: parsed.fuzzy,
            minScore: parsed.minScore
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },

    async deleteEntities(args: any): Promise<CallToolResult> {
        const parsed = Schemas.DeleteEntitiesSchema.parse(args);
        const root = await this.resolveRootWithHandshake(parsed);
        if (typeof root !== 'string') return root;

        const deletedCount = await MemoryService.getInstance().deleteEntities(root, parsed.entityNames);
        const response = {
            status: "success",
            message: `Deleted ${deletedCount} entities from root: ${root}`,
            _protocol: PROTOCOL.AFTER_WRITE
        };
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
    },

    async deleteObservations(args: any): Promise<CallToolResult> {
        const parsed = Schemas.DeleteObservationsSchema.parse(args);
        const root = await this.resolveRootWithHandshake(parsed);
        if (typeof root !== 'string') return root;

        const deletedCount = await MemoryService.getInstance().deleteObservations(root, parsed.deletions);
        const response = {
            status: "success",
            message: `Deleted ${deletedCount} observations from root: ${root}`,
            _protocol: PROTOCOL.AFTER_WRITE
        };
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
    },

    async deleteRelations(args: any): Promise<CallToolResult> {
        const parsed = Schemas.DeleteRelationsSchema.parse(args);
        const root = await this.resolveRootWithHandshake(parsed);
        if (typeof root !== 'string') return root;

        const deletedCount = await MemoryService.getInstance().deleteRelations(root, parsed.relations);
        const response = {
            status: "success",
            message: `Deleted ${deletedCount} relations from root: ${root}`,
            _protocol: PROTOCOL.AFTER_WRITE
        };
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
    },

    async openNodes(args: any): Promise<CallToolResult> {
        const parsed = Schemas.OpenNodesSchema.parse(args);
        const root = await this.resolveRootWithHandshake(parsed);
        if (typeof root !== 'string') return root;

        const result = await MemoryManager.openNodes(root, parsed.names);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },

    async exportMarkdown(args: any): Promise<CallToolResult> {
        const parsed = Schemas.ExportMarkdownSchema.parse(args);
        const root = await this.resolveRootWithHandshake(parsed);
        if (typeof root !== 'string') return root;

        const filePath = await MemoryManager.exportToMarkdown(root, parsed.outputPath);
        const response = {
            status: "success",
            message: `Exported knowledge graph to ${filePath}`,
        };
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
    },

    async readResource(uriString: string): Promise<ReadResourceResult> {
        const uri = new URL(uriString);
        if (uri.protocol !== "mcp:" || uri.host !== "memory") {
            throw new McpError(ErrorCode.InvalidRequest, `Unknown resource URI: ${uriString}`);
        }
        const projectPath = uri.searchParams.get("path");
        if (!projectPath) {
            throw new McpError(ErrorCode.InvalidParams, "Project path query parameter 'path' is required. Use mcp://memory/graph?path=/your/project/path");
        }

        // Resources are tricky since they don't take extra arguments.
        // We assume resource reading is for established projects.
        const discovery = await findProjectRoot(projectPath);
        if (!discovery.hasMcp) {
            throw new McpError(ErrorCode.InvalidRequest, "Handshake required for new projects. Use tools first.");
        }

        const state = await MemoryService.getInstance().getCompleteState(discovery.rootPath);
        return {
            contents: [{
                uri: uriString,
                mimeType: "application/json",
                text: JSON.stringify(state, null, 2),
            }]
        };
    },

    async callTool(name: string, args: any): Promise<CallToolResult> {
        try {
            switch (name) {
                case "n2n_add_entities": return await this.addEntities(args);
                case "n2n_add_observations": return await this.addObservations(args);
                case "n2n_create_relations": return await this.createRelations(args);
                case "n2n_read_graph": return await this.readGraph(args);
                case "n2n_get_graph_summary": return await this.getGraphSummary(args);
                case "n2n_update_context": return await this.updateContext(args);
                case "n2n_search": return await this.search(args);
                case "n2n_delete_entities": return await this.deleteEntities(args);
                case "n2n_delete_observations": return await this.deleteObservations(args);
                case "n2n_delete_relations": return await this.deleteRelations(args);
                case "n2n_open_nodes": return await this.openNodes(args);
                case "n2n_export_markdown": return await this.exportMarkdown(args);
                default: throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            status: "error",
                            type: "validation_error",
                            message: `Validation Error: ${error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`
                        }, null, 2)
                    }],
                    isError: true,
                };
            }
            const message = error instanceof Error ? error.message : String(error);
            if (message.startsWith("Directory Not Recognized as a Project")) {
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            status: "error",
                            type: "project_recognition_error",
                            message: `Project Requirement Error: ${message}`
                        }, null, 2)
                    }],
                    isError: true,
                };
            }
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        status: "error",
                        type: "execution_error",
                        message: `Execution Error: ${message}`
                    }, null, 2)
                }],
                isError: true,
            };
        }
    },

    async listResources() {
        return {
            resources: [{
                uri: "mcp://memory/graph",
                name: "Project Knowledge Graph & Context (Legacy Support)",
                description: "The complete knowledge graph and active project context (Requires path parameter).",
                mimeType: "application/json",
            }],
            resourceTemplates: [{
                uriTemplate: "mcp://memory/graph?path={path}",
                name: "Project Knowledge Graph & Context",
                description: "Get the complete graph and active context for a specific project path.",
                mimeType: "application/json"
            }]
        };
    },

    async listTools() {
        return { tools: TOOL_DEFINITIONS };
    }
};

/**
 * Registers all tools and resources to the provided McpServer instance.
 */
export function registerAll(server: McpServer) {
    server.tool(
        "n2n_add_entities",
        Schemas.AddEntitiesSchema.shape,
        async (args) => {
            await server.server.sendLoggingMessage({
                level: "info",
                data: `Processing n2n_add_entities for path: ${args.projectPath}`,
            });
            return await Handlers.addEntities(args);
        }
    );

    server.tool(
        "n2n_add_observations",
        Schemas.AddObservationsSchema.shape,
        async (args) => {
            await server.server.sendLoggingMessage({
                level: "info",
                data: `Processing n2n_add_observations for path: ${args.projectPath}`,
            });
            return await Handlers.addObservations(args);
        }
    );

    server.tool(
        "n2n_create_relations",
        Schemas.CreateRelationsSchema.shape,
        async (args) => {
            await server.server.sendLoggingMessage({
                level: "info",
                data: `Processing n2n_create_relations for path: ${args.projectPath}`,
            });
            return await Handlers.createRelations(args);
        }
    );

    server.tool(
        "n2n_read_graph",
        Schemas.ReadGraphSchema.shape,
        async (args) => {
            await server.server.sendLoggingMessage({
                level: "info",
                data: `Reading graph for path: ${args.projectPath}`,
            });
            return await Handlers.readGraph(args);
        }
    );

    server.tool(
        "n2n_get_graph_summary",
        Schemas.GetGraphSummarySchema.shape,
        (args) => Handlers.getGraphSummary(args)
    );

    server.tool(
        "n2n_update_context",
        Schemas.UpdateContextSchema.shape,
        async (args) => {
            await server.server.sendLoggingMessage({
                level: "info",
                data: `Updating context for path: ${args.projectPath}`,
            });
            return await Handlers.updateContext(args);
        }
    );

    server.tool(
        "n2n_search",
        Schemas.SearchSchema.shape,
        (args) => Handlers.search(args)
    );

    server.tool(
        "n2n_delete_entities",
        Schemas.DeleteEntitiesSchema.shape,
        (args) => Handlers.deleteEntities(args)
    );

    server.tool(
        "n2n_delete_observations",
        Schemas.DeleteObservationsSchema.shape,
        (args) => Handlers.deleteObservations(args)
    );

    server.tool(
        "n2n_delete_relations",
        Schemas.DeleteRelationsSchema.shape,
        (args) => Handlers.deleteRelations(args)
    );

    server.tool(
        "n2n_open_nodes",
        Schemas.OpenNodesSchema.shape,
        (args) => Handlers.openNodes(args)
    );

    server.tool(
        "n2n_export_markdown",
        Schemas.ExportMarkdownSchema.shape,
        (args) => Handlers.exportMarkdown(args)
    );

    server.resource("graph", "mcp://memory/graph", (uri) => Handlers.readResource(uri.href));
}
