import { readFileSync } from "fs";
import { extractBlocks } from "../src/parsing/block-parser";

const exampleNote = readFileSync("test/example-note.md", "utf-8");

console.log("=== Input ===");
console.log(exampleNote);
console.log("\n=== Extracted blocks for #log ===\n");

const blocks = extractBlocks(exampleNote, ["#log"]);

blocks.forEach((block, index) => {
	console.log(
		`--- Block ${index + 1} (lines ${block.startLine}-${block.endLine}) ---`
	);
	console.log(block.content);
	console.log();
});

console.log(`Total blocks found: ${blocks.length}`);
