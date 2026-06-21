/** Reads up to 500 chars of a response body, never throwing. */
export const safeReadText = async (response: {
	text(): Promise<string>;
}): Promise<string> => {
	try {
		return (await response.text()).slice(0, 500);
	} catch {
		return "<no response body>";
	}
}