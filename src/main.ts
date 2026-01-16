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
					type: "text",
					displayName: "Tag filter",
					key: "tagFilter",
					default: "",
				},
				{
					type: "toggle",
					displayName: "Include all file types",
					key: "showAllFiles",
					default: false,
				},
				{
					type: "toggle",
					displayName: "Show file names",
					key: "showFileNames",
					default: true,
				},
			],
		});
	}
}
