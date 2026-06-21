import { execSync } from "child_process";

/** Returns true if `cwd` is inside a Git working tree. */
export const isGitRepository = (cwd: string): boolean => {
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