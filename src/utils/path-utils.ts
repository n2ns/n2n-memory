import path from "path";
import fs from "fs-extra";

/**
 * Strong markers that define a project root.
 */
const STRONG_ROOT_MARKERS = [
    ".git",
    ".mcp",
    "package.json",
    "go.mod",
    "Cargo.toml",
    "requirements.txt",
    "pom.xml",
    "composer.json",
    ".vscode",
    "tsconfig.json",
    ".gitignore"
];

const WEAK_ROOT_MARKERS = [
    "README.md"
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
    const absoluteStart = validateAbsolutePath(startPath);
    const current = absoluteStart;

    const foundMarkers: string[] = [];
    let hasMcp = false;

    // Check current directory for strong markers.
    for (const marker of STRONG_ROOT_MARKERS) {
        const markerPath = path.join(current, marker);
        if (await fs.pathExists(markerPath)) {
            foundMarkers.push(marker);
            if (marker === ".mcp") hasMcp = true;
        }
    }

    if (foundMarkers.length > 0) {
        return { rootPath: current, hasMcp, markersFound: foundMarkers };
    }

    const weakMarkersFound: string[] = [];
    for (const marker of WEAK_ROOT_MARKERS) {
        const markerPath = path.join(current, marker);
        if (await fs.pathExists(markerPath)) {
            weakMarkersFound.push(marker);
        }
    }

    throw new Error(
        `Directory Not Recognized as a Project Root: No strong project markers (.git, package.json, tsconfig.json, etc.) found in "${absoluteStart}". ` +
        `${weakMarkersFound.length > 0 ? `Weak markers found (${weakMarkersFound.join(", ")}), but they are not sufficient for initialization. ` : ""}` +
        `N2N-Memory strictly requires you to open the IDE at the project root or use a workspace top-level directory. ` +
        `Memory initialization is refused for generic or sub-directories to prevent context pollution.`
    );
}

/**
 * Basic absolute path validation.
 */
export function validateAbsolutePath(projectPath: string): string {
    if (!projectPath) throw new Error("Project path is required.");
    if (projectPath.includes('\0')) throw new Error("Invalid path detected.");
    if (!path.isAbsolute(projectPath)) throw new Error(`Path must be absolute: ${projectPath}`);
    const resolved = path.resolve(projectPath);
    if (resolved.includes('\0')) throw new Error("Invalid path detected.");
    return resolved;
}
