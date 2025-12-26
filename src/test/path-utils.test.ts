import { expect } from "chai";
import path from "path";
import fs from "fs-extra";
import os from "os";
import { findProjectRoot } from "../utils/path-utils.js";

describe("PathUtils - findProjectRoot", () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = path.join(os.tmpdir(), `n2n-test-${Date.now()}`);
        await fs.ensureDir(tempDir);
    });

    afterEach(async () => {
        await fs.remove(tempDir);
    });

    it("should find root if .git exists in current dir", async () => {
        await fs.ensureDir(path.join(tempDir, ".git"));
        const result = await findProjectRoot(tempDir);
        expect(result.rootPath).to.equal(path.resolve(tempDir));
        expect(result.markersFound).to.include(".git");
    });

    it("should find root if package.json exists in current dir", async () => {
        await fs.writeJson(path.join(tempDir, "package.json"), { name: "test" });
        const result = await findProjectRoot(tempDir);
        expect(result.rootPath).to.equal(path.resolve(tempDir));
        expect(result.markersFound).to.include("package.json");
    });

    it("should find root if README.md exists in current dir", async () => {
        await fs.writeFile(path.join(tempDir, "README.md"), "# Test");
        const result = await findProjectRoot(tempDir);
        expect(result.rootPath).to.equal(path.resolve(tempDir));
        expect(result.markersFound).to.include("README.md");
    });

    it("should throw error if no markers found in directory", async () => {
        const emptyDir = path.join(tempDir, "empty");
        await fs.ensureDir(emptyDir);

        try {
            await findProjectRoot(emptyDir);
            expect.fail("Should have thrown");
        } catch (error) {
            expect((error as Error).message).to.contain("Directory Not Recognized as a Project");
        }
    });

    it("should detect .mcp marker and set hasMcp to true", async () => {
        await fs.ensureDir(path.join(tempDir, ".mcp"));
        const result = await findProjectRoot(tempDir);
        expect(result.hasMcp).to.be.true;
        expect(result.markersFound).to.include(".mcp");
    });

    it("should set hasMcp to false if .mcp does not exist", async () => {
        await fs.ensureDir(path.join(tempDir, ".git"));
        const result = await findProjectRoot(tempDir);
        expect(result.hasMcp).to.be.false;
        expect(result.markersFound).to.not.include(".mcp");
    });

    it("should collect multiple markers if present", async () => {
        await fs.ensureDir(path.join(tempDir, ".git"));
        await fs.writeJson(path.join(tempDir, "package.json"), { name: "test" });
        await fs.writeJson(path.join(tempDir, "tsconfig.json"), { compilerOptions: {} });
        
        const result = await findProjectRoot(tempDir);
        expect(result.markersFound).to.include(".git");
        expect(result.markersFound).to.include("package.json");
        expect(result.markersFound).to.include("tsconfig.json");
    });
});
