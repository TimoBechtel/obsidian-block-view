/**
 * Regex to match a task. 
 * It supports the following task markers:
 * - - [ ]
 * - 1) [ ]
 * 
 * The following are not rendered as checkboxes by MarkdownRenderer and therefore not matched:
 * - * [ ]
 * - + [ ]
 * - 1.) [ ]
 * - 1. [ ]
 * 
 * Obsidian supports them, but MarkdownRenderer does not appear to support them..
 * 
 */
const TASK_LINE_REGEX = /^(?:>\s*)*(?:-|\d+\))\s+\[[ xX]\]/;
const TASK_TOGGLE_REGEX = /^(\s*(?:>\s*)*(?:-|\d+\))\s+\[)([ xX])(\].*)$/;

export function isTaskLine(line: string): boolean {
	return TASK_LINE_REGEX.test(line.trim());
}

/**
 * Toggles the task status in a task line string.
 */
export function toggleTaskLine(line: string): string {
	return line.replace(
		TASK_TOGGLE_REGEX,
		(_, prefix: string, status: string, suffix: string) =>
			`${prefix}${status.toLowerCase() === "x" ? " " : "x"}${suffix}`
	);
}
