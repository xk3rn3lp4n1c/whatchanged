import { CONFIG } from "../constants/constants";

/**
 * Strips code fences and common LLM boilerplate, returning a clean message.
 * Falls back to a placeholder if nothing usable remains.
 */
export const sanitizeCommitMessage = (raw: string): string => {
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