import * as vscode from "vscode";
import { getWorkspacePath } from "./getWorkspacePath";
import { isGitRepository } from "./isGitRepository";
import { getStagedDiff } from "./getStagedDiff";
import { getOllamaConfig } from "./getOllamaConfig";
import { requestCommitMessage } from "./requestCommitMessage";
import { applyCommitMessage } from "./applyCommitMessage";
import { toErrorMessage } from "./toErrorMessage";

/**
 * Orchestrates the full flow: validate workspace + repo, read the staged diff,
 * call Ollama (with progress + cancellation), and write the resulting message
 * into the Source Control input box.
 */
export async function generateCommitMessage(): Promise<void> {
	try {
		const workspacePath = getWorkspacePath();
		if (!workspacePath) {
			return;
		}

		if (!isGitRepository(workspacePath)) {
			vscode.window.showErrorMessage(`Not a Git repository: ${workspacePath}`);
			return;
		}

		const diff = getStagedDiff(workspacePath);
		if (!diff) {
			vscode.window.showWarningMessage(
				"No staged changes found. Stage your changes first with 'git add'."
			);
			return;
		}

		const ollama = getOllamaConfig();

		const message = await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Generating commit message (${ollama.model})…`,
				cancellable: true,
			},
			(_progress, token) => requestCommitMessage(ollama, diff, token)
		);

		// Undefined means cancelled or a handled failure (already surfaced).
		if (!message) {
			return;
		}

		await applyCommitMessage(workspacePath, message);
	} catch (err) {
		vscode.window.showErrorMessage(
			`Error generating commit message: ${toErrorMessage(err)}`
		);
	}
}