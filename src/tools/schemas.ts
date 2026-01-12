import { z } from "zod";

const BaseSchema = {
    projectPath: z.string().describe("The absolute path to the project or any subdirectory within the project."),
    confirmNewProjectRoot: z.string().optional().describe("MUST be provided ONLY when initializing a new project. Set this to the 'detectedRoot' path returned by the server's confirmation request."),
};

export const EntitySchema = z.object({
    name: z.string().describe("Unique name of the entity"),
    entityType: z.string().describe("Category of the entity (e.g., CLASS, FUNCTION, MODULE)"),
    observations: z.array(z.string()).describe("List of facts or discoveries about this entity"),
});

export const RelationSchema = z.object({
    from: z.string().describe("Source entity name"),
    to: z.string().describe("Target entity name"),
    relationType: z.string().describe("Nature of the link (e.g., CALLS, EXTENDS, USES)"),
});

export const AddEntitiesSchema = z.object({
    ...BaseSchema,
    entities: z.array(EntitySchema),
});

export const AddObservationsSchema = z.object({
    ...BaseSchema,
    observations: z.array(z.object({
        entityName: z.string(),
        contents: z.array(z.string()),
    })),
});

export const CreateRelationsSchema = z.object({
    ...BaseSchema,
    relations: z.array(RelationSchema),
});

export const ReadGraphSchema = z.object({
    ...BaseSchema,
    summaryMode: z.boolean().optional().describe("If true, returns only entity names and types without detailed observations to save tokens."),
    limit: z.number().int().positive().optional().describe("Maximum number of entities to return."),
    offset: z.number().int().nonnegative().optional().describe("Number of entities to skip."),
});

export const GetGraphSummarySchema = z.object({
    ...BaseSchema,
    limit: z.number().int().positive().optional().describe("Maximum number of entities to return."),
    offset: z.number().int().nonnegative().optional().describe("Number of entities to skip."),
});

export const SearchSchema = z.object({
    ...BaseSchema,
    query: z.string().describe("Search keywords for entities, types, or observations"),
    limit: z.number().int().positive().optional().describe("Maximum number of entities to return."),
    offset: z.number().int().nonnegative().optional().describe("Number of entities to skip."),
    fuzzy: z.boolean().optional().describe("Enable fuzzy matching for typo tolerance and semantic similarity (default: true)."),
    minScore: z.number().min(0).max(1).optional().describe("Minimum relevance score threshold 0-1 (default: 0.3). Higher values return fewer but more relevant results."),
});

export const DeleteEntitiesSchema = z.object({
    ...BaseSchema,
    entityNames: z.array(z.string()).describe("Names of entities to delete"),
});

export const DeleteObservationsSchema = z.object({
    ...BaseSchema,
    deletions: z.array(z.object({
        entityName: z.string(),
        observations: z.array(z.string()),
    })),
});

export const DeleteRelationsSchema = z.object({
    ...BaseSchema,
    relations: z.array(RelationSchema),
});

export const OpenNodesSchema = z.object({
    ...BaseSchema,
    names: z.array(z.string()).describe("Names of entities to retrieve"),
});

export const ExportMarkdownSchema = z.object({
    ...BaseSchema,
    outputPath: z.string().optional().describe("Output file path relative to project root, defaults to KNOWLEDGE_GRAPH.md"),
});

export const UpdateContextSchema = z.object({
    ...BaseSchema,
    activeTask: z.string().optional().describe("Current task being performed"),
    status: z.enum(["IN_PROGRESS", "COMPLETED", "BLOCKED", "PLANNING"]).optional().describe("Current project status"),
    reason: z.string().optional().describe("Reason for current status (especially if BLOCKED)"),
    nextSteps: z.array(z.string()).optional().describe("Planned subsequent actions"),
    lastCommit: z.string().optional().describe("Hash or message of the last relevant git commit"),
});
