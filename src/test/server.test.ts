import { expect } from "chai";
import sinon from "sinon";
import { Handlers } from "../index.js";
import { MemoryManager } from "../memory-manager.js";

describe("MCP Server Handlers", () => {
    afterEach(() => {
        sinon.restore();
    });

    describe("Tools", () => {
        it("should list available tools", async () => {
            const result = await Handlers.listTools();
            expect(result.tools).to.be.an("array");
            const toolNames = result.tools.map((t: any) => t.name);
            expect(toolNames).to.include("n2n_add_entities");
            expect(toolNames).to.include("n2n_read_graph");
        });

        it("should validate tool arguments using Zod", async () => {
            // Missing projectPath
            const result = await Handlers.callTool("n2n_read_graph", {});
            expect((result as any).isError).to.be.true;
            expect((result as any).content[0].text).to.contain("Validation Error");
        });

        it("should call MemoryManager.readGraph on n2n_read_graph", async () => {
            const mockGraph = { entities: [], relations: [] };
            const readStub = sinon.stub(MemoryManager, "readGraph").resolves(mockGraph);

            const result = await Handlers.callTool("n2n_read_graph", { projectPath: "/test" });
            expect(readStub.calledWith("/test")).to.be.true;
            expect((result as any).content[0].text).to.equal(JSON.stringify(mockGraph, null, 2));
        });

        it("should call MemoryManager.addEntities on n2n_add_entities", async () => {
            const addStub = sinon.stub(MemoryManager, "addEntities").resolves();
            const entities = [{ name: "E", entityType: "T", observations: ["O"] }];

            const result = await Handlers.callTool("n2n_add_entities", {
                projectPath: "/test",
                entities
            });

            expect(addStub.calledWith("/test", entities)).to.be.true;
            expect((result as any).content[0].text).to.contain("Success");
        });

        it("should call MemoryManager.addObservations on n2n_add_observations", async () => {
            const addStub = sinon.stub(MemoryManager, "addObservations").resolves(5);
            const observations = [{ entityName: "E", contents: ["O"] }];

            const result = await Handlers.callTool("n2n_add_observations", {
                projectPath: "/test",
                observations
            });

            expect(addStub.calledWith("/test", observations)).to.be.true;
            expect((result as any).content[0].text).to.contain("5 observation fragments");
        });

        it("should call MemoryManager.createRelations on n2n_create_relations", async () => {
            const addStub = sinon.stub(MemoryManager, "createRelations").resolves();
            const relations = [{ from: "A", to: "B", relationType: "R" }];

            const result = await Handlers.callTool("n2n_create_relations", {
                projectPath: "/test",
                relations
            });

            expect(addStub.calledWith("/test", relations)).to.be.true;
            expect((result as any).content[0].text).to.contain("Success");
        });

        it("should call MemoryManager.search on n2n_search", async () => {
            const mockResult = { entities: [], relations: [] };
            const searchStub = sinon.stub(MemoryManager, "search").resolves(mockResult);

            const result = await Handlers.callTool("n2n_search", { projectPath: "/test", query: "findme" });
            expect(searchStub.calledWith("/test", "findme")).to.be.true;
            expect((result as any).content[0].text).to.equal(JSON.stringify(mockResult, null, 2));
        });
    });

    describe("Resources", () => {
        it("should list memory resource", async () => {
            const result = await Handlers.listResources();
            expect(result.resources[0].uri).to.equal("mcp://memory/graph");
        });

        it("should read memory resource with projectPath", async () => {
            const mockGraph = { entities: [], relations: [] };
            sinon.stub(MemoryManager, "readGraph").resolves(mockGraph);

            const uri = "mcp://memory/graph?path=/test/path";
            const result = await Handlers.readResource(uri);
            expect(result.contents[0].uri).to.equal(uri);
            expect(JSON.parse(result.contents[0].text)).to.deep.equal(mockGraph);
        });

        it("should throw error for invalid resource URI", async () => {
            try {
                await Handlers.readResource("mcp://unknown/resource");
                expect.fail("Should have thrown McpError");
            } catch (error: any) {
                expect(error.message).to.contain("Unknown resource URI");
            }
        });
    });
});
