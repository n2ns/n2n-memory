import { expect } from "chai";
import sinon from "sinon";
import fs from "fs-extra";
import { MemoryManager } from "../core/memory-manager.js";
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

        it("should throw if existing memory file cannot be read", async () => {
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").rejects(new Error("Parse error"));

            try {
                await MemoryManager.readGraph(mockProjectPath);
                expect.fail("Should have thrown");
            } catch (error) {
                expect((error as Error).message).to.contain("Failed to read memory file");
                expect((error as Error).message).to.contain("Parse error");
            }
        });

        it("should throw if existing memory file does not match schema", async () => {
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves({ entities: [{ name: "Missing fields" }] });

            try {
                await MemoryManager.readGraph(mockProjectPath);
                expect.fail("Should have thrown");
            } catch (error) {
                expect((error as Error).message).to.contain("Failed to read memory file");
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

            sinon.stub(fs, "ensureDir").resolves();
            const writeJsonStub = sinon.stub(fs, "writeJson").resolves();
            sinon.stub(fs, "move").resolves();

            await MemoryManager.writeGraph(mockProjectPath, unsortedGraph);

            const savedGraph = writeJsonStub.firstCall.args[1] as KnowledgeGraph;

            // Entities sorted: Alpha, Bravo
            expect(savedGraph.entities[0]!.name).to.equal("Alpha");
            expect(savedGraph.entities[1]!.name).to.equal("Bravo");

            // Observations of Bravo sorted: a, z
            expect(savedGraph.entities[1]!.observations).to.deep.equal(["a", "z"]);
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
            sinon.stub(fs, "move").resolves();

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

    describe("openNodes", () => {
        it("should return only specified entities and their mutual relations", async () => {
            const graph = {
                entities: [
                    { name: "A", entityType: "T", observations: ["1"] },
                    { name: "B", entityType: "T", observations: ["2"] },
                    { name: "C", entityType: "T", observations: ["3"] }
                ],
                relations: [
                    { from: "A", to: "B", relationType: "X" },
                    { from: "B", to: "C", relationType: "Y" }
                ]
            };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves(graph);

            const result = await MemoryManager.openNodes(mockProjectPath, ["A", "B"]);

            expect(result.entities.length).to.equal(2);
            expect(result.entities.map(e => e.name)).to.include.members(["A", "B"]);
            expect(result.relations.length).to.equal(1);
            expect(result.relations[0]).to.deep.equal({ from: "A", to: "B", relationType: "X" });
        });
    });

    describe("exportToMarkdown", () => {
        it("should generate markdown file with entities and relations", async () => {
            const graph = {
                entities: [{ name: "Test", entityType: "COMPONENT", observations: ["obs1", "obs2"] }],
                relations: [{ from: "Test", to: "Other", relationType: "USES" }]
            };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves(graph);
            const writeFileStub = sinon.stub(fs, "writeFile").resolves();

            const filePath = await MemoryManager.exportToMarkdown(mockProjectPath);

            expect(filePath).to.contain("KNOWLEDGE_GRAPH.md");
            expect(writeFileStub.calledOnce).to.be.true;
            const content = writeFileStub.firstCall.args[1] as string;
            expect(content).to.contain("# Knowledge Graph");
            expect(content).to.contain("### Test");
            expect(content).to.contain("obs1");
            expect(content).to.contain("| Test | USES | Other |");
        });

        it("should reject absolute export paths", async () => {
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves({ entities: [], relations: [] });

            try {
                await MemoryManager.exportToMarkdown(mockProjectPath, "/tmp/out.md");
                expect.fail("Should have thrown");
            } catch (error) {
                expect((error as Error).message).to.contain("relative");
            }
        });

        it("should reject export paths outside the project root", async () => {
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves({ entities: [], relations: [] });

            try {
                await MemoryManager.exportToMarkdown(mockProjectPath, "../out.md");
                expect.fail("Should have thrown");
            } catch (error) {
                expect((error as Error).message).to.contain("inside the project root");
            }
        });
    });

    describe("Context Operations", () => {
        it("should return default context if file does not exist", async () => {
            sinon.stub(fs, "pathExists").resolves(false);
            const context = await MemoryManager.readContext(mockProjectPath);
            expect(context.status).to.equal("PLANNING");
            expect(context.nextSteps).to.be.an("array").empty;
        });

        it("should write context atomically", async () => {
            const context = { activeTask: "Development", status: "IN_PROGRESS" as const, nextSteps: ["Step 1"] };
            sinon.stub(fs, "ensureDir").resolves();
            const writeJsonStub = sinon.stub(fs, "writeJson").resolves();
            sinon.stub(fs, "move").resolves();

            await MemoryManager.writeContext(mockProjectPath, context);

            expect(writeJsonStub.calledOnce).to.be.true;
            const saved = writeJsonStub.firstCall.args[1] as any;
            expect(saved.activeTask).to.equal("Development");
            expect(saved.updatedAt).to.be.a("string");
        });

        it("should throw error if context write fails", async () => {
            const context = { status: "PLANNING" as const, nextSteps: [] };
            sinon.stub(fs, "ensureDir").resolves();
            sinon.stub(fs, "writeJson").rejects(new Error("Permission denied"));
            sinon.stub(fs, "pathExists").resolves(false);

            try {
                await MemoryManager.writeContext(mockProjectPath, context);
                expect.fail("Should have thrown");
            } catch (error) {
                expect((error as Error).message).to.contain("Failed to write context");
            }
        });

        it("should throw if existing context file cannot be read", async () => {
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").rejects(new Error("Corrupted file"));

            try {
                await MemoryManager.readContext(mockProjectPath);
                expect.fail("Should have thrown");
            } catch (error) {
                expect((error as Error).message).to.contain("Failed to read context file");
                expect((error as Error).message).to.contain("Corrupted file");
            }
        });
    });

    describe("openNodes - Edge Cases", () => {
        it("should return empty result for empty names array", async () => {
            const graph = {
                entities: [{ name: "A", entityType: "T", observations: [] }],
                relations: []
            };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves(graph);

            const result = await MemoryManager.openNodes(mockProjectPath, []);

            expect(result.entities).to.be.empty;
            expect(result.relations).to.be.empty;
        });

        it("should return empty for non-existent entity names", async () => {
            const graph = {
                entities: [{ name: "A", entityType: "T", observations: [] }],
                relations: []
            };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves(graph);

            const result = await MemoryManager.openNodes(mockProjectPath, ["NonExistent"]);

            expect(result.entities).to.be.empty;
        });

        it("should exclude relations where only one node matches", async () => {
            const graph = {
                entities: [
                    { name: "A", entityType: "T", observations: [] },
                    { name: "B", entityType: "T", observations: [] },
                    { name: "C", entityType: "T", observations: [] }
                ],
                relations: [
                    { from: "A", to: "B", relationType: "X" },
                    { from: "A", to: "C", relationType: "Y" }
                ]
            };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves(graph);

            const result = await MemoryManager.openNodes(mockProjectPath, ["A", "B"]);

            expect(result.relations).to.have.length(1);
            expect(result.relations[0].to).to.equal("B");
        });
    });

    describe("exportToMarkdown - Edge Cases", () => {
        it("should handle empty graph gracefully", async () => {
            const graph = { entities: [], relations: [] };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves(graph);
            const writeFileStub = sinon.stub(fs, "writeFile").resolves();

            await MemoryManager.exportToMarkdown(mockProjectPath);

            const content = writeFileStub.firstCall.args[1] as string;
            expect(content).to.contain("_No entities found._");
            expect(content).to.contain("_No relations found._");
        });

        it("should use custom output path when provided", async () => {
            const graph = { entities: [], relations: [] };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves(graph);
            const _writeFileStub = sinon.stub(fs, "writeFile").resolves();

            const result = await MemoryManager.exportToMarkdown(mockProjectPath, "docs/GRAPH.md");

            expect(result).to.contain("docs");
            expect(result).to.contain("GRAPH.md");
        });

        it("should handle entities without observations", async () => {
            const graph = {
                entities: [{ name: "Test", entityType: "TYPE", observations: [] }],
                relations: []
            };
            sinon.stub(fs, "pathExists").resolves(true);
            sinon.stub(fs, "readJson").resolves(graph);
            const writeFileStub = sinon.stub(fs, "writeFile").resolves();

            await MemoryManager.exportToMarkdown(mockProjectPath);

            const content = writeFileStub.firstCall.args[1] as string;
            expect(content).to.contain("### Test");
            expect(content).to.not.contain("**Observations**");
        });
    });

    describe("writeGraph - Edge Cases", () => {
        it("should handle entities with undefined observations", async () => {
            const graph: KnowledgeGraph = {
                entities: [{ name: "Test", entityType: "T", observations: undefined as any }],
                relations: []
            };
            sinon.stub(fs, "ensureDir").resolves();
            const writeJsonStub = sinon.stub(fs, "writeJson").resolves();
            sinon.stub(fs, "move").resolves();

            await MemoryManager.writeGraph(mockProjectPath, graph);

            const savedGraph = writeJsonStub.firstCall.args[1] as KnowledgeGraph;
            expect(savedGraph.entities[0]!.observations).to.deep.equal([]);
        });

        it("should cleanup temp file on failure", async () => {
            const graph: KnowledgeGraph = { entities: [], relations: [] };
            sinon.stub(fs, "ensureDir").resolves();
            sinon.stub(fs, "writeJson").resolves();
            sinon.stub(fs, "move").rejects(new Error("Move failed"));
            const _pathExistsStub = sinon.stub(fs, "pathExists").resolves(true);
            const removeStub = sinon.stub(fs, "remove").resolves();

            try {
                await MemoryManager.writeGraph(mockProjectPath, graph);
                expect.fail("Should have thrown");
            } catch {
                expect(removeStub.calledOnce).to.be.true;
            }
        });
    });
});
