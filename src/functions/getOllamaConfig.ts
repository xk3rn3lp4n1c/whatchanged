import { CONFIG } from "../constants/constants";
import { OllamaConfig } from "../interfaces/interface";
import * as vscode from "vscode";

/** Reads Ollama base URL + model from settings, falling back to defaults. */
export const getOllamaConfig = (): OllamaConfig => {
	const cfg = vscode.workspace.getConfiguration("commitHelper");
	const baseUrl = cfg
		.get<string>("ollama.baseUrl", CONFIG.defaultBaseUrl)
		.trim()
		.replace(/\/+$/, ""); // strip trailing slashes
	const model = cfg.get<string>("ollama.model", CONFIG.defaultModel).trim();
	return {
		baseUrl: baseUrl || CONFIG.defaultBaseUrl,
		model: model || CONFIG.defaultModel,
	};
}