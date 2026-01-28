const interactiveTags = new Set([
	"A",
	"BUTTON",
	"INPUT",
	"TEXTAREA",
	"SELECT",
	"LABEL",
	"VIDEO",
	"AUDIO",
	"DETAILS",
	"SUMMARY",
]);

const interactiveAriaRoles = new Set([
	"button",
	"link",
	"tab",
	"menuitem",
	"checkbox",
	"radio",
	"switch",
]);

/**
 * Checks if the target is an interactive element or a child of an interactive element within the boundary.
 */
export function isInteractiveTarget(
	target: EventTarget | null,
	boundary: HTMLElement
): boolean {
	if (!(target instanceof HTMLElement)) {
		return false;
	}

	let current: HTMLElement | null = target;
	while (current && current !== boundary) {
		if (current.isContentEditable) {
			return true;
		}

		if (current.tabIndex > -1) {
			return true;
		}

		if (interactiveTags.has(current.tagName)) {
			return true;
		}

		if (interactiveAriaRoles.has(current.getAttribute("role") ?? "")) {
			return true;
		}

		current = current.parentElement;
	}

	return false;
}

export function hasTextSelection(): boolean {
	const selection = window.getSelection();
	if (!selection) {
		return false;
	}

	const selectedText = selection.toString();
	return selectedText.length > 0;
}
