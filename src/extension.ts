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
import { execSync } from "child_process";
import fetch from "node-fetch";

/** Centralised, tweak-in-one-place configuration. */
const CONFIG = {
  /** Default Ollama server URL (overridable via settings). */
  defaultBaseUrl: "http://localhost:11434",
  /** Default model (overridable via settings). */
  defaultModel: "qwen2.5-coder",
  /** Sampling temperature — low for deterministic, focused messages. */
  temperature: 0.4,
  /** Upper bound on generated tokens (Ollama `num_predict`). */
  maxTokens: 1000,
  /** Abort the request after this many ms (local models can be slow). */
  requestTimeoutMs: 120_000,
  /**
   * Max characters of diff sent to the model. Large diffs are truncated to
   * stay within context limits and keep latency predictable.
   */
  maxDiffChars: 12_000,
  /** Max bytes execSync may buffer from `git diff` (default is only ~1 MB). */
  gitMaxBuffer: 20 * 1024 * 1024,
  /** Fallback message when generation yields nothing usable. */
  fallbackMessage: "feat: describe your changes",
} as const;

/** System prompt: fixed instructions for the model. */
const SYSTEM_PROMPT = [
  "You are a tool that writes Git commit messages following the Conventional Commits specification.",
  "Rules:",
  "- Start the subject with one of: feat:, fix:, chore:, docs:, style:, refactor:, test:, perf:, build:, ci:",
  "- Write the subject in the imperative mood, <= 72 characters, with no trailing period.",
  "- Optionally add a body explaining the what and the why; each body line must start with '- '.",
  "- Output ONLY the commit message as plain text. No markdown, no code fences, no commentary.",
].join("\n");

/** Resolved Ollama settings for the current invocation. */
interface OllamaConfig {
  baseUrl: string;
  model: string;
}

/** Minimal shape of the Ollama /api/chat (non-streaming) response. */
interface OllamaChatResponse {
  message?: { role?: string; content?: string };
  error?: string;
}

/** Minimal slice of the built-in `vscode.git` extension API that we use. */
interface GitRepository {
  rootUri: vscode.Uri;
  inputBox: { value: string };
}

interface GitAPI {
  repositories: GitRepository[];
}

interface GitExtensionExports {
  getAPI(version: 1): GitAPI;
}

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

/** Nothing to clean up manually — all disposables live in context.subscriptions. */
export function deactivate(): void { }

/**
 * Orchestrates the full flow: validate workspace + repo, read the staged diff,
 * call Ollama (with progress + cancellation), and write the resulting message
 * into the Source Control input box.
 */
async function generateCommitMessage(): Promise<void> {
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

/** Reads Ollama base URL + model from settings, falling back to defaults. */
function getOllamaConfig(): OllamaConfig {
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

/** Returns the first workspace folder path, or warns and returns undefined. */
function getWorkspacePath(): string | undefined {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    vscode.window.showErrorMessage(
      "No workspace folder found. Please open a folder first."
    );
    return undefined;
  }
  return folder.uri.fsPath;
}

/** Returns true if `cwd` is inside a Git working tree. */
function isGitRepository(cwd: string): boolean {
  try {
    const result = execSync("git rev-parse --is-inside-work-tree", {
      encoding: "utf-8",
      cwd,
      stdio: "pipe",
    }).trim();
    return result === "true";
  } catch {
    return false;
  }
}

/**
 * Returns the staged diff, or undefined if there are no staged changes.
 * Uses a large buffer so big diffs don't blow up execSync's default limit.
 */
function getStagedDiff(cwd: string): string | undefined {
  const diff = execSync("git diff --cached", {
    encoding: "utf-8",
    cwd,
    maxBuffer: CONFIG.gitMaxBuffer,
  });
  return diff.trim() ? diff : undefined;
}

/**
 * Calls the local Ollama server and returns a sanitized commit message.
 *
 * Returns undefined (without throwing) when the user cancels, the request
 * times out, Ollama is unreachable, or the model is missing — those cases are
 * surfaced to the user directly. Other failures throw and are reported by the
 * caller.
 */
async function requestCommitMessage(
  config: OllamaConfig,
  diff: string,
  token: vscode.CancellationToken
): Promise<string | undefined> {
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

/** Builds the user-message prompt, truncating oversized diffs. */
function buildUserPrompt(diff: string): string {
  const truncated =
    diff.length > CONFIG.maxDiffChars
      ? `${diff.slice(0, CONFIG.maxDiffChars)}\n…[diff truncated]…`
      : diff;
  return `Write a commit message for the following staged diff:\n\n${truncated}`;
}

/**
 * Strips code fences and common LLM boilerplate, returning a clean message.
 * Falls back to a placeholder if nothing usable remains.
 */
function sanitizeCommitMessage(raw: string): string {
  const cleaned = raw
    .replace(/```[a-z]*\n?/gi, "") // drop code-fence markers
    .split("\n")
    .map((line) => line.replace(/\s+$/, "")) // trim trailing whitespace
    .filter((line, index, lines) => {
      const lower = line.toLowerCase();
      // Drop typical preamble lines the model sometimes adds.
      if (
        /^(based on|this commit|here is|here's|sure[,!]|commit message:)/.test(
          lower
        )
      ) {
        return false;
      }
      // Collapse leading blank lines.
      if (
        line.trim() === "" &&
        lines.slice(0, index).every((l) => l.trim() === "")
      ) {
        return false;
      }
      return true;
    })
    .join("\n")
    .trim();

  return cleaned || CONFIG.fallbackMessage;
}

/**
 * Writes the message into the Source Control input box of the repository that
 * matches the workspace path (falling back to the first repo).
 */
async function applyCommitMessage(
  workspacePath: string,
  message: string
): Promise<void> {
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

/** True if the error represents an aborted fetch (timeout or cancellation). */
function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

/** True if the error looks like a refused connection to the Ollama server. */
function isConnectionRefused(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return (
    code === "ECONNREFUSED" ||
    (err instanceof Error && /ECONNREFUSED|failed/i.test(err.message))
  );
}

/** Reads up to 500 chars of a response body, never throwing. */
async function safeReadText(response: {
  text(): Promise<string>;
}): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "<no response body>";
  }
}

/** Normalises unknown thrown values into a readable string. */
function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
