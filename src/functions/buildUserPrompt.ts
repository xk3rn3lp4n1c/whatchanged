import { CONFIG } from "../constants/constants";

/** Builds the user-message prompt, truncating oversized diffs. */
export const buildUserPrompt = (diff: string): string => {
	const truncated =
		diff.length > CONFIG.maxDiffChars
			? `${diff.slice(0, CONFIG.maxDiffChars)}\n…[diff truncated]…`
			: diff;
	return `Write a commit message for the following staged diff:\n\n${truncated}`;
}
