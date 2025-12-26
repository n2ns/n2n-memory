import path from "path";
import fs from "fs-extra";

/**
 * Common markers that define a project root.
 */
const ROOT_MARKERS = [
    ".git",
    ".mcp",
    "package.json",
    "go.mod",
    "Cargo.toml",
    "requirements.txt",
    "pom.xml",
    "composer.json",
    "README.md",
    ".vscode",
    "tsconfig.json",
    ".gitignore"
];

// Note: Caching was removed as the current implementation only checks the current directory.
// If parent-directory traversal is re-added in the future, consider implementing a cache here.

/**
 * Result of the project root discovery.
 */
export interface RootDiscovery {
    rootPath: string;
    hasMcp: boolean;
    markersFound: string[];
}

/**
 * Recursively finds the project root.
 * NOTE: For N2N-Memory, we now strictly only check the provided path or its immediate markers 
 * to ensure that memory is only initialized at true project roots (IDE roots).
 * @param startPath The path to start searching from.
 */
export async function findProjectRoot(startPath: string): Promise<RootDiscovery> {
    const absoluteStart = path.resolve(startPath);
    const current = absoluteStart;

    const foundMarkers: string[] = [];
    let hasMcp = false;

    // Check current directory for markers
    for (const marker of ROOT_MARKERS) {
        const markerPath = path.join(current, marker);
        if (await fs.pathExists(markerPath)) {
            foundMarkers.push(marker);
            if (marker === ".mcp") hasMcp = true;
        }
    }

    if (foundMarkers.length > 0) {
        return { rootPath: current, hasMcp, markersFound: foundMarkers };
    }

    throw new Error(
        `Directory Not Recognized as a Project Root: No project markers (.git, package.json, README.md, etc.) found in "${absoluteStart}". ` +
        `N2N-Memory strictly requires you to open the IDE at the project root or use a workspace top-level directory. ` +
        `Memory initialization is refused for generic or sub-directories to prevent context pollution.`
    );
}

/**
 * Basic absolute path validation.
 */
export function validateAbsolutePath(projectPath: string): string {
    if (!projectPath) throw new Error("Project path is required.");
    const resolved = path.resolve(projectPath);
    if (!path.isAbsolute(resolved)) throw new Error(`Path must be absolute: ${projectPath}`);
    if (resolved.includes('\0')) throw new Error("Invalid path detected.");
    return resolved;
}
