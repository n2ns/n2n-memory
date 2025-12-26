import { Mutex } from "async-mutex";
import lockfile from "proper-lockfile";
import fs from "fs-extra";
import path from "path";
import {
    KnowledgeGraph,
    Entity,
    Relation,
    ProjectContext
} from "../types.js";
import {
    MemoryManager,
    MEMORY_FILE_PATH,
    CONTEXT_FILE_PATH
} from "./memory-manager.js";

/**
 * MemoryService - High reliability dual-buffer memory manager.
 * - Snapshot Buffer: Instant in-memory reads for both Graph and Context.
 * - Write Queue: Sequentialized, atomic writes with independent cross-process locking for Graph and Context.
 */
export class MemoryService {
    private static instance: MemoryService;

    // Graph state
    private snapshots: Map<string, KnowledgeGraph> = new Map();
    private writeMutexes: Map<string, Mutex> = new Map();
    private lastMtimes: Map<string, number> = new Map();

    // Context state (Hot data)
    private contextSnapshots: Map<string, ProjectContext> = new Map();
    private contextMutexes: Map<string, Mutex> = new Map();
    private contextMtimes: Map<string, number> = new Map();

    // Resource Management
    private activeLocks: Map<string, () => Promise<void>> = new Map();
    private projectAccessOrder: string[] = [];
    private readonly MAX_PROJECTS = 20;

    private constructor() { }

    public static getInstance(): MemoryService {
        if (!MemoryService.instance) {
            MemoryService.instance = new MemoryService();
        }
        return MemoryService.instance;
    }

    /** @internal */
    public static resetInstance(): void {
        MemoryService.instance = new MemoryService();
    }

    /**
     * Gracefully shuts down the service, releasing all active file locks.
     */
    public async shutdown(): Promise<void> {
        console.error(`[MemoryService] Shutting down, releasing ${this.activeLocks.size} locks...`);
        const lockReleases = Array.from(this.activeLocks.values());
        await Promise.all(lockReleases.map(release => release().catch(() => { })));
        this.activeLocks.clear();
    }

    /**
     * Simple LRU pruning to prevent memory growth.
     */
    private touchProject(projectPath: string) {
        this.projectAccessOrder = this.projectAccessOrder.filter(p => p !== projectPath);
        this.projectAccessOrder.push(projectPath);

        if (this.projectAccessOrder.length > this.MAX_PROJECTS) {
            const oldest = this.projectAccessOrder.shift();
            if (oldest) {
                this.snapshots.delete(oldest);
                this.lastMtimes.delete(oldest);
                this.contextSnapshots.delete(oldest);
                this.contextMtimes.delete(oldest);
                this.writeMutexes.delete(oldest);
                this.contextMutexes.delete(oldest);
            }
        }
    }

    private getMutex(projectPath: string): Mutex {
        if (!this.writeMutexes.has(projectPath)) {
            this.writeMutexes.set(projectPath, new Mutex());
        }
        return this.writeMutexes.get(projectPath)!;
    }

    private getContextMutex(projectPath: string): Mutex {
        if (!this.contextMutexes.has(projectPath)) {
            this.contextMutexes.set(projectPath, new Mutex());
        }
        return this.contextMutexes.get(projectPath)!;
    }

    // --- Graph Operations ---

    public async loadSnapshot(projectPath: string): Promise<KnowledgeGraph> {
        this.touchProject(projectPath);
        const filePath = path.resolve(projectPath, MEMORY_FILE_PATH);
        try {
            if (await fs.pathExists(filePath)) {
                const stats = await fs.stat(filePath);
                const currentMtime = stats.mtimeMs;
                if (this.snapshots.has(projectPath) && this.lastMtimes.get(projectPath) === currentMtime) {
                    return this.snapshots.get(projectPath)!;
                }
                const graph = await MemoryManager.readGraph(projectPath);
                this.snapshots.set(projectPath, graph);
                this.lastMtimes.set(projectPath, currentMtime);
                return graph;
            }
        } catch (error) {
            console.error(`[MemoryService] Failed to load graph snapshot: ${error}`);
        }
        const emptyGraph = { entities: [], relations: [] };
        this.snapshots.set(projectPath, emptyGraph);
        return emptyGraph;
    }

    public async getGraph(projectPath: string): Promise<KnowledgeGraph> {
        if (!this.snapshots.has(projectPath)) {
            return await this.loadSnapshot(projectPath);
        }
        return this.snapshots.get(projectPath)!;
    }

    // --- Context Operations ---

    public async loadContextSnapshot(projectPath: string): Promise<ProjectContext> {
        this.touchProject(projectPath);
        const filePath = path.resolve(projectPath, CONTEXT_FILE_PATH);
        try {
            if (await fs.pathExists(filePath)) {
                const stats = await fs.stat(filePath);
                const currentMtime = stats.mtimeMs;
                if (this.contextSnapshots.has(projectPath) && this.contextMtimes.get(projectPath) === currentMtime) {
                    return this.contextSnapshots.get(projectPath)!;
                }
                const context = await MemoryManager.readContext(projectPath);
                this.contextSnapshots.set(projectPath, context);
                this.contextMtimes.set(projectPath, currentMtime);
                return context;
            }
        } catch (error) {
            console.error(`[MemoryService] Failed to load context snapshot: ${error}`);
        }
        const defaultContext: ProjectContext = { status: "PLANNING", nextSteps: [] };
        this.contextSnapshots.set(projectPath, defaultContext);
        return defaultContext;
    }

    public async getContext(projectPath: string): Promise<ProjectContext> {
        if (!this.contextSnapshots.has(projectPath)) {
            return await this.loadContextSnapshot(projectPath);
        }
        return this.contextSnapshots.get(projectPath)!;
    }

    /**
     * Updates project context with independent locking.
     */
    public async updateContext(projectPath: string, update: Partial<ProjectContext>): Promise<void> {
        const mutex = this.getContextMutex(projectPath);
        const filePath = path.resolve(projectPath, CONTEXT_FILE_PATH);
        const dirPath = path.dirname(filePath);

        await mutex.runExclusive(async () => {
            await fs.ensureDir(dirPath);
            const fileExists = await fs.pathExists(filePath);
            let release: (() => Promise<void>) | undefined;

            try {
                if (fileExists) {
                    release = await lockfile.lock(filePath, { retries: 5 });
                } else {
                    release = await lockfile.lock(dirPath, { retries: 5 });
                }
                this.activeLocks.set(filePath, release);

                const currentContext = await MemoryManager.readContext(projectPath);
                const updatedContext = { ...currentContext, ...update };

                await MemoryManager.writeContext(projectPath, updatedContext);

                // Update local snapshot
                const stats = await fs.stat(filePath);
                this.contextMtimes.set(projectPath, stats.mtimeMs);
                this.contextSnapshots.set(projectPath, updatedContext);
            } finally {
                if (release) {
                    this.activeLocks.delete(filePath);
                    await release();
                }
            }
        });
    }

    // --- Combined Operations ---

    public async getCompleteState(
        projectPath: string,
        options: { summaryMode?: boolean; limit?: number; offset?: number } = {}
    ): Promise<{
        graph: KnowledgeGraph;
        context: ProjectContext;
        totalEntityCount: number;
        isTruncated: boolean;
    }> {
        const [graph, context] = await Promise.all([
            this.getGraph(projectPath),
            this.getContext(projectPath)
        ]);

        const totalEntityCount = graph.entities.length;
        const offset = options.offset || 0;
        const limit = options.limit || totalEntityCount;
        const paginatedEntities = graph.entities.slice(offset, offset + limit);
        const isTruncated = (offset + limit) < totalEntityCount;

        const entities = options.summaryMode
            ? paginatedEntities.map(e => ({ name: e.name, entityType: e.entityType, observations: [] }))
            : paginatedEntities;

        // Filter relations to only include those where BOTH nodes are in the current page
        // to maintain UI/Logic consistency during paginated reading.
        const entityNameSet = new Set(paginatedEntities.map(e => e.name));
        const relations = graph.relations.filter(r => entityNameSet.has(r.from) && entityNameSet.has(r.to));

        return {
            graph: { entities, relations },
            context,
            totalEntityCount,
            isTruncated
        };
    }

    public async getGraphSummary(
        projectPath: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{
        entities: { name: string; type: string }[];
        relationCount: number;
        totalEntityCount: number;
        isTruncated: boolean;
    }> {
        const graph = await this.getGraph(projectPath);
        const totalEntityCount = graph.entities.length;
        const offset = options.offset || 0;
        const limit = options.limit || totalEntityCount;

        const paginated = graph.entities.slice(offset, offset + limit);
        const isTruncated = (offset + limit) < totalEntityCount;

        return {
            entities: paginated.map(e => ({ name: e.name, type: e.entityType })),
            relationCount: graph.relations.length,
            totalEntityCount,
            isTruncated
        };
    }

    // --- Mutation Helpers ---

    private async executeWrite(projectPath: string, updateFn: (graph: KnowledgeGraph) => void): Promise<void> {
        const mutex = this.getMutex(projectPath);
        const filePath = path.resolve(projectPath, MEMORY_FILE_PATH);
        const dirPath = path.dirname(filePath);

        await mutex.runExclusive(async () => {
            await fs.ensureDir(dirPath);
            const fileExists = await fs.pathExists(filePath);

            let release: (() => Promise<void>) | undefined;
            try {
                if (fileExists) {
                    release = await lockfile.lock(filePath, { retries: 5 });
                } else {
                    release = await lockfile.lock(dirPath, { retries: 5 });
                }
                this.activeLocks.set(filePath, release);

                const currentGraph = await MemoryManager.readGraph(projectPath);
                updateFn(currentGraph);
                await MemoryManager.writeGraph(projectPath, currentGraph);

                const stats = await fs.stat(filePath);
                this.lastMtimes.set(projectPath, stats.mtimeMs);
                this.snapshots.set(projectPath, currentGraph);

            } catch (error) {
                console.error(`[MemoryService] Write operation failed for ${projectPath}:`, error);
                throw error;
            } finally {
                if (release) {
                    this.activeLocks.delete(filePath);
                    await release();
                }
            }
        });
    }

    public async addEntities(projectPath: string, entities: Entity[]): Promise<void> {
        await this.executeWrite(projectPath, (graph) => {
            entities.forEach(newEntity => {
                const existing = graph.entities.find(e => e.name === newEntity.name);
                if (existing) {
                    existing.observations = Array.from(new Set([...existing.observations, ...newEntity.observations]));
                } else {
                    graph.entities.push(newEntity);
                }
            });
        });
    }

    public async addObservations(projectPath: string, observations: { entityName: string; contents: string[] }[]): Promise<number> {
        let count = 0;
        await this.executeWrite(projectPath, (graph) => {
            observations.forEach(obs => {
                const entity = graph.entities.find(e => e.name === obs.entityName);
                if (entity) {
                    const originalLen = entity.observations.length;
                    entity.observations = Array.from(new Set([...entity.observations, ...obs.contents]));
                    count += entity.observations.length - originalLen;
                }
            });
        });
        return count;
    }

    public async createRelations(projectPath: string, relations: Relation[]): Promise<void> {
        await this.executeWrite(projectPath, (graph) => {
            relations.forEach(newRel => {
                const exists = graph.relations.some(r =>
                    r.from === newRel.from && r.to === newRel.to && r.relationType === newRel.relationType
                );
                if (!exists) {
                    graph.relations.push(newRel);
                }
            });
        });
    }

    public async deleteEntities(projectPath: string, entityNames: string[]): Promise<number> {
        let count = 0;
        await this.executeWrite(projectPath, (graph) => {
            const namesToDelete = new Set(entityNames);
            const originalLen = graph.entities.length;
            graph.entities = graph.entities.filter(e => !namesToDelete.has(e.name));
            graph.relations = graph.relations.filter(r => !namesToDelete.has(r.from) && !namesToDelete.has(r.to));
            count = originalLen - graph.entities.length;
        });
        return count;
    }

    public async deleteObservations(projectPath: string, deletions: { entityName: string; observations: string[] }[]): Promise<number> {
        let count = 0;
        await this.executeWrite(projectPath, (graph) => {
            deletions.forEach(del => {
                const entity = graph.entities.find(e => e.name === del.entityName);
                if (entity) {
                    const obsToDelete = new Set(del.observations);
                    const originalLen = entity.observations.length;
                    entity.observations = entity.observations.filter(o => !obsToDelete.has(o));
                    count += originalLen - entity.observations.length;
                }
            });
        });
        return count;
    }

    public async deleteRelations(projectPath: string, relations: Relation[]): Promise<number> {
        let count = 0;
        await this.executeWrite(projectPath, (graph) => {
            const originalLen = graph.relations.length;
            graph.relations = graph.relations.filter(r =>
                !relations.some(del =>
                    del.from === r.from && del.to === r.to && del.relationType === r.relationType
                )
            );
            count = originalLen - graph.relations.length;
        });
        return count;
    }

    public async search(
        projectPath: string,
        query: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{
        graph: KnowledgeGraph;
        totalResults: number;
        isTruncated: boolean;
    }> {
        const graph = await this.getGraph(projectPath);
        const lowerQuery = query.toLowerCase();

        const filteredEntities = graph.entities.filter(e =>
            e.name.toLowerCase().includes(lowerQuery) ||
            e.entityType.toLowerCase().includes(lowerQuery) ||
            e.observations.some(o => o.toLowerCase().includes(lowerQuery))
        );

        const totalResults = filteredEntities.length;
        const offset = options.offset || 0;
        const limit = options.limit || totalResults;
        const paginatedEntities = filteredEntities.slice(offset, offset + limit);
        const isTruncated = (offset + limit) < totalResults;

        const entityNames = new Set(paginatedEntities.map(e => e.name));
        const filteredRelations = graph.relations.filter(r =>
            r.from.toLowerCase().includes(lowerQuery) ||
            r.to.toLowerCase().includes(lowerQuery) ||
            r.relationType.toLowerCase().includes(lowerQuery) ||
            (entityNames.has(r.from) || entityNames.has(r.to))
        );

        return {
            graph: { entities: paginatedEntities, relations: filteredRelations },
            totalResults,
            isTruncated
        };
    }
}
