export interface LineMatcher {
	matches(line: string): boolean;
}

export class TagMatcher implements LineMatcher {
	private regexes: RegExp[];

	constructor(tags: string[]) {
		this.regexes = tags.map((tag) => {
			const normalized = tag.startsWith("#") ? tag : `#${tag}`;
			const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			return new RegExp(`${escaped}\\b`, "i");
		});
	}

	matches(line: string): boolean {
		return this.regexes.some((regex) => regex.test(line));
	}
}
