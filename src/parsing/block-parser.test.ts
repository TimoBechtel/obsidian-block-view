/* eslint-disable obsidianmd/no-tfile-tfolder-cast */
import { describe, expect, test } from "bun:test";
// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync } from "node:fs";
import type { App, CachedMetadata, SectionCache, TFile } from "obsidian";
import { parseBlocks } from "./block-parser";
import { TagMatcher } from "./matchers";

const exampleNote = readFileSync("test/example-note.md", "utf-8");
const exampleSections: SectionCache[] = JSON.parse(
	readFileSync("test/example-sections.json", "utf-8")
) as SectionCache[];

function createMockApp(content: string, sections: SectionCache[]): App {
	return {
		metadataCache: {
			getFileCache: () => ({ sections } as CachedMetadata),
		},
		vault: {
			cachedRead: async () => content,
		},
	} as unknown as App;
}

describe("extractBlocks", () => {
	test("extracts paragraph blocks with tags", async () => {
		const matcher = new TagMatcher(["#log"]);
		const mockApp = createMockApp(exampleNote, exampleSections);
		const mockFile = {} as TFile;
		const blocks = await parseBlocks(mockApp, mockFile, matcher);

		const paragraphBlock = blocks.find((block) =>
			block.content.includes("This paragraph has a #log tag")
		);
		expect(paragraphBlock).toBeDefined();
		expect(paragraphBlock?.content).toContain(
			"This paragraph has a #log tag"
		);
		expect(paragraphBlock?.content).toContain("It continues on this line");
	});

	test("extracts heading blocks with tags", async () => {
		const matcher = new TagMatcher(["#log"]);
		const mockApp = createMockApp(exampleNote, exampleSections);
		const mockFile = {} as TFile;
		const blocks = await parseBlocks(mockApp, mockFile, matcher);

		const headingBlock = blocks.find((block) =>
			block.content.startsWith("## A heading with #log")
		);
		expect(headingBlock).toBeDefined();
		expect(headingBlock?.content).toContain("## A heading with #log");
		expect(headingBlock?.content).toContain("Content under the heading");
		expect(headingBlock?.content).toContain("### Subheading");
		expect(headingBlock?.content).toContain("This should be included too");
	});

	test("extracts list item blocks with tags", async () => {
		const matcher = new TagMatcher(["#log"]);
		const mockApp = createMockApp(exampleNote, exampleSections);
		const mockFile = {} as TFile;
		const blocks = await parseBlocks(mockApp, mockFile, matcher);

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

	test("extracts numbered list blocks with tags", async () => {
		const matcher = new TagMatcher(["#log"]);
		const mockApp = createMockApp(exampleNote, exampleSections);
		const mockFile = {} as TFile;
		const blocks = await parseBlocks(mockApp, mockFile, matcher);

		const numberedBlock = blocks.find((block) =>
			block.content.includes("2. Numbered with #log")
		);
		expect(numberedBlock).toBeDefined();
		expect(numberedBlock?.content).toContain("2. Numbered with #log");
		expect(numberedBlock?.content).toContain("   - Sub item");
		expect(numberedBlock?.content).toContain("   - Another sub");
		expect(numberedBlock?.content).not.toContain("3. Next numbered");
	});

	test("extracts continuation paragraphs in list blocks", async () => {
		const matcher = new TagMatcher(["#log"]);
		const mockApp = createMockApp(exampleNote, exampleSections);
		const mockFile = {} as TFile;
		const blocks = await parseBlocks(mockApp, mockFile, matcher);

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

	test("does not extract blocks without matching tags", async () => {
		const matcher = new TagMatcher(["#nonexistent"]);
		const mockApp = createMockApp(exampleNote, exampleSections);
		const mockFile = {} as TFile;
		const blocks = await parseBlocks(mockApp, mockFile, matcher);

		expect(blocks.length).toBe(0);
	});

	test("returns correct line numbers", async () => {
		const matcher = new TagMatcher(["#log"]);
		const mockApp = createMockApp(exampleNote, exampleSections);
		const mockFile = {} as TFile;
		const blocks = await parseBlocks(mockApp, mockFile, matcher);

		const paragraphBlock = blocks.find((block) =>
			block.content.includes("This paragraph has a #log tag")
		);
		expect(paragraphBlock?.startLine).toBe(4);
		expect(paragraphBlock?.endLine).toBe(5);
	});

	test("extracts blocks that start with a tag", async () => {
		const matcher = new TagMatcher(["#log"]);
		const mockApp = createMockApp(exampleNote, exampleSections);
		const mockFile = {} as TFile;
		const blocks = await parseBlocks(mockApp, mockFile, matcher);

		const tagStartBlock = blocks.find((block) =>
			block.content.includes("#log this paragraph starts with a tag")
		);
		expect(tagStartBlock).toBeDefined();
		expect(tagStartBlock?.content).toContain(
			"#log this paragraph starts with a tag"
		);
		expect(tagStartBlock?.content).toContain("And continues here.");
	});

	test("extracts code blocks with tags in fence", async () => {
		const matcher = new TagMatcher(["#log"]);
		const mockApp = createMockApp(exampleNote, exampleSections);
		const mockFile = {} as TFile;
		const blocks = await parseBlocks(mockApp, mockFile, matcher);

		const codeBlock = blocks.find((block) =>
			block.content.includes("```python #log")
		);
		expect(codeBlock).toBeDefined();
		expect(codeBlock?.content).toContain("```python #log");
		expect(codeBlock?.content).toContain("def example():");
		expect(codeBlock?.content).toContain("```");
		expect(codeBlock?.content).not.toContain("Another paragraph");
	});

	test("skips code blocks with tags inside code", async () => {
		const matcher = new TagMatcher(["#log"]);
		const mockApp = createMockApp(exampleNote, exampleSections);
		const mockFile = {} as TFile;
		const blocks = await parseBlocks(mockApp, mockFile, matcher);

		const jsCodeBlock = blocks.find((block) =>
			block.content.includes("```javascript") &&
			block.content.includes("// code block with #log tag")
		);
		expect(jsCodeBlock).toBeUndefined();
	});

	test("skips inline code with tags", async () => {
		const matcher = new TagMatcher(["#log"]);
		const mockApp = createMockApp(exampleNote, exampleSections);
		const mockFile = {} as TFile;
		const blocks = await parseBlocks(mockApp, mockFile, matcher);

		const inlineCodeParagraph = blocks.find((block) =>
			block.content.includes("`some code #log`")
		);
		expect(inlineCodeParagraph).toBeUndefined();
	});

	test("extracts blockquotes with tags", async () => {
		const matcher = new TagMatcher(["#log"]);
		const mockApp = createMockApp(exampleNote, exampleSections);
		const mockFile = {} as TFile;
		const blocks = await parseBlocks(mockApp, mockFile, matcher);

		const blockquote = blocks.find((block) =>
			block.content.includes("> This is a quote with #log tag")
		);
		expect(blockquote).toBeDefined();
		expect(blockquote?.content).not.toContain("> Regular quote without tag");
		expect(blockquote?.content).toContain("> Following is a quote:");
		expect(blockquote?.content).toContain("> This is a quote with #log tag");
		expect(blockquote?.content).toContain("> Continuation of quote");
		expect(blockquote?.content).toContain("> Still part of the same quote");
		expect(blockquote?.content).not.toContain("> Another quote without tag");
	});

	test("extracts tables with tags when filtering rows", async () => {
		const matcher = new TagMatcher(["#log"]);
		const mockApp = createMockApp(exampleNote, exampleSections);
		const mockFile = {} as TFile;
		const blocks = await parseBlocks(mockApp, mockFile, matcher, {
			filterTableRows: true,
		});

		const tableWithTagInCell = blocks.find((block) =>
			block.content.includes("| Data #log |")
		);
		expect(tableWithTagInCell).toBeDefined();
		expect(tableWithTagInCell?.content).toContain("| Column 1  | Column 2 |");
		expect(tableWithTagInCell?.content).not.toContain("| Data      | More     |");
		expect(tableWithTagInCell?.content).toContain("| Data #log | More     |");

		// when header matches, all rows are included
		const tableWithTagInHeader = blocks.find((block) =>
			block.content.includes("| Status #log |")
		);
		expect(tableWithTagInHeader).toBeDefined();
		expect(tableWithTagInHeader?.content).toContain("| Name     | Status #log |");
		expect(tableWithTagInHeader?.content).toContain("| Item 1   | Active      |");
		expect(tableWithTagInHeader?.content).toContain("| Item 2   | Pending     |");
	});

	test("extracts full tables by default", async () => {
		const matcher = new TagMatcher(["#log"]);
		const mockApp = createMockApp(exampleNote, exampleSections);
		const mockFile = {} as TFile;
		const blocks = await parseBlocks(mockApp, mockFile, matcher);

		const tableBlock = blocks.find((block) =>
			block.content.includes("| Data #log |")
		);
		expect(tableBlock).toBeDefined();
		expect(tableBlock?.content).toContain("| Column 1  | Column 2 |");
		expect(tableBlock?.content).toContain("| Data      | More     |");
		expect(tableBlock?.content).toContain("| Data #log | More     |");
	});

	test("does not extract duplicate blocks when heading matches and content inside also matches", async () => {
		const matcher = new TagMatcher(["#log"]);
		const mockApp = createMockApp(exampleNote, exampleSections);
		const mockFile = {} as TFile;
		const blocks = await parseBlocks(mockApp, mockFile, matcher);

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
});
