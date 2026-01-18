import type { App, SectionCache, TFile } from "obsidian";
import type { LineMatcher } from "./matchers";

type Block = {
	content: string;
	startLine: number;
	endLine: number;
};

abstract class SectionBlockParser {
	abstract matches(section: SectionCache): boolean;
	abstract extract(
		sections: SectionCache[],
		startIndex: number,
		lines: string[],
		matcher: LineMatcher
	): Block[] | null;
}

class ListBlockParser extends SectionBlockParser {
	matches(section: SectionCache): boolean {
		return section.type === "list";
	}

	extract(
		sections: SectionCache[],
		startIndex: number,
		lines: string[],
		matcher: LineMatcher
	): Block[] | null {
		const section = sections[startIndex];
		if (!section) return null;

		const blocks: Block[] = [];
		let i = section.position.start.line;

		while (i <= section.position.end.line) {
			const line = lines[i];

			if (
				!line?.trim()
				|| !this.isListLine(line)
				|| !matcher.matches(line)
			) {
				i++;
				continue;
			}

			const endLine = this.findBlockEnd(
				lines,
				i,
				section.position.end.line,
				this.getIndentLevel(line)
			);

			blocks.push({
				content: lines.slice(i, endLine + 1).join("\n"),
				startLine: i,
				endLine,
			});

			i = endLine + 1;
		}

		return blocks.length > 0 ? blocks : null;
	}

	private findBlockEnd(
		lines: string[],
		startLine: number,
		maxLine: number,
		baseIndent: number
	): number {
		let endLine = startLine;

		for (let j = startLine + 1; j <= maxLine; j++) {
			const line = lines[j];
			if (!line) break;

			if (line.trim() === "") {
				const nextNonEmpty = this.findNextNonEmptyLine(lines, j + 1, maxLine);
				if (
					nextNonEmpty === -1
					|| this.getIndentLevel(lines[nextNonEmpty] ?? "") <= baseIndent
				) {
					break;
				}
				endLine = j;
				continue;
			}

			const indent = this.getIndentLevel(line);
			if (indent <= baseIndent && this.isListLine(line)) {
				break;
			}

			if (
				indent > baseIndent ||
				!this.isListLine(line)
			) {
				endLine = j;
			} else {
				break;
			}
		}

		return endLine;
	}

	private getIndentLevel(line: string): number {
		return line.match(/^(\s*)/)?.[1]?.length ?? 0;
	}

	private isListLine(line: string): boolean {
		const trimmed = line.trim();
		return (
			trimmed.startsWith("-")
			|| trimmed.startsWith("*")
			|| /^\s*\d+\./.test(line)
		);
	}

	private findNextNonEmptyLine(
		lines: string[],
		start: number,
		maxLine: number
	): number {
		for (let i = start; i <= maxLine; i++) {
			const line = lines[i];
			if (line?.trim()) {
				return i;
			}
		}
		return -1;
	}
}

class HeadingBlockParser extends SectionBlockParser {
	matches(section: SectionCache): boolean {
		return section.type === "heading";
	}

	extract(
		sections: SectionCache[],
		startIndex: number,
		lines: string[],
		matcher: LineMatcher
	): Block[] | null {
		const section = sections[startIndex];
		if (!section) return null;

		const headingLine = lines[section.position.start.line];
		if (!headingLine || !matcher.matches(headingLine)) return null;

		const headingLevel = this.getHeadingLevel(headingLine);
		let endLine = section.position.end.line;

		for (let j = startIndex + 1; j < sections.length; j++) {
			const nextSection = sections[j];
			if (!nextSection) break;

			if (nextSection.type === "heading") {
				const nextHeadingLine = lines[nextSection.position.start.line];
				const nextLevel = this.getHeadingLevel(nextHeadingLine ?? "");
				if (nextLevel > 0 && nextLevel <= headingLevel) {
					break;
				}
			}

			endLine = nextSection.position.end.line;
		}

		return [{
			content: lines
				.slice(section.position.start.line, endLine + 1)
				.join("\n"),
			startLine: section.position.start.line,
			endLine,
		}];
	}

	private getHeadingLevel(line: string): number {
		const match = line.match(/^(#+)\s/);
		return match && match[1] ? match[1].length : 0;
	}
}

class CodeBlockParser extends SectionBlockParser {
	matches(section: SectionCache): boolean {
		return section.type === "code";
	}

	extract(
		sections: SectionCache[],
		startIndex: number,
		lines: string[],
		matcher: LineMatcher
	): Block[] | null {
		const section = sections[startIndex];
		if (!section) return null;

		const fenceLine = lines[section.position.start.line];
		if (!fenceLine || !matcher.matches(fenceLine)) return null;

		return [{
			content: lines
				.slice(section.position.start.line, section.position.end.line + 1)
				.join("\n"),
			startLine: section.position.start.line,
			endLine: section.position.end.line,
		}];
	}
}

class DefaultSectionParser extends SectionBlockParser {
	matches(): boolean {
		return true;
	}

	extract(
		sections: SectionCache[],
		startIndex: number,
		lines: string[],
		matcher: LineMatcher
	): Block[] | null {
		const section = sections[startIndex];
		if (!section) return null;

		const hasMatch = lines
			.slice(section.position.start.line, section.position.end.line + 1)
			.some((line) => matcher.matches(line ?? ""));

		if (!hasMatch) return null;

		return [{
			content: lines
				.slice(section.position.start.line, section.position.end.line + 1)
				.join("\n"),
			startLine: section.position.start.line,
			endLine: section.position.end.line,
		}];
	}
}

const sectionParsers = [
	new HeadingBlockParser(),
	new CodeBlockParser(),
	new ListBlockParser(),
	new DefaultSectionParser(),
];

export async function parseBlocks(
	app: App,
	file: TFile,
	matcher: LineMatcher
): Promise<Block[]> {
	const metadata = app.metadataCache.getFileCache(file);
	if (!metadata?.sections) return [];

	// Log sections to update the test file:
	// console.log('sections', metadata.sections);

	const content = await app.vault.cachedRead(file);
	const lines = content.split("\n");
	const blocks: Block[] = [];

	for (let i = 0; i < metadata.sections.length; i++) {
		const section = metadata.sections[i];
		if (!section || section.type === "yaml") continue;

		const parser = sectionParsers.find((p) => p.matches(section));
		if (!parser) continue;

		const result = parser.extract(metadata.sections, i, lines, matcher);
		if (result) {
			blocks.push(...result);
		}
	}

	return blocks;
}
