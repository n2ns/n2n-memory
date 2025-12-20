import { expect } from "chai";
import sinon from "sinon";
import { Handlers } from "../handlers/mcp-handlers.js";
import { MemoryManager } from "../core/memory-manager.js";
import { MemoryService } from "../core/memory-service.js";
import * as PathUtils from "../utils/path-utils.js";

describe("MCP Server Handlers", () => {
    let findRootStub: sinon.SinonStub;

    beforeEach(() => {
        // Default findProjectRoot stub to return path as is and claim .mcp exists
        findRootStub = sinon.stub(PathUtils, "findProjectRoot").resolves({
            rootPath: "/test",
            hasMcp: true,
            markersFound: [".mcp"]
        });
    });

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
            expect(toolNames).to.include("n2n_update_context");
        });

        it("should validate tool arguments using Zod", async () => {
            const result = await Handlers.callTool("n2n_read_graph", {});
            expect((result as any).isError).to.be.true;
            expect((result as any).content[0].text).to.contain("Validation Error");
        });

        it("should return handshake request if .mcp does not exist", async () => {
            findRootStub.resolves({
                rootPath: "/test",
                hasMcp: false,
                markersFound: [".git"]
            });

            const result = await Handlers.callTool("n2n_read_graph", { projectPath: "/test" });
            expect((result as any).isError).to.be.true;
            const content = JSON.parse((result as any).content[0].text);
            expect(content.status).to.equal("AWAITING_CONFIRMATION");
            expect(content.detectedRoot).to.equal("/test");
        });

        it("should proceed if confirmNewProjectRoot matches detected root", async () => {
            findRootStub.resolves({
                rootPath: "/test",
                hasMcp: false,
                markersFound: [".git"]
            });
            sinon.stub(MemoryService.getInstance(), "getCompleteState").resolves({ graph: {}, context: {} } as any);

            const result = await Handlers.callTool("n2n_read_graph", {
                projectPath: "/test",
                confirmNewProjectRoot: "/test"
            });
            expect((result as any).isError).to.be.undefined;
            expect((result as any).content[0].text).to.contain("graph");
        });

        it("should call MemoryService.getCompleteState on n2n_read_graph", async () => {
            const mockState = {
                graph: { entities: [], relations: [] },
                context: { status: "PLANNING", nextSteps: [] }
            };
            const serviceStub = sinon.stub(MemoryService.getInstance(), "getCompleteState").resolves(mockState as any);

            const result = await Handlers.callTool("n2n_read_graph", { projectPath: "/test" });
            expect(serviceStub.calledWith("/test")).to.be.true;
            expect((result as any).content[0].text).to.equal(JSON.stringify(mockState, null, 2));
        });

        it("should call MemoryService.updateContext on n2n_update_context", async () => {
            const serviceStub = sinon.stub(MemoryService.getInstance(), "updateContext").resolves();
            const update = { activeTask: "Test Task", status: "PLANNING" } as const;

            const result = await Handlers.callTool("n2n_update_context", {
                projectPath: "/test",
                ...update
            });

            expect(serviceStub.calledWith("/test", sinon.match(update))).to.be.true;
            expect((result as any).content[0].text).to.contain("Success");
        });
    });

    describe("Resources", () => {
        it("should list memory resource", async () => {
            const result = await Handlers.listResources();
            expect(result.resources[0].uri).to.equal("mcp://memory/graph");
        });

        it("should read memory resource with projectPath", async () => {
            const mockState = {
                graph: { entities: [], relations: [] },
                context: { status: "PLANNING", nextSteps: [] }
            };
            sinon.stub(MemoryService.getInstance(), "getCompleteState").resolves(mockState as any);

            const uri = "mcp://memory/graph?path=/test/path";
            const result = await Handlers.readResource(uri);
            expect(result.contents[0].uri).to.equal(uri);
            expect(JSON.parse((result.contents[0] as any).text)).to.deep.equal(mockState);
        });
    });
});
