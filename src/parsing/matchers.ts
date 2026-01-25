import type { CachedMetadata, SectionCache } from "obsidian";

export type MatchContext = {
	range: {
		start: number;
		end: number;
	};
	sectionType: SectionCache["type"];
	lines: string[];
	cache: CachedMetadata;
};

export interface Matcher {
	matches(context: MatchContext): boolean;
}

export class TagMatcher implements Matcher {
	private targetTags: string[];

	constructor(tags: string[]) {
		this.targetTags = tags.map((tag) => {
			const normalized = tag.startsWith("#") ? tag : `#${tag}`;
			return normalized.toLowerCase();
		});
	}

	matches({ cache, range }: MatchContext): boolean {
		return (
			cache.tags?.some(
				(t) =>
					t.position.start.line >= range.start &&
					t.position.start.line <= range.end &&
					this.targetTags.includes(t.tag.toLowerCase())
			) ?? false
		);
	}
}

export class RegexMatcher implements Matcher {
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

	matches({ range, lines }: MatchContext): boolean {
		if (!this.regex) {
			return false;
		}

		for (let i = range.start; i <= range.end; i++) {
			const line = lines[i];
			if (line && this.regex.test(line)) {
				return true;
			}
		}

		return false;
	}
}

export class AndMatcher implements Matcher {
	constructor(private matchers: Matcher[]) {}

	matches(context: MatchContext): boolean {
		return this.matchers.every((matcher) => matcher.matches(context));
	}
}

export class OrMatcher implements Matcher {
	constructor(private matchers: Matcher[]) {}

	matches(context: MatchContext): boolean {
		return this.matchers.some((matcher) => matcher.matches(context));
	}
}

export class TaskMatcher implements Matcher {
	constructor(private type: "any" | "incomplete" | "complete") {}

	matches({ range, cache }: MatchContext): boolean {
		return (
			cache.listItems?.some(
				(item) =>
					item.position.start.line >= range.start &&
					item.position.start.line <= range.end &&
					item.task !== undefined &&
					(this.type === "any" ||
						(this.type === "incomplete" && item.task === " ") ||
						(this.type === "complete" && item.task !== " "))
			) ?? false
		);
	}
}

export class QuoteMatcher implements Matcher {
	constructor(private type: "any" | "quotes" | "callouts") {}

	matches({ sectionType }: MatchContext): boolean {
		if (this.type === "any") {
			return sectionType === "blockquote" || sectionType === "callout";
		}
		if (this.type === "quotes") {
			return sectionType === "blockquote";
		}
		return sectionType === "callout";
	}
}

export class CodeBlockMatcher implements Matcher {
	private language: string | null;

	constructor(language?: string) {
		this.language = language?.trim() || null;
	}

	matches({ range, sectionType, lines }: MatchContext): boolean {
		if (sectionType !== "code") {
			return false;
		}

		if (!this.language) {
			return true;
		}

		const fenceLine = lines[range.start];
		if (!fenceLine) {
			return false;
		}

		const trimmed = fenceLine.trim();
		const afterFence = trimmed.slice(3).trim().split(/\s+/)[0];
		if (!afterFence) {
			return false;
		}

		return afterFence.toLowerCase() === this.language.toLowerCase();
	}
}

export class NotMatcher implements Matcher {
	constructor(private matcher: Matcher) {}

	matches(context: MatchContext): boolean {
		return !this.matcher.matches(context);
	}
}
