import * as vscode from 'vscode';
import { ImportMatch } from './importScanner';

/**
 * Extended import scanner for multi-language support
 */
export class MultiLanguageScanner {
    /**
     * Scan document based on language
     */
    static scanDocument(document: vscode.TextDocument): ImportMatch[] {
        const config = vscode.workspace.getConfiguration('linker');
        const languageId = document.languageId;

        switch (languageId) {
            case 'python':
                if (config.get<boolean>('multiLanguage.python', true)) {
                    return this.scanPython(document);
                }
                break;
            case 'java':
                if (config.get<boolean>('multiLanguage.java', true)) {
                    return this.scanJava(document);
                }
                break;
            case 'go':
                if (config.get<boolean>('multiLanguage.go', true)) {
                    return this.scanGo(document);
                }
                break;
            case 'css':
            case 'scss':
            case 'less':
                if (config.get<boolean>('multiLanguage.css', true)) {
                    return this.scanCSS(document);
                }
                break;
        }

        return [];
    }

    /**
     * Scan Python imports
     * Supports: import module, from module import x, from . import x
     */
    private static scanPython(document: vscode.TextDocument): ImportMatch[] {
        const imports: ImportMatch[] = [];
        const lineCount = document.lineCount;

        for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
            const line = document.lineAt(lineIndex);
            const lineText = line.text;

            // Skip comments and empty lines
            if (this.isPythonComment(lineText)) {
                continue;
            }

            // Pattern: from module import ...
            const fromPattern = /from\s+([.\w]+)\s+import/g;
            let match: RegExpExecArray | null;

            while ((match = fromPattern.exec(lineText)) !== null) {
                const modulePath = match[1];
                const matchStart = match.index;
                const pathStart = matchStart + 'from '.length;
                const pathEnd = pathStart + modulePath.length;

                imports.push({
                    importPath: modulePath,
                    line: lineIndex,
                    startColumn: pathStart,
                    endColumn: pathEnd,
                    type: 'import',
                    quote: '' // Python doesn't use quotes for module paths
                });
            }

            // Pattern: import module (as alias)
            const importPattern = /^import\s+([.\w]+)(?:\s+as\s+\w+)?/;
            const importMatch = importPattern.exec(lineText);
            if (importMatch) {
                const modulePath = importMatch[1];
                const pathStart = 'import '.length;
                const pathEnd = pathStart + modulePath.length;

                imports.push({
                    importPath: modulePath,
                    line: lineIndex,
                    startColumn: pathStart,
                    endColumn: pathEnd,
                    type: 'import',
                    quote: ''
                });
            }
        }

        return imports;
    }

    /**
     * Scan Java imports
     * Supports: import package.Class;
     * Supports: import static package.Class.method;
     */
    private static scanJava(document: vscode.TextDocument): ImportMatch[] {
        const imports: ImportMatch[] = [];
        const lineCount = document.lineCount;

        for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
            const line = document.lineAt(lineIndex);
            const lineText = line.text;

            // Skip comments and empty lines
            if (this.isJavaComment(lineText)) {
                continue;
            }

            // Pattern: import [static] package.Class[.method];
            // Captures the package path WITHOUT the "static" keyword
            const importPattern = /import\s+(?:static\s+)?([\w.]+)\s*;/g;
            let match: RegExpExecArray | null;

            while ((match = importPattern.exec(lineText)) !== null) {
                const packagePath = match[1];
                const matchStart = match.index;
                const pathStart = matchStart + match[0].indexOf(packagePath);
                const pathEnd = pathStart + packagePath.length;

                imports.push({
                    importPath: packagePath,
                    line: lineIndex,
                    startColumn: pathStart,
                    endColumn: pathEnd,
                    type: 'import',
                    quote: ''
                });
            }
        }

        return imports;
    }

    /**
     * Scan Go imports
     * Supports: import "package", import ( "pkg1" "pkg2" )
     */
    private static scanGo(document: vscode.TextDocument): ImportMatch[] {
        const imports: ImportMatch[] = [];
        const lineCount = document.lineCount;
        let inImportBlock = false;

        for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
            const line = document.lineAt(lineIndex);
            const lineText = line.text;

            // Skip comments
            if (this.isGoComment(lineText)) {
                continue;
            }

            // Check for import block start
            if (/import\s*\(/.test(lineText)) {
                inImportBlock = true;
                continue;
            }

            // Check for import block end
            if (inImportBlock && lineText.includes(')')) {
                inImportBlock = false;
                continue;
            }

            // Single line import: import "package"
            const singlePattern = /import\s+(['"])(.*?)\1/g;
            let match: RegExpExecArray | null;

            while ((match = singlePattern.exec(lineText)) !== null) {
                const quote = match[1];
                const packagePath = match[2];
                const matchStart = match.index;
                const fullMatch = match[0];
                const quoteIndex = fullMatch.indexOf(quote + packagePath);
                const pathStart = matchStart + quoteIndex + quote.length;
                const pathEnd = pathStart + packagePath.length;

                imports.push({
                    importPath: packagePath,
                    line: lineIndex,
                    startColumn: pathStart,
                    endColumn: pathEnd,
                    type: 'import',
                    quote: quote
                });
            }

            // Import block line: "package" or alias "package"
            if (inImportBlock) {
                const blockPattern = /(['"])(.*?)\1/g;
                while ((match = blockPattern.exec(lineText)) !== null) {
                    const quote = match[1];
                    const packagePath = match[2];
                    const matchStart = match.index;
                    const pathStart = matchStart + quote.length;
                    const pathEnd = pathStart + packagePath.length;

                    imports.push({
                        importPath: packagePath,
                        line: lineIndex,
                        startColumn: pathStart,
                        endColumn: pathEnd,
                        type: 'import',
                        quote: quote
                    });
                }
            }
        }

        return imports;
    }

    /**
     * Scan CSS/SCSS/LESS @import statements
     * Supports: @import "path", @import url("path")
     */
    private static scanCSS(document: vscode.TextDocument): ImportMatch[] {
        const imports: ImportMatch[] = [];
        const lineCount = document.lineCount;

        for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
            const line = document.lineAt(lineIndex);
            const lineText = line.text;

            // Skip comments
            if (this.isCSSComment(lineText)) {
                continue;
            }

            // Pattern: @import url("path")
            const urlPattern = /@import\s+url\s*\(\s*(['"]?)(.*?)\1\s*\)/g;
            let match: RegExpExecArray | null;

            while ((match = urlPattern.exec(lineText)) !== null) {
                const quote = match[1] || '';
                const importPath = match[2];
                const matchStart = match.index;
                const fullMatch = match[0];

                // Find the path within the match
                const pathPattern = quote ? quote + importPath + quote : importPath;
                const pathIndex = fullMatch.indexOf(pathPattern);
                const pathStart = matchStart + pathIndex + quote.length;
                const pathEnd = pathStart + importPath.length;

                imports.push({
                    importPath,
                    line: lineIndex,
                    startColumn: pathStart,
                    endColumn: pathEnd,
                    type: 'import',
                    quote: quote
                });
            }

            // Pattern: @import "path"
            const directPattern = /@import\s+(['"])(.*?)\1/g;
            while ((match = directPattern.exec(lineText)) !== null) {
                const quote = match[1];
                const importPath = match[2];
                const matchStart = match.index;
                const fullMatch = match[0];
                const pathIndex = fullMatch.indexOf(quote + importPath);
                const pathStart = matchStart + pathIndex + quote.length;
                const pathEnd = pathStart + importPath.length;

                imports.push({
                    importPath,
                    line: lineIndex,
                    startColumn: pathStart,
                    endColumn: pathEnd,
                    type: 'import',
                    quote: quote
                });
            }
        }

        return imports;
    }

    /**
     * Check if line is Python comment
     */
    private static isPythonComment(line: string): boolean {
        const trimmed = line.trim();
        return trimmed.startsWith('#') || trimmed.length === 0;
    }

    /**
     * Check if line is Java comment
     */
    private static isJavaComment(line: string): boolean {
        const trimmed = line.trim();
        return trimmed.startsWith('//') || trimmed.startsWith('/*') ||
            trimmed.startsWith('*') || trimmed.length === 0;
    }

    /**
     * Check if line is Go comment
     */
    private static isGoComment(line: string): boolean {
        const trimmed = line.trim();
        return trimmed.startsWith('//') || trimmed.startsWith('/*') ||
            trimmed.length === 0;
    }

    /**
     * Check if line is CSS comment
     */
    private static isCSSComment(line: string): boolean {
        const trimmed = line.trim();
        return trimmed.startsWith('/*') || trimmed.startsWith('*') ||
            trimmed.length === 0;
    }

    /**
     * Convert Python module path to file path
     * e.g., "package.module" -> "package/module"
     */
    static pythonModuleToPath(modulePath: string): string {
        return modulePath.replace(/\./g, '/');
    }

    /**
     * Convert file path to Python module path
     * e.g., "package/module" -> "package.module"
     */
    static pathToPythonModule(filePath: string): string {
        return filePath.replace(/\//g, '.').replace(/\\/g, '.');
    }

    /**
     * Convert Java package to path
     * e.g., "com.example.Class" -> "com/example/Class"
     */
    static javaPackageToPath(packagePath: string): string {
        return packagePath.replace(/\./g, '/');
    }

    /**
     * Convert path to Java package
     * e.g., "com/example/Class" -> "com.example.Class"
     */
    static pathToJavaPackage(filePath: string): string {
        return filePath.replace(/\//g, '.').replace(/\\/g, '.');
    }

    /**
     * Check if a Python import matches a renamed file
     * Python imports use dot notation: from utils.helpers import x
     */
    static doesPythonImportMatchFile(
        importPath: string,
        oldFileName: string
    ): boolean {
        // Python imports can be:
        // 1. "utils.helpers" - module path
        // 2. ".helpers" - relative import from same directory
        // 3. "..utils.helpers" - relative import from parent directory

        // Extract the module name from the import path
        // For "utils.helpers" -> "helpers"
        // For ".helpers" -> "helpers"
        // For "..utils.helpers" -> "helpers"

        const parts = importPath.split('.');
        const moduleName = parts[parts.length - 1];

        // Remove .py extension from oldFileName if present
        const fileNameWithoutExt = oldFileName.replace(/\.py$/, '');

        console.log(`Linker [Python Match]: Comparing module "${moduleName}" with file "${fileNameWithoutExt}"`);

        return moduleName === fileNameWithoutExt;
    }

    /**
     * Check if a Java import matches a renamed file
     * Java imports use package notation: import com.example.utils.Helpers;
     * Also supports static imports: import static com.example.utils.Helpers.doSomething;
     */
    static doesJavaImportMatchFile(
        importPath: string,
        oldFileName: string
    ): boolean {
        // Java imports can be:
        // 1. Regular: "com.example.utils.Helpers" - class name is last part
        // 2. Static: "com.example.utils.Helpers.doSomething" - class name is second to last part

        const parts = importPath.split('.');
        const fileNameWithoutExt = oldFileName.replace(/\.java$/, '');

        // Check if this could be a static import (has method/field name after class)
        // Try matching the last part (for regular imports) OR second-to-last part (for static imports)
        const lastPart = parts[parts.length - 1];
        const secondToLastPart = parts.length > 1 ? parts[parts.length - 2] : '';

        console.log(`Linker [Java Match]: Checking "${importPath}"`);
        console.log(`Linker [Java Match]: Last part: "${lastPart}", Second-to-last: "${secondToLastPart}", File: "${fileNameWithoutExt}"`);

        // Try matching last part first (regular import)
        if (lastPart === fileNameWithoutExt) {
            console.log(`Linker [Java Match]: ✓ Matched as regular import`);
            return true;
        }

        // Try matching second-to-last part (static import)
        if (secondToLastPart === fileNameWithoutExt) {
            console.log(`Linker [Java Match]: ✓ Matched as static import`);
            return true;
        }

        console.log(`Linker [Java Match]: ✗ No match`);
        return false;
    }

    /**
     * Check if a Go import matches a renamed file
     * Go imports use package paths: import "github.com/user/project/utils"
     */
    static doesGoImportMatchFile(
        importPath: string,
        oldFileName: string
    ): boolean {
        // Go imports: "github.com/user/project/utils"
        // Extract the package name (last part)

        const parts = importPath.split('/');
        const packageName = parts[parts.length - 1];

        // Remove .go extension from oldFileName if present
        const fileNameWithoutExt = oldFileName.replace(/\.go$/, '');

        console.log(`Linker [Go Match]: Comparing package "${packageName}" with file "${fileNameWithoutExt}"`);

        return packageName === fileNameWithoutExt;
    }

    /**
     * Check if a CSS import matches a renamed file
     * CSS imports: @import "partials/variables.css" or @import "./partials/variables.css"
     */
    static doesCSSImportMatchFile(
        importPath: string,
        oldFileName: string
    ): boolean {
        // CSS imports can be:
        // 1. "partials/variables.css" - relative without ./
        // 2. "./partials/variables.css" - relative with ./
        // 3. "../partials/variables.css" - relative with ../

        // Extract just the filename from the path
        const parts = importPath.split('/');
        const fileName = parts[parts.length - 1];

        console.log(`Linker [CSS Match]: Comparing import file "${fileName}" with renamed file "${oldFileName}"`);

        return fileName === oldFileName;
    }
}

