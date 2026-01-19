import type { CachedMetadata, SectionCache } from "obsidian";

export interface MatchContext {
	line: string;
	lineNumber: number;
	section: SectionCache;
	cache: CachedMetadata;
}

export interface LineMatcher {
	matches(context: MatchContext): boolean;
}

export class TagMatcher implements LineMatcher {
	private targetTags: string[];

	constructor(tags: string[]) {
		this.targetTags = tags.map((tag) => {
			const normalized = tag.startsWith("#") ? tag : `#${tag}`;
			return normalized.toLowerCase();
		});
	}

	matches({ cache, lineNumber }: MatchContext): boolean {
		const tagsOnLine = cache.tags?.filter(t =>
			t.position.start.line === lineNumber &&
			this.targetTags.includes(t.tag.toLowerCase())
		);

		return tagsOnLine !== undefined && tagsOnLine.length > 0;
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

	matches({ line }: MatchContext): boolean {
		if (!this.regex) {
			return false;
		}
		return this.regex.test(line);
	}
}

export class AndMatcher implements LineMatcher {
	constructor(private matchers: LineMatcher[]) { }

	matches(context: MatchContext): boolean {
		return this.matchers.every((matcher) => matcher.matches(context));
	}
}

export class OrMatcher implements LineMatcher {
	constructor(private matchers: LineMatcher[]) { }

	matches(context: MatchContext): boolean {
		return this.matchers.some((matcher) => matcher.matches(context));
	}
}



export class TaskMatcher implements LineMatcher {
	constructor(private type: "any" | "incomplete" | "complete") { }

	matches({ cache, lineNumber }: MatchContext): boolean {
		const listItem = cache.listItems?.find(item =>
			item.position.start.line === lineNumber
		);
		if (!listItem || listItem.task === undefined) return false;
		if (this.type === "any") return true;
		if (this.type === "incomplete") return listItem.task === " ";
		if (this.type === "complete") return listItem.task !== " ";
		return false;
	}
}

export class QuoteMatcher implements LineMatcher {
	matches({ section }: MatchContext): boolean {
		return section.type === "blockquote" || section.type === 'callout';
	}
}

export class CodeBlockMatcher implements LineMatcher {
	private language: string | null;

	constructor(language?: string) {
		this.language = language?.trim() || null;
	}

	matches({ line, section }: MatchContext): boolean {
		if (section.type !== "code") {
			return false;
		}

		if (!this.language) {
			return true;
		}

		const trimmed = line.trim();
		const afterFence = trimmed.slice(3).trim().split(/\s+/)[0];
		if (!afterFence) {
			return false;
		}

		return afterFence.toLowerCase() === this.language.toLowerCase();
	}
}
