import * as vscode from "vscode";

/** Returns the first workspace folder path, or warns and returns undefined. */
export const getWorkspacePath = (): string | undefined => {
	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) {
		vscode.window.showErrorMessage(
			"No workspace folder found. Please open a folder first."
		);
		return undefined;
	}
	return folder.uri.fsPath;
}