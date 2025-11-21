import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Resolves Go module path aliases from go.mod
 * Supports: module paths, replace directives, and local modules
 */
export class GoAliasResolver {
    private modulePath: string | undefined;
    private replacements: Map<string, string> = new Map();
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Load Go module configuration from go.mod
     */
    async loadConfig(): Promise<boolean> {
        const goModPath = path.join(this.workspaceRoot, 'go.mod');

        if (!fs.existsSync(goModPath)) {
            return false;
        }

        try {
            const content = fs.readFileSync(goModPath, 'utf-8');

            // Extract module path: module github.com/user/project
            const moduleMatch = content.match(/^module\s+(.+)$/m);
            if (moduleMatch) {
                this.modulePath = moduleMatch[1].trim();
            }

            // Extract replace directives: replace old => new
            const replaceMatches = content.matchAll(/^replace\s+(.+?)\s+=>\s+(.+?)$/gm);
            for (const match of replaceMatches) {
                const oldPath = match[1].trim();
                const newPath = match[2].trim();
                this.replacements.set(oldPath, newPath);
            }

            return this.modulePath !== undefined;
        } catch (error) {
            console.error('Failed to load go.mod:', error);
            return false;
        }
    }

    /**
     * Check if an import uses the project's module path
     */
    isAliasedImport(importPath: string): boolean {
        if (!this.modulePath) {
            return false;
        }

        // Check if import starts with the project's module path
        return importPath === this.modulePath || importPath.startsWith(this.modulePath + '/');
    }

    /**
     * Convert a file path to its Go import path
     * @param filePath The absolute file path
     * @returns The import path (e.g., 'github.com/user/project/pkg/utils')
     */
    filePathToAlias(filePath: string): string | undefined {
        if (!this.modulePath) {
            return undefined;
        }

        const normalizedPath = filePath.replace(/\\/g, '/');
        const normalizedWorkspace = this.workspaceRoot.replace(/\\/g, '/');

        // Check if file is in workspace
        if (normalizedPath.startsWith(normalizedWorkspace)) {
            // Get relative path from workspace root
            let relativePath = normalizedPath.substring(normalizedWorkspace.length);
            relativePath = relativePath.replace(/^\//, '');

            // Remove .go extension and get directory
            relativePath = relativePath.replace(/\.go$/, '');
            const dirPath = path.posix.dirname(relativePath);

            // If file is in root, just use module path
            if (dirPath === '.') {
                return this.modulePath;
            }

            // Build full import path
            const importPath = this.modulePath + '/' + dirPath;

            return importPath;
        }

        return undefined;
    }

    /**
     * Resolve an import to actual file path
     */
    resolveImport(importPath: string): string | undefined {
        if (!this.modulePath) {
            return undefined;
        }

        // Check if this is a project import
        if (importPath.startsWith(this.modulePath)) {
            // Remove module prefix
            let relativePath = importPath.substring(this.modulePath.length);
            relativePath = relativePath.replace(/^\//, '');

            // Convert to file path
            const filePath = path.resolve(this.workspaceRoot, relativePath);

            // Go imports reference packages (directories), not files
            // Check if this directory exists
            if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
                return filePath;
            }

            // Try as a .go file
            const goFilePath = filePath + '.go';
            if (fs.existsSync(goFilePath)) {
                return goFilePath;
            }
        }

        // Check replace directives
        for (const [oldPath, newPath] of this.replacements.entries()) {
            if (importPath.startsWith(oldPath)) {
                const replaced = importPath.replace(oldPath, newPath);

                // If replacement is a local path
                if (newPath.startsWith('./') || newPath.startsWith('../')) {
                    const resolvedPath = path.resolve(this.workspaceRoot, newPath);
                    return resolvedPath;
                }
            }
        }

        return undefined;
    }

    /**
     * Get the module path
     */
    getModulePath(): string | undefined {
        return this.modulePath;
    }

    /**
     * Get all replace directives
     */
    getReplacements(): Map<string, string> {
        return this.replacements;
    }
}
