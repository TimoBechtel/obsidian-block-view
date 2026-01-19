import type { CachedMetadata, ListItemCache, SectionCache } from "obsidian";
import type { LineMatcher } from "./matchers";

type Block = {
	content: string;
	startLine: number;
	endLine: number;
};

type ExtractOptions = {
	startIndex: number;
	lines: string[];
	matcher: LineMatcher;
	cache: CachedMetadata;
};

abstract class SectionBlockParser {
	abstract matches(section: SectionCache): boolean;
	abstract extract(options: ExtractOptions): { blocks: Block[], lastSectionIndex: number } | null;
}

class ListBlockParser extends SectionBlockParser {
	matches(section: SectionCache): boolean {
		return section.type === "list";
	}

	extract({ startIndex, lines, matcher, cache }: ExtractOptions): { blocks: Block[], lastSectionIndex: number } | null {
		const sections = cache.sections;
		if (!sections) return null;

		const section = sections[startIndex];
		if (!section) return null;

		const listItemsInSection = cache.listItems?.filter(item =>
			item.position.start.line >= section.position.start.line &&
			item.position.end.line <= section.position.end.line
		) ?? [];

		if (listItemsInSection.length === 0) return null;

		const blocks: Block[] = [];

		let lastProcessedLine = -1;

		for (let i = 0; i < listItemsInSection.length; i++) {
			const item = listItemsInSection[i];
			if (!item) continue;

			const startLine = item.position.start.line;

			if (startLine <= lastProcessedLine) continue;

			if (!matcher.matches({
				line: lines[startLine] ?? "",
				lineNumber: startLine,
				cache,
				section,
			})) {
				continue;
			}

			const endLine = this.findBlockEndForItem(
				i,
				listItemsInSection,
				section.position.end.line
			);

			lastProcessedLine = endLine;

			blocks.push({
				content: lines.slice(startLine, endLine + 1).join("\n"),
				startLine,
				endLine,
			});
		}

		return blocks.length > 0 ? { blocks, lastSectionIndex: startIndex } : null;
	}

	/**
	 * Finds the end line of a block starting from a list item.
	 * Includes all children and continuation paragraphs.
	 * 
	 * Note: Assumes the items are sorted by start line.
	 */
	private findBlockEndForItem(
		startItemIndex: number,
		items: ListItemCache[],
		maxLine: number
	): number {
		const parentItem = items[startItemIndex];
		if (!parentItem) return -1;

		let endLine = parentItem.position.end.line;

		const validParents = new Set<number>();
		validParents.add(parentItem.position.start.line);

		for (let i = startItemIndex + 1; i < items.length; i++) {
			const current = items[i];
			if (!current) break;

			if (validParents.has(current.parent)) {
				if (current.position.end.line > endLine) {
					endLine = current.position.end.line;
				}
				validParents.add(current.position.start.line);
			} else {
				break;
			}
		}

		return Math.min(endLine, maxLine);
	}
}

class HeadingBlockParser extends SectionBlockParser {
	matches(section: SectionCache): boolean {
		return section.type === "heading";
	}

	extract({ startIndex, lines, matcher, cache }: ExtractOptions): { blocks: Block[], lastSectionIndex: number } | null {
		const sections = cache.sections;
		if (!sections) return null;

		const section = sections[startIndex];
		if (!section) return null;

		const headingLine = lines[section.position.start.line];
		if (!headingLine) return null;

		if (!matcher.matches({
			line: headingLine,
			lineNumber: section.position.start.line,
			cache,
			section,
		})) {
			return null;
		}

		const headingLevel = this.getHeadingLevel(headingLine);
		let endLine = section.position.end.line;
		let lastSectionIndex = startIndex;

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
			lastSectionIndex = j;
		}

		return {
			blocks: [{
				content: lines
					.slice(section.position.start.line, endLine + 1)
					.join("\n"),
				startLine: section.position.start.line,
				endLine,
			}],
			lastSectionIndex,
		};
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

	extract({ startIndex, lines, matcher, cache }: ExtractOptions): { blocks: Block[], lastSectionIndex: number } | null {
		const sections = cache.sections;
		if (!sections) return null;

		const section = sections[startIndex];
		if (!section) return null;

		const fenceLine = lines[section.position.start.line];
		if (!fenceLine) return null;

		if (!matcher.matches({
			line: fenceLine,
			lineNumber: section.position.start.line,
			cache,
			section,
		})) {
			return null;
		}

		return {
			blocks: [{
				content: lines
					.slice(section.position.start.line, section.position.end.line + 1)
					.join("\n"),
				startLine: section.position.start.line,
				endLine: section.position.end.line,
			}],
			lastSectionIndex: startIndex,
		};
	}
}

class TableBlockParser extends SectionBlockParser {
	matches(section: SectionCache): boolean {
		return section.type === "table";
	}

	extract({ startIndex, lines, matcher, cache }: ExtractOptions): { blocks: Block[], lastSectionIndex: number } | null {
		const sections = cache.sections;
		if (!sections) return null;

		const section = sections[startIndex];
		if (!section) return null;

		const tableLines = lines.slice(
			section.position.start.line,
			section.position.end.line + 1
		);

		if (tableLines.length < 2) return null;

		const headerLine = tableLines[0];
		const separatorLine = tableLines[1];

		if (!headerLine || !separatorLine) return null;

		if (matcher.matches({
			line: headerLine,
			lineNumber: section.position.start.line,
			cache,
			section,
		})) {
			return {
				blocks: [{
					content: tableLines.join("\n"),
					startLine: section.position.start.line,
					endLine: section.position.end.line,
				}],
				lastSectionIndex: startIndex,
			};
		}

		const blocks: Block[] = [];
		for (let i = 2; i < tableLines.length; i++) {
			const dataLine = tableLines[i];
			if (!dataLine) continue;

			if (matcher.matches({
				line: dataLine,
				lineNumber: section.position.start.line + i,
				cache,
				section,
			})) {
				const blockLines = [headerLine, separatorLine, dataLine];
				blocks.push({
					content: blockLines.join("\n"),
					startLine: section.position.start.line,
					endLine: section.position.start.line + i,
				});
			}
		}

		return blocks.length > 0 ? { blocks, lastSectionIndex: startIndex } : null;
	}
}

class DefaultSectionParser extends SectionBlockParser {
	matches(): boolean {
		return true;
	}

	extract({ startIndex, lines, matcher, cache }: ExtractOptions): { blocks: Block[], lastSectionIndex: number } | null {
		const sections = cache.sections;
		if (!sections) return null;

		const section = sections[startIndex];
		if (!section) return null;

		const hasMatch = lines
			.slice(section.position.start.line, section.position.end.line + 1)
			.some((line, idx) => {
				return matcher.matches({
					line: line ?? "",
					lineNumber: section.position.start.line + idx,
					cache,
					section,
				});
			});

		if (!hasMatch) return null;

		let endLine = section.position.end.line;
		let lastSectionIndex = startIndex;

		// check if the next section comes immediately after the current section, and include if so
		const nextSection = sections[startIndex + 1];
		if (nextSection && nextSection.type !== "yaml") {
			const gap = nextSection.position.start.line - endLine;
			if (gap === 1) {
				endLine = nextSection.position.end.line;
				lastSectionIndex = startIndex + 1;
			}
		}

		return {
			blocks: [{
				content: lines
					.slice(section.position.start.line, endLine + 1)
					.join("\n"),
				startLine: section.position.start.line,
				endLine,
			}],
			lastSectionIndex,
		};
	}
}

type ParseOptions = {
	filterTableRows?: boolean;
};

export function parseBlocks(
	content: string,
	metadata: CachedMetadata,
	matcher: LineMatcher,
	options?: ParseOptions
): Block[] {
	if (!metadata?.sections) return [];

	// log metadata to update the test file:
	// console.log('metadata', metadata);

	const lines = content.split("\n");
	const blocks: Block[] = [];

	const sectionParsers = [
		new HeadingBlockParser(),
		new CodeBlockParser(),
		new ListBlockParser(),
		...(options?.filterTableRows ? [new TableBlockParser()] : []),
		new DefaultSectionParser(),
	];

	for (let i = 0; i < metadata.sections.length; i++) {
		const section = metadata.sections[i];
		if (!section || section.type === "yaml") continue;

		const parser: SectionBlockParser | undefined = sectionParsers.find((p) => p.matches(section));
		if (!parser) continue;

		const result = parser.extract({
			startIndex: i,
			lines,
			matcher,
			cache: metadata,
		});
		if (result) {
			blocks.push(...result.blocks);
			// skip processed sections
			i = result.lastSectionIndex;
		}
	}

	return blocks;
}
