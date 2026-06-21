import * as vscode from "vscode";

/** Resolved Ollama settings for the current invocation. */
export interface OllamaConfig {
	baseUrl: string;
	model: string;
}

/** Minimal shape of the Ollama /api/chat (non-streaming) response. */
export interface OllamaChatResponse {
	message?: { role?: string; content?: string };
	error?: string;
}

/** Minimal slice of the built-in `vscode.git` extension API that we use. */
export interface GitRepository {
	rootUri: vscode.Uri;
	inputBox: { value: string };
}

export interface GitAPI {
	repositories: GitRepository[];
}

export interface GitExtensionExports {
	getAPI(version: 1): GitAPI;
}
