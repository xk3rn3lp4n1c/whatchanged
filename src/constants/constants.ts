/** System prompt: fixed instructions for the model. */
export const SYSTEM_PROMPT = [
	"You are a tool that writes Git commit messages following the Conventional Commits specification.",
	"Rules:",
	"- Start the subject with one of: feat:, fix:, chore:, docs:, style:, refactor:, test:, perf:, build:, ci:",
	"- Write the subject in the imperative mood, <= 72 characters, with no trailing period.",
	"- Optionally add a body explaining the what and the why; each body line must start with '- '.",
	"- Output ONLY the commit message as plain text. No markdown, no code fences, no commentary.",
].join("\n");



/** Centralised, tweak-in-one-place configuration. */
export const CONFIG = {
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
} as const