# Example Note

This is a paragraph without any tag.

This paragraph has a #log tag in it.
It continues on this line.

#log this paragraph starts with a tag.
And continues here.

## A heading with #log

Content under the heading.
More content here.

### Subheading

This should be included too.
And this is a #log sentence.

## Another heading

This should not be included.

- Regular list item
- List item with #log tag
  - Nested child 1
  - Nested child 2
    - Deeply nested
  - Back to level 2
- Next item at same level (should not be included)

- Another #log item
  With continuation paragraph
  
  And another paragraph still indented

- Not included item

1. Numbered item
2. Numbered with #log
   - Sub item
   - Another sub
3. Next numbered (not included)

## Blockquotes

> Regular quote without tag

> Following is a quote:
> This is a quote with #log tag
> Continuation of quote
> Still part of the same quote

> Another quote without tag

## Task Lists

- [ ] Regular task
- [ ] Incomplete task with #log
- [x] Completed task with #log
  - [ ] Nested task
- [ ] Next task (not included)

## Callouts

> [!note]
> Regular callout without tag

> [!note] #log
> Content inside callout with tag
> More content here

> [!warning]
> Another callout with #log tag
> And more content here

## Code Blocks

Regular paragraph before code.

```python #log
def example():
    pass
```

Another paragraph.

```javascript
// code block with #log tag
console.log("test");
```

Paragraph with inline code `some code #log` in it.

## Tables

| Column 1  | Column 2 |
|-----------|----------|
| Data      | More     |
| Data #log | More     |

| Name     | Status #log |
|----------|-------------|
| Item 1   | Active      |
| Item 2   | Pending     |

| Regular  | Table    |
|----------|----------|
| No tag   | Here     |
