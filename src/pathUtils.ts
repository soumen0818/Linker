import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Utilities for working with file paths and imports
 */
export class PathUtils {
    /**
     * Convert a file URI to a relative import path
     * @param from The file that contains the import
     * @param to The file being imported
     * @param originalImport Optional: the original import path (for preserving style)
     * @returns Relative import path (e.g., './utils', '../components/Button')
     */
    static toImportPath(from: vscode.Uri, to: vscode.Uri, originalImport?: string): string {
        // Convert Windows paths to POSIX
        const fromPath = from.fsPath.replace(/\\/g, '/');
        const toPath = to.fsPath.replace(/\\/g, '/');

        console.log('Linker [toImportPath]: from =', fromPath);
        console.log('Linker [toImportPath]: to =', toPath);
        console.log('Linker [toImportPath]: originalImport =', originalImport);

        const fromDir = path.posix.dirname(fromPath);
        let rel = path.posix.relative(fromDir, toPath);

        console.log('Linker [toImportPath]: relative path (with ext) =', rel);

        // Check if this is a Java file
        if (toPath.endsWith('.java')) {
            // For Java, preserve the package notation from original import
            // Regular imports: import com.example.utils.Helpers;
            // Static imports: import static com.example.utils.Helpers.doSomething;
            // We need to update ONLY the class name, keep the package path and method/field name

            if (originalImport && originalImport.includes('.')) {
                const parts = originalImport.split('.');
                const newClassName = path.posix.basename(toPath).replace(/\.java$/, '');

                // Check if this is a static import by looking at the file name
                // Static imports have a method/field after the class name
                // We need to find which part is the class name and replace it

                // Try to determine if last part is a class or method/field
                // Class names typically start with uppercase, methods with lowercase
                const lastPart = parts[parts.length - 1];
                const isLastPartClass = lastPart.length > 0 && lastPart[0] === lastPart[0].toUpperCase();

                if (isLastPartClass) {
                    // Regular import: "com.example.utils.Helpers"
                    // Replace last part
                    parts[parts.length - 1] = newClassName;
                } else {
                    // Static import: "com.example.utils.Helpers.doSomething"
                    // Replace second-to-last part (the class name)
                    if (parts.length > 1) {
                        parts[parts.length - 2] = newClassName;
                    }
                }

                rel = parts.join('.');
                console.log('Linker [toImportPath]: Java package path =', rel);
            } else {
                // Fallback: just use the class name
                rel = path.posix.basename(toPath).replace(/\.java$/, '');
                console.log('Linker [toImportPath]: Java class name =', rel);
            }
        }
        // Check if this is a Go file
        else if (toPath.endsWith('.go')) {
            // For Go, preserve the package path from original import
            // Go imports: import "github.com/user/project/utils"
            // We need to update ONLY the last part (package name)

            if (originalImport && originalImport.includes('/')) {
                // Split the original import: "github.com/user/project/utils" → ["github.com", "user", "project", "utils"]
                const parts = originalImport.split('/');
                // Get new package name from file: "helpers.go" → "helpers"
                const newPackageName = path.posix.basename(toPath).replace(/\.go$/, '');
                // Replace the last part (old package name) with new package name
                parts[parts.length - 1] = newPackageName;
                // Rejoin: ["github.com", "user", "project", "helpers"] → "github.com/user/project/helpers"
                rel = parts.join('/');

                console.log('Linker [toImportPath]: Go package path =', rel);
            } else {
                // Fallback: just use the package name
                rel = path.posix.basename(toPath).replace(/\.go$/, '');
                console.log('Linker [toImportPath]: Go package name =', rel);
            }
        }
        // Check if this is a Python file
        else if (toPath.endsWith('.py')) {
            // For Python, convert file path to module path
            // Remove .py extension
            rel = rel.replace(/\.py$/, '');

            // Check if original import was relative (started with .)
            const isRelativeImport = originalImport && originalImport.startsWith('.');

            if (isRelativeImport) {
                // Preserve relative import style
                // Replace slashes with dots for Python module notation
                const parts = rel.split('/');
                let dotCount = 0;
                let moduleParts: string[] = [];

                for (const part of parts) {
                    if (part === '.') {
                        dotCount += 1;
                    } else if (part === '..') {
                        dotCount += 1;
                    } else {
                        moduleParts.push(part);
                    }
                }

                // Python relative imports: . for same dir, .. for parent
                const prefix = '.'.repeat(dotCount);
                rel = prefix + moduleParts.join('.');
            } else {
                // Absolute-style import (like "utils.helpers")
                // Just replace slashes with dots, don't add leading dots
                rel = rel.split('/').filter(p => p !== '.' && p !== '..').join('.');
            }

            console.log('Linker [toImportPath]: Python module path =', rel);
        } else {
            // JavaScript/TypeScript: Remove file extension
            rel = rel.replace(/\.(js|ts|jsx|tsx|mjs|cjs)$/, '');

            console.log('Linker [toImportPath]: relative path (no ext) =', rel);

            // Ensure it starts with ./ or ../
            if (!rel.startsWith('.') && !rel.startsWith('/')) {
                rel = './' + rel;
            }
        }

        console.log('Linker [toImportPath]: final import path =', rel);

        return rel;
    }

    /**
     * Check if a URI represents a directory
     */
    static async isDirectory(uri: vscode.Uri): Promise<boolean> {
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            return stat.type === vscode.FileType.Directory;
        } catch {
            return false;
        }
    }

    /**
     * Get all files recursively in a directory
     */
    static async getFilesInDirectory(dirUri: vscode.Uri, extensions: string[]): Promise<vscode.Uri[]> {
        const pattern = new vscode.RelativePattern(dirUri, `**/*.{${extensions.join(',')}}`);
        return await vscode.workspace.findFiles(pattern);
    }

    /**
     * Extract filename without extension
     */
    static getFileNameWithoutExtension(uri: vscode.Uri): string {
        const filename = path.posix.basename(uri.path);
        return filename.replace(/\.(js|ts|jsx|tsx|mjs|cjs)$/, '');
    }

    /**
     * Normalize path for comparison (handles Windows vs POSIX)
     */
    static normalizePath(filePath: string): string {
        return filePath.replace(/\\/g, '/');
    }
}
