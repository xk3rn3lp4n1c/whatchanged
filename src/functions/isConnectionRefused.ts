/** True if the error looks like a refused connection to the Ollama server. */
export const isConnectionRefused = (err: unknown): boolean => {
	const code = (err as { code?: string } | null)?.code;
	return (
		code === "ECONNREFUSED" ||
		(err instanceof Error && /ECONNREFUSED|failed/i.test(err.message))
	);
}