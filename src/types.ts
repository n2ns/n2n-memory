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

export type Entity = z.infer<typeof EntitySchema>;
export type Relation = z.infer<typeof RelationSchema>;
export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;
