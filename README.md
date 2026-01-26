<h1 align="center">Obsidian Block View</h1>

<p align="center">
  <img src="https://img.shields.io/badge/obsidian-plugin-purple?style=flat-square" alt="Obsidian Plugin" />
</p>

<p align="center">
  <b>An Obsidian Bases view that turns your notes into a database of blocks.</b>
</p>

![Block View Demo](https://raw.githubusercontent.com/TimoBechtel/obsidian-block-view/main/docs/assets/obsidian-block-view.gif)

---


## Table of Contents

- [Installation](#installation)
- [Examples](#examples)
- [How it works](#how-it-works)
- [Filters & View Options](#filters--view-options)
- [Style Settings](#style-settings)
- [Contributing](#contributing)

## What is Block View?

Block View is an extension for the Bases core plugin that allows you to list and filter the content of your notes - _"blocks"_ - across your entire vault.



For example, you could use it to resurface specifically tagged bullet points in your daily notes every week. Or have a library of quotes from anywhere in your vault.

And because it works as a Bases view, you can still use all the standard features like file filtering, sorting and grouping. It then divides each files's content into blocks, allowing you to filter and display specific sections from multiple notes in the same view.

## Installation

### Via [BRAT](https://obsidian.md/plugins?id=obsidian42-brat)

This plugin is not yet available in the official Community Plugins list. You can install it using **BRAT**:

1. Install **[BRAT](https://obsidian.md/plugins?id=obsidian42-brat)** from the Community Plugins store.
2. Open the command palette and run `BRAT: Add a beta plugin for testing`.
3. Enter the URL: `https://github.com/timobechtel/obsidian-block-view`
4. Enable "Block View" in your settings.

## Examples

Still not sure what this is? Let's look at some examples.

### 1. Daily Logs

Review your work history by listing every paragraph tagged with `#log` or `#work` from your daily notes in a single timeline, without opening each file individually.

![Work Log Screenshot](https://raw.githubusercontent.com/TimoBechtel/obsidian-block-view/main/docs/assets/work-log.jpeg)

<details>
<summary><b>Show Bases Snippet</b></summary>

````markdown
```base
views:
  - type: block-view
    name: Blocks
    filters:
      and:
        - file.folder == "Daily Notes"
    order:
      - file.name
    sort:
      - property: file.mtime
        direction: DESC
    tagFilter:
      - "#log"
      - "#work"
```
````

</details>

### 2. Project Tasks

Collect all incomplete tasks from your project folders in a single list. You can group them by project and check them off directly in the view, without opening the corresponding note.

![Project Tasks Screenshot](https://raw.githubusercontent.com/TimoBechtel/obsidian-block-view/main/docs/assets/tasks.jpeg)

<details>
<summary><b>Show Bases Snippet</b></summary>

````markdown
```base
views:
  - type: block-view
    name: "Active Tasks"
    group:
      - property: file.folder
    filterTasks: true
    filterTasksType: incomplete
```
````

</details>

### 3. Code Snippets

Build a searchable library of your code snippets. This example collects every `python` code block scattered across your vault into one reference list.

![Code Snippets Screenshot](https://raw.githubusercontent.com/TimoBechtel/obsidian-block-view/main/docs/assets/code-snippets.jpeg)

<details>
<summary><b>Show Bases Snippet</b></summary>

````markdown
```base
views:
  - type: block-view
    name: "Python Library"
    filterCodeBlocks: true
    filterCodeBlocksLanguages:
      - python
    groupBy:
      property: file.folder
      direction: ASC
    order:
      - file.name
    sort:
      - property: file.mtime
        direction: DESC
```
````

</details>

### 4. Quotes and Highlights

Surface key information from your notes. This collects every blockquote tagged `#insight` so you can review all your insights in one place.

![Quotes Screenshot](https://raw.githubusercontent.com/TimoBechtel/obsidian-block-view/main/docs/assets/quotes.jpeg)

<details>
<summary><b>Show Bases Snippet</b></summary>

````markdown
```base
views:
  - type: block-view
    name: "Highlights"
    filterQuotes: true
    tagFilter:
      - insight
    matchLogic: all
```
````

</details>

## How it works

Block View filters blocks by checking if any line in a markdown section matches your filters.

For example:

- **Quotes:** If any line in a blockquote matches the filter, the view includes the content of that blockquote.
- **Headers:** If a header matches the filter, the view includes the content of that section up to the next header of the same level.
- **Lists:** If a list item matches, it includes all nested children items and continuation paragraphs.
- **Paragraphs:** If a paragraph matches, the view includes the content of that paragraph.

## Filters & View Options

You can configure these settings via the view options panel in the Bases view.

| Option              | Description                                                                   |
| :------------------ | :---------------------------------------------------------------------------- |
| **Tasks**           | Toggle to show task items (`- [ ]`).                                          |
| **Show**            | If tasks are enabled, choose `Any`, `Incomplete`, or `Complete`.              |
| **Quotes**          | Toggle to show Blockquotes (`> text`) and/or Callouts.                        |
| **Quote type**      | If quotes are enabled, choose `Any`, `Blockquotes`, or `Callouts`.            |
| **Code Blocks**     | Toggle to show code blocks.                                                   |
| **Languages**       | Multi-select filter for code block languages. Use `-` prefix to exclude (e.g., `ts`, `js`, `-base`). Default excludes `base`. |
| **Include tags**    | Multi-select list of tags to filter by. Use `-` prefix to exclude (e.g., `#work`, `-#archived`). Supports nested tags. |
| **Include if**      | `Any` (match at least one filter) or `All` (must match all active filters).   |
| **Text pattern**    | Match lines starting with given text or regex (wrap in `//`). Supports invert.                          |
| **Display Options** | Customize hiding empty files or stripping non-matching table rows. |

## Style Settings

Block View supports configuring some of the styles via the [Style Settings](https://obsidian.md/plugins?id=obsidian-style-settings) plugin.

## Contributing

### Development

This project uses [bun](https://bun.sh/) as a package manager.

#### Install dependencies

```bash
bun install
```

#### Build

```bash
bun run build
```

### Commit messages

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) guidelines. I recommend using [commitizen](https://github.com/commitizen/cz-cli) for automated commit messages.
