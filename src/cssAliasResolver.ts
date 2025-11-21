import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Resolves CSS/SCSS path aliases from build tool configurations
 * Supports: webpack, vite, parcel, and common alias patterns (~, @)
 */
export class CSSAliasResolver {
    private pathMappings: Map<string, string> = new Map();
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Load CSS alias configurations from build tools
     */
    async loadConfig(): Promise<boolean> {
        try {
            // Try webpack
            await this.loadFromWebpack();

            // Try vite
            await this.loadFromVite();

            // Detect common patterns
            this.detectCommonPatterns();

            return this.pathMappings.size > 0;
        } catch (error) {
            console.error('Failed to load CSS alias config:', error);
            return false;
        }
    }

    /**
     * Load aliases from webpack.config.js
     */
    private async loadFromWebpack(): Promise<void> {
        const webpackPath = path.join(this.workspaceRoot, 'webpack.config.js');

        if (!fs.existsSync(webpackPath)) {
            return;
        }

        try {
            const content = fs.readFileSync(webpackPath, 'utf-8');

            // Look for resolve.alias configuration
            // This is a simple pattern match, not a full JS parser
            const aliasMatch = content.match(/alias\s*:\s*\{([^}]+)\}/);
            if (aliasMatch) {
                const aliasBlock = aliasMatch[1];

                // Match patterns like: '@': path.resolve(__dirname, 'src')
                const aliasPattern = /['"]([^'"]+)['"]\s*:\s*.*?['"]([^'"]+)['"]/g;
                let match;

                while ((match = aliasPattern.exec(aliasBlock)) !== null) {
                    const alias = match[1];
                    const targetPath = match[2];

                    // Resolve relative paths
                    const resolved = targetPath.startsWith('.')
                        ? targetPath
                        : targetPath.replace(/^.*?src/, 'src');

                    this.pathMappings.set(alias, resolved);
                }
            }
        } catch (error) {
            console.error('Error parsing webpack.config.js:', error);
        }
    }

    /**
     * Load aliases from vite.config.js/ts
     */
    private async loadFromVite(): Promise<void> {
        const viteConfigs = ['vite.config.js', 'vite.config.ts'];

        for (const configFile of viteConfigs) {
            const vitePath = path.join(this.workspaceRoot, configFile);

            if (!fs.existsSync(vitePath)) {
                continue;
            }

            try {
                const content = fs.readFileSync(vitePath, 'utf-8');

                // Look for resolve.alias configuration
                const aliasMatch = content.match(/alias\s*:\s*\{([^}]+)\}/);
                if (aliasMatch) {
                    const aliasBlock = aliasMatch[1];

                    // Match patterns like: '@': fileURLToPath(new URL('./src', import.meta.url))
                    // Or simpler: '@': './src'
                    const aliasPattern = /['"]([^'"]+)['"]\s*:\s*.*?['"]([^'"]+)['"]/g;
                    let match;

                    while ((match = aliasPattern.exec(aliasBlock)) !== null) {
                        const alias = match[1];
                        const targetPath = match[2];

                        // Resolve paths
                        const resolved = targetPath.startsWith('.')
                            ? targetPath.replace(/^\.\//, '')
                            : targetPath;

                        this.pathMappings.set(alias, resolved);
                    }
                }
            } catch (error) {
                console.error(`Error parsing ${configFile}:`, error);
            }
        }
    }

    /**
     * Detect common CSS alias patterns
     */
    private detectCommonPatterns(): void {
        // Common pattern: ~ points to node_modules
        this.pathMappings.set('~', 'node_modules');

        // Check for src directory
        const srcPath = path.join(this.workspaceRoot, 'src');
        if (fs.existsSync(srcPath) && fs.statSync(srcPath).isDirectory()) {
            // Add @ alias if not already configured
            if (!this.pathMappings.has('@')) {
                this.pathMappings.set('@', 'src');
            }
        }

        // Check for styles directory
        const stylesPath = path.join(this.workspaceRoot, 'styles');
        if (fs.existsSync(stylesPath) && fs.statSync(stylesPath).isDirectory()) {
            if (!this.pathMappings.has('@styles')) {
                this.pathMappings.set('@styles', 'styles');
            }
        }

        // Check for assets directory
        const assetsPath = path.join(this.workspaceRoot, 'assets');
        if (fs.existsSync(assetsPath) && fs.statSync(assetsPath).isDirectory()) {
            if (!this.pathMappings.has('@assets')) {
                this.pathMappings.set('@assets', 'assets');
            }
        }
    }

    /**
     * Check if an import uses an alias
     */
    isAliasedImport(importPath: string): boolean {
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
            return false; // Relative imports
        }

        // Check if matches any configured alias
        for (const alias of this.pathMappings.keys()) {
            if (importPath === alias || importPath.startsWith(alias + '/')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Convert a file path to its alias representation
     * @param filePath The absolute file path
     * @returns The alias path (e.g., '@/styles/main.scss')
     */
    filePathToAlias(filePath: string): string | undefined {
        const normalizedPath = filePath.replace(/\\/g, '/');

        // Try each path mapping
        for (const [alias, target] of this.pathMappings.entries()) {
            // Skip node_modules alias
            if (alias === '~') {
                continue;
            }

            const targetPath = path.resolve(this.workspaceRoot, target);
            const normalizedTarget = targetPath.replace(/\\/g, '/');

            // Check if file is under this target directory
            if (normalizedPath.startsWith(normalizedTarget)) {
                // Get relative path from target
                let relativePath = normalizedPath.substring(normalizedTarget.length);
                relativePath = relativePath.replace(/^\//, '');

                // Build alias path (keep file extension for CSS)
                const aliasPath = alias + '/' + relativePath;

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
            if (importPath === alias || importPath.startsWith(alias + '/')) {
                // Remove alias prefix
                const relativePath = importPath.substring(alias.length + 1);
                const fullPath = path.resolve(this.workspaceRoot, target, relativePath);

                if (fs.existsSync(fullPath)) {
                    return fullPath;
                }

                // Try with common extensions
                for (const ext of ['.css', '.scss', '.sass', '.less']) {
                    const withExt = fullPath + ext;
                    if (fs.existsSync(withExt)) {
                        return withExt;
                    }
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
