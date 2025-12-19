import fs from "fs-extra";
import path from "path";
import { KnowledgeGraph, KnowledgeGraphSchema, Entity, Relation } from "./types.js";

export const MEMORY_FILE_PATH = ".mcp/memory.json";

export class MemoryManager {
    static async readGraph(projectPath: string): Promise<KnowledgeGraph> {
        const filePath = path.resolve(projectPath, MEMORY_FILE_PATH);
        try {
            if (await fs.pathExists(filePath)) {
                const data = await fs.readJson(filePath);
                return KnowledgeGraphSchema.parse(data);
            }
        } catch (error) {
            throw new Error(`Failed to read memory file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
        return { entities: [], relations: [] };
    }

    static async writeGraph(projectPath: string, graph: KnowledgeGraph): Promise<void> {
        const filePath = path.resolve(projectPath, MEMORY_FILE_PATH);
        const dirPath = path.dirname(filePath);

        try {
            // Git-friendly sorting
            graph.entities.sort((a, b) => a.name.localeCompare(b.name));
            graph.entities.forEach(entity => {
                if (entity.observations) {
                    entity.observations.sort();
                } else {
                    entity.observations = [];
                }
            });
            graph.relations.sort((a, b) => {
                const fromComp = a.from.localeCompare(b.from);
                if (fromComp !== 0) return fromComp;
                const toComp = a.to.localeCompare(b.to);
                if (toComp !== 0) return toComp;
                return a.relationType.localeCompare(b.relationType);
            });

            await fs.ensureDir(dirPath);
            await fs.writeJson(filePath, graph, { spaces: 2 });
        } catch (error) {
            throw new Error(`Failed to write memory file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    static async addEntities(projectPath: string, newEntities: Entity[]): Promise<void> {
        const graph = await this.readGraph(projectPath);
        newEntities.forEach(newEntity => {
            const existing = graph.entities.find(e => e.name === newEntity.name);
            if (existing) {
                existing.observations = Array.from(new Set([...existing.observations, ...newEntity.observations]));
            } else {
                graph.entities.push(newEntity);
            }
        });
        await this.writeGraph(projectPath, graph);
    }

    static async addObservations(projectPath: string, observations: { entityName: string; contents: string[] }[]): Promise<number> {
        const graph = await this.readGraph(projectPath);
        let addedCount = 0;
        observations.forEach(obs => {
            const entity = graph.entities.find(e => e.name === obs.entityName);
            if (entity) {
                entity.observations = Array.from(new Set([...entity.observations, ...obs.contents]));
                addedCount += obs.contents.length;
            }
        });
        await this.writeGraph(projectPath, graph);
        return addedCount;
    }

    static async createRelations(projectPath: string, newRelations: Relation[]): Promise<void> {
        const graph = await this.readGraph(projectPath);
        newRelations.forEach(newRel => {
            const exists = graph.relations.some(r =>
                r.from === newRel.from && r.to === newRel.to && r.relationType === newRel.relationType
            );
            if (!exists) {
                graph.relations.push(newRel);
            }
        });
        await this.writeGraph(projectPath, graph);
    }

    static async search(projectPath: string, query: string): Promise<KnowledgeGraph> {
        const graph = await this.readGraph(projectPath);
        const lowerQuery = query.toLowerCase();

        const filteredEntities = graph.entities.filter(e =>
            e.name.toLowerCase().includes(lowerQuery) ||
            e.entityType.toLowerCase().includes(lowerQuery) ||
            e.observations.some(o => o.toLowerCase().includes(lowerQuery))
        );

        const entityNames = new Set(filteredEntities.map(e => e.name));

        const filteredRelations = graph.relations.filter(r =>
            r.from.toLowerCase().includes(lowerQuery) ||
            r.to.toLowerCase().includes(lowerQuery) ||
            r.relationType.toLowerCase().includes(lowerQuery) ||
            (entityNames.has(r.from) || entityNames.has(r.to))
        );

        return {
            entities: filteredEntities,
            relations: filteredRelations
        };
    }
}
