<h1 align="center">Obsidian Block View</h1>

<p align="center">
  <img src="https://img.shields.io/badge/status-beta-yellow?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/obsidian-plugin-purple?style=flat-square" alt="Obsidian Plugin" />
</p>

<p align="center">
  <b>A Obsidian Bases view that turns your notes into a database of blocks.</b>
</p>

---

## What is Block View?

Block View is an extension for the Bases core plugin that allows you to list and filter specific sections of your notes - *"blocks"* - across your entire vault.

![./docs/assets/obsidian-block-view.gif]

For example, you could use it to resurface specifically tagged bullet points in your daily notes every week. Or have a library of quotes from anywhere in your vault.

And because it works as a Bases view, you can still use all the standard features like file filtering, sorting and grouping. It then divides each files's content into blocks, allowing you to filter and display specific sections from multiple notes in the same view.

Still not sure what this is? Let's look at some examples.

## Examples

### 1. Daily Logs

Review your work history by listing every paragraph tagged with `#log` or `#work` from your daily notes in a single timeline, without opening each file individually.

![./docs/assets/work-log.jpeg]

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
      - log
      - work
```
````

</details>

### 2. Project Tasks

Collect all incomplete tasks from your project folders in a single list. You can group them by project and check them off directly in the view, without opening the corresponding note.

![./docs/assets/tasks.jpeg]

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

![./docs/assets/code-snippets.jpeg]

<details>
<summary><b>Show Bases Snippet</b></summary>

````markdown
```base
views:
  - type: block-view
    name: "Python Library"
    filterCodeBlocks: true
    filterCodeBlocksLanguage: python
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

![./docs/assets/quotes.jpeg]

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


## Context Matching

Block View uses the Markdown structure to determine what content belongs to a match.

* **Headers:** If a header matches the filter, the view includes the content of that section up to the next header of the same level.
* **Lists:** If a list item matches, it includes all nested children items and continuation paragraphs.
* **Tables:** You can choose to show the whole table if one cell matches or filter down to specific rows.
* **Code:** It respects code block fences.

## View Options

You can configure these settings via the view options panel in the Bases view.

| Option | Description |
| :--- | :--- |
| **Tasks** | Toggle to show task items (`- [ ]`). |
| **Show** | If tasks are enabled, choose `Any`, `Incomplete`, or `Complete`. |
| **Quotes** | Toggle to show Blockquotes (`> text`) and Callouts. |
| **Code Blocks** | Toggle to show code blocks. |
| **Language** | Filter code blocks by language (e.g., `js`, `python`). |
| **Include tags** | A list of tags to filter by. Supports nested tags. |
| **Include if** | `Any` (match at least one filter) or `All` (must match all active filters). |
| **Regex pattern** | Advanced: specify a custom Regex pattern to match lines. |
| **Display Options** | Customize table dividers, hide empty files, or strip non-matching table rows. |

## Installation

### Via BRAT (Beta)

This plugin is currently in Beta and not yet available in the official Community Plugins list. You can install it using **BRAT**:

1. Install **BRAT** from the Community Plugins store.
2. Open the command palette and run `BRAT: Add a beta plugin for testing`.
3. Enter the URL: `https://github.com/timobechtel/obsidian-block-view`
4. Enable "Block View" in your settings.

## Contributing

### Development

This project uses [bun](https://bun.sh/) as a package manager & bundler.

If you don't have bun installed, run:

```bash
curl -fsSL https://bun.sh/install | bash
```

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
