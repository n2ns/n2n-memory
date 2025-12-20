import { execSync } from "child_process";

export function checkEnvironment() {
    const minNodeMajor = 24;
    const minNpmVersion = "11.5.1";

    // 1. Check Node.js Version
    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    if (nodeMajor < minNodeMajor) {
        console.error(`[Warning] Node.js version ${nodeVersion} detected. Node.js >= v${minNodeMajor}.0.0 is recommended for full feature support (e.g. OIDC publishing).`);
    }

    // 2. Check NPM Version (Dev/CI diagnostic)
    try {
        const npmVersion = execSync("npm -v", { encoding: "utf-8" }).trim();
        const [major, minor, patch] = npmVersion.split('.').map(Number);
        const [targetMajor, targetMinor, targetPatch] = minNpmVersion.split('.').map(Number);

        const isLower = major < targetMajor ||
            (major === targetMajor && minor < targetMinor) ||
            (major === targetMajor && minor === targetMinor && patch < targetPatch);

        if (isLower) {
            console.error(`[Warning] npm version ${npmVersion} detected. npm >= ${minNpmVersion} is required for Trusted Publishing (OIDC).`);
        }
    } catch (e) {
        // Silently ignore if npm is not in PATH at runtime
    }
}
