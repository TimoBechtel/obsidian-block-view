import { describe, expect, test } from "bun:test";
import type { CachedMetadata, SectionCache } from "obsidian";
import {
	AndMatcher,
	CodeBlockMatcher,
	NotMatcher,
	TagMatcher,
	TaskMatcher,
	type MatchContext,
} from "./matchers";

function createContext(
	content: string,
	options: {
		section?: SectionCache["type"];
		tags?: Array<{ tag: string; line?: number }>;
		tasks?: Array<{ status: " " | "x" | "X"; line?: number }>;
	} = {}
): MatchContext {
	const lines = content.split("\n");

	const startLine = 0;
	const sectionEndLine = startLine + lines.length - 1;

	const cache: Partial<CachedMetadata> = {};

	if (options.tags) {
		cache.tags = options.tags.map(({ tag, line = startLine }) => ({
			tag,
			position: {
				start: { line, col: 0, offset: 0 },
				end: { line, col: 0, offset: 0 },
			},
		}));
	}

	if (options.tasks) {
		cache.listItems = options.tasks.map(({ status, line = startLine }) => ({
			task: status,
			position: {
				start: { line, col: 0, offset: 0 },
				end: { line, col: 0, offset: 0 },
			},
			parent: -1,
		}));
	}

	return {
		range: {
			start: startLine,
			end: sectionEndLine,
		},
		sectionType: options.section ?? "paragraph",
		lines,
		cache: cache as CachedMetadata,
	};
}

describe("TagMatcher", () => {
	test("matches when tag in cache", () => {
		const matcher = new TagMatcher(["#log"]);
		expect(
			matcher.matches(
				createContext("This has #log tag", {
					tags: [{ tag: "#log" }],
				})
			)
		).toBe(true);
	});

	test("matches multiple tags", () => {
		const matcher = new TagMatcher(["#log", "#todo"]);
		expect(
			matcher.matches(
				createContext("This has #log", {
					tags: [{ tag: "#log" }],
				})
			)
		).toBe(true);

		expect(
			matcher.matches(
				createContext("This has #todo", {
					tags: [{ tag: "#todo" }],
				})
			)
		).toBe(true);
	});

	test("normalizes tags without hash", () => {
		const matcher = new TagMatcher(["log"]);
		expect(
			matcher.matches(
				createContext("This has #log", {
					tags: [{ tag: "#log" }],
				})
			)
		).toBe(true);
	});

	test("case insensitive matching", () => {
		const matcher = new TagMatcher(["#Log"]);
		expect(
			matcher.matches(
				createContext("This has #log", {
					tags: [{ tag: "#log" }],
				})
			)
		).toBe(true);

		expect(
			matcher.matches(
				createContext("This has #LOG", {
					tags: [{ tag: "#LOG" }],
				})
			)
		).toBe(true);
	});

	test("handles empty tag array", () => {
		const matcher = new TagMatcher([]);
		expect(
			matcher.matches(
				createContext("This has #log", {
					tags: [{ tag: "#log" }],
				})
			)
		).toBe(false);
	});

	test("returns first match line in section", () => {
		const matcher = new TagMatcher(["#log"]);
		const section = createContext(
			`Line 1
Line 2 #log
Line 3 #log`,
			{
				tags: [
					{ tag: "#log", line: 1 },
					{ tag: "#log", line: 2 },
				],
			}
		);
		expect(matcher.matches(section)).toBe(true);
	});
});

describe("TaskMatcher", () => {
	test("matches any tasks", () => {
		const matcher = new TaskMatcher("any");
		expect(
			matcher.matches(
				createContext("- [ ] incomplete task", {
					tasks: [{ status: " " }],
					section: "list",
				})
			)
		).toBe(true);

		expect(
			matcher.matches(
				createContext("- [x] complete task", {
					tasks: [{ status: "x" }],
					section: "list",
				})
			)
		).toBe(true);
	});

	test("matches incomplete tasks only", () => {
		const matcher = new TaskMatcher("incomplete");
		expect(
			matcher.matches(
				createContext("- [ ] incomplete task", {
					tasks: [{ status: " " }],
					section: "list",
				})
			)
		).toBe(true);

		expect(
			matcher.matches(
				createContext("- [x] complete task", {
					tasks: [{ status: "x" }],
					section: "list",
				})
			)
		).toBe(false);
	});

	test("matches complete tasks only", () => {
		const matcher = new TaskMatcher("complete");
		expect(
			matcher.matches(
				createContext("- [ ] incomplete task", {
					tasks: [{ status: " " }],
					section: "list",
				})
			)
		).toBe(false);

		expect(
			matcher.matches(
				createContext("- [x] complete task", {
					tasks: [{ status: "x" }],
					section: "list",
				})
			)
		).toBe(true);
	});

	test("does not match non-task list items", () => {
		const matcher = new TaskMatcher("any");
		expect(
			matcher.matches(
				createContext("- regular list item", {
					section: "list",
				})
			)
		).toBe(false);
	});
});

describe("CodeBlockMatcher", () => {
	test("matches any code block when no language specified", () => {
		const matcher = new CodeBlockMatcher();
		expect(matcher.matches(createContext("```", { section: "code" }))).toBe(
			true
		);

		expect(
			matcher.matches(createContext("```python", { section: "code" }))
		).toBe(true);
	});

	test("matches specific language", () => {
		const matcher = new CodeBlockMatcher("python");
		expect(
			matcher.matches(createContext("```python", { section: "code" }))
		).toBe(true);

		expect(
			matcher.matches(createContext("  ```python", { section: "code" }))
		).toBe(true);

		expect(
			matcher.matches(
				createContext('```python title="example.py"', {
					section: "code",
				})
			)
		).toBe(true);

		expect(
			matcher.matches(
				createContext("```python {1-5}", { section: "code" })
			)
		).toBe(true);
	});

	test("does not match code block without language when language specified", () => {
		const matcher = new CodeBlockMatcher("python");
		expect(
			matcher.matches(
				createContext("```", {
					section: "code",
				})
			)
		).toBe(false);
	});
});

describe("NotMatcher", () => {
	test("inverts tag matcher for paragraph with tag", () => {
		const matcher = new NotMatcher(new TagMatcher(["#log"]));
		expect(
			matcher.matches(
				createContext("This paragraph has #log tag", {
					tags: [{ tag: "#log" }],
				})
			)
		).toBe(false);
	});

	test("checks all matchers and excludes if notmatcher does not match", () => {
		const matcher = new AndMatcher([
			new TagMatcher(["#log"]),
			new NotMatcher(new TagMatcher(["#archive"])),
		]);
		expect(
			matcher.matches(
				createContext(
					"This has #log and #archive and should not be included",
					{
						tags: [{ tag: "#log" }, { tag: "#archive", line: 0 }],
					}
				)
			)
		).toBe(false);

		expect(
			matcher.matches(
				createContext("This has just #log and should be included", {
					tags: [{ tag: "#log" }],
				})
			)
		).toBe(true);
	});
});
