import { isTaskLine } from "./markdown-utils";

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
	constructor(private matchers: LineMatcher[]) { }

	matches(line: string): boolean {
		return this.matchers.every((matcher) => matcher.matches(line));
	}
}

export class OrMatcher implements LineMatcher {
	constructor(private matchers: LineMatcher[]) { }

	matches(line: string): boolean {
		return this.matchers.some((matcher) => matcher.matches(line));
	}
}



export class TaskMatcher implements LineMatcher {
	constructor(private type: "any" | "incomplete" | "complete") { }

	matches(line: string): boolean {
		const trimmed = line.trim();
		if (!isTaskLine(trimmed)) {
			return false;
		}

		const isComplete = /\[[xX]\]/.test(trimmed);

		if (this.type === "any") return true;
		if (this.type === "incomplete") return !isComplete;
		if (this.type === "complete") return isComplete;
		return false;
	}
}

export class QuoteMatcher implements LineMatcher {
	matches(line: string): boolean {
		return line.trim().startsWith(">");
	}
}

export class CodeBlockMatcher implements LineMatcher {
	private language: string | null;

	constructor(language?: string) {
		this.language = language?.trim() || null;
	}

	matches(line: string): boolean {
		const trimmed = line.trim();
		if (!trimmed.startsWith("```")) {
			return false;
		}

		if (!this.language) {
			return true;
		}

		const afterFence = trimmed.slice(3).trim().split(/\s+/)[0];
		if (!afterFence) {
			return false;
		}

		return afterFence.toLowerCase() === this.language.toLowerCase();
	}
}
