import { execSync } from "child_process";
import { CONFIG } from "../constants/constants";

/**
 * Returns the staged diff, or undefined if there are no staged changes.
 * Uses a large buffer so big diffs don't blow up execSync's default limit.
 */
export const getStagedDiff = (cwd: string): string | undefined => {
	const diff = execSync("git diff --cached", {
		encoding: "utf-8",
		cwd,
		maxBuffer: CONFIG.gitMaxBuffer,
	});
	return diff.trim() ? diff : undefined;
}