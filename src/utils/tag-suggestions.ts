export interface VaultTag {
	name: string;
}

export function indexVaultTags(tags: Iterable<string>): VaultTag[] {
	const names = new Map<string, VaultTag>();
	for (const tag of tags) {
		const name = tag.trim().replace(/^#/, "");
		const key = name.toLowerCase();
		if (name && !names.has(key)) names.set(key, { name });
	}
	return Array.from(names.values()).sort((a, b) =>
		a.name.localeCompare(b.name)
	);
}

export function tagSearchQuery(draft: string): string {
	return draft.trim().replace(/^-\s*/, "").replace(/^#/, "");
}

export function tagSuggestionRows(draft: string, tags: VaultTag[]): string[] {
	const prefix = draft.trimStart().startsWith("-") ? "-#" : "#";
	return tags.slice(0, 10).map(({ name }) => prefix + name);
}
