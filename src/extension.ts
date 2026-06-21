/**
 * Commit Helper — VS Code extension
 *
 * Generates Conventional Commits–style messages from the staged Git diff
 * using a local Ollama model, then writes the result into the Source Control
 * input box. No API key or network access beyond your local Ollama server.
 *
 * Command (must also be declared in package.json `contributes.commands`):
 *   - commit-helper.generateCommitMessage
 *
 * Settings (declare in package.json `contributes.configuration`):
 *   - commitHelper.ollama.baseUrl  (default "http://localhost:11434")
 *   - commitHelper.ollama.model    (default "qwen2.5-coder")
 */

import * as vscode from "vscode";
import { generateCommitMessage } from "./functions/generateCommitMessage";
/**
 * Extension entry point. Registers the command and ties its lifetime to the
 * extension context so it is disposed automatically on deactivate.
 */
export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("commit-helper.generateCommitMessage", () =>
      generateCommitMessage()
    )
  );
}