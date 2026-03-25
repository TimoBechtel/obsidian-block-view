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

export type MetadataMatchContext = {
	cache: CachedMetadata;
};

export type ContentMatchContext = {
	content: string;
	cache: CachedMetadata;
};

export interface Matcher {
	matches(context: MatchContext): boolean;
	/**
	 * Cheap check whether to skip whole file based on metadata.
	 */
	canSkipByMetadata(context: MetadataMatchContext): boolean;
	/**
	 * Cheap check whether to skip whole file based on content.
	 */
	canSkipByContent(context: ContentMatchContext): boolean;
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

	canSkipByMetadata({ cache }: MetadataMatchContext): boolean {
		return !(
			cache.tags?.some((tag) =>
				this.targetTags.includes(tag.tag.toLowerCase())
			) ?? false
		);
	}

	canSkipByContent(): boolean {
		return false;
	}
}

export class TextMatcher implements Matcher {
	private regex: RegExp | null;
	private normalizedPattern: string | null;

	constructor(pattern: string) {
		this.regex = null;
		this.normalizedPattern = null;

		if (!pattern) {
			return;
		}

		const trimmed = pattern.trim();
		if (trimmed.startsWith("/")) {
			const secondSlashIndex = trimmed.indexOf("/", 1);
			if (secondSlashIndex > 1) {
				const regexPattern = trimmed.slice(1, secondSlashIndex);
				const flags = trimmed.slice(secondSlashIndex + 1);
				try {
					this.regex = new RegExp(regexPattern, flags);
				} catch {
					this.regex = null;
				}
				return;
			}
		}

		this.normalizedPattern = pattern.toLowerCase();
	}

	matches({ range, lines }: MatchContext): boolean {
		if (!this.normalizedPattern && !this.regex) {
			return false;
		}

		for (let i = range.start; i <= range.end; i++) {
			const line = lines[i];
			if (!line) continue;
			if (this.regex && this.regex.test(line)) {
				return true;
			}
			if (
				this.normalizedPattern &&
				// case insensitive matching
				line.trim().toLowerCase().startsWith(this.normalizedPattern)
			) {
				return true;
			}
		}

		return false;
	}

	canSkipByMetadata(): boolean {
		return false;
	}

	canSkipByContent({ content }: ContentMatchContext): boolean {
		if (!this.normalizedPattern) {
			return false;
		}

		return !content.toLowerCase().includes(this.normalizedPattern);
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

	canSkipByMetadata({ cache }: MetadataMatchContext): boolean {
		return !(
			cache.listItems?.some(
				(item) =>
					item.task !== undefined &&
					(this.type === "any" ||
						(this.type === "incomplete" && item.task === " ") ||
						(this.type === "complete" && item.task !== " "))
			) ?? false
		);
	}

	canSkipByContent(): boolean {
		return false;
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

	canSkipByMetadata({ cache }: MetadataMatchContext): boolean {
		return !(
			cache.sections?.some((section) => {
				if (this.type === "any") {
					return (
						section.type === "blockquote" ||
						section.type === "callout"
					);
				}
				if (this.type === "quotes") {
					return section.type === "blockquote";
				}
				return section.type === "callout";
			}) ?? false
		);
	}

	canSkipByContent(): boolean {
		return false;
	}
}

export class CodeBlockMatcher implements Matcher {
	private languages: Set<string>;

	constructor(languages?: string[]) {
		this.languages = new Set(
			(languages ?? [])
				.map((lang) => lang.trim().toLowerCase())
				.filter((lang) => lang.length > 0)
		);
	}

	matches({ range, sectionType, lines }: MatchContext): boolean {
		if (sectionType !== "code") {
			return false;
		}

		if (this.languages.size === 0) {
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

		return this.languages.has(afterFence.toLowerCase());
	}

	canSkipByMetadata({ cache }: MetadataMatchContext): boolean {
		return !(
			cache.sections?.some((section) => section.type === "code") ?? false
		);
	}

	canSkipByContent(): boolean {
		return false;
	}
}

export class TableMatcher implements Matcher {
	matches({ sectionType }: MatchContext): boolean {
		return sectionType === "table";
	}

	canSkipByMetadata({ cache }: MetadataMatchContext): boolean {
		return !(
			cache.sections?.some((section) => section.type === "table") ?? false
		);
	}

	canSkipByContent(): boolean {
		return false;
	}
}

export class NotMatcher implements Matcher {
	constructor(private matcher: Matcher) {}

	matches(context: MatchContext): boolean {
		return !this.matcher.matches(context);
	}

	canSkipByMetadata(): boolean {
		return false;
	}

	canSkipByContent(): boolean {
		return false;
	}
}

export class AndMatcher implements Matcher {
	constructor(private matchers: Matcher[]) {}

	matches(context: MatchContext): boolean {
		return this.matchers.every((matcher) => matcher.matches(context));
	}

	canSkipByMetadata(context: MetadataMatchContext): boolean {
		return this.matchers.some((matcher) =>
			matcher.canSkipByMetadata(context)
		);
	}

	canSkipByContent(context: ContentMatchContext): boolean {
		return this.matchers.some((matcher) =>
			matcher.canSkipByContent(context)
		);
	}
}

export class OrMatcher implements Matcher {
	constructor(private matchers: Matcher[]) {}

	matches(context: MatchContext): boolean {
		return this.matchers.some((matcher) => matcher.matches(context));
	}

	canSkipByMetadata(context: MetadataMatchContext): boolean {
		return this.matchers.every((matcher) =>
			matcher.canSkipByMetadata(context)
		);
	}

	canSkipByContent(context: ContentMatchContext): boolean {
		return this.matchers.every((matcher) =>
			matcher.canSkipByContent(context)
		);
	}
}
