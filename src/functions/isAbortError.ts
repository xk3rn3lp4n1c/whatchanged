
/** True if the error represents an aborted fetch (timeout or cancellation). */
export const isAbortError = (err: unknown): boolean => {
	return err instanceof Error && err.name === "AbortError";
}