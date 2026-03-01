import type { CachedMetadata, SectionCache } from "obsidian";

export type SectionWithOutgoingLinks = SectionCache & {
	outgoingLinks: string[];
};

type LineRange = {
	start: number;
	end: number;
};

export function normalizeOutgoingLink(target: string): string {
	let normalized = target.trim();
	if (!normalized) return "";

	const aliasIndex = normalized.indexOf("|");
	if (aliasIndex >= 0) {
		normalized = normalized.slice(0, aliasIndex);
	}

	const hashIndex = normalized.indexOf("#");
	if (hashIndex >= 0) {
		normalized = normalized.slice(0, hashIndex);
	}

	normalized = normalized.trim();

	if (normalized.toLowerCase().endsWith(".md")) {
		normalized = normalized.slice(0, -3);
	}

	return normalized.trim().toLowerCase();
}

export function getOutgoingLinksInRange(
	cache: CachedMetadata,
	range: LineRange
): string[] {
	const entries = [
		...(cache.links ?? []),
		...(cache.embeds ?? []),
	];
	const matches: string[] = [];

	for (const entry of entries) {
		const line = entry.position?.start?.line;
		if (line === undefined) continue;
		if (line < range.start || line > range.end) continue;

		const normalized = normalizeOutgoingLink(entry.link);
		if (!normalized) continue;
		matches.push(normalized);
	}

	return matches;
}

export function attachOutgoingLinksToSections(
	cache: CachedMetadata
): SectionWithOutgoingLinks[] {
	const sections = cache.sections ?? [];
	return sections.map((section) => ({
		...section,
		outgoingLinks: getOutgoingLinksInRange(cache, {
			start: section.position.start.line,
			end: section.position.end.line,
		}),
	}));
}
