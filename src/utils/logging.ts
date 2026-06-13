import path from "path";

export function isDebugLogging(): boolean {
    return process.env.N2N_LOG_LEVEL?.toLowerCase() === "debug";
}

export function formatProjectPath(projectPath: string): string {
    if (isDebugLogging()) {
        return projectPath;
    }

    const baseName = path.basename(projectPath);
    return baseName || "[project]";
}

export function logInfo(message: string): void {
    if (isDebugLogging()) {
        console.error(message);
    }
}

export function logWarning(message: string): void {
    console.error(message);
}

export function logError(message: string, error?: unknown): void {
    if (error === undefined || !isDebugLogging()) {
        console.error(message);
        return;
    }

    console.error(message, error);
}
