import { describe, expect, test } from "bun:test";
// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync } from "node:fs";
import { extractBlocks } from "./block-parser";
import { TagMatcher } from "./matchers";

const exampleNote = readFileSync("test/example-note.md", "utf-8");

describe("extractBlocks", () => {
	test("extracts paragraph blocks with tags", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = extractBlocks(exampleNote, matcher);

		const paragraphBlock = blocks.find((block) =>
			block.content.includes("This paragraph has a #log tag")
		);
		expect(paragraphBlock).toBeDefined();
		expect(paragraphBlock?.content).toContain(
			"This paragraph has a #log tag"
		);
		expect(paragraphBlock?.content).toContain("It continues on this line");
	});

	test("extracts heading blocks with tags", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = extractBlocks(exampleNote, matcher);

		const headingBlock = blocks.find((block) =>
			block.content.startsWith("## A heading with #log")
		);
		expect(headingBlock).toBeDefined();
		expect(headingBlock?.content).toContain("## A heading with #log");
		expect(headingBlock?.content).toContain("Content under the heading");
		expect(headingBlock?.content).toContain("### Subheading");
		expect(headingBlock?.content).toContain("This should be included too");
	});

	test("extracts list item blocks with tags", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = extractBlocks(exampleNote, matcher);

		const listBlock = blocks.find((block) =>
			block.content.includes("- List item with #log tag")
		);
		expect(listBlock).toBeDefined();
		expect(listBlock?.content).toContain("- List item with #log tag");
		expect(listBlock?.content).toContain("  - Nested child 1");
		expect(listBlock?.content).toContain("  - Nested child 2");
		expect(listBlock?.content).toContain("    - Deeply nested");
		expect(listBlock?.content).toContain("  - Back to level 2");
		expect(listBlock?.content).not.toContain("- Next item at same level");
	});

	test("extracts numbered list blocks with tags", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = extractBlocks(exampleNote, matcher);

		const numberedBlock = blocks.find((block) =>
			block.content.includes("2. Numbered with #log")
		);
		expect(numberedBlock).toBeDefined();
		expect(numberedBlock?.content).toContain("2. Numbered with #log");
		expect(numberedBlock?.content).toContain("   - Sub item");
		expect(numberedBlock?.content).toContain("   - Another sub");
		expect(numberedBlock?.content).not.toContain("3. Next numbered");
	});

	test("extracts continuation paragraphs in list blocks", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = extractBlocks(exampleNote, matcher);

		const continuationBlock = blocks.find((block) =>
			block.content.includes("- Another #log item")
		);
		expect(continuationBlock).toBeDefined();
		expect(continuationBlock?.content).toContain("- Another #log item");
		expect(continuationBlock?.content).toContain(
			"  With continuation paragraph"
		);
		expect(continuationBlock?.content).toContain(
			"  And another paragraph still indented"
		);
		expect(continuationBlock?.content).not.toContain("- Not included item");
	});

	test("does not extract blocks without matching tags", () => {
		const matcher = new TagMatcher(["#nonexistent"]);
		const blocks = extractBlocks(exampleNote, matcher);

		expect(blocks.length).toBe(0);
	});

	test("returns correct line numbers", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = extractBlocks(exampleNote, matcher);

		const paragraphBlock = blocks.find((block) =>
			block.content.includes("This paragraph has a #log tag")
		);
		expect(paragraphBlock?.startLine).toBe(4);
		expect(paragraphBlock?.endLine).toBe(5);
	});
});
