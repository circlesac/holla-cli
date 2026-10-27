export type ListField = Record<string, unknown>;

export function parseListId(input: string): string {
	const value = input.trim();
	const match = value.match(/^https?:\/\/[^/]+\/lists\/[^/]+\/([A-Z][A-Z0-9]+)/i);
	return match?.[1] ?? value;
}

export function parseFields(input: string, flagName = "--fields"): ListField[] {
	let value: unknown;
	try {
		value = JSON.parse(input);
	} catch {
		throw new Error(`${flagName} must be valid JSON`);
	}

	if (!Array.isArray(value) || value.some((field) => !isRecord(field))) {
		throw new Error(`${flagName} must be a JSON array of objects`);
	}

	return value;
}

export function addFallbackRowId(fields: ListField[], rowId: string): ListField[] {
	return fields.map((field) => ("row_id" in field ? field : { ...field, row_id: rowId }));
}

export function normalizeListItem(item: unknown): Record<string, unknown> {
	if (!isRecord(item)) return { id: "", fields: [] };

	const fields = Array.isArray(item.fields) ? item.fields : [];
	const text = fields
		.filter(isRecord)
		.map((field) => field.text)
		.find((value): value is string => typeof value === "string" && value.length > 0);

	return {
		id: typeof item.id === "string" ? item.id : "",
		text: text ?? "",
		updated_timestamp: item.updated_timestamp ?? "",
		date_created: item.date_created ?? "",
		archived: item.archived ?? false,
		fields,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
