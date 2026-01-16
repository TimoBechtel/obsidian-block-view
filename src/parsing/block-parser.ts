export function extractBlocks(
	content: string,
	tag: string
): Array<{
	content: string;
	startLine: number;
	endLine: number;
}> {
	const lines = content.split("\n");
	const blocks: Array<{
		content: string;
		startLine: number;
		endLine: number;
	}> = [];

	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (!line) {
			i++;
			continue;
		}

		const tagIndex = line.indexOf(tag);

		if (tagIndex === -1) {
			i++;
			continue;
		}

		const startLine = i;
		let endLine = i;

		if (
			line.trim().startsWith("-") ||
			line.trim().startsWith("*") ||
			/^\s*\d+\./.test(line)
		) {
			const baseIndent = getIndentLevel(line);
			endLine = i;

			for (let j = i + 1; j < lines.length; j++) {
				const nextLine = lines[j];
				if (!nextLine) {
					break;
				}
				if (nextLine.trim() === "") {
					const nextNonEmpty = findNextNonEmptyLine(lines, j + 1);
					if (nextNonEmpty === -1) {
						break;
					}
					const nonEmptyLine = lines[nextNonEmpty];
					if (
						!nonEmptyLine ||
						getIndentLevel(nonEmptyLine) <= baseIndent
					) {
						break;
					}
					endLine = j;
					continue;
				}

				const nextIndent = getIndentLevel(nextLine);
				if (
					nextIndent <= baseIndent &&
					(nextLine.trim().startsWith("-") ||
						nextLine.trim().startsWith("*") ||
						/^\s*\d+\./.test(nextLine))
				) {
					break;
				}

				if (
					nextIndent > baseIndent ||
					nextLine.trim() === "" ||
					!isListLine(nextLine)
				) {
					endLine = j;
				} else {
					break;
				}
			}
		} else if (line.startsWith("#")) {
			const headingLevel = getHeadingLevel(line);
			endLine = i;

			for (let j = i + 1; j < lines.length; j++) {
				const nextLine = lines[j];
				if (nextLine === undefined) {
					break;
				}
				if (nextLine.startsWith("#")) {
					const nextLevel = getHeadingLevel(nextLine);
					if (nextLevel <= headingLevel) {
						break;
					}
				}
				endLine = j;
			}
		} else {
			endLine = i;
			for (let j = i + 1; j < lines.length; j++) {
				const nextLine = lines[j];
				if (!nextLine || nextLine.trim() === "") {
					break;
				}
				endLine = j;
			}
		}

		const blockContent = lines.slice(startLine, endLine + 1).join("\n");
		blocks.push({
			content: blockContent,
			startLine,
			endLine,
		});

		i = endLine + 1;
	}

	return blocks;
}

function getIndentLevel(line: string): number {
	const match = line.match(/^(\s*)/);
	return match && match[1] ? match[1].length : 0;
}

function isListLine(line: string): boolean {
	return (
		line.trim().startsWith("-") ||
		line.trim().startsWith("*") ||
		/^\s*\d+\./.test(line)
	);
}

function getHeadingLevel(line: string): number {
	const match = line.match(/^(#+)/);
	return match && match[1] ? match[1].length : 0;
}

function findNextNonEmptyLine(lines: string[], start: number): number {
	for (let i = start; i < lines.length; i++) {
		const line = lines[i];
		if (line && line.trim() !== "") {
			return i;
		}
	}
	return -1;
}
