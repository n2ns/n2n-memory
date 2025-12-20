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
        const root = await findProjectRoot(tempDir);
        expect(root).to.equal(path.resolve(tempDir));
    });

    it("should find root if package.json exists 1 level up", async () => {
        await fs.writeJson(path.join(tempDir, "package.json"), { name: "test" });
        const subDir = path.join(tempDir, "src");
        await fs.ensureDir(subDir);

        const root = await findProjectRoot(subDir);
        expect(root).to.equal(path.resolve(tempDir));
    });

    it("should find root if README.md exists 2 levels up", async () => {
        await fs.writeFile(path.join(tempDir, "README.md"), "# Test");
        const level1 = path.join(tempDir, "src");
        const level2 = path.join(level1, "components");
        await fs.ensureDir(level2);

        const root = await findProjectRoot(level2);
        expect(root).to.equal(path.resolve(tempDir));
    });

    it("should throw error if no markers found within 2 levels", async () => {
        const level1 = path.join(tempDir, "level1");
        const level2 = path.join(level1, "level2");
        const level3 = path.join(level2, "level3");
        await fs.ensureDir(level3);

        try {
            await findProjectRoot(level3);
            expect.fail("Should have thrown");
        } catch (error) {
            expect((error as Error).message).to.contain("Directory Not Recognized as a Project");
        }
    });

    it("should use cache for subsequent calls", async () => {
        await fs.ensureDir(path.join(tempDir, ".git"));

        // First call (I/O)
        const root1 = await findProjectRoot(tempDir);

        // Remove .git to prove cache works
        await fs.remove(path.join(tempDir, ".git"));

        // Second call (Cache)
        const root2 = await findProjectRoot(tempDir);
        expect(root2).to.equal(root1);
    });
});
