/** Normalises unknown thrown values into a readable string. */
export const toErrorMessage = (err: unknown): string => {
	return err instanceof Error ? err.message : String(err);
}
