#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
    ErrorCode,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { MemoryManager } from "./memory-manager.js";
import { EntitySchema, RelationSchema } from "./types.js";

// Input Schemas for validation
const AddEntitiesSchema = z.object({
    projectPath: z.string(),
    entities: z.array(EntitySchema),
});

const AddObservationsSchema = z.object({
    projectPath: z.string(),
    observations: z.array(z.object({
        entityName: z.string(),
        contents: z.array(z.string()),
    })),
});

const CreateRelationsSchema = z.object({
    projectPath: z.string(),
    relations: z.array(RelationSchema),
});

const ReadGraphSchema = z.object({
    projectPath: z.string(),
});

const SearchSchema = z.object({
    projectPath: z.string(),
    query: z.string().describe("Search keywords for entities, types, or observations"),
});

export const server = new Server(
    {
        name: "n2n-memory",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
            resources: {},
        },
    }
);

// --- Handler Logic Extensions (Exported for Testing) ---
export const Handlers = {
    async listTools() {
        return {
            tools: [
                {
                    name: "n2n_add_entities",
                    description: "Add new entities (concepts, components, nodes) to the project-local knowledge graph. Use this when you discover a new significant part of the project architecture or a core concept.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            projectPath: { type: "string", description: "Absolute path to the project root" },
                            entities: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string", description: "Unique name of the entity" },
                                        entityType: { type: "string", description: "Category of the entity (e.g., CLASS, FUNCTION, MODULE, UI_COMPONENT)" },
                                        observations: { type: "array", items: { type: "string" }, description: "Initial facts or documentation fragments about this entity" },
                                    },
                                    required: ["name", "entityType", "observations"],
                                },
                            },
                        },
                        required: ["projectPath", "entities"],
                    },
                },
                {
                    name: "n2n_add_observations",
                    description: "Append new facts or discovery details to existing entities. Use this as you explore the code and learn more about how specific parts work.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            projectPath: { type: "string", description: "Absolute path to the project root" },
                            observations: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        entityName: { type: "string", description: "The name of the existing entity to update" },
                                        contents: { type: "array", items: { type: "string" }, description: "New specific facts or insights to add" },
                                    },
                                    required: ["entityName", "contents"],
                                },
                            },
                        },
                        required: ["projectPath", "observations"],
                    },
                },
                {
                    name: "n2n_create_relations",
                    description: "Define relationships between existing entities. Use this to map out dependencies, implementation details, or data flows (e.g., 'AuthService' IMPLEMENTS 'IAuth').",
                    inputSchema: {
                        type: "object",
                        properties: {
                            projectPath: { type: "string", description: "Absolute path to the project root" },
                            relations: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        from: { type: "string", description: "Source entity name" },
                                        to: { type: "string", description: "Target entity name" },
                                        relationType: { type: "string", description: "The nature of the link (e.g., CALLS, EXTENDS, USES, CONTAINS)" },
                                    },
                                    required: ["from", "to", "relationType"],
                                },
                            },
                        },
                        required: ["projectPath", "relations"],
                    },
                },
                {
                    name: "n2n_read_graph",
                    description: "Fetch the entire knowledge graph for the current project. Use this to get an overview of the system architecture and previously stored context.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            projectPath: { type: "string", description: "Absolute path to the project root" },
                        },
                        required: ["projectPath"],
                    },
                },
                {
                    name: "n2n_search",
                    description: "Search for specific entities, relations, or observations within the project knowledge graph using keywords. Useful for large projects where the full graph is too big to browse.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            projectPath: { type: "string", description: "Absolute path to the project root" },
                            query: { type: "string", description: "Keywords to search for in names, types, and observations" },
                        },
                        required: ["projectPath", "query"],
                    },
                },
            ],
        };
    },

    async callTool(name: string, args: any) {
        try {
            switch (name) {
                case "n2n_add_entities": {
                    const parsed = AddEntitiesSchema.parse(args);
                    await MemoryManager.addEntities(parsed.projectPath, parsed.entities);
                    return { content: [{ type: "text", text: `Success: Added ${parsed.entities.length} entities.` }] };
                }

                case "n2n_add_observations": {
                    const parsed = AddObservationsSchema.parse(args);
                    const addedCount = await MemoryManager.addObservations(parsed.projectPath, parsed.observations);
                    return { content: [{ type: "text", text: `Success: Added ${addedCount} observation fragments.` }] };
                }

                case "n2n_create_relations": {
                    const parsed = CreateRelationsSchema.parse(args);
                    await MemoryManager.createRelations(parsed.projectPath, parsed.relations);
                    return { content: [{ type: "text", text: `Success: Created ${parsed.relations.length} relations.` }] };
                }

                case "n2n_read_graph": {
                    const parsed = ReadGraphSchema.parse(args);
                    const graph = await MemoryManager.readGraph(parsed.projectPath);
                    return { content: [{ type: "text", text: JSON.stringify(graph, null, 2) }] };
                }

                case "n2n_search": {
                    const parsed = SearchSchema.parse(args);
                    const result = await MemoryManager.search(parsed.projectPath, parsed.query);
                    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
                }

                default:
                    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                return {
                    content: [{
                        type: "text",
                        text: `Validation Error: ${error.issues.map((i: z.ZodIssue) => `${i.path.join('.')}: ${i.message}`).join(', ')}`
                    }],
                    isError: true,
                };
            }
            return {
                content: [{ type: "text", text: `Execution Error: ${error instanceof Error ? error.message : String(error)}` }],
                isError: true,
            };
        }
    },

    async listResources() {
        return {
            resources: [
                {
                    uri: "mcp://memory/graph",
                    name: "Project Knowledge Graph",
                    description: "The complete knowledge graph stored in .mcp/memory.json",
                    mimeType: "application/json",
                }
            ]
        };
    },

    async readResource(uriString: string) {
        const uri = new URL(uriString);
        if (uri.protocol !== "mcp:" || uri.host !== "memory") {
            throw new McpError(ErrorCode.InvalidRequest, `Unknown resource URI: ${uriString}`);
        }

        const projectPath = uri.searchParams.get("path");
        if (!projectPath) {
            throw new McpError(ErrorCode.InvalidParams, "projectPath query parameter 'path' is required");
        }

        try {
            const graph = await MemoryManager.readGraph(projectPath);
            return {
                contents: [
                    {
                        uri: uriString,
                        mimeType: "application/json",
                        text: JSON.stringify(graph, null, 2),
                    }
                ]
            };
        } catch (error) {
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to read memory: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
};

// --- Resources ---
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return Handlers.listResources();
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    return Handlers.readResource(request.params.uri);
});

// --- Tools ---
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return Handlers.listTools();
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return Handlers.callTool(request.params.name, request.params.arguments);
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("N2N Memory MCP server running on stdio");
}

main().catch((error) => {
    console.error("Fatal Server Error:", error);
    process.exit(1);
});
