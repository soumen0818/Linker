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
     * @returns Relative import path (e.g., './utils', '../components/Button')
     */
    static toImportPath(from: vscode.Uri, to: vscode.Uri): string {
        // Convert Windows paths to POSIX
        const fromPath = from.fsPath.replace(/\\/g, '/');
        const toPath = to.fsPath.replace(/\\/g, '/');

        console.log('Linker [toImportPath]: from =', fromPath);
        console.log('Linker [toImportPath]: to =', toPath);

        const fromDir = path.posix.dirname(fromPath);
        let rel = path.posix.relative(fromDir, toPath);

        console.log('Linker [toImportPath]: relative path (with ext) =', rel);

        // Remove file extension FIRST
        rel = rel.replace(/\.(js|ts|jsx|tsx|mjs|cjs)$/, '');

        console.log('Linker [toImportPath]: relative path (no ext) =', rel);

        // Ensure it starts with ./ or ../
        if (!rel.startsWith('.') && !rel.startsWith('/')) {
            rel = './' + rel;
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
