import { describe, expect, test } from "bun:test";
import type { CachedMetadata, SectionCache } from "obsidian";
import { CodeBlockMatcher, TagMatcher, TaskMatcher, type MatchContext } from "./matchers";

function createContext(
	line: string,
	lineNumber: number = 0,
	options: {
		section?: SectionCache['type'];
		tags?: string[];
		taskStatus?: " " | "x" | "X";
	} = {}
): MatchContext {
	const cache: Partial<CachedMetadata> = {};

	if (options.tags) {
		cache.tags = options.tags.map(tag => ({
			tag,
			position: { start: { line: lineNumber, col: 0, offset: 0 }, end: { line: lineNumber, col: 0, offset: 0 } },
		}));
	}

	if (options.taskStatus !== undefined) {
		cache.listItems = [{
			task: options.taskStatus,
			position: { start: { line: lineNumber, col: 0, offset: 0 }, end: { line: lineNumber, col: 0, offset: 0 } },
			parent: -1,
		}];
	}

	return {
		line,
		lineNumber,
		section: { type: options.section ?? "paragraph", position: { start: { line: lineNumber, col: 0, offset: 0 }, end: { line: lineNumber, col: 0, offset: 0 } } },
		cache: cache as CachedMetadata,
	};
}

describe("TagMatcher", () => {
	test("matches when tag in cache", () => {
		const matcher = new TagMatcher(["#log"]);
		expect(matcher.matches(createContext("This has #log tag", 0, { tags: ["#log"], section: "paragraph" }))).toBe(true);
	});

	test("matches multiple tags", () => {
		const matcher = new TagMatcher(["#log", "#todo"]);
		expect(matcher.matches(createContext("This has #log", 0, { tags: ["#log"], section: "paragraph" }))).toBe(true);
		expect(matcher.matches(createContext("This has #todo", 0, { tags: ["#todo"], section: "paragraph" }))).toBe(true);
	});

	test("normalizes tags without hash", () => {
		const matcher = new TagMatcher(["log"]);
		expect(matcher.matches(createContext("This has #log", 0, { tags: ["#log"], section: "paragraph" }))).toBe(true);
	});

	test("case insensitive matching", () => {
		const matcher = new TagMatcher(["#Log"]);
		expect(matcher.matches(createContext("This has #log", 0, { tags: ["#log"], section: "paragraph" }))).toBe(true);
		expect(matcher.matches(createContext("This has #LOG", 0, { tags: ["#LOG"], section: "paragraph" }))).toBe(true);
	});

	test("handles empty tag array", () => {
		const matcher = new TagMatcher([]);
		expect(matcher.matches(createContext("This has #log", 0, { tags: ["#log"], section: "paragraph" }))).toBe(false);
	});
});

describe("TaskMatcher", () => {
	test("matches any tasks", () => {
		const matcher = new TaskMatcher("any");
		expect(matcher.matches(createContext("- [ ] incomplete task", 0, { taskStatus: " ", section: "list" }))).toBe(true);
		expect(matcher.matches(createContext("- [x] complete task", 0, { taskStatus: "x", section: "list" }))).toBe(true);
	});

	test("matches incomplete tasks only", () => {
		const matcher = new TaskMatcher("incomplete");
		expect(matcher.matches(createContext("- [ ] incomplete task", 0, { taskStatus: " ", section: "list" }))).toBe(true);
		expect(matcher.matches(createContext("- [x] complete task", 0, { taskStatus: "x", section: "list" }))).toBe(false);
	});

	test("matches complete tasks only", () => {
		const matcher = new TaskMatcher("complete");
		expect(matcher.matches(createContext("- [ ] incomplete task", 0, { taskStatus: " ", section: "list" }))).toBe(false);
		expect(matcher.matches(createContext("- [x] complete task", 0, { taskStatus: "x", section: "list" }))).toBe(true);
	});

	test("does not match non-task list items", () => {
		const matcher = new TaskMatcher("any");
		expect(matcher.matches(createContext("- regular list item", 0, { section: "list" }))).toBe(false);
	});
});

describe("CodeBlockMatcher", () => {
	test("matches any code block when no language specified", () => {
		const matcher = new CodeBlockMatcher();
		expect(matcher.matches(createContext("```", 0, { section: "code" }))).toBe(true);
		expect(matcher.matches(createContext("```python", 0, { section: "code" }))).toBe(true);
	});

	test("matches specific language", () => {
		const matcher = new CodeBlockMatcher("python");
		expect(matcher.matches(createContext("```python", 0, { section: "code" }))).toBe(true);
		expect(matcher.matches(createContext("  ```python", 0, { section: "code" }))).toBe(true);
		expect(matcher.matches(createContext("```python title=\"example.py\"", 0, { section: "code" }))).toBe(true);
		expect(matcher.matches(createContext("```python {1-5}", 0, { section: "code" }))).toBe(true);
	});

	test("does not match code block without language when language specified", () => {
		const matcher = new CodeBlockMatcher("python");
		expect(matcher.matches(createContext("```", 0, { section: "code" }))).toBe(false);
	});
});
