import { expect } from "chai";
import sinon from "sinon";
import fs from "fs-extra";
import lockfile from "proper-lockfile";
import { MemoryService } from "../core/memory-service.js";
import { MemoryManager } from "../core/memory-manager.js";

describe("MemoryService", () => {
    const mockProjectPath = "/test/project";

    beforeEach(() => {
        MemoryService.resetInstance();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe("Singleton", () => {
        it("should return the same instance", () => {
            const instance1 = MemoryService.getInstance();
            const instance2 = MemoryService.getInstance();
            expect(instance1).to.equal(instance2);
        });

        it("should create new instance after reset", () => {
            const instance1 = MemoryService.getInstance();
            MemoryService.resetInstance();
            const instance2 = MemoryService.getInstance();
            expect(instance1).to.not.equal(instance2);
        });
    });

    describe("Snapshot Management", () => {
        it("should load and cache graph snapshots", async () => {
            const mockGraph = { entities: [{ name: "A", entityType: "T", observations: [] }], relations: [] };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "stat").resolves({ mtimeMs: 100 } as any);
            const readStub = sinon.stub(MemoryManager, "readGraph").resolves(mockGraph);

            const service = MemoryService.getInstance();

            // First load
            const graph1 = await service.loadSnapshot(mockProjectPath);
            expect(graph1).to.deep.equal(mockGraph);
            expect(readStub.calledOnce).to.be.true;

            // Second load with same mtime (should hit cache)
            const graph2 = await service.loadSnapshot(mockProjectPath);
            expect(graph2).to.equal(graph1);
            expect(readStub.calledOnce).to.be.true; // Still once
        });

        it("should refresh graph snapshot if mtime change detected", async () => {
            const service = MemoryService.getInstance();
            sinon.stub(fs, "pathExists").resolves(true);
            const statStub = sinon.stub(fs, "stat");
            const readStub = sinon.stub(MemoryManager, "readGraph");

            // Initial load
            statStub.onCall(0).resolves({ mtimeMs: 100 } as any);
            readStub.onCall(0).resolves({ entities: [], relations: [] });
            await service.loadSnapshot(mockProjectPath);

            // Trigger change
            statStub.onCall(1).resolves({ mtimeMs: 200 } as any);
            readStub.onCall(1).resolves({ entities: [{ name: "New", entityType: "T", observations: [] }], relations: [] });

            const graph = await service.loadSnapshot(mockProjectPath);
            expect(graph.entities[0]!.name).to.equal("New");
            expect(readStub.calledTwice).to.be.true;
        });

        it("should return empty graph if file does not exist", async () => {
            sinon.stub(fs, "pathExists").resolves(false);
            const service = MemoryService.getInstance();
            const graph = await service.loadSnapshot(mockProjectPath);
            expect(graph).to.deep.equal({ entities: [], relations: [] });
        });

        it("should load and cache context snapshots", async () => {
            const mockContext = { status: "IN_PROGRESS" as const, nextSteps: ["Step 1"], activeTask: "Testing" };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "stat").resolves({ mtimeMs: 100 } as any);
            const readStub = sinon.stub(MemoryManager, "readContext").resolves(mockContext);

            const service = MemoryService.getInstance();

            // First load
            const context1 = await service.loadContextSnapshot(mockProjectPath);
            expect(context1.activeTask).to.equal("Testing");
            expect(readStub.calledOnce).to.be.true;

            // Second load with same mtime (should hit cache)
            const context2 = await service.loadContextSnapshot(mockProjectPath);
            expect(context2).to.equal(context1);
            expect(readStub.calledOnce).to.be.true;
        });

        it("should return default context if file does not exist", async () => {
            sinon.stub(fs, "pathExists").resolves(false);
            const service = MemoryService.getInstance();
            const context = await service.loadContextSnapshot(mockProjectPath);
            expect(context.status).to.equal("PLANNING");
            expect(context.nextSteps).to.deep.equal([]);
        });
    });

    describe("Write Operations (Reliability)", () => {
        it("should acquire cross-process lock and call writeGraph", async () => {
            sinon.stub(fs, "ensureDir").resolves();
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "stat").resolves({ mtimeMs: 123 } as any);
            sinon.stub(MemoryManager, "readGraph").resolves({ entities: [], relations: [] });
            const writeStub = sinon.stub(MemoryManager, "writeGraph").resolves();

            const lockStub = sinon.stub(lockfile, "lock").resolves(async () => { });

            const service = MemoryService.getInstance();
            await service.addEntities(mockProjectPath, [{ name: "X", entityType: "T", observations: [] }]);

            expect(lockStub.calledOnce).to.be.true;
            expect(writeStub.calledOnce).to.be.true;
        });

        it("should update project context independently", async () => {
            sinon.stub(fs, "ensureDir").resolves();
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "stat").resolves({ mtimeMs: 456 } as any);
            sinon.stub(MemoryManager, "readContext").resolves({ status: "PLANNING", nextSteps: [] });
            const writeStub = sinon.stub(MemoryManager, "writeContext").resolves();
            sinon.stub(lockfile, "lock").resolves(async () => { });

            const service = MemoryService.getInstance();
            await service.updateContext(mockProjectPath, { activeTask: "Coding", status: "IN_PROGRESS" });

            expect(writeStub.calledOnce).to.be.true;
            const saved = writeStub.firstCall.args[1] as any;
            expect(saved.activeTask).to.equal("Coding");
        });
    });

    describe("Entity Operations", () => {
        let service: MemoryService;

        beforeEach(() => {
            service = MemoryService.getInstance();
            sinon.stub(fs, "ensureDir").resolves();
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "stat").resolves({ mtimeMs: 100 } as any);
            sinon.stub(lockfile, "lock").resolves(async () => { });
        });

        it("should add new entities", async () => {
            sinon.stub(MemoryManager, "readGraph").resolves({ entities: [], relations: [] });
            const writeStub = sinon.stub(MemoryManager, "writeGraph").resolves();

            await service.addEntities(mockProjectPath, [
                { name: "Entity1", entityType: "TYPE1", observations: ["obs1"] },
                { name: "Entity2", entityType: "TYPE2", observations: ["obs2"] }
            ]);

            expect(writeStub.calledOnce).to.be.true;
            const savedGraph = writeStub.firstCall.args[1];
            expect(savedGraph.entities).to.have.length(2);
            expect(savedGraph.entities[0].name).to.equal("Entity1");
        });

        it("should merge observations for existing entities", async () => {
            sinon.stub(MemoryManager, "readGraph").resolves({
                entities: [{ name: "Entity1", entityType: "TYPE1", observations: ["existing"] }],
                relations: []
            });
            const writeStub = sinon.stub(MemoryManager, "writeGraph").resolves();

            await service.addEntities(mockProjectPath, [
                { name: "Entity1", entityType: "TYPE1", observations: ["new"] }
            ]);

            const savedGraph = writeStub.firstCall.args[1];
            expect(savedGraph.entities[0].observations).to.include.members(["existing", "new"]);
        });

        it("should delete entities and their relations", async () => {
            sinon.stub(MemoryManager, "readGraph").resolves({
                entities: [
                    { name: "A", entityType: "T", observations: [] },
                    { name: "B", entityType: "T", observations: [] },
                    { name: "C", entityType: "T", observations: [] }
                ],
                relations: [
                    { from: "A", to: "B", relationType: "X" },
                    { from: "B", to: "C", relationType: "Y" }
                ]
            });
            const writeStub = sinon.stub(MemoryManager, "writeGraph").resolves();

            const deletedCount = await service.deleteEntities(mockProjectPath, ["A", "B"]);

            expect(deletedCount).to.equal(2);
            const savedGraph = writeStub.firstCall.args[1];
            expect(savedGraph.entities).to.have.length(1);
            expect(savedGraph.entities[0].name).to.equal("C");
            expect(savedGraph.relations).to.have.length(0); // All relations involve A or B
        });
    });

    describe("Observation Operations", () => {
        let service: MemoryService;

        beforeEach(() => {
            service = MemoryService.getInstance();
            sinon.stub(fs, "ensureDir").resolves();
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "stat").resolves({ mtimeMs: 100 } as any);
            sinon.stub(lockfile, "lock").resolves(async () => { });
        });

        it("should add observations to existing entities", async () => {
            sinon.stub(MemoryManager, "readGraph").resolves({
                entities: [{ name: "Entity1", entityType: "T", observations: ["old"] }],
                relations: []
            });
            const writeStub = sinon.stub(MemoryManager, "writeGraph").resolves();

            const count = await service.addObservations(mockProjectPath, [
                { entityName: "Entity1", contents: ["new1", "new2"] }
            ]);

            expect(count).to.equal(2);
            const savedGraph = writeStub.firstCall.args[1];
            expect(savedGraph.entities[0].observations).to.include.members(["old", "new1", "new2"]);
        });

        it("should deduplicate observations", async () => {
            sinon.stub(MemoryManager, "readGraph").resolves({
                entities: [{ name: "Entity1", entityType: "T", observations: ["existing"] }],
                relations: []
            });
            const writeStub = sinon.stub(MemoryManager, "writeGraph").resolves();

            const count = await service.addObservations(mockProjectPath, [
                { entityName: "Entity1", contents: ["existing", "new"] }
            ]);

            expect(count).to.equal(1); // Only "new" is added
            const savedGraph = writeStub.firstCall.args[1];
            expect(savedGraph.entities[0].observations).to.have.length(2);
        });

        it("should skip non-existent entities when adding observations", async () => {
            sinon.stub(MemoryManager, "readGraph").resolves({
                entities: [{ name: "Entity1", entityType: "T", observations: [] }],
                relations: []
            });
            const _writeStub = sinon.stub(MemoryManager, "writeGraph").resolves();

            const count = await service.addObservations(mockProjectPath, [
                { entityName: "NonExistent", contents: ["obs"] }
            ]);

            expect(count).to.equal(0);
        });

        it("should delete specific observations from entities", async () => {
            sinon.stub(MemoryManager, "readGraph").resolves({
                entities: [{ name: "Entity1", entityType: "T", observations: ["keep", "delete1", "delete2"] }],
                relations: []
            });
            const writeStub = sinon.stub(MemoryManager, "writeGraph").resolves();

            const count = await service.deleteObservations(mockProjectPath, [
                { entityName: "Entity1", observations: ["delete1", "delete2"] }
            ]);

            expect(count).to.equal(2);
            const savedGraph = writeStub.firstCall.args[1];
            expect(savedGraph.entities[0].observations).to.deep.equal(["keep"]);
        });
    });

    describe("Relation Operations", () => {
        let service: MemoryService;

        beforeEach(() => {
            service = MemoryService.getInstance();
            sinon.stub(fs, "ensureDir").resolves();
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "stat").resolves({ mtimeMs: 100 } as any);
            sinon.stub(lockfile, "lock").resolves(async () => { });
        });

        it("should create new relations", async () => {
            sinon.stub(MemoryManager, "readGraph").resolves({ entities: [], relations: [] });
            const writeStub = sinon.stub(MemoryManager, "writeGraph").resolves();

            await service.createRelations(mockProjectPath, [
                { from: "A", to: "B", relationType: "USES" },
                { from: "B", to: "C", relationType: "EXTENDS" }
            ]);

            const savedGraph = writeStub.firstCall.args[1];
            expect(savedGraph.relations).to.have.length(2);
        });

        it("should not create duplicate relations", async () => {
            sinon.stub(MemoryManager, "readGraph").resolves({
                entities: [],
                relations: [{ from: "A", to: "B", relationType: "USES" }]
            });
            const writeStub = sinon.stub(MemoryManager, "writeGraph").resolves();

            await service.createRelations(mockProjectPath, [
                { from: "A", to: "B", relationType: "USES" }
            ]);

            const savedGraph = writeStub.firstCall.args[1];
            expect(savedGraph.relations).to.have.length(1);
        });

        it("should delete specific relations", async () => {
            sinon.stub(MemoryManager, "readGraph").resolves({
                entities: [],
                relations: [
                    { from: "A", to: "B", relationType: "X" },
                    { from: "B", to: "C", relationType: "Y" },
                    { from: "C", to: "D", relationType: "Z" }
                ]
            });
            const writeStub = sinon.stub(MemoryManager, "writeGraph").resolves();

            const count = await service.deleteRelations(mockProjectPath, [
                { from: "A", to: "B", relationType: "X" },
                { from: "C", to: "D", relationType: "Z" }
            ]);

            expect(count).to.equal(2);
            const savedGraph = writeStub.firstCall.args[1];
            expect(savedGraph.relations).to.have.length(1);
            expect(savedGraph.relations[0]).to.deep.equal({ from: "B", to: "C", relationType: "Y" });
        });
    });

    describe("Search Operations", () => {
        let service: MemoryService;

        beforeEach(() => {
            service = MemoryService.getInstance();
        });

        it("should search entities by name", async () => {
            sinon.stub(service, "getGraph").resolves({
                entities: [
                    { name: "UserService", entityType: "CLASS", observations: [] },
                    { name: "ProductService", entityType: "CLASS", observations: [] },
                    { name: "Helper", entityType: "UTIL", observations: [] }
                ],
                relations: []
            });

            const result = await service.search(mockProjectPath, "Service");

            expect(result.graph.entities).to.have.length(2);
            expect(result.totalResults).to.equal(2);
        });

        it("should search entities by type", async () => {
            sinon.stub(service, "getGraph").resolves({
                entities: [
                    { name: "A", entityType: "COMPONENT", observations: [] },
                    { name: "B", entityType: "SERVICE", observations: [] },
                    { name: "C", entityType: "COMPONENT", observations: [] }
                ],
                relations: []
            });

            const result = await service.search(mockProjectPath, "COMPONENT");

            expect(result.graph.entities).to.have.length(2);
        });

        it("should search entities by observation content", async () => {
            sinon.stub(service, "getGraph").resolves({
                entities: [
                    { name: "A", entityType: "T", observations: ["handles authentication"] },
                    { name: "B", entityType: "T", observations: ["manages data"] },
                    { name: "C", entityType: "T", observations: ["auth token validation"] }
                ],
                relations: []
            });

            const result = await service.search(mockProjectPath, "auth");

            expect(result.graph.entities).to.have.length(2);
        });

        it("should support pagination in search", async () => {
            sinon.stub(service, "getGraph").resolves({
                entities: [
                    { name: "Match1", entityType: "T", observations: [] },
                    { name: "Match2", entityType: "T", observations: [] },
                    { name: "Match3", entityType: "T", observations: [] }
                ],
                relations: []
            });

            const result = await service.search(mockProjectPath, "Match", { limit: 2, offset: 1 });

            expect(result.graph.entities).to.have.length(2);
            expect(result.graph.entities[0].name).to.equal("Match2");
            expect(result.isTruncated).to.be.false;
            expect(result.totalResults).to.equal(3);
        });

        it("should include related relations in search results", async () => {
            sinon.stub(service, "getGraph").resolves({
                entities: [
                    { name: "Target", entityType: "T", observations: [] },
                    { name: "Other", entityType: "T", observations: [] }
                ],
                relations: [
                    { from: "Target", to: "Other", relationType: "X" },
                    { from: "Unrelated", to: "Unrelated2", relationType: "Y" }
                ]
            });

            const result = await service.search(mockProjectPath, "Target");

            expect(result.graph.relations).to.have.length(1);
            expect(result.graph.relations[0].from).to.equal("Target");
        });
    });

    describe("Graph Summary", () => {
        let service: MemoryService;

        beforeEach(() => {
            service = MemoryService.getInstance();
        });

        it("should return entity names and types with relation count", async () => {
            sinon.stub(service, "getGraph").resolves({
                entities: [
                    { name: "A", entityType: "TYPE1", observations: ["obs1", "obs2"] },
                    { name: "B", entityType: "TYPE2", observations: [] }
                ],
                relations: [
                    { from: "A", to: "B", relationType: "X" }
                ]
            });

            const result = await service.getGraphSummary(mockProjectPath);

            expect(result.entities).to.have.length(2);
            expect(result.entities[0]).to.deep.equal({ name: "A", type: "TYPE1" });
            expect(result.relationCount).to.equal(1);
            expect(result.totalEntityCount).to.equal(2);
        });

        it("should support pagination in summary", async () => {
            sinon.stub(service, "getGraph").resolves({
                entities: [
                    { name: "A", entityType: "T", observations: [] },
                    { name: "B", entityType: "T", observations: [] },
                    { name: "C", entityType: "T", observations: [] }
                ],
                relations: []
            });

            const result = await service.getGraphSummary(mockProjectPath, { limit: 2, offset: 1 });

            expect(result.entities).to.have.length(2);
            expect(result.entities[0].name).to.equal("B");
            expect(result.isTruncated).to.be.false;
            expect(result.totalEntityCount).to.equal(3);
        });
    });

    describe("Complete State", () => {
        let service: MemoryService;

        beforeEach(() => {
            service = MemoryService.getInstance();
        });

        it("should return both graph and context in getCompleteState", async () => {
            sinon.stub(service, "getGraph").resolves({ entities: [], relations: [] });
            sinon.stub(service, "getContext").resolves({ status: "COMPLETED", nextSteps: [] });

            const result = await service.getCompleteState(mockProjectPath);
            expect(result).to.have.property("graph");
            expect(result).to.have.property("context");
            expect(result.context.status).to.equal("COMPLETED");
        });

        it("should support summaryMode to reduce payload", async () => {
            sinon.stub(service, "getGraph").resolves({
                entities: [
                    { name: "A", entityType: "T", observations: ["obs1", "obs2", "obs3"] }
                ],
                relations: []
            });
            sinon.stub(service, "getContext").resolves({ status: "PLANNING", nextSteps: [] });

            const result = await service.getCompleteState(mockProjectPath, { summaryMode: true });

            expect(result.graph.entities[0].observations).to.be.empty;
        });

        it("should support pagination in getCompleteState", async () => {
            sinon.stub(service, "getGraph").resolves({
                entities: [
                    { name: "A", entityType: "T", observations: [] },
                    { name: "B", entityType: "T", observations: [] },
                    { name: "C", entityType: "T", observations: [] }
                ],
                relations: [
                    { from: "A", to: "B", relationType: "X" },
                    { from: "B", to: "C", relationType: "Y" }
                ]
            });
            sinon.stub(service, "getContext").resolves({ status: "PLANNING", nextSteps: [] });

            const result = await service.getCompleteState(mockProjectPath, { limit: 2, offset: 0 });

            expect(result.graph.entities).to.have.length(2);
            expect(result.totalEntityCount).to.equal(3);
            expect(result.isTruncated).to.be.true;
            // Only relations where BOTH nodes are in current page
            expect(result.graph.relations).to.have.length(1);
        });
    });

    describe("Lifecycle and Resource Management", () => {
        it("should release all locks on shutdown", async () => {
            const service = MemoryService.getInstance();
            
            // Simulate having active locks by accessing internal state
            const releaseFunc1 = sinon.stub().resolves();
            const releaseFunc2 = sinon.stub().resolves();
            (service as any).activeLocks.set("/path1", releaseFunc1);
            (service as any).activeLocks.set("/path2", releaseFunc2);

            await service.shutdown();

            expect(releaseFunc1.calledOnce).to.be.true;
            expect(releaseFunc2.calledOnce).to.be.true;
            expect((service as any).activeLocks.size).to.equal(0);
        });

        it("should handle shutdown errors gracefully", async () => {
            const service = MemoryService.getInstance();
            
            const failingRelease = sinon.stub().rejects(new Error("Lock release failed"));
            (service as any).activeLocks.set("/path", failingRelease);

            // Should not throw
            await service.shutdown();
            expect((service as any).activeLocks.size).to.equal(0);
        });

        it("should evict oldest projects when max limit reached (LRU)", async () => {
            const service = MemoryService.getInstance();
            
            // Access internal MAX_PROJECTS
            const maxProjects = (service as any).MAX_PROJECTS;
            
            // Simulate accessing many projects
            for (let i = 0; i < maxProjects + 5; i++) {
                (service as any).touchProject(`/project${i}`);
            }

            const accessOrder = (service as any).projectAccessOrder;
            expect(accessOrder.length).to.be.at.most(maxProjects);
            
            // First projects should be evicted
            expect(accessOrder).to.not.include("/project0");
            expect(accessOrder).to.not.include("/project1");
        });
    });
});
