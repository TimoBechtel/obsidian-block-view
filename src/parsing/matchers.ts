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
		const withoutInlineCode = line.replace(/`[^`]*`/g, "");
		return this.regexes.some((regex) => regex.test(withoutInlineCode));
	}
}

export class RegexMatcher implements LineMatcher {
	private regex: RegExp | null;

	constructor(pattern: string) {
		if (!pattern) {
			this.regex = null;
			return;
		}
		try {
			this.regex = new RegExp(pattern);
		} catch {
			this.regex = null;
		}
	}

	matches(line: string): boolean {
		if (!this.regex) {
			return false;
		}
		return this.regex.test(line);
	}
}

export class AndMatcher implements LineMatcher {
	constructor(private matchers: LineMatcher[]) {}

	matches(line: string): boolean {
		return this.matchers.every((matcher) => matcher.matches(line));
	}
}

export class OrMatcher implements LineMatcher {
	constructor(private matchers: LineMatcher[]) {}

	matches(line: string): boolean {
		return this.matchers.some((matcher) => matcher.matches(line));
	}
}
