/**
 * Regex to match a task. Includes capture groups for toggling the task status.
 * 
 * It supports the following task markers:
 * - [ ]
 * - 1) [ ]
 * 
 * As well as nested task markers:
 * > - [ ]
 * > 1) [x]
 * > > - [x]
 * 
 * The following markers are not supported (by MarkdownRenderer) and will not be matched:
 * - * [ ]
 * - + [ ]
 * - 1. [ ]
 * 
 */
const TASK_TOGGLE_REGEX = /^(\s*[>\s]*(?:-|\d+\))\s+\[)([ xX])(\].*)$/;

export function isTaskLine(line: string): boolean {
	// quick check first to prevent unnecessary regex execution
	if (!line.includes("[") || !line.includes("]")) return false;
	return TASK_TOGGLE_REGEX.test(line);
}

/**
 * Toggles the task status in a task line string.
 */
export function toggleTaskLine(line: string, checked?: boolean): string {
	return line.replace(
		TASK_TOGGLE_REGEX,
		(_, prefix: string, status: string, suffix: string) =>
			`${prefix}${checked === true ? "x" : checked === false ? " " : status.toLowerCase() === "x" ? " " : "x"}${suffix}`
	);
}
