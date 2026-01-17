import { Plugin } from "obsidian";
import { BlockContentView } from "./views/block-content-view";

export const BlockContentViewType = "block-content-view";

export default class MyPlugin extends Plugin {
	async onload() {
		this.registerBasesView(BlockContentViewType, {
			name: "Block Content",
			icon: "lucide-file-text",
			factory: (controller, containerEl) => {
				return new BlockContentView(controller, containerEl);
			},
			options: () => [
				{
					type: "multitext",
					displayName: "Include tags",
					key: "tagFilter",
					default: [],
				},
				{
					type: "group",
					displayName: "Display options",
					items: [
						{
							type: "toggle",
							displayName: "Show file names",
							key: "showFileNames",
							default: true,
						},
						{
							type: "toggle",
							displayName: "Include other file types than markdown",
							key: "showAllFiles",
							default: false,
						},
					],
				},
			],
		});
	}
}
