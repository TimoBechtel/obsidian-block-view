import { describe, expect, test } from "bun:test";
import { CodeBlockMatcher, QuoteMatcher, TagMatcher, TaskMatcher } from "./matchers";

describe("TagMatcher", () => {
	test("exact match", () => {
		const matcher = new TagMatcher(["#log"]);
		expect(matcher.matches("This has #log tag")).toBe(true);
		expect(matcher.matches("#log at start")).toBe(true);
		expect(matcher.matches("End with #log")).toBe(true);
	});

	test("does not match partial tags", () => {
		const matcher = new TagMatcher(["#l"]);
		expect(matcher.matches("This has #log")).toBe(false);
		expect(matcher.matches("This has #longer")).toBe(false);
		expect(matcher.matches("This has #l")).toBe(true);
	});

	test("respects word boundaries", () => {
		const matcher = new TagMatcher(["#tag"]);
		expect(matcher.matches("This has #tag")).toBe(true);
		expect(matcher.matches("This has #hashtag")).toBe(false);
		expect(matcher.matches("This has #tagged")).toBe(false);
	});

	test("matches multiple tags", () => {
		const matcher = new TagMatcher(["#log", "#todo"]);
		expect(matcher.matches("This has #log")).toBe(true);
		expect(matcher.matches("This has #todo")).toBe(true);
		expect(matcher.matches("This has #log and #todo")).toBe(true);
		expect(matcher.matches("This has #other")).toBe(false);
	});

	test("normalizes tags without hash", () => {
		const matcher = new TagMatcher(["log", "todo"]);
		expect(matcher.matches("This has #log")).toBe(true);
		expect(matcher.matches("This has #todo")).toBe(true);
	});

	test("handles empty tag array", () => {
		const matcher = new TagMatcher([]);
		expect(matcher.matches("This has #log")).toBe(false);
	});

	test("case insensitive matching", () => {
		const matcher = new TagMatcher(["#Log"]);
		expect(matcher.matches("This has #Log")).toBe(true);
		expect(matcher.matches("This has #log")).toBe(true);
		expect(matcher.matches("This has #LOG")).toBe(true);
		expect(matcher.matches("This has #LoG")).toBe(true);
	});

	test("escapes special regex characters", () => {
		const matcher = new TagMatcher(["#tag.test"]);
		expect(matcher.matches("This has #tag.test")).toBe(true);
		expect(matcher.matches("This has #tagxtest")).toBe(false);
	});
});

describe("TaskMatcher", () => {
	test("matches any tasks", () => {
		const matcher = new TaskMatcher("any");
		expect(matcher.matches("- [ ] incomplete task")).toBe(true);
		expect(matcher.matches("- [x] complete task")).toBe(true);
		expect(matcher.matches("  - [ ] indented incomplete")).toBe(true);
		expect(matcher.matches("  - [x] indented complete")).toBe(true);
	});

	test("matches incomplete tasks only", () => {
		const matcher = new TaskMatcher("incomplete");
		expect(matcher.matches("- [ ] incomplete task")).toBe(true);
		expect(matcher.matches("- [x] complete task")).toBe(false);
		expect(matcher.matches("  - [ ] indented incomplete")).toBe(true);
		expect(matcher.matches("  - [x] indented complete")).toBe(false);
	});

	test("matches complete tasks only", () => {
		const matcher = new TaskMatcher("complete");
		expect(matcher.matches("- [ ] incomplete task")).toBe(false);
		expect(matcher.matches("- [x] complete task")).toBe(true);
		expect(matcher.matches("  - [ ] indented incomplete")).toBe(false);
		expect(matcher.matches("  - [x] indented complete")).toBe(true);
	});

	test("does not match non-task list items", () => {
		const matcher = new TaskMatcher("any");
		expect(matcher.matches("- regular list item")).toBe(false);
		expect(matcher.matches("* bullet point")).toBe(false);
		expect(matcher.matches("1. numbered item")).toBe(false);
	});

	test("does not match inline checkboxes", () => {
		const matcher = new TaskMatcher("any");
		expect(matcher.matches("This has - [ ] in the middle")).toBe(false);
		expect(matcher.matches("Not a task - [x] here")).toBe(false);
	});
});

describe("QuoteMatcher", () => {
	test("matches blockquotes", () => {
		const matcher = new QuoteMatcher();
		expect(matcher.matches("> This is a quote")).toBe(true);
		expect(matcher.matches(">Quote without space")).toBe(true);
		expect(matcher.matches("  > Indented quote")).toBe(true);
	});

	test("matches callouts", () => {
		const matcher = new QuoteMatcher();
		expect(matcher.matches("> [!note]")).toBe(true);
		expect(matcher.matches("> [!warning] Title")).toBe(true);
	});

	test("does not match non-quotes", () => {
		const matcher = new QuoteMatcher();
		expect(matcher.matches("Regular text")).toBe(false);
		expect(matcher.matches("Has > in middle")).toBe(false);
	});
});

describe("CodeBlockMatcher", () => {
	test("matches any code block when no language specified", () => {
		const matcher = new CodeBlockMatcher();
		expect(matcher.matches("```")).toBe(true);
		expect(matcher.matches("```python")).toBe(true);
		expect(matcher.matches("  ```")).toBe(true);
	});

	test("matches specific language", () => {
		const matcher = new CodeBlockMatcher("python");
		expect(matcher.matches("```python")).toBe(true);
		expect(matcher.matches("  ```python")).toBe(true);
		expect(matcher.matches("```python title=\"example.py\"")).toBe(true);
		expect(matcher.matches("```python {1-5}")).toBe(true);
	});

	test("does not match code block without language when language specified", () => {
		const matcher = new CodeBlockMatcher("python");
		expect(matcher.matches("```")).toBe(false);
	});

	test("does not match non-code-blocks", () => {
		const matcher = new CodeBlockMatcher();
		expect(matcher.matches("Regular text")).toBe(false);
		expect(matcher.matches("Has ``` in middle")).toBe(false);
		expect(matcher.matches("Inline code `print('hello')`")).toBe(false);
	});
});
