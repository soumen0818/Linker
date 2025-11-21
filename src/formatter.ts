import * as vscode from 'vscode';

export type QuoteStyle = 'single' | 'double' | 'auto';
export type SemicolonStyle = 'always' | 'never' | 'auto';

/**
 * Handles formatting of import statements
 */
export class ImportFormatter {
    private quoteStyle: QuoteStyle = 'auto';
    private semicolonStyle: SemicolonStyle = 'auto';

    constructor() {
        this.loadConfig();
    }

    private loadConfig() {
        const config = vscode.workspace.getConfiguration('linker');
        this.quoteStyle = config.get<QuoteStyle>('formatting.quoteStyle', 'auto');
        this.semicolonStyle = config.get<SemicolonStyle>('formatting.semicolons', 'auto');
    }

    /**
     * Format an import path with the configured quote style
     */
    public formatImportPath(originalImport: string, newPath: string, fileContent?: string): string {
        console.log('Linker [formatImportPath]: CALLED');
        console.log('Linker [formatImportPath]: originalImport =', JSON.stringify(originalImport));
        console.log('Linker [formatImportPath]: newPath =', JSON.stringify(newPath));

        // Check if this is a Go import (has "package/path" in quotes)
        if (this.isGoImport(originalImport)) {
            return this.formatGoImport(originalImport, newPath);
        }

        // Check if this is a Python import (no quotes)
        if (this.isPythonImport(originalImport)) {
            return this.formatPythonImport(originalImport, newPath);
        }

        // Detect current quote style from original import
        const originalQuote = this.detectQuoteStyle(originalImport);

        // Determine which quote to use
        let quote: string;
        if (this.quoteStyle === 'auto') {
            // Use the quote from original import
            quote = originalQuote;
        } else if (this.quoteStyle === 'single') {
            quote = "'";
        } else {
            quote = '"';
        }

        // Build the formatted import (this already preserves semicolons)
        const formattedImport = this.buildFormattedImport(originalImport, newPath, quote);

        // Return as-is - buildFormattedImport already handles semicolons correctly
        return formattedImport;
    }

    /**
     * Check if this is a Go import statement
     */
    private isGoImport(importStatement: string): boolean {
        // Go imports: import "package/path" or import ( ... )
        return /^\s*import\s+["'][\w./]+["']/.test(importStatement);
    }

    /**
     * Format Go import statement
     */
    private formatGoImport(originalImport: string, newPath: string): string {
        // Go imports: import "github.com/user/project/utils"
        // Simply replace the path inside quotes
        const match = originalImport.match(/^(\s*import\s+)(["'])([\w./]+)(["'].*)$/);
        if (match) {
            const [, prefix, openQuote, oldPath, suffix] = match;
            return `${prefix}${openQuote}${newPath}${suffix}`;
        }

        // Fallback - shouldn't happen
        return originalImport;
    }

    /**
     * Check if this is a Python import statement
     */
    private isPythonImport(importStatement: string): boolean {
        return /^(\s*)(from\s+[\w.]+\s+import|import\s+[\w.]+)/.test(importStatement);
    }

    /**
     * Format Python import statement
     */
    private formatPythonImport(originalImport: string, newPath: string): string {
        // Handle: from module import ...
        const fromMatch = originalImport.match(/^(\s*from\s+)([\w.]+)(\s+import.*)$/);
        if (fromMatch) {
            const [, prefix, oldPath, suffix] = fromMatch;
            return `${prefix}${newPath}${suffix}`;
        }

        // Handle: import module (as alias)
        const importMatch = originalImport.match(/^(\s*import\s+)([\w.]+)(.*)$/);
        if (importMatch) {
            const [, prefix, oldPath, suffix] = importMatch;
            return `${prefix}${newPath}${suffix}`;
        }

        // Fallback
        return originalImport;
    }

    /**
     * Detect quote style from import statement
     */
    private detectQuoteStyle(importStatement: string): string {
        if (importStatement.includes('"')) {
            return '"';
        } else if (importStatement.includes("'")) {
            return "'";
        }
        return "'"; // Default to single quote
    }

    /**
     * Determine if semicolon should be added
     */
    private shouldAddSemicolon(originalImport: string, fileContent?: string): boolean {
        if (this.semicolonStyle === 'always') {
            return true;
        } else if (this.semicolonStyle === 'never') {
            return false;
        }

        // Auto-detect from original import
        const hasSemicolon = originalImport.trim().endsWith(';');

        if (!fileContent) {
            return hasSemicolon;
        }

        // Analyze file content to detect project style
        const lines = fileContent.split('\n');
        let semicolonCount = 0;
        let noSemicolonCount = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('import ') || trimmed.startsWith('const ') ||
                trimmed.startsWith('let ') || trimmed.startsWith('var ')) {
                if (trimmed.endsWith(';')) {
                    semicolonCount++;
                } else if (trimmed.length > 0 && !trimmed.endsWith('{') && !trimmed.endsWith(',')) {
                    noSemicolonCount++;
                }
            }
        }

        // If we have data, use the majority style
        if (semicolonCount + noSemicolonCount > 0) {
            return semicolonCount >= noSemicolonCount;
        }

        // Fall back to original
        return hasSemicolon;
    }

    /**
     * Build formatted import with new path
     */
    private buildFormattedImport(originalImport: string, newPath: string, quote: string): string {
        console.log('Linker [buildFormattedImport]: originalImport =', originalImport);
        console.log('Linker [buildFormattedImport]: newPath =', newPath);
        console.log('Linker [buildFormattedImport]: quote =', quote);

        // Extract the parts of the import - Match opening and closing quotes separately
        // Use non-greedy match and ensure we capture content AFTER closing quote (not including it)
        const importMatch = originalImport.match(/^(\s*)(import\s+.*?from\s+)['"](.+?)['"](.*)$/);
        if (importMatch) {
            const [fullMatch, indent, importPart, oldPath, afterClosingQuote] = importMatch;
            console.log('Linker [buildFormattedImport]: Matched import statement');
            console.log('Linker [buildFormattedImport]: indent =', JSON.stringify(indent));
            console.log('Linker [buildFormattedImport]: importPart =', JSON.stringify(importPart));
            console.log('Linker [buildFormattedImport]: oldPath =', oldPath);
            console.log('Linker [buildFormattedImport]: afterClosingQuote =', JSON.stringify(afterClosingQuote));

            // afterClosingQuote is everything AFTER the closing quote (;, semicolon, etc.)
            const result = `${indent}${importPart}${quote}${newPath}${quote}${afterClosingQuote}`;
            console.log('Linker [buildFormattedImport]: result =', result);
            return result;
        }

        // Handle require statements
        const requireMatch = originalImport.match(/^(\s*)(.*?require\s*\(\s*)['"](.+?)['"](\s*\).*)$/);
        if (requireMatch) {
            const [, indent, requirePart, oldPath, afterClosingQuote] = requireMatch;
            return `${indent}${requirePart}${quote}${newPath}${quote}${afterClosingQuote}`;
        }

        // Handle dynamic imports
        const dynamicMatch = originalImport.match(/^(\s*)(.*?import\s*\(\s*)['"](.+?)['"](\s*\).*)$/);
        if (dynamicMatch) {
            const [, indent, importPart, oldPath, afterClosingQuote] = dynamicMatch;
            return `${indent}${importPart}${quote}${newPath}${quote}${afterClosingQuote}`;
        }

        // Handle re-exports  
        const exportMatch = originalImport.match(/^(\s*)(export\s+.*?from\s+)['"](.+?)['"](.*)$/);
        if (exportMatch) {
            const [, indent, exportPart, oldPath, afterClosingQuote] = exportMatch;
            return `${indent}${exportPart}${quote}${newPath}${quote}${afterClosingQuote}`;
        }

        // Fallback: just replace the path with proper quoting
        return originalImport.replace(/(['"])(.+?)\1/, `${quote}${newPath}${quote}`);
    }

    /**
     * Format CSS @import statement
     */
    public formatCSSImport(originalImport: string, newPath: string): string {
        const quote = this.quoteStyle === 'double' ? '"' :
            this.quoteStyle === 'single' ? "'" :
                this.detectQuoteStyle(originalImport);

        // Handle @import url() syntax
        if (originalImport.includes('url(')) {
            return originalImport.replace(
                /url\s*\(\s*['"]?(.+?)['"]?\s*\)/,
                `url(${quote}${newPath}${quote})`
            );
        }

        // Handle @import "path" syntax
        return originalImport.replace(
            /(@import\s+)['"](.+?)['"]/,
            `$1${quote}${newPath}${quote}`
        );
    }

    /**
     * Detect if file uses ES modules or CommonJS
     */
    public detectModuleStyle(fileContent: string): 'esm' | 'commonjs' | 'mixed' {
        const hasESM = /^\s*(import|export)\s+/m.test(fileContent);
        const hasCJS = /\brequire\s*\(/m.test(fileContent);

        if (hasESM && hasCJS) {
            return 'mixed';
        } else if (hasESM) {
            return 'esm';
        } else if (hasCJS) {
            return 'commonjs';
        }
        return 'esm'; // Default
    }

    /**
     * Preserve original formatting patterns
     */
    public preserveFormatting(original: string, updated: string): string {
        // Preserve leading/trailing whitespace
        const leadingWhitespace = original.match(/^\s*/)?.[0] || '';
        const trailingWhitespace = original.match(/\s*$/)?.[0] || '';

        return leadingWhitespace + updated.trim() + trailingWhitespace;
    }
}

// Singleton instance
let formatterInstance: ImportFormatter | null = null;

export function getFormatter(): ImportFormatter {
    if (!formatterInstance) {
        formatterInstance = new ImportFormatter();
    }
    return formatterInstance;
}
