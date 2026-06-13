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
        if (!await fs.pathExists(filePath)) {
            return { entities: [], relations: [] };
        }

        try {
            const data = await fs.readJson(filePath);
            return KnowledgeGraphSchema.parse(data);
        } catch (error) {
            throw new Error(`Failed to read memory file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Writes the graph to disk atomically using a temporary file.
     * Ensures git-friendly sorting before write.
     */
    static async writeGraph(projectPath: string, graph: KnowledgeGraph): Promise<void> {
        const filePath = path.resolve(projectPath, MEMORY_FILE_PATH);
        const normalizedGraph = this.normalizeGraphForStorage(graph);

        try {
            await this.atomicWriteJson(filePath, normalizedGraph);
        } catch (error) {
            throw new Error(`Failed to write memory file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    static async readContext(projectPath: string): Promise<ProjectContext> {
        const filePath = path.resolve(projectPath, CONTEXT_FILE_PATH);
        if (!await fs.pathExists(filePath)) {
            return { status: "PLANNING", nextSteps: [] };
        }

        try {
            const data = await fs.readJson(filePath);
            return ProjectContextSchema.parse(data);
        } catch (error) {
            throw new Error(`Failed to read context file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    static async writeContext(projectPath: string, context: ProjectContext): Promise<void> {
        const filePath = path.resolve(projectPath, CONTEXT_FILE_PATH);

        try {
            context.updatedAt = new Date().toISOString();
            await this.atomicWriteJson(filePath, context);
        } catch (error) {
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
        const filePath = this.resolveProjectOutputPath(projectPath, outputPath || "KNOWLEDGE_GRAPH.md");

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

    private static normalizeGraphForStorage(graph: KnowledgeGraph): KnowledgeGraph {
        return {
            entities: graph.entities
                .map(entity => ({
                    ...entity,
                    observations: [...(entity.observations || [])].sort()
                }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            relations: [...graph.relations].sort((a, b) => {
                const fromComp = a.from.localeCompare(b.from);
                if (fromComp !== 0) return fromComp;
                const toComp = a.to.localeCompare(b.to);
                if (toComp !== 0) return toComp;
                return a.relationType.localeCompare(b.relationType);
            })
        };
    }

    private static async atomicWriteJson(filePath: string, data: unknown): Promise<void> {
        const dirPath = path.dirname(filePath);
        const tempPath = this.createTempPath(filePath);

        try {
            await fs.ensureDir(dirPath);
            await fs.writeJson(tempPath, data, { spaces: 2 });
            await fs.move(tempPath, filePath, { overwrite: true });
        } catch (error) {
            if (await fs.pathExists(tempPath)) {
                await fs.remove(tempPath);
            }
            throw error;
        }
    }

    private static createTempPath(filePath: string): string {
        const suffix = `${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
        return `${filePath}.${suffix}.tmp`;
    }

    private static resolveProjectOutputPath(projectPath: string, outputPath: string): string {
        if (path.isAbsolute(outputPath)) {
            throw new Error("Export outputPath must be relative to the project root.");
        }

        const projectRoot = path.resolve(projectPath);
        const filePath = path.resolve(projectRoot, outputPath);
        const relative = path.relative(projectRoot, filePath);

        if (relative.startsWith("..") || path.isAbsolute(relative)) {
            throw new Error("Export outputPath must stay inside the project root.");
        }

        return filePath;
    }
}
