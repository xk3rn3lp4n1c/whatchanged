import { CONFIG, SYSTEM_PROMPT } from "../constants/constants";
import { OllamaChatResponse, OllamaConfig } from "../interfaces/interface";
import * as vscode from "vscode";
import { buildUserPrompt } from "./buildUserPrompt";
import { isConnectionRefused } from "./isConnectionRefused";
import { toErrorMessage } from "./toErrorMessage";
import { sanitizeCommitMessage } from "./sanitizeCommitMessage";
import { isAbortError } from "./isAbortError";
import { safeReadText } from "./safeReadText";

/**
 * Calls the local Ollama server and returns a sanitized commit message.
 *
 * Returns undefined (without throwing) when the user cancels, the request
 * times out, Ollama is unreachable, or the model is missing — those cases are
 * surfaced to the user directly. Other failures throw and are reported by the
 * caller.
 */
export const requestCommitMessage = async (
	config: OllamaConfig,
	diff: string,
	token: vscode.CancellationToken
): Promise<string | undefined> => {
	// Combine a timeout and the user's cancel button into a single abort.
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);
	const cancelSub = token.onCancellationRequested(() => controller.abort());

	try {
		const response = await fetch(`${config.baseUrl}/api/chat`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: config.model,
				stream: false,
				messages: [
					{ role: "system", content: SYSTEM_PROMPT },
					{ role: "user", content: buildUserPrompt(diff) },
				],
				options: {
					temperature: CONFIG.temperature,
					num_predict: CONFIG.maxTokens,
				},
			}),
			signal: controller.signal,
		});

		if (!response.ok) {
			const detail = await safeReadText(response);
			// Ollama returns 404 with a "model not found" message when unpulled.
			if (response.status === 404 || /not found/i.test(detail)) {
				vscode.window.showErrorMessage(
					`Ollama model '${config.model}' not found. Pull it first: ollama pull ${config.model}`
				);
				return undefined;
			}
			throw new Error(`Ollama error ${response.status}: ${detail}`);
		}

		const data = (await response.json()) as OllamaChatResponse;
		if (data.error) {
			throw new Error(`Ollama error: ${data.error}`);
		}

		const raw = data.message?.content ?? "";
		return sanitizeCommitMessage(raw);
	} catch (err) {
		if (isAbortError(err)) {
			// User cancellation needs no error popup.
			if (token.isCancellationRequested) {
				return undefined;
			}
			vscode.window.showErrorMessage(
				`Request timed out after ${CONFIG.requestTimeoutMs / 1000}s.`
			);
			return undefined;
		}
		if (isConnectionRefused(err)) {
			vscode.window.showErrorMessage(
				`Could not reach Ollama at ${config.baseUrl}. Is it running? Start it with 'ollama serve'.`
			);
			return undefined;
		}
		throw new Error(
			`Failed to generate commit message: ${toErrorMessage(err)}`
		);
	} finally {
		clearTimeout(timeout);
		cancelSub.dispose();
	}
}
