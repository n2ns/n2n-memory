/**
 * Metadata definitions for all MCP tools.
 * Includes detailed descriptions and [MANDATORY PROTOCOLS].
 */
export const TOOL_DEFINITIONS = [
    {
        name: "n2n_add_entities",
        description: "[MANDATORY PROTOCOL] Record new entities. [INIT HANDSHAKE] If this is a new project, you must first call this to get the 'detectedRoot', then call again with 'confirmNewProjectRoot'. [SYNC RULE] Call BEFORE every 'git commit'.",
        inputSchema: { type: "object" } // Schema is managed via Zod in registerAll
    },
    {
        name: "n2n_add_observations",
        description: "[MANDATORY PROTOCOL] Append learnings. [INIT HANDSHAKE] Required for new projects. [SYNC RULE] Call BEFORE every 'git commit'.",
        inputSchema: { type: "object" }
    },
    {
        name: "n2n_create_relations",
        description: "[RECOMMENDED PROTOCOL] Map connections. [INIT HANDSHAKE] Required for new projects. [SYNC RULE] Call BEFORE every 'git commit'.",
        inputSchema: { type: "object" }
    },
    {
        name: "n2n_read_graph",
        description: "[START HERE] Read project memory and active context. [INIT HANDSHAKE] For new projects, provide 'confirmNewProjectRoot' matching the server's detection. [N2N-SYNC] Respect the 'Update before Commit' policy. Set 'summaryMode' to true for a lightweight index.",
        inputSchema: { type: "object" }
    },
    {
        name: "n2n_get_graph_summary",
        description: "Quickly fetch a list of all entity names and types plus a count of relations. Use this to get a 'map' of the project without consuming massive tokens.",
        inputSchema: { type: "object" }
    },
    {
        name: "n2n_update_context",
        description: "[MANDATORY PROTOCOL] Update task status and next steps. [INIT HANDSHAKE] Required for new projects. [SYNC RULE] MUST call BEFORE every 'git commit'.",
        inputSchema: { type: "object" }
    },
    {
        name: "n2n_search",
        description: "Search project memory by keyword. Helpful for locating specific context in large graphs.",
        inputSchema: { type: "object" }
    },
    {
        name: "n2n_delete_entities",
        description: "Remove outdated entities and their relations.",
        inputSchema: { type: "object" }
    },
    {
        name: "n2n_delete_observations",
        description: "Remove specific outdated observations.",
        inputSchema: { type: "object" }
    },
    {
        name: "n2n_delete_relations",
        description: "Remove outdated relations.",
        inputSchema: { type: "object" }
    },
    {
        name: "n2n_open_nodes",
        description: "Retrieve specific entities by name. Efficient alternative to full graph read.",
        inputSchema: { type: "object" }
    },
    {
        name: "n2n_export_markdown",
        description: "Export knowledge graph to Markdown for documentation or review.",
        inputSchema: { type: "object" }
    }
];
