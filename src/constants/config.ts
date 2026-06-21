/** Centralised, tweak-in-one-place configuration. */
export const CONFIG = {
	/** Default Ollama server URL (overridable via settings). */
	defaultBaseUrl: "http://localhost:11434",
	/** Default model (overridable via settings). */
	defaultModel: "qwen2.5-coder",
	/** Sampling temperature — low for deterministic, focused messages. */
	temperature: 0.9,
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