import { z } from "zod";

export const EntitySchema = z.object({
    name: z.string().describe("Unique name of the entity"),
    entityType: z.string().describe("Type of entity (e.g. COMPONENT, CONCEPT, BUG)"),
    observations: z.array(z.string()).describe("A list of observations or facts about the entity"),
});

export const RelationSchema = z.object({
    from: z.string().describe("Name of the source entity"),
    to: z.string().describe("Name of the target entity"),
    relationType: z.string().describe("The type of relationship (e.g. DEPENDS_ON, IMPLEMENTS)"),
});

export const KnowledgeGraphSchema = z.object({
    entities: z.array(EntitySchema).default([]),
    relations: z.array(RelationSchema).default([]),
});

export const ProjectContextSchema = z.object({
    activeTask: z.string().optional().describe("Current task being performed"),
    status: z.enum(["IN_PROGRESS", "COMPLETED", "BLOCKED", "PLANNING"]).default("PLANNING"),
    reason: z.string().optional().describe("Reason for current status (especially if BLOCKED)"),
    nextSteps: z.array(z.string()).default([]).describe("Planned subsequent actions"),
    lastCommit: z.string().optional().describe("Hash or message of the last relevant git commit"),
    updatedAt: z.string().optional().describe("ISO timestamp of the last context update")
});

export type Entity = z.infer<typeof EntitySchema>;
export type Relation = z.infer<typeof RelationSchema>;
export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;
export type ProjectContext = z.infer<typeof ProjectContextSchema>;
