import { describe, expect, test } from "bun:test";
import type { CachedMetadata, SectionCache, TFile } from "obsidian";
type TestFile = TFile;
import {
	AndMatcher,
	CodeBlockMatcher,
	ImageMatcher,
	InternalLinkMatcher,
	NotMatcher,
	TagMatcher,
	TaskMatcher,
	TextMatcher,
	type MatchContext,
} from "./matchers";

function createContext(
	content: string,
	options: {
		section?: SectionCache["type"];
		tags?: Array<{ tag: string; line?: number }>;
		tasks?: Array<{ status: " " | "x" | "X"; line?: number }>;
		embeds?: Array<{ link: string; original: string; line?: number }>;
		links?: Array<{ link: string; original?: string; line?: number }>;
		file?: TFile;
	} = {}
): MatchContext {
	const lines = content.split("\n");

	const startLine = 0;
	const sectionEndLine = startLine + lines.length - 1;

	const cache: CachedMetadata = {};

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

	if (options.embeds) {
		cache.embeds = options.embeds.map(
			({ link, original, line = startLine }) => ({
				link,
				original,
				position: {
					start: { line, col: 0, offset: 0 },
					end: {
						line,
						col: original.length,
						offset: original.length,
					},
				},
			})
		);
	}

	if (options.links) {
		cache.links = options.links.map(
			({ link, original = `[[${link}]]`, line = startLine }) => ({
				link,
				original,
				position: {
					start: { line, col: 0, offset: 0 },
					end: {
						line,
						col: original.length,
						offset: original.length,
					},
				},
			})
		);
	}

	return {
		range: {
			start: startLine,
			end: sectionEndLine,
		},
		sectionType: options.section ?? "paragraph",
		lines,
		cache,
		file: options.file ?? ({ path: "Source.md" } as TestFile),
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
		const matcher = new CodeBlockMatcher(["python"]);
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
		const matcher = new CodeBlockMatcher(["python"]);
		expect(
			matcher.matches(
				createContext("```", {
					section: "code",
				})
			)
		).toBe(false);
	});

	test("matches multiple languages", () => {
		const matcher = new CodeBlockMatcher(["ts", "js"]);
		expect(
			matcher.matches(createContext("```ts", { section: "code" }))
		).toBe(true);

		expect(
			matcher.matches(createContext("```js", { section: "code" }))
		).toBe(true);

		expect(
			matcher.matches(createContext("```python", { section: "code" }))
		).toBe(false);
	});
});

describe("ImageMatcher", () => {
	test("matches local image embeds", () => {
		const matcher = new ImageMatcher();

		expect(
			matcher.matches(
				createContext("![[photo.jpg#outline]]", {
					embeds: [
						{
							link: "photo.jpg#outline",
							original: "![[photo.jpg#outline]]",
						},
					],
				})
			)
		).toBe(true);
		expect(
			matcher.matches(
				createContext("![[document.pdf]]", {
					embeds: [
						{
							link: "document.pdf",
							original: "![[document.pdf]]",
						},
					],
				})
			)
		).toBe(false);
	});

	test("matches remote Markdown images without file extensions", () => {
		const matcher = new ImageMatcher();
		const image = "![Weather map](https://example.com/render?id=42)";

		expect(
			matcher.matches(
				createContext(image, {
					embeds: [
						{
							link: "https://example.com/render?id=42",
							original: image,
						},
					],
				})
			)
		).toBe(true);
	});

	test("combines with tags in the same block", () => {
		const matcher = new AndMatcher([
			new ImageMatcher(),
			new TagMatcher(["#greenhouse"]),
		]);
		const image = "![Greenhouse](https://example.com/render)";

		expect(
			matcher.matches(
				createContext(`${image} #greenhouse`, {
					embeds: [
						{
							link: "https://example.com/render",
							original: image,
						},
					],
					tags: [{ tag: "#greenhouse" }],
				})
			)
		).toBe(true);
	});
});

describe("TextMatcher", () => {
	test("matches simple string pattern", () => {
		const matcher = new TextMatcher("hello");
		expect(matcher.matches(createContext("hello world"))).toBe(true);
		expect(matcher.matches(createContext("world"))).toBe(false);
	});

	test("string matching is case insensitive", () => {
		const matcher = new TextMatcher("hello");
		expect(matcher.matches(createContext("Hello world"))).toBe(true);
		expect(matcher.matches(createContext("hello world"))).toBe(true);
	});

	test("matches regex pattern wrapped in slashes", () => {
		const matcher = new TextMatcher("/^- \\[.*\\]/");
		expect(matcher.matches(createContext("- [ ] task"))).toBe(true);
		expect(matcher.matches(createContext("regular text"))).toBe(false);
	});

	test("supports regex flags for case insensitive matching", () => {
		const matcher = new TextMatcher("/MEETING/i");
		expect(matcher.matches(createContext("meeting notes"))).toBe(true);
		expect(matcher.matches(createContext("MEETING NOTES"))).toBe(true);
		expect(matcher.matches(createContext("notes"))).toBe(false);
	});
});

describe("InternalLinkMatcher", () => {
	test("matches blocks containing any internal link", () => {
		const matcher = new InternalLinkMatcher({
			target: { type: "any" },
			resolveLink: () => null,
		});
		expect(
			matcher.matches(
				createContext("See [[Reactor]]", {
					links: [{ link: "Reactor" }],
				})
			)
		).toBe(true);
		expect(matcher.matches(createContext("No links here"))).toBe(false);
		expect(
			matcher.matches(
				createContext("No links in this block", {
					links: [{ link: "Reactor", line: 1 }],
				})
			)
		).toBe(false);
	});

	test("matches links that resolve to the selected file", () => {
		const matcher = new InternalLinkMatcher({
			target: { type: "file", path: "Projects/Reactor.md" },
			resolveLink: (link, file) =>
				link === "Reactor#Cooling" && file.path === "Meetings/Weekly.md"
					? "Projects/Reactor.md"
					: null,
		});
		const context = createContext(
			"Review [[Reactor#Cooling|the reactor]]",
			{
				links: [
					{
						link: "Reactor#Cooling",
						original: "[[Reactor#Cooling|the reactor]]",
					},
				],
				file: { path: "Meetings/Weekly.md" } as TestFile,
			}
		);

		expect(matcher.matches(context)).toBe(true);
		expect(
			matcher.canSkipByMetadata({
				cache: context.cache,
				file: context.file,
			})
		).toBe(false);
	});

	test("matches nothing without a target file", () => {
		const matcher = new InternalLinkMatcher({
			target: { type: "none" },
			resolveLink: () => "Projects/Reactor.md",
		});
		expect(
			matcher.matches(
				createContext("See [[Reactor]]", {
					links: [{ link: "Reactor" }],
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
