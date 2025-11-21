import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Resolves Python path aliases from configuration files
 * Supports: pyproject.toml, setup.py, and custom path configurations
 */
export class PythonAliasResolver {
    private pathMappings: Map<string, string> = new Map();
    private workspaceRoot: string;
    private srcRoot: string | undefined;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Load Python path configurations
     * Checks pyproject.toml, setup.py, and common project structures
     */
    async loadConfig(): Promise<boolean> {
        try {
            // Try to load from pyproject.toml
            const loaded = await this.loadFromPyProjectToml();
            if (loaded) {
                return true;
            }

            // Try to detect common Python project structures
            this.detectCommonStructures();

            return this.pathMappings.size > 0;
        } catch (error) {
            console.error('Failed to load Python config:', error);
            return false;
        }
    }

    /**
     * Load path aliases from pyproject.toml
     */
    private async loadFromPyProjectToml(): Promise<boolean> {
        const pyprojectPath = path.join(this.workspaceRoot, 'pyproject.toml');

        if (!fs.existsSync(pyprojectPath)) {
            return false;
        }

        try {
            const content = fs.readFileSync(pyprojectPath, 'utf-8');

            // Look for tool.linker.paths section (custom configuration)
            const pathsMatch = content.match(/\[tool\.linker\.paths\]([\s\S]*?)(?=\[|$)/);
            if (pathsMatch) {
                const pathsSection = pathsMatch[1];
                const lines = pathsSection.split('\n');

                for (const line of lines) {
                    // Match: alias = "path"
                    const match = line.match(/^(\w+)\s*=\s*["']([^"']+)["']/);
                    if (match) {
                        const alias = match[1];
                        const targetPath = match[2];
                        this.pathMappings.set(alias, targetPath);
                    }
                }
            }

            return this.pathMappings.size > 0;
        } catch (error) {
            console.error('Error parsing pyproject.toml:', error);
            return false;
        }
    }

    /**
     * Detect common Python project structures
     * Sets up default aliases for standard layouts
     */
    private detectCommonStructures(): void {
        // Check for src/ directory
        const srcPath = path.join(this.workspaceRoot, 'src');
        if (fs.existsSync(srcPath) && fs.statSync(srcPath).isDirectory()) {
            this.srcRoot = srcPath;
            this.pathMappings.set('@', 'src');
        }

        // Check for app/ directory (common in Django, FastAPI)
        const appPath = path.join(this.workspaceRoot, 'app');
        if (fs.existsSync(appPath) && fs.statSync(appPath).isDirectory()) {
            this.pathMappings.set('@app', 'app');
        }

        // Check for lib/ directory
        const libPath = path.join(this.workspaceRoot, 'lib');
        if (fs.existsSync(libPath) && fs.statSync(libPath).isDirectory()) {
            this.pathMappings.set('@lib', 'lib');
        }

        // Check for utils/ directory
        const utilsPath = path.join(this.workspaceRoot, 'utils');
        if (fs.existsSync(utilsPath) && fs.statSync(utilsPath).isDirectory()) {
            this.pathMappings.set('@utils', 'utils');
        }
    }

    /**
     * Check if an import uses an alias
     */
    isAliasedImport(importPath: string): boolean {
        if (importPath.startsWith('.')) {
            return false; // Relative imports
        }

        // Check if matches any configured alias
        for (const alias of this.pathMappings.keys()) {
            if (importPath === alias || importPath.startsWith(alias + '.')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Convert a file path to its alias representation
     * @param filePath The absolute file path
     * @returns The alias module path (e.g., '@.models.user') or undefined
     */
    filePathToAlias(filePath: string): string | undefined {
        const normalizedPath = filePath.replace(/\\/g, '/');

        // Try each path mapping
        for (const [alias, target] of this.pathMappings.entries()) {
            const targetPath = path.resolve(this.workspaceRoot, target);
            const normalizedTarget = targetPath.replace(/\\/g, '/');

            // Check if file is under this target directory
            if (normalizedPath.startsWith(normalizedTarget)) {
                // Get relative path from target
                let relativePath = normalizedPath.substring(normalizedTarget.length);
                relativePath = relativePath.replace(/^\//, '');

                // Remove .py extension
                relativePath = relativePath.replace(/\.py$/, '');

                // Convert path to Python module notation
                const modulePath = relativePath.replace(/\//g, '.');

                // Build alias path
                const aliasPath = alias + (modulePath ? '.' + modulePath : '');

                return aliasPath;
            }
        }

        return undefined;
    }

    /**
     * Resolve an import to actual file path
     */
    resolveImport(importPath: string): string | undefined {
        for (const [alias, target] of this.pathMappings.entries()) {
            if (importPath === alias || importPath.startsWith(alias + '.')) {
                // Remove alias prefix and convert to path
                const modulePath = importPath.substring(alias.length + 1);
                const filePath = modulePath.replace(/\./g, '/');
                const fullPath = path.resolve(this.workspaceRoot, target, filePath + '.py');

                if (fs.existsSync(fullPath)) {
                    return fullPath;
                }

                // Try __init__.py
                const initPath = path.resolve(this.workspaceRoot, target, filePath, '__init__.py');
                if (fs.existsSync(initPath)) {
                    return initPath;
                }
            }
        }

        return undefined;
    }

    /**
     * Get all configured aliases
     */
    getAliases(): string[] {
        return Array.from(this.pathMappings.keys());
    }
}
