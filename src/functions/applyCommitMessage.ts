import * as vscode from "vscode";
import { GitExtensionExports } from "../interfaces/interface";

/**
 * Writes the message into the Source Control input box of the repository that
 * matches the workspace path (falling back to the first repo).
 */
export const applyCommitMessage = async (
	workspacePath: string,
	message: string
): Promise<void> => {
	const extension =
		vscode.extensions.getExtension<GitExtensionExports>("vscode.git");
	if (!extension) {
		vscode.window.showErrorMessage("Git extension not found.");
		return;
	}

	// The extension may not be activated yet; activate to access its exports.
	const exports = extension.isActive
		? extension.exports
		: await extension.activate();
	const api = exports.getAPI(1);

	const repo =
		api.repositories.find((r) => r.rootUri.fsPath === workspacePath) ??
		api.repositories[0];

	if (!repo) {
		vscode.window.showErrorMessage("No Git repository found.");
		return;
	}

	repo.inputBox.value = message;
}