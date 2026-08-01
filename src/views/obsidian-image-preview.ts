import { MarkdownPreviewRenderer } from "obsidian";

/**
 * Experimental feature to add support for Obsidian's built-in image previewer. 
 * It uses a private API so might break in future versions.
 **/
export function tryOpenObsidianImagePreview({
	containerEl,
	event,
	target,
}: {
	containerEl: HTMLElement;
	event: MouseEvent;
	target: HTMLElement;
}) {
	const image = target.closest<HTMLImageElement>(".block-view-block img");
	if (!image) return false;

	try {
		// this method is available at runtime but is not part of Obsidian's public API.
		const handleMediaClick: unknown = Reflect.get(
			MarkdownPreviewRenderer.prototype,
			"handleMediaClick"
		);
		if (typeof handleMediaClick !== "function") return false;
		const sections = Array.from(
			containerEl.querySelectorAll<HTMLElement>(".block-view-block"),
			(el) => ({ el })
		);
		handleMediaClick.call({ sections }, event, image);
		event.preventDefault();
		return true;
	} catch (error) {
		console.error("Unable to open Obsidian's image viewer.", error);
		return false;
	}
}
