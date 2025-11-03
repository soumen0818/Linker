import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Git integration utilities
 * Handles git operations for preserving history during renames
 */
export class GitIntegration {
    private workspaceRoot: string | undefined;
    private isGitRepo: boolean = false;

    constructor(workspaceRoot?: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Initialize and detect if workspace is a git repository
     */
    async initialize(): Promise<boolean> {
        if (!this.workspaceRoot) {
            return false;
        }

        try {
            const { stdout } = await execAsync('git rev-parse --git-dir', {
                cwd: this.workspaceRoot
            });
            this.isGitRepo = stdout.trim().length > 0;
            return this.isGitRepo;
        } catch {
            this.isGitRepo = false;
            return false;
        }
    }

    /**
     * Check if workspace is a git repository
     */
    isRepository(): boolean {
        return this.isGitRepo;
    }

    /**
     * Check if a file is tracked by git
     */
    async isFileTracked(filePath: string): Promise<boolean> {
        if (!this.isGitRepo || !this.workspaceRoot) {
            return false;
        }

        try {
            const relativePath = path.relative(this.workspaceRoot, filePath);
            const { stdout } = await execAsync(`git ls-files --error-unmatch "${relativePath}"`, {
                cwd: this.workspaceRoot
            });
            return stdout.trim().length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Perform git mv operation
     */
    async gitMove(oldPath: string, newPath: string): Promise<boolean> {
        if (!this.isGitRepo || !this.workspaceRoot) {
            return false;
        }

        try {
            const oldRelative = path.relative(this.workspaceRoot, oldPath);
            const newRelative = path.relative(this.workspaceRoot, newPath);

            await execAsync(`git mv "${oldRelative}" "${newRelative}"`, {
                cwd: this.workspaceRoot
            });

            return true;
        } catch (error) {
            console.error('Git mv failed:', error);
            return false;
        }
    }

    /**
     * Stage a file
     */
    async stageFile(filePath: string): Promise<boolean> {
        if (!this.isGitRepo || !this.workspaceRoot) {
            return false;
        }

        try {
            const relativePath = path.relative(this.workspaceRoot, filePath);
            await execAsync(`git add "${relativePath}"`, {
                cwd: this.workspaceRoot
            });
            return true;
        } catch (error) {
            console.error('Git add failed:', error);
            return false;
        }
    }

    /**
     * Stage multiple files
     */
    async stageFiles(filePaths: string[]): Promise<number> {
        let successCount = 0;
        for (const filePath of filePaths) {
            if (await this.stageFile(filePath)) {
                successCount++;
            }
        }
        return successCount;
    }
}
