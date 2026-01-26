import { describe, expect, test } from "bun:test";
// this is ok for tests
// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync } from "node:fs";
import type { CachedMetadata } from "obsidian";
import { parseBlocks } from "./block-parser";
import { AndMatcher, NotMatcher, TagMatcher, TaskMatcher } from "./matchers";

const exampleNote = readFileSync("test/example-note.md", "utf-8");
const exampleMetadata: CachedMetadata = JSON.parse(
	readFileSync("test/example-note-metadata.json", "utf-8")
) as CachedMetadata;

describe("extractBlocks", () => {
	test("extracts paragraph blocks with tags", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

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
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

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
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

		const listBlock = blocks.find((block) =>
			block.content.includes("- List item with tag")
		);
		expect(listBlock).toBeDefined();
		expect(listBlock?.content).toContain("- List item with tag");
		expect(listBlock?.content).toContain("  - Nested child 1 #log");
		expect(listBlock?.content).toContain("  - Nested child 2");
		expect(listBlock?.content).toContain("    - Deeply nested");
		expect(listBlock?.content).toContain("  - Back to level 2");
		expect(listBlock?.content).not.toContain("- Next item at same level");
		expect(listBlock?.content).not.toContain("- Regular list item");

		// next block
		const blockIndex = listBlock ? blocks.indexOf(listBlock) : -1;
		if (blockIndex !== -1) {
			const nextBlock = blocks[blockIndex + 1];
			expect(nextBlock).toBeDefined();
			expect(nextBlock?.content).not.toContain(
				"- Next item at same level (should not be included)"
			);
		} else {
			throw new Error("List block not found");
		}
	});

	test("excludes list items without tags", () => {
		const matcher = new AndMatcher([
			new TaskMatcher("any"),
			new NotMatcher(new TagMatcher(["#log"])),
		]);
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

		// includes all task items but not the ones with #log
		expect(
			blocks.some((block) => block.content.includes("- [ ] Regular task"))
		).toBe(true);
		expect(
			blocks.some((block) => block.content.includes("- [ ] Next task"))
		).toBe(true);
		expect(
			blocks.some((block) =>
				block.content.includes("- [ ] Incomplete task with #log")
			)
		).toBe(false);
	});

	test("extracts numbered list blocks with tags", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

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
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

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
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

		expect(blocks.length).toBe(0);
	});

	test("returns correct line numbers", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

		const paragraphBlock = blocks.find((block) =>
			block.content.includes("This paragraph has a #log tag")
		);
		expect(paragraphBlock?.startLine).toBe(4);
		expect(paragraphBlock?.endLine).toBe(5);
	});

	test("extracts blocks that start with a tag", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

		const tagStartBlock = blocks.find((block) =>
			block.content.includes("#log this paragraph starts with a tag")
		);
		expect(tagStartBlock).toBeDefined();
		expect(tagStartBlock?.content).toContain(
			"#log this paragraph starts with a tag"
		);
		expect(tagStartBlock?.content).toContain("And continues here.");
	});

	test("skips code blocks with tags inside code", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

		const jsCodeBlock = blocks.find(
			(block) =>
				block.content.includes("```javascript") &&
				block.content.includes("// code block with #log tag")
		);
		expect(jsCodeBlock).toBeUndefined();
	});

	test("skips inline code with tags", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

		const inlineCodeParagraph = blocks.find((block) =>
			block.content.includes("`some code #log`")
		);
		expect(inlineCodeParagraph).toBeUndefined();
	});

	test("extracts blockquotes with tags", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

		const blockquote = blocks.find((block) =>
			block.content.includes("> This is a quote with #log tag")
		);
		expect(blockquote).toBeDefined();
		expect(blockquote?.content).not.toContain(
			"> Regular quote without tag"
		);
		expect(blockquote?.content).toContain("> Following is a quote:");
		expect(blockquote?.content).toContain(
			"> This is a quote with #log tag"
		);
		expect(blockquote?.content).toContain("> Continuation of quote");
		expect(blockquote?.content).toContain("> Still part of the same quote");
		expect(blockquote?.content).not.toContain(
			"> Another quote without tag"
		);
	});

	test("extracts tables with tags when filtering rows", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher, {
			filterTableRows: true,
		});

		const tableWithTagInCell = blocks.find((block) =>
			block.content.includes("| Data #log |")
		);
		expect(tableWithTagInCell).toBeDefined();
		expect(tableWithTagInCell?.content).toContain(
			"| Column 1  | Column 2 |"
		);
		expect(tableWithTagInCell?.content).not.toContain(
			"| Data      | More     |"
		);
		expect(tableWithTagInCell?.content).toContain(
			"| Data #log | More     |"
		);

		// when header matches, all rows are included
		const tableWithTagInHeader = blocks.find((block) =>
			block.content.includes("| Status #log |")
		);
		expect(tableWithTagInHeader).toBeDefined();
		expect(tableWithTagInHeader?.content).toContain(
			"| Name     | Status #log |"
		);
		expect(tableWithTagInHeader?.content).toContain(
			"| Item 1   | Active      |"
		);
		expect(tableWithTagInHeader?.content).toContain(
			"| Item 2   | Pending     |"
		);
	});

	test("extracts full tables by default", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

		const tableBlock = blocks.find((block) =>
			block.content.includes("| Data #log |")
		);
		expect(tableBlock).toBeDefined();
		expect(tableBlock?.content).toContain("| Column 1  | Column 2 |");
		expect(tableBlock?.content).toContain("| Data      | More     |");
		expect(tableBlock?.content).toContain("| Data #log | More     |");
	});

	test("does not extract duplicate blocks when heading matches and content inside also matches", () => {
		const matcher = new TagMatcher(["#log"]);
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

		const headingBlock = blocks.find((block) =>
			block.content.startsWith("## A heading with #log")
		);
		expect(headingBlock).toBeDefined();

		const sentenceInsideHeading = "And this is a #log sentence.";
		const blocksWithSentence = blocks.filter((block) =>
			block.content.includes(sentenceInsideHeading)
		);

		expect(blocksWithSentence.length).toBe(1);
		expect(blocksWithSentence[0]).toBe(headingBlock);
	});

	test("includes block immediately after tagged line", () => {
		const matcher = new TagMatcher(["#adjacent"]);
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

		const afterBlock = blocks.find(
			(block) =>
				block.content.includes("#adjacent") &&
				block.content.includes("def adjacent_before()")
		);
		expect(afterBlock).toBeDefined();
		expect(afterBlock?.content).toContain("#adjacent");
		expect(afterBlock?.content).toContain("```python");
		expect(afterBlock?.content).toContain("def adjacent_before():");
		expect(afterBlock?.content).toContain("```");
	});

	test("does not include sections separated by empty line", () => {
		const matcher = new TagMatcher(["#adjacent"]);
		const blocks = parseBlocks(exampleNote, exampleMetadata, matcher);

		const separatedBlock = blocks.find((block) =>
			block.content.includes("func separated()")
		);
		expect(separatedBlock).toBeUndefined();
	});
});
