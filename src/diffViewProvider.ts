import * as vscode from 'vscode';
import * as path from 'path';

export interface DiffItem {
    filePath: string;
    oldImport: string;
    newImport: string;
    line: number;
}

/**
 * Provides enhanced diff view for import changes using WebviewPanel (editor area)
 */
export class DiffViewProvider {
    public static readonly viewType = 'linkerDiffView';
    private _panel?: vscode.WebviewPanel;
    private _diffItems: DiffItem[] = [];
    private _pendingResolve?: (value: boolean) => void;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    /**
     * Create or show the webview panel
     */
    private createPanel(): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            DiffViewProvider.viewType,
            'Import Changes Preview',
            vscode.ViewColumn.Beside, // Open beside current editor
            {
                enableScripts: true,
                localResourceRoots: [this._extensionUri],
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this._getHtmlForWebview(panel.webview);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'viewFile':
                    this._viewFile(data.filePath, data.line);
                    break;
                case 'apply':
                    this._applyChanges();
                    break;
                case 'cancel':
                    this._cancelChanges();
                    break;
            }
        });

        // Reset when panel is closed
        panel.onDidDispose(() => {
            this._panel = undefined;
            // If panel is closed without action, treat as cancel
            if (this._pendingResolve) {
                this._pendingResolve(false);
                this._pendingResolve = undefined;
            }
        });

        return panel;
    }

    /**
     * Update diff items and refresh view
     */
    public updateDiff(items: DiffItem[]) {
        this._diffItems = items;

        // If panel exists, send message immediately
        if (this._panel) {
            this._panel.webview.postMessage({
                type: 'updateDiff',
                items: items
            });
        }
    }

    /**
     * Show the diff view panel and wait for user confirmation
     * Returns true if user clicks Apply, false if Cancel
     */
    public async showAndWaitForConfirmation(): Promise<boolean> {
        // Create or reveal the panel
        if (this._panel) {
            this._panel.reveal(vscode.ViewColumn.Beside);
        } else {
            this._panel = this.createPanel();
        }

        // Send diff items
        if (this._diffItems.length > 0) {
            // Small delay to ensure webview is ready
            setTimeout(() => {
                this._panel?.webview.postMessage({
                    type: 'updateDiff',
                    items: this._diffItems
                });
            }, 100);
        }

        // Wait for user decision
        return new Promise<boolean>((resolve) => {
            this._pendingResolve = resolve;
        });
    }

    /**
     * Show the diff view panel (legacy method for showing summary)
     */
    public async show() {
        // Create or reveal the panel
        if (this._panel) {
            this._panel.reveal(vscode.ViewColumn.Beside);
        } else {
            this._panel = this.createPanel();
        }

        // Send diff items
        if (this._diffItems.length > 0) {
            // Small delay to ensure webview is ready
            setTimeout(() => {
                this._panel?.webview.postMessage({
                    type: 'updateDiff',
                    items: this._diffItems
                });
            }, 100);
        }
    }

    private _applyChanges() {
        console.log('DiffViewProvider: Apply button clicked');
        if (this._pendingResolve) {
            this._pendingResolve(true);
            this._pendingResolve = undefined;
        }
        this._panel?.dispose();
    }

    private _cancelChanges() {
        console.log('DiffViewProvider: Cancel button clicked');
        if (this._pendingResolve) {
            this._pendingResolve(false);
            this._pendingResolve = undefined;
        }
        this._panel?.dispose();
    }

    private async _viewFile(filePath: string, line: number) {
        const uri = vscode.Uri.file(filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);

        // Move cursor to the line
        const position = new vscode.Position(line, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
        );
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const config = vscode.workspace.getConfiguration('linker');
        const layout = config.get<string>('preview.layout', 'side-by-side');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Linker Diff View</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            font-size: 13px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 0;
            overflow-x: hidden;
        }

        /* Sticky Header */
        .header {
            position: sticky;
            top: 0;
            z-index: 100;
            background: var(--vscode-editor-background);
            border-bottom: 2px solid var(--vscode-panel-border);
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .header-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-foreground);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .logo {
            font-size: 20px;
        }

        .stats {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
        }

        .buttons {
            display: flex;
            gap: 8px;
        }

        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 20px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        button:active {
            transform: translateY(0);
        }

        button.secondary {
            background-color: transparent;
            color: var(--vscode-foreground);
            border: 1px solid var(--vscode-panel-border);
        }

        button.secondary:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        /* Main Content */
        .diff-container {
            padding: 16px 20px;
            max-width: 1400px;
            margin: 0 auto;
        }

        .diff-file {
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            margin-bottom: 12px;
            overflow: hidden;
            transition: all 0.2s ease;
        }

        .diff-file:hover {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        /* Compact File Header */
        .file-header {
            background: linear-gradient(135deg, var(--vscode-sideBar-background) 0%, var(--vscode-editor-background) 100%);
            padding: 10px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .file-header:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .file-info {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }

        .file-icon {
            font-size: 16px;
        }

        .file-path {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            font-weight: 500;
            color: var(--vscode-textLink-foreground);
        }

        .change-badge {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
        }

        /* Compact Diff Content */
        .diff-content {
            padding: 10px 14px;
            display: grid;
            grid-template-columns: ${layout === 'side-by-side' ? '1fr auto 1fr' : '1fr'};
            gap: 8px;
            align-items: start;
            background: var(--vscode-editor-background);
        }

        .diff-side {
            min-width: 0;
        }

        .diff-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .diff-label.old {
            color: var(--vscode-gitDecoration-deletedResourceForeground);
        }

        .diff-label.new {
            color: var(--vscode-gitDecoration-addedResourceForeground);
        }

        /* Compact Code Display */
        .diff-code {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 8px 10px;
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-word;
            position: relative;
            overflow: hidden;
        }

        .diff-code.old {
            background: linear-gradient(135deg, rgba(255, 0, 0, 0.08) 0%, rgba(255, 0, 0, 0.04) 100%);
            border-left: 3px solid var(--vscode-gitDecoration-deletedResourceForeground);
        }

        .diff-code.new {
            background: linear-gradient(135deg, rgba(0, 255, 0, 0.08) 0%, rgba(0, 255, 0, 0.04) 100%);
            border-left: 3px solid var(--vscode-gitDecoration-addedResourceForeground);
        }

        /* Compact Arrow */
        .diff-arrow {
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--vscode-descriptionForeground);
            font-size: 16px;
            opacity: 0.6;
            padding-top: 16px;
            min-width: 24px;
        }

        .diff-arrow::before {
            content: '→';
        }

        /* No Changes State */
        .no-changes {
            text-align: center;
            padding: 60px 20px;
            color: var(--vscode-descriptionForeground);
        }

        .no-changes-icon {
            font-size: 48px;
            margin-bottom: 12px;
            opacity: 0.5;
        }

        .no-changes-text {
            font-size: 14px;
            font-weight: 500;
        }

        /* Divider between multiple changes in same file */
        .change-divider {
            height: 1px;
            background: var(--vscode-panel-border);
            margin: 10px 0;
            opacity: 0.5;
        }

        /* Scrollbar styling */
        ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }

        ::-webkit-scrollbar-track {
            background: var(--vscode-editor-background);
        }

        ::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-background);
            border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-hoverBackground);
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
            .header {
                padding: 10px 15px;
            }
            .header-left {
                gap: 10px;
            }
            .header-title {
                font-size: 14px;
            }
            .stats {
                font-size: 10px;
                padding: 3px 8px;
            }
            button {
                padding: 6px 14px;
                font-size: 11px;
            }
            .diff-container {
                padding: 12px 15px;
            }
        }

        @media (max-width: 768px) {
            .header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            .header-left {
                width: 100%;
                flex-wrap: wrap;
            }
            .buttons {
                width: 100%;
            }
            button {
                flex: 1;
            }
            .diff-content {
                grid-template-columns: 1fr !important;
                gap: 6px;
            }
            .diff-arrow {
                padding: 6px 0;
                font-size: 14px;
            }
            .diff-arrow::before {
                content: '↓';
            }
            .diff-container {
                padding: 10px;
            }
            .file-header {
                padding: 8px 10px;
            }
            .diff-content {
                padding: 8px 10px;
            }
        }

        @media (max-width: 480px) {
            .header-title .logo {
                display: none;
            }
            .header-title {
                font-size: 13px;
            }
            .stats {
                font-size: 9px;
            }
            button {
                padding: 6px 10px;
                font-size: 10px;
            }
            .file-path {
                font-size: 11px;
            }
            .diff-code {
                font-size: 10px;
                padding: 6px 8px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <div class="header-title">
                <span class="logo">🔗</span>
                <span>Import Changes Preview</span>
            </div>
            <div class="stats" id="stats">Loading...</div>
        </div>
        <div class="buttons">
            <button onclick="applyChanges()">
                <span>✓</span> Apply Changes
            </button>
            <button class="secondary" onclick="cancelChanges()">
                <span>✕</span> Cancel
            </button>
        </div>
    </div>

    <div class="diff-container" id="diffContainer">
        <div class="no-changes">
            <div class="no-changes-icon">📝</div>
            <div class="no-changes-text">No changes to display</div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function applyChanges() {
            console.log('Apply button clicked');
            vscode.postMessage({ type: 'apply' });
        }

        function cancelChanges() {
            console.log('Cancel button clicked');
            vscode.postMessage({ type: 'cancel' });
        }

        function viewFile(filePath, line) {
            vscode.postMessage({ 
                type: 'viewFile',
                filePath: filePath,
                line: line
            });
        }

        window.addEventListener('message', event => {
            const message = event.data;
            console.log('Webview received message:', message);
            if (message.type === 'updateDiff') {
                console.log('Updating diff view with items:', message.items);
                updateDiffView(message.items);
            }
        });

        function updateDiffView(items) {
            console.log('updateDiffView called with:', items);
            const container = document.getElementById('diffContainer');
            const stats = document.getElementById('stats');
            
            if (!items || items.length === 0) {
                console.log('No items to display');
                container.innerHTML = \`
                    <div class="no-changes">
                        <div class="no-changes-icon">✓</div>
                        <div class="no-changes-text">No changes detected</div>
                    </div>\`;
                stats.textContent = 'No changes';
                return;
            }

            console.log('Displaying ' + items.length + ' diff items');

            // Group by file
            const fileGroups = {};
            items.forEach(item => {
                if (!fileGroups[item.filePath]) {
                    fileGroups[item.filePath] = [];
                }
                fileGroups[item.filePath].push(item);
            });

            const totalFiles = Object.keys(fileGroups).length;
            const totalChanges = items.length;
            stats.textContent = \`\${totalChanges} change\${totalChanges !== 1 ? 's' : ''} • \${totalFiles} file\${totalFiles !== 1 ? 's' : ''}\`;
            
            console.log('Grouped into ' + totalFiles + ' files');

            let html = '';
            for (const [filePath, changes] of Object.entries(fileGroups)) {
                const fileName = filePath.split(/[\\\\\\/]/).pop();
                const fileExt = fileName.split('.').pop();
                const fileIcon = getFileIcon(fileExt);
                
                html += \`
                    <div class="diff-file">
                        <div class="file-header" onclick="viewFile('\${escapeHtml(filePath)}', \${changes[0].line})">
                            <div class="file-info">
                                <span class="file-icon">\${fileIcon}</span>
                                <span class="file-path" title="\${escapeHtml(filePath)}">\${escapeHtml(fileName)}</span>
                            </div>
                            <span class="change-badge">\${changes.length} change\${changes.length !== 1 ? 's' : ''}</span>
                        </div>
                        \${changes.map((change, index) => \`
                            \${index > 0 ? '<div class="change-divider"></div>' : ''}
                            <div class="diff-content">
                                <div class="diff-side">
                                    <div class="diff-label old">
                                        <span>−</span> Line \${change.line + 1} (Before)
                                    </div>
                                    <div class="diff-code old">\${escapeHtml(change.oldImport)}</div>
                                </div>
                                <div class="diff-arrow"></div>
                                <div class="diff-side">
                                    <div class="diff-label new">
                                        <span>+</span> Line \${change.line + 1} (After)
                                    </div>
                                    <div class="diff-code new">\${escapeHtml(change.newImport)}</div>
                                </div>
                            </div>
                        \`).join('')}
                    </div>
                \`;
            }

            container.innerHTML = html;
        }

        function getFileIcon(ext) {
            const icons = {
                'js': '📜',
                'jsx': '⚛️',
                'ts': '📘',
                'tsx': '⚛️',
                'py': '🐍',
                'go': '🔷',
                'css': '🎨',
                'scss': '🎨',
                'less': '🎨',
                'json': '📋',
                'md': '📝'
            };
            return icons[ext] || '📄';
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    </script>
</body>
</html>`;
    }
}
