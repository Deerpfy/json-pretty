# JSON Pretty-Print and Minify

A tiny, single-purpose offline tool for cleaning up JSON. Paste raw JSON and either beautify it with your chosen indent, minify it down to a single line, or sort its object keys, then copy the result or download it as a file. Invalid JSON is reported clearly (with the line and column when the engine provides a position) and your input is never destroyed on error. The whole tool is plain HTML, CSS, and one classic JavaScript file using only the native `JSON.parse` and `JSON.stringify` APIs.

## How to run

1. Download or copy the `json-pretty-minify/` folder.
2. Open `index.html` in any modern browser by double-clicking it.

That is all. There is no install step, no build step, no server, and no network access at any point. The tool runs entirely from disk on the `file://` protocol, and nothing you paste ever leaves your device.

## Features

- **Beautify** - pretty-print JSON with readable indentation.
- **Indent options** - choose 2 spaces, 4 spaces, or a Tab for beautified output.
- **Minify** - collapse JSON to a single line with no insignificant whitespace.
- **Sort keys** - recursively reorder object keys alphabetically (array order is always preserved). Applies to both beautify and minify.
- **Clear validation** - invalid JSON shows the parser message plus the 1-based line and column when available, and leaves your input and any previous output untouched.
- **Copy** - copy the result to the clipboard, with a selection-based fallback that works under `file://`.
- **Download** - save the result as `formatted.json`.
- **Size stats** - after each transform, the status line reports the input and output character counts.

## Known limits

Numbers are processed by the browser's native JSON engine, where every number is an IEEE-754 double-precision float. Very large integers (beyond roughly 2^53, that is 9,007,199,254,740,991) and high-precision decimals can therefore lose precision during a `JSON.parse` / `JSON.stringify` round-trip. For example, `12345678901234567890` may come back as `12345678901234568000`. If you need to preserve such values exactly, keep them as JSON strings.
