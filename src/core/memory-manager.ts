import fs from "fs-extra";
import path from "path";
import {
    KnowledgeGraph,
    KnowledgeGraphSchema,
    ProjectContext,
    ProjectContextSchema
} from "../types.js";

export const MEMORY_FILE_PATH = ".mcp/memory.json";
export const CONTEXT_FILE_PATH = ".mcp/context.json";

export class MemoryManager {
    static async readGraph(projectPath: string): Promise<KnowledgeGraph> {
        const filePath = path.resolve(projectPath, MEMORY_FILE_PATH);
        try {
            if (await fs.pathExists(filePath)) {
                const data = await fs.readJson(filePath);
                return KnowledgeGraphSchema.parse(data);
            }
        } catch (error) {
            console.error(`[MemoryManager] Read error at ${filePath}:`, error);
        }
        return { entities: [], relations: [] };
    }

    /**
     * Writes the graph to disk atomically using a temporary file.
     * Ensures git-friendly sorting before write.
     */
    static async writeGraph(projectPath: string, graph: KnowledgeGraph): Promise<void> {
        const filePath = path.resolve(projectPath, MEMORY_FILE_PATH);
        const tempPath = `${filePath}.${Date.now()}.tmp`;
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

            // 1. Write to temporary file
            await fs.writeJson(tempPath, graph, { spaces: 2 });

            // 2. Atomic rename
            await fs.move(tempPath, filePath, { overwrite: true });

        } catch (error) {
            // Cleanup temp file if it exists and write failed
            if (await fs.pathExists(tempPath)) {
                await fs.remove(tempPath);
            }
            throw new Error(`Failed to write memory file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    static async readContext(projectPath: string): Promise<ProjectContext> {
        const filePath = path.resolve(projectPath, CONTEXT_FILE_PATH);
        try {
            if (await fs.pathExists(filePath)) {
                const data = await fs.readJson(filePath);
                return ProjectContextSchema.parse(data);
            }
        } catch (error) {
            console.error(`[MemoryManager] Context read error at ${filePath}:`, error);
        }
        return { status: "PLANNING", nextSteps: [] };
    }

    static async writeContext(projectPath: string, context: ProjectContext): Promise<void> {
        const filePath = path.resolve(projectPath, CONTEXT_FILE_PATH);
        const tempPath = `${filePath}.${Date.now()}.tmp`;
        const dirPath = path.dirname(filePath);

        try {
            context.updatedAt = new Date().toISOString();
            await fs.ensureDir(dirPath);
            await fs.writeJson(tempPath, context, { spaces: 2 });
            await fs.move(tempPath, filePath, { overwrite: true });
        } catch (error) {
            if (await fs.pathExists(tempPath)) {
                await fs.remove(tempPath);
            }
            throw new Error(`Failed to write context file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    static async openNodes(projectPath: string, names: string[]): Promise<KnowledgeGraph> {
        const graph = await this.readGraph(projectPath);
        const nameSet = new Set(names);

        const filteredEntities = graph.entities.filter(e => nameSet.has(e.name));
        const entityNames = new Set(filteredEntities.map(e => e.name));

        const filteredRelations = graph.relations.filter(r =>
            entityNames.has(r.from) && entityNames.has(r.to)
        );

        return {
            entities: filteredEntities,
            relations: filteredRelations
        };
    }

    static async exportToMarkdown(projectPath: string, outputPath?: string): Promise<string> {
        const graph = await this.readGraph(projectPath);
        const filePath = path.resolve(projectPath, outputPath || "KNOWLEDGE_GRAPH.md");

        let md = "# Knowledge Graph\n\n";
        md += `> Generated from \`${MEMORY_FILE_PATH}\`\n\n`;

        md += "## Entities\n\n";
        if (graph.entities.length === 0) {
            md += "_No entities found._\n\n";
        } else {
            for (const entity of graph.entities) {
                md += `### ${entity.name}\n\n`;
                md += `- **Type**: \`${entity.entityType}\`\n`;
                if (entity.observations.length > 0) {
                    md += `- **Observations**:\n`;
                    for (const obs of entity.observations) {
                        md += `  - ${obs}\n`;
                    }
                }
                md += "\n";
            }
        }

        md += "## Relations\n\n";
        if (graph.relations.length === 0) {
            md += "_No relations found._\n\n";
        } else {
            md += "| From | Relation | To |\n";
            md += "|------|----------|----|\n";
            for (const rel of graph.relations) {
                md += `| ${rel.from} | ${rel.relationType} | ${rel.to} |\n`;
            }
            md += "\n";
        }

        await fs.writeFile(filePath, md, "utf-8");
        return filePath;
    }
}
