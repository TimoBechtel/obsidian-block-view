const interactiveSelector = [
	"a",
	"button",
	"input",
	"textarea",
	"select",
	"label",
	"video",
	"audio",
	"details",
	"summary",

	// other elements
	"svg", // icons
	"img", // to allow image preview

	"[onclick]",
	"[onmousedown]",
	"[onmouseup]",
	'[contenteditable="true"]',
	'[contenteditable=""]',
	"[tabindex]",
	'[role="button"]',
	'[role="link"]',
	'[role="tab"]',
	'[role="menuitem"]',
	'[role="checkbox"]',
	'[role="radio"]',
	'[role="switch"]',
].join(", ");

export function isInteractiveTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) {
		return false;
	}

	if (target.closest(interactiveSelector)) {
		return true;
	}

	if (target.isContentEditable) {
		return true;
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
