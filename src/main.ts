import {
	BasesView,
	Keymap,
	parsePropertyId,
	Plugin,
	type HoverParent,
	type HoverPopover,
	type QueryController,
} from "obsidian";

// Remember to rename these classes and interfaces!

export const ExampleViewType = "example-view";

export default class MyPlugin extends Plugin {
	async onload() {
		// Tell Obsidian about the new view type that this plugin provides.
		this.registerBasesView(ExampleViewType, {
			name: "Example",
			icon: "lucide-graduation-cap",
			factory: (controller, containerEl) => {
				return new MyBasesView(controller, containerEl);
			},
			options: () => [
				{
					// The type of option. 'text' is a text input.
					type: "text",
					// The name displayed in the settings menu.
					displayName: "Property separator",
					// The value saved to the view settings.
					key: "separator",
					// The default value for this option.
					default: " - ",
				},
				// ...
			],
		});
	}
}

export class MyBasesView extends BasesView implements HoverParent {
	readonly type = ExampleViewType;
	private containerEl: HTMLElement;

	hoverPopover: HoverPopover | null;

	constructor(controller: QueryController, parentEl: HTMLElement) {
		super(controller);
		this.containerEl = parentEl.createDiv("bases-example-view-container");
	}

	public onDataUpdated(): void {
		const { app } = this;

		// Retrieve the user configured order set in the Properties menu.
		const order = this.config.getOrder();

		// Clear entries created by previous iterations. Remember, you should
		// instead attempt element reuse when possible.
		this.containerEl.empty();

		// The property separator configured by the ViewOptions above can be
		// retrieved from the view config. Be sure to set a default value.
		const propertySeparator = String(this.config.get("separator")) || " - ";

		// this.data contains both grouped and ungrouped versions of the data.
		// If it's appropriate for your view type, use the grouped form.
		for (const group of this.data.groupedData) {
			const groupEl = this.containerEl.createDiv("bases-list-group");
			const groupListEl = groupEl.createEl("ul", "bases-list-group-list");

			// Each entry in the group is a separate file in the vault matching
			// the Base filters. For list view, each entry is a separate line.
			for (const entry of group.entries) {
				groupListEl.createEl("li", "bases-list-entry", (el) => {
					let firstProp = true;
					for (const propertyName of order) {
						// Properties in the order can be parsed to determine what type
						// they are: formula, note, or file.
						const { type, name } = parsePropertyId(propertyName);

						// `entry.getValue` returns the evaluated result of the property
						// in the context of this entry.
						const value = entry.getValue(propertyName);

						// Skip rendering properties which have an empty value.
						// The list items for each file may have differing length.
						if (!value?.isTruthy()) continue;

						if (!firstProp) {
							el.createSpan({
								cls: "bases-list-separator",
								text: propertySeparator,
							});
						}
						firstProp = false;

						// If the `file.name` property is included in the order, render
						// it specially so that it links to that file.
						if (name === "name" && type === "file") {
							const fileName = String(entry.file.name);
							const linkEl = el.createEl("a", { text: fileName });
							linkEl.onClickEvent((evt) => {
								if (evt.button !== 0 && evt.button !== 1)
									return;
								evt.preventDefault();
								const path = entry.file.path;
								const modEvent = Keymap.isModEvent(evt);
								void app.workspace.openLinkText(
									path,
									"",
									modEvent
								);
							});

							linkEl.addEventListener("mouseover", (evt) => {
								app.workspace.trigger("hover-link", {
									event: evt,
									source: "bases",
									hoverParent: this,
									targetEl: linkEl,
									linktext: entry.file.path,
								});
							});
						}
						// For all other properties, just display the value as text.
						// In your view you may also choose to use the `Value.renderTo`
						// API to better support photos, links, icons, etc.
						else {
							const target = el.createSpan();
							value.renderTo(target, {
								hoverPopover: this.hoverPopover,
							});
						}
					}
				});
			}
		}
	}
}
