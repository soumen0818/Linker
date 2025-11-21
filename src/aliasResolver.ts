import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Resolves TypeScript path aliases from tsconfig.json
 * Supports baseUrl, paths, and common alias patterns
 */
export class AliasResolver {
    private baseUrl: string | undefined;
    private pathMappings: Map<string, string[]> = new Map();
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Load and parse tsconfig.json
     */
    async loadTsConfig(): Promise<boolean> {
        const tsconfigPath = path.join(this.workspaceRoot, 'tsconfig.json');

        try {
            if (!fs.existsSync(tsconfigPath)) {
                return false;
            }

            const content = fs.readFileSync(tsconfigPath, 'utf-8');
            // Remove comments (simple approach for JSON with comments)
            const jsonContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
            const tsconfig = JSON.parse(jsonContent);

            const compilerOptions = tsconfig.compilerOptions || {};

            // Load baseUrl
            if (compilerOptions.baseUrl) {
                this.baseUrl = path.resolve(this.workspaceRoot, compilerOptions.baseUrl);
            }

            // Load path mappings
            if (compilerOptions.paths) {
                for (const [alias, targets] of Object.entries(compilerOptions.paths)) {
                    this.pathMappings.set(alias, targets as string[]);
                }
            }

            return true;
        } catch (error) {
            console.error('Failed to load tsconfig.json:', error);
            return false;
        }
    }

    /**
     * Resolve an import path to actual file path
     * @param importPath The import string (e.g., '@/components/Button', '~/utils')
     * @param fromFile The file containing the import
     * @returns Resolved file URI or undefined if not resolvable
     */
    resolveImport(importPath: string, fromFile: vscode.Uri): vscode.Uri | undefined {
        // Try path mappings first
        for (const [pattern, targets] of this.pathMappings.entries()) {
            const match = this.matchPattern(importPath, pattern);
            if (match) {
                // Try each target path
                for (const target of targets) {
                    const resolved = this.resolveTarget(match, target);
                    if (resolved) {
                        return vscode.Uri.file(resolved);
                    }
                }
            }
        }

        // Try baseUrl resolution
        if (this.baseUrl && !importPath.startsWith('.')) {
            const resolved = path.resolve(this.baseUrl, importPath);
            if (this.fileExists(resolved)) {
                return vscode.Uri.file(resolved);
            }
        }

        return undefined;
    }

    /**
     * Check if an import uses an alias
     */
    isAliasedImport(importPath: string): boolean {
        if (importPath.startsWith('.')) {
            return false; // Relative imports are not aliases
        }

        // Check against path mappings
        for (const pattern of this.pathMappings.keys()) {
            if (this.matchPattern(importPath, pattern)) {
                return true;
            }
        }

        // Check if it could be a baseUrl import
        if (this.baseUrl && !importPath.startsWith('.')) {
            return true;
        }

        return false;
    }

    /**
     * Match import path against pattern (supports wildcards)
     */
    private matchPattern(importPath: string, pattern: string): string | null {
        if (pattern.includes('*')) {
            const regexPattern = pattern.replace(/\*/g, '(.*)');
            const regex = new RegExp(`^${regexPattern}$`);
            const match = importPath.match(regex);
            return match ? match[1] : null;
        } else {
            return importPath === pattern ? '' : null;
        }
    }

    /**
     * Resolve target path with wildcard replacement
     */
    private resolveTarget(matched: string, target: string): string | undefined {
        const resolved = target.replace(/\*/g, matched);
        const fullPath = path.resolve(this.workspaceRoot, resolved);

        // Try with various extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
        for (const ext of extensions) {
            const withExt = fullPath + ext;
            if (this.fileExists(withExt)) {
                return withExt;
            }
        }

        // Try as directory with index file
        const indexPath = path.join(fullPath, 'index');
        for (const ext of extensions) {
            const withExt = indexPath + ext;
            if (this.fileExists(withExt)) {
                return withExt;
            }
        }

        return undefined;
    }

    /**
     * Check if file exists
     */
    private fileExists(filePath: string): boolean {
        try {
            return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
        } catch {
            return false;
        }
    }

    /**
     * Get all configured aliases
     */
    getAliases(): string[] {
        return Array.from(this.pathMappings.keys());
    }

    /**
     * Convert a file path to its alias representation
     * @param filePath The absolute file path
     * @returns The alias path (e.g., '@/components/Footer') or undefined if not mappable
     */
    filePathToAlias(filePath: string): string | undefined {
        const normalizedPath = filePath.replace(/\\/g, '/');

        // Try each path mapping
        for (const [pattern, targets] of this.pathMappings.entries()) {
            for (const target of targets) {
                // Resolve the target directory
                const targetPath = path.resolve(this.baseUrl || this.workspaceRoot, target.replace('*', ''));
                const normalizedTarget = targetPath.replace(/\\/g, '/');

                // Check if the file is under this target directory
                if (normalizedPath.startsWith(normalizedTarget)) {
                    // Get the relative path from the target
                    const relativePath = normalizedPath.substring(normalizedTarget.length);

                    // Remove leading slash and file extension
                    const cleanPath = relativePath.replace(/^\//, '').replace(/\.(js|ts|jsx|tsx|mjs|cjs)$/, '');

                    // Build the alias path
                    const aliasPrefix = pattern.replace('/*', '');
                    const aliasPath = `${aliasPrefix}/${cleanPath}`;

                    return aliasPath;
                }
            }
        }

        return undefined;
    }
}
