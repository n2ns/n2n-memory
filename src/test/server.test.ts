import { expect } from "chai";
import sinon from "sinon";
import { Handlers } from "../handlers/mcp-handlers.js";
import { MemoryService } from "../core/memory-service.js";

describe("MCP Server Handlers", () => {
    afterEach(() => {
        sinon.restore();
        MemoryService.resetInstance();
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
            const errorObj = JSON.parse((result as any).content[0].text);
            expect(errorObj.status).to.equal("error");
            expect(errorObj.type).to.equal("validation_error");
        });

        it("should return error for unrecognized project path", async () => {
            // Use a path that definitely won't exist
            const result = await Handlers.callTool("n2n_read_graph", {
                projectPath: "C:\\nonexistent\\path\\to\\project"
            });
            expect((result as any).isError).to.be.true;
            expect((result as any).content[0].text).to.contain("Directory Not Recognized");
        });

        it("should return handshake request if .mcp does not exist", async () => {
            // Mock resolveRootWithHandshake directly for this test
            const handshakeStub = sinon.stub(Handlers, "resolveRootWithHandshake").resolves({
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        status: "AWAITING_CONFIRMATION",
                        detectedRoot: "/test",
                        markersFound: [".git"],
                        message: "Please confirm..."
                    })
                }],
                isError: true
            });

            const result = await Handlers.callTool("n2n_read_graph", { projectPath: "/test" });
            expect((result as any).isError).to.be.true;
            const content = JSON.parse((result as any).content[0].text);
            expect(content.status).to.equal("AWAITING_CONFIRMATION");

            handshakeStub.restore();
        });

        it("should proceed if confirmNewProjectRoot matches detected root", async () => {
            const handshakeStub = sinon.stub(Handlers, "resolveRootWithHandshake").resolves("/test");
            const serviceStub = sinon.stub(MemoryService.getInstance(), "getCompleteState").resolves({
                graph: { entities: [], relations: [] },
                context: { status: "PLANNING", nextSteps: [] },
                totalEntityCount: 0,
                isTruncated: false
            });

            const result = await Handlers.callTool("n2n_read_graph", {
                projectPath: "/test",
                confirmNewProjectRoot: "/test"
            });
            expect((result as any).isError).to.be.undefined;
            expect((result as any).content[0].text).to.contain("graph");

            handshakeStub.restore();
            serviceStub.restore();
        });

        it("should call MemoryService.getCompleteState on n2n_read_graph", async () => {
            const mockState = {
                graph: { entities: [], relations: [] },
                context: { status: "PLANNING" as const, nextSteps: [] },
                totalEntityCount: 0,
                isTruncated: false
            };
            const handshakeStub = sinon.stub(Handlers, "resolveRootWithHandshake").resolves("/test");
            const serviceStub = sinon.stub(MemoryService.getInstance(), "getCompleteState").resolves(mockState);

            const result = await Handlers.callTool("n2n_read_graph", { projectPath: "/test" });
            expect(serviceStub.calledWith("/test")).to.be.true;
            // Response now includes _protocol field for AI assistants
            const parsed = JSON.parse((result as any).content[0].text);
            expect(parsed.graph).to.deep.equal(mockState.graph);
            expect(parsed._protocol).to.have.property("action", "MEMORY_LOADED");

            handshakeStub.restore();
            serviceStub.restore();
        });

        it("should call MemoryService.updateContext on n2n_update_context", async () => {
            const handshakeStub = sinon.stub(Handlers, "resolveRootWithHandshake").resolves("/test");
            const serviceStub = sinon.stub(MemoryService.getInstance(), "updateContext").resolves();
            const update = { activeTask: "Test Task", status: "PLANNING" } as const;

            const result = await Handlers.callTool("n2n_update_context", {
                projectPath: "/test",
                ...update
            });

            expect(serviceStub.calledWith("/test", sinon.match(update))).to.be.true;
            // Response is now JSON with _protocol field
            const parsed = JSON.parse((result as any).content[0].text);
            expect(parsed.status).to.equal("success");
            expect(parsed._protocol).to.have.property("action", "CONTEXT_SYNCED");

            handshakeStub.restore();
            serviceStub.restore();
        });
    });

    describe("Resources", () => {
        it("should list memory resource and templates", async () => {
            const result = await Handlers.listResources();
            expect(result.resources[0].uri).to.equal("mcp://memory/graph");
            expect(result.resourceTemplates).to.be.an("array");
            expect(result.resourceTemplates![0].uriTemplate).to.equal("mcp://memory/graph?path={path}");
        });

        it("should throw for invalid resource URI protocol", async () => {
            try {
                await Handlers.readResource("https://invalid/resource");
                expect.fail("Should have thrown");
            } catch (error) {
                expect((error as Error).message).to.contain("Unknown resource URI");
            }
        });

        it("should throw if path query parameter is missing", async () => {
            try {
                await Handlers.readResource("mcp://memory/graph");
                expect.fail("Should have thrown");
            } catch (error) {
                expect((error as Error).message).to.contain("path");
            }
        });
    });
});
