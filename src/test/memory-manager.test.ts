import { expect } from "chai";
import sinon from "sinon";
import fs from "fs-extra";
import { MemoryManager } from "../memory-manager.js";
import { KnowledgeGraph } from "../types.js";

describe("MemoryManager", () => {
    const mockProjectPath = "/test/project";

    afterEach(() => {
        sinon.restore();
    });

    describe("readGraph", () => {
        it("should return empty graph if file does not exist", async () => {
            sinon.stub(fs, "pathExists").resolves(false);
            const graph = await MemoryManager.readGraph(mockProjectPath);
            expect(graph).to.deep.equal({ entities: [], relations: [] });
        });

        it("should return graph data if file exists", async () => {
            const mockData = {
                entities: [{ name: "Test", entityType: "CONCEPT", observations: ["obs1"] }],
                relations: []
            };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves(mockData);
            const graph = await MemoryManager.readGraph(mockProjectPath);
            expect(graph).to.deep.equal(mockData);
        });

        it("should throw if file content is invalid", async () => {
            const invalidData = {
                entities: "should be array"
            };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves(invalidData);

            try {
                await MemoryManager.readGraph(mockProjectPath);
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect((error as Error).message).to.contain("Failed to read");
            }
        });
    });

    describe("writeGraph", () => {
        it("should sort entities and observations alphabetically", async () => {
            const unsortedGraph: KnowledgeGraph = {
                entities: [
                    { name: "Bravo", entityType: "CONCEPT", observations: ["z", "a"] },
                    { name: "Alpha", entityType: "CONCEPT", observations: ["m"] }
                ],
                relations: []
            };

            const ensureDirStub = sinon.stub(fs, "ensureDir").resolves();
            const writeJsonStub = sinon.stub(fs, "writeJson").resolves();

            await MemoryManager.writeGraph(mockProjectPath, unsortedGraph);

            const savedGraph = writeJsonStub.firstCall.args[1] as KnowledgeGraph;

            // Entities sorted: Alpha, Bravo
            expect(savedGraph.entities[0]!.name).to.equal("Alpha");
            expect(savedGraph.entities[1]!.name).to.equal("Bravo");

            // Observations of Bravo sorted: a, z
            expect(savedGraph.entities[1]!.observations).to.deep.equal(["a", "z"]);

            expect(ensureDirStub.calledOnce).to.be.true;
        });

        it("should sort relations by from, then to, then type", async () => {
            const unsortedGraph: KnowledgeGraph = {
                entities: [],
                relations: [
                    { from: "B", to: "A", relationType: "X" },
                    { from: "A", to: "C", relationType: "Z" },
                    { from: "A", to: "B", relationType: "Y" }
                ]
            };

            const writeJsonStub = sinon.stub(fs, "writeJson").resolves();
            sinon.stub(fs, "ensureDir").resolves();

            await MemoryManager.writeGraph(mockProjectPath, unsortedGraph);

            const savedGraph = writeJsonStub.firstCall.args[1] as KnowledgeGraph;
            expect(savedGraph.relations).to.deep.equal([
                { from: "A", to: "B", relationType: "Y" },
                { from: "A", to: "C", relationType: "Z" },
                { from: "B", to: "A", relationType: "X" }
            ]);
        });

        it("should throw error if write fails", async () => {
            const graph: KnowledgeGraph = { entities: [], relations: [] };
            sinon.stub(fs, "ensureDir").resolves();
            sinon.stub(fs, "writeJson").rejects(new Error("Disk Full"));

            try {
                await MemoryManager.writeGraph(mockProjectPath, graph);
                expect.fail("Should have thrown");
            } catch (error) {
                expect((error as Error).message).to.contain("Failed to write");
                expect((error as Error).message).to.contain("Disk Full");
            }
        });
    });

    describe("addEntities", () => {
        it("should merge observations for existing entities", async () => {
            const existingGraph = {
                entities: [{ name: "A", entityType: "T", observations: ["1"] }],
                relations: []
            };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves(existingGraph);
            sinon.stub(fs, "ensureDir").resolves();
            const writeJsonStub = sinon.stub(fs, "writeJson").resolves();

            await MemoryManager.addEntities(mockProjectPath, [
                { name: "A", entityType: "T", observations: ["2", "1"] }
            ]);

            const savedGraph = writeJsonStub.firstCall.args[1] as KnowledgeGraph;
            expect(savedGraph.entities[0]!.observations).to.include.members(["1", "2"]);
            expect(savedGraph.entities[0]!.observations.length).to.equal(2); // unique
        });
    });

    describe("addObservations", () => {
        it("should add observations to existing entities only", async () => {
            const existingGraph = {
                entities: [{ name: "Target", entityType: "T", observations: ["A"] }],
                relations: []
            };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves(existingGraph);
            sinon.stub(fs, "ensureDir").resolves();
            const writeJsonStub = sinon.stub(fs, "writeJson").resolves();

            const count = await MemoryManager.addObservations(mockProjectPath, [
                { entityName: "Target", contents: ["B", "A"] },
                { entityName: "NonExistent", contents: ["C"] }
            ]);

            const savedGraph = writeJsonStub.firstCall.args[1] as KnowledgeGraph;
            expect(count).to.equal(2); // Added B and A (A is already there but counted in input)
            expect(savedGraph.entities[0]!.observations).to.deep.equal(["A", "B"]); // Sorted and unique
            expect(savedGraph.entities.length).to.equal(1); // No new entity created
        });
    });

    describe("createRelations", () => {
        it("should avoid duplicate relations", async () => {
            const existingGraph = {
                entities: [],
                relations: [{ from: "A", to: "B", relationType: "KNOWS" }]
            };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves(existingGraph);
            sinon.stub(fs, "ensureDir").resolves();
            const writeJsonStub = sinon.stub(fs, "writeJson").resolves();

            await MemoryManager.createRelations(mockProjectPath, [
                { from: "A", to: "B", relationType: "KNOWS" }, // Exist
                { from: "A", to: "C", relationType: "KNOWS" }  // New
            ]);

            const savedGraph = writeJsonStub.firstCall.args[1] as KnowledgeGraph;
            expect(savedGraph.relations.length).to.equal(2);
            expect(savedGraph.relations).to.deep.include({ from: "A", to: "C", relationType: "KNOWS" });
        });
    });

    describe("search", () => {
        it("should return matches in entities and observations", async () => {
            const graph = {
                entities: [
                    { name: "AuthServer", entityType: "COMPONENT", observations: ["Handles login"] },
                    { name: "DB", entityType: "DATABASE", observations: ["Stores users"] }
                ],
                relations: [
                    { from: "AuthServer", to: "DB", relationType: "CONNECTS" }
                ]
            };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves(graph);

            const result = await MemoryManager.search(mockProjectPath, "login");
            expect(result.entities.length).to.equal(1);
            expect(result.entities[0]!.name).to.equal("AuthServer");
            expect(result.relations.length).to.equal(1); // Should include relation where AuthServer is source
        });

        it("should be case-insensitive", async () => {
            const graph = {
                entities: [{ name: "AuthServer", entityType: "COMPONENT", observations: [] }],
                relations: []
            };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves(graph);

            const result = await MemoryManager.search(mockProjectPath, "AUTH");
            expect(result.entities.length).to.equal(1);
        });
    });
});
