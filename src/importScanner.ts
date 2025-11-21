import * as vscode from 'vscode';
import * as path from 'path';
import { PathUtils } from './pathUtils';

/**
 * Represents a found import statement
 */
export interface ImportMatch {
    /** The import path string (e.g., './utils', '@/components/Button') */
    importPath: string;
    /** Line number (0-indexed) */
    line: number;
    /** Column where import path starts (0-indexed) */
    startColumn: number;
    /** Column where import path ends (0-indexed) */
    endColumn: number;
    /** Type of import (import, require, export) */
    type: 'import' | 'require' | 'export';
    /** Quote character used (' or ") */
    quote: string;
}

/**
 * Scans files for import statements
 * Supports: import/export from, require(), dynamic imports
 */
export class ImportScanner {
    /**
     * Scan a document for import statements
     */
    static scanDocument(document: vscode.TextDocument): ImportMatch[] {
        const imports: ImportMatch[] = [];
        const lineCount = document.lineCount;

        for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
            const line = document.lineAt(lineIndex);
            const lineText = line.text;

            // Skip comments and empty lines
            if (this.isCommentOrEmpty(lineText)) {
                continue;
            }

            // Try different import patterns
            const patterns = [
                // import ... from '...'
                /import\s+(?:[\w\s{},*]+\s+from\s+)?(['"])(.*?)\1/g,
                // export ... from '...'
                /export\s+(?:[\w\s{},*]+\s+from\s+)?(['"])(.*?)\1/g,
                // require('...')
                /require\s*\(\s*(['"])(.*?)\1\s*\)/g,
                // import('...') - dynamic import
                /import\s*\(\s*(['"])(.*?)\1\s*\)/g,
            ];

            for (const pattern of patterns) {
                let match: RegExpExecArray | null;
                while ((match = pattern.exec(lineText)) !== null) {
                    const quote = match[1];
                    const importPath = match[2];

                    // Use match.index to get exact position where the match started
                    const matchStart = match.index;
                    const fullMatch = match[0];

                    // Find where the opening quote is in the full match
                    const quotePattern = quote + importPath + quote;
                    const quotePatternIndex = fullMatch.indexOf(quotePattern);

                    if (quotePatternIndex !== -1) {
                        // Calculate absolute column position of the opening quote
                        const absoluteQuoteStart = matchStart + quotePatternIndex;

                        // The import path starts AFTER the opening quote
                        const importPathStart = absoluteQuoteStart + quote.length;
                        const importPathEnd = importPathStart + importPath.length;

                        imports.push({
                            importPath,
                            line: lineIndex,
                            startColumn: importPathStart,  // Position AFTER the opening quote
                            endColumn: importPathEnd,       // Position BEFORE the closing quote
                            type: this.getImportType(fullMatch),
                            quote
                        });
                    }
                }
            }
        }

        return imports;
    }

    /**
     * Check if a line is a comment or empty
     */
    private static isCommentOrEmpty(line: string): boolean {
        const trimmed = line.trim();
        return trimmed.length === 0 ||
            trimmed.startsWith('//') ||
            trimmed.startsWith('/*') ||
            trimmed.startsWith('*');
    }

    /**
     * Determine import type from matched text
     */
    private static getImportType(matchedText: string): 'import' | 'require' | 'export' {
        if (matchedText.startsWith('export')) {
            return 'export';
        } else if (matchedText.includes('require')) {
            return 'require';
        } else {
            return 'import';
        }
    }

    /**
     * Check if an import matches a renamed file
     * Now supports TypeScript path aliases (@/, ~/, etc.)
     */
    static doesImportMatchFile(
        importMatch: ImportMatch,
        oldFileName: string,
        currentFilePath: string,
        oldFilePath: string
    ): boolean {
        const { importPath } = importMatch;

        // Check if it's a path alias (starts with @, ~, or other configured aliases)
        const isAlias = !importPath.startsWith('.') && !importPath.startsWith('/') &&
            (importPath.startsWith('@/') || importPath.startsWith('~/') || importPath.includes('/'));

        if (isAlias) {
            // Extract the file name from the alias path
            // "@/components/Footer" -> "Footer"
            const aliasFileName = path.posix.basename(importPath).replace(/\.(js|ts|jsx|tsx|mjs|cjs)$/, '');

            console.log(`Linker [doesImportMatchFile]: Alias import "${importPath}", extracting filename: "${aliasFileName}"`);
            console.log(`Linker [doesImportMatchFile]: Comparing "${aliasFileName}" with "${oldFileName}"`);

            const matches = aliasFileName === oldFileName;
            console.log(`Linker [doesImportMatchFile]: Alias match result = ${matches}`);

            return matches;
        }

        // Skip non-relative imports (like 'react', 'lodash', etc.) - these are npm packages
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
            console.log(`Linker [doesImportMatchFile]: "${importPath}" is not relative, skipping`);
            return false;
        }

        // Get the imported filename without extension
        const importedFileName = path.posix.basename(importPath).replace(/\.(js|ts|jsx|tsx|mjs|cjs)$/, '');

        console.log(`Linker [doesImportMatchFile]: Comparing "${importedFileName}" with "${oldFileName}"`);

        // Direct filename match
        const matches = importedFileName === oldFileName;
        console.log(`Linker [doesImportMatchFile]: Match result = ${matches}`);

        return matches;
    }
}
