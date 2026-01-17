import { Plugin } from "obsidian";
import { BlockView, BlockViewType } from "./views/block-view";

export default class BlockViewPlugin extends Plugin {
	async onload() {
		this.registerBasesView(BlockViewType, {
			name: "Blocks",
			icon: "lucide-file-text",
			factory: (controller, containerEl) => {
				return new BlockView(controller, containerEl);
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
