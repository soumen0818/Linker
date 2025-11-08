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
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 10px;
        }

        h2 {
            margin-bottom: 15px;
            color: var(--vscode-foreground);
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .stats {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
        }

        .buttons {
            display: flex;
            gap: 10px;
        }

        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            border-radius: 2px;
            font-size: 13px;
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .diff-container {
            margin-bottom: 20px;
        }

        .diff-file {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-left: 3px solid var(--vscode-textLink-foreground);
            margin-bottom: 15px;
            border-radius: 3px;
            overflow: hidden;
        }

        .file-header {
            background-color: var(--vscode-sideBar-background);
            padding: 10px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
        }

        .file-header:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .file-path {
            font-family: var(--vscode-editor-font-family);
            font-size: 0.95em;
        }

        .line-number {
            color: var(--vscode-descriptionForeground);
            font-size: 0.85em;
        }

        .diff-content {
            display: flex;
            flex-direction: ${layout === 'side-by-side' ? 'row' : 'column'};
            gap: 10px;
            padding: 10px;
        }

        .diff-side {
            flex: 1;
            min-width: 0;
        }

        .diff-label {
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }

        .diff-label.old {
            color: var(--vscode-gitDecoration-deletedResourceForeground);
        }

        .diff-label.new {
            color: var(--vscode-gitDecoration-addedResourceForeground);
        }

        .diff-code {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 3px;
            padding: 10px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            white-space: pre-wrap;
            word-break: break-all;
        }

        .diff-code.old {
            background-color: rgba(255, 0, 0, 0.1);
            border-color: var(--vscode-gitDecoration-deletedResourceForeground);
        }

        .diff-code.new {
            background-color: rgba(0, 255, 0, 0.1);
            border-color: var(--vscode-gitDecoration-addedResourceForeground);
        }

        .no-changes {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }

        .diff-arrow {
            align-self: center;
            color: var(--vscode-descriptionForeground);
            font-size: 1.5em;
            margin: ${layout === 'side-by-side' ? '20px 10px 0 10px' : '10px 0'};
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h2>Import Changes Preview</h2>
            <div class="stats" id="stats">Loading...</div>
        </div>
        <div class="buttons">
            <button onclick="applyChanges()">Apply Changes</button>
            <button class="secondary" onclick="cancelChanges()">Cancel</button>
        </div>
    </div>

    <div class="diff-container" id="diffContainer">
        <div class="no-changes">No changes to display</div>
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
                container.innerHTML = '<div class="no-changes">No changes detected</div>';
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
            stats.textContent = totalChanges + ' import(s) in ' + totalFiles + ' file(s)';
            
            console.log('Grouped into ' + totalFiles + ' files');

            let html = '';
            for (const [filePath, changes] of Object.entries(fileGroups)) {
                const fileName = filePath.split(/[\\\\\\/]/).pop();
                html += \`
                    <div class="diff-file">
                        <div class="file-header" onclick="viewFile('\${filePath}', \${changes[0].line})">
                            <span class="file-path">\${fileName}</span>
                            <span class="line-number">\${changes.length} change(s)</span>
                        </div>
                        \${changes.map(change => \`
                            <div class="diff-content">
                                <div class="diff-side">
                                    <div class="diff-label old">- Line \${change.line + 1} (Before)</div>
                                    <div class="diff-code old">\${escapeHtml(change.oldImport)}</div>
                                </div>
                                <div class="diff-arrow">${layout === 'side-by-side' ? '→' : '↓'}</div>
                                <div class="diff-side">
                                    <div class="diff-label new">+ Line \${change.line + 1} (After)</div>
                                    <div class="diff-code new">\${escapeHtml(change.newImport)}</div>
                                </div>
                            </div>
                        \`).join('')}
                    </div>
                \`;
            }

            container.innerHTML = html;
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
