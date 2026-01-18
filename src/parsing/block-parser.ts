import type { LineMatcher } from "./matchers";

type Block = {
	content: string;
	startLine: number;
	endLine: number;
};

abstract class BlockParser {
	abstract matches(line: string): boolean;
	abstract findEnd(lines: string[], startIndex: number): number;

	extract(lines: string[], startIndex: number): Block {
		const endLine = this.findEnd(lines, startIndex);
		const content = lines.slice(startIndex, endLine + 1).join("\n");
		return {
			content,
			startLine: startIndex,
			endLine,
		};
	}
}

// TODO: how is the list block parser different from the paragraph block parser?
class ListBlockParser extends BlockParser {
	matches(line: string): boolean {
		return this.isListLine(line);
	}

	findEnd(lines: string[], startIndex: number): number {
		const startLine = lines[startIndex];
		if (!startLine) return startIndex;
		const baseIndent = this.getIndentLevel(startLine);
		let endLine = startIndex;

		for (let j = startIndex + 1; j < lines.length; j++) {
			const nextLine = lines[j];
			if (!nextLine) {
				break;
			}
			if (nextLine.trim() === "") {
				const nextNonEmpty = this.findNextNonEmptyLine(lines, j + 1);
				if (nextNonEmpty === -1) {
					break;
				}
				const nonEmptyLine = lines[nextNonEmpty];
				if (
					!nonEmptyLine ||
					this.getIndentLevel(nonEmptyLine) <= baseIndent
				) {
					break;
				}
				endLine = j;
				continue;
			}

			const nextIndent = this.getIndentLevel(nextLine);
			if (nextIndent <= baseIndent && this.isListLine(nextLine)) {
				break;
			}

			if (
				nextIndent > baseIndent ||
				nextLine.trim() === "" ||
				!this.isListLine(nextLine)
			) {
				endLine = j;
			} else {
				break;
			}
		}

		return endLine;
	}

	private getIndentLevel(line: string): number {
		const match = line.match(/^(\s*)/);
		return match && match[1] ? match[1].length : 0;
	}

	private isListLine(line: string): boolean {
		return (
			line.trim().startsWith("-") ||
			line.trim().startsWith("*") ||
			/^\s*\d+\./.test(line)
		);
	}

	private findNextNonEmptyLine(lines: string[], start: number): number {
		for (let i = start; i < lines.length; i++) {
			const line = lines[i];
			if (line && line.trim() !== "") {
				return i;
			}
		}
		return -1;
	}
}

class HeadingBlockParser extends BlockParser {
	matches(line: string): boolean {
		return line.startsWith("#") && this.getHeadingLevel(line) > 0;
	}

	findEnd(lines: string[], startIndex: number): number {
		const startLine = lines[startIndex];
		if (!startLine) return startIndex;
		const headingLevel = this.getHeadingLevel(startLine);
		let endLine = startIndex;

		for (let j = startIndex + 1; j < lines.length; j++) {
			const nextLine = lines[j];
			if (nextLine === undefined) {
				break;
			}
			const nextLevel = this.getHeadingLevel(nextLine);
			if (nextLevel > 0 && nextLevel <= headingLevel) {
				break;
			}
			endLine = j;
		}

		return endLine;
	}

	private getHeadingLevel(line: string): number {
		const match = line.match(/^(#+)\s/);
		return match && match[1] ? match[1].length : 0;
	}
}

class ParagraphBlockParser extends BlockParser {
	matches(): boolean {
		return true;
	}

	findEnd(lines: string[], startIndex: number): number {
		let endLine = startIndex;
		for (let j = startIndex + 1; j < lines.length; j++) {
			const nextLine = lines[j];
			if (!nextLine || nextLine.trim() === "") {
				break;
			}
			endLine = j;
		}
		return endLine;
	}
}

const blockParsers = [
	new ListBlockParser(),
	new HeadingBlockParser(),
	new ParagraphBlockParser(),

];

export function parseBlocks(
	content: string,
	matcher: LineMatcher
): Block[] {
	const lines = content.split("\n");
	const blocks: Block[] = [];

	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (!line || line.trim() === "") {
			i++;
			continue;
		}

		if (!matcher.matches(line)) {
			i++;
			continue;
		}

		const parser = blockParsers.find((p) => p.matches(line));
		if (!parser) {
			i++;
			continue;
		}

		const block = parser.extract(lines, i);
		blocks.push(block);

		i = block.endLine + 1;
	}

	return blocks;
}
