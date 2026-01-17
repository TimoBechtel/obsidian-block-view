import { describe, expect, test } from "bun:test";
import { TagMatcher } from "./matchers";

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
