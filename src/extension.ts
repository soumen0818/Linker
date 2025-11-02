import * as vscode from 'vscode';
import * as path from 'path';

function toImportPath(from: vscode.Uri, to: vscode.Uri) {
    // compute a relative import path from file 'from' to file 'to'
    // returns posix style path without extension for JS/TS imports

    // Convert Windows paths to POSIX
    const fromPath = from.fsPath.replace(/\\/g, '/');
    const toPath = to.fsPath.replace(/\\/g, '/');

    const fromDir = path.posix.dirname(fromPath);
    let rel = path.posix.relative(fromDir, toPath);

    // Ensure it starts with ./ or ../
    if (!rel.startsWith('.')) {
        rel = './' + rel;
    }

    // Remove file extension
    rel = rel.replace(/\.(js|ts|jsx|tsx)$/, '');

    return rel;
}

function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Linker is active');

    const config = vscode.workspace.getConfiguration('linker');

    const renameDisposable = vscode.workspace.onDidRenameFiles(async (ev) => {
        try {
            const excludes: string[] = config.get('exclude', ['**/node_modules/**', '**/.git/**']);
            const exPattern = '{' + excludes.join(',') + '}';
            const extList: string[] = config.get('fileExtensions', ['js', 'ts', 'jsx', 'tsx']);
            const glob = `**/*.{${extList.join(',')}}`;

            // accumulate all proposed edits
            const allEdits: Array<{ file: vscode.Uri, edits: vscode.TextEdit[], summary: string }> = [];

            for (const file of ev.files) {
                const oldUri = file.oldUri;
                const newUri = file.newUri;

                // Get the old filename without extension
                const oldFileName = path.posix.basename(oldUri.path).replace(/\.(js|ts|jsx|tsx)$/, '');

                console.log('Linker: File renamed from', oldUri.fsPath, 'to', newUri.fsPath);
                console.log('Linker: Looking for imports of:', oldFileName);

                // For simplicity: search workspace text for the base filename occurrences and then run regex check
                const searchPattern = `**/*.{${extList.join(',')}}`;
                const files = await vscode.workspace.findFiles(searchPattern, exPattern);

                for (const f of files) {
                    if (f.fsPath === newUri.fsPath) continue;
                    const doc = await vscode.workspace.openTextDocument(f);
                    const edits: vscode.TextEdit[] = [];

                    // Process line by line for accurate position tracking
                    const lineCount = doc.lineCount;

                    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
                        const line = doc.lineAt(lineIndex);
                        const lineText = line.text;

                        // Match import/require/export statements
                        const importMatch = lineText.match(/(?:import\s.*?from\s*|require\s*\(\s*|export\s.*?from\s*)(['"])(.*?)\1/);

                        if (importMatch) {
                            const importPath = importMatch[2];

                            // Check if this import matches the old file
                            const importedFileName = path.posix.basename(importPath).replace(/\.(js|ts|jsx|tsx)$/, '');

                            console.log(`Linker: Line ${lineIndex + 1}: Found import "${importPath}"`);

                            if (importedFileName === oldFileName) {
                                // Calculate new import path
                                const newImportPath = toImportPath(f, newUri);

                                console.log(`Linker: MATCH! "${importPath}" → "${newImportPath}"`);

                                if (newImportPath !== importPath) {
                                    // Simple string search to find where the import path is
                                    // We search for the quote+path pattern to be precise
                                    const searchPattern = `'${importPath}'`;
                                    const searchPattern2 = `"${importPath}"`;

                                    let startCol = lineText.indexOf(searchPattern);
                                    if (startCol === -1) {
                                        startCol = lineText.indexOf(searchPattern2);
                                    }

                                    if (startCol !== -1) {
                                        // Skip the opening quote
                                        startCol += 1;
                                        const endCol = startCol + importPath.length;

                                        const startPos = new vscode.Position(lineIndex, startCol);
                                        const endPos = new vscode.Position(lineIndex, endCol);

                                        console.log(`Linker: Replacing at line ${lineIndex + 1}, columns ${startCol}-${endCol}`);
                                        console.log(`Linker: Text to replace: "${lineText.substring(startCol, endCol)}"`);
                                        console.log(`Linker: New text: "${newImportPath}"`);

                                        edits.push(vscode.TextEdit.replace(new vscode.Range(startPos, endPos), newImportPath));
                                    }
                                }
                            }
                        }
                    }

                    if (edits.length > 0) {
                        allEdits.push({ file: f, edits, summary: `${f.fsPath} -> ${edits.length} changes` });
                    }
                }
            }

            if (allEdits.length === 0) {
                vscode.window.showInformationMessage('Linker: No import updates needed for the rename/move.');
                return;
            }

            // Show preview webview
            const panel = vscode.window.createWebviewPanel('linkerPreview', 'Linker: Preview Changes', vscode.ViewColumn.One, {
                enableScripts: true
            });

            const listHtml = allEdits.map((e, idx) => `<li data-idx="${idx}"><strong>${vscode.Uri.file(e.file.fsPath).fsPath}</strong>: ${e.summary}</li>`).join('');

            panel.webview.html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Linker Preview</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding: 12px }
      ul { list-style: none; padding: 0 }
      li { margin: 8px 0; padding: 8px; border-radius: 6px; background: #f5f5f5 }
      .actions { margin-top: 12px }
      button { margin-right: 8px; padding: 6px 12px }
    </style>
  </head>
  <body>
    <h2>Linker — Preview Changes</h2>
    <p>The following files will be updated. Click <strong>Apply</strong> to apply edits.</p>
    <ul>
      ${listHtml}
    </ul>
    <div class="actions">
      <button id="apply">Apply</button>
      <button id="cancel">Cancel</button>
    </div>
    <script>
      const vscode = acquireVsCodeApi();
      document.getElementById('apply').addEventListener('click', () => {
        vscode.postMessage({ cmd: 'apply' });
      });
      document.getElementById('cancel').addEventListener('click', () => {
        vscode.postMessage({ cmd: 'cancel' });
      });
    </script>
  </body>
</html>`;

            // handle messages
            panel.webview.onDidReceiveMessage(async (msg) => {
                if (msg.cmd === 'apply') {
                    const wsEdit = new vscode.WorkspaceEdit();
                    for (const item of allEdits) {
                        for (const te of item.edits) {
                            wsEdit.replace(item.file, te.range, te.newText);
                        }
                    }
                    const ok = await vscode.workspace.applyEdit(wsEdit);
                    if (ok) {
                        vscode.window.showInformationMessage(`Linker: Applied ${allEdits.reduce((s, a) => s + a.edits.length, 0)} edits.`);
                        panel.dispose();
                    } else {
                        vscode.window.showErrorMessage('Linker: Failed to apply edits.');
                    }
                } else if (msg.cmd === 'cancel') {
                    panel.dispose();
                }
            });

        } catch (err) {
            console.error('Linker error', err);
            vscode.window.showErrorMessage('Linker: Error while processing rename. See console for details.');
        }
    });

    context.subscriptions.push(renameDisposable);
}

export function deactivate() { }
