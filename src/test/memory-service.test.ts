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

    describe("Combined State", () => {
        it("should return both graph and context in getCompleteState", async () => {
            const service = MemoryService.getInstance();
            sinon.stub(service, "getGraph").resolves({ entities: [], relations: [] });
            sinon.stub(service, "getContext").resolves({ status: "COMPLETED", nextSteps: [] });

            const result = await service.getCompleteState(mockProjectPath);
            expect(result).to.have.property("graph");
            expect(result).to.have.property("context");
            expect(result.context.status).to.equal("COMPLETED");
        });
    });
});
