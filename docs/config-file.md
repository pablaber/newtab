# Configuration

Configuration is stored in the browser's localStorage. On first load (when no localStorage data exists), the app fetches `config.json` to seed the initial config. All subsequent changes are saved to localStorage and the seed file is not read again. The settings page includes:

- **General** — configure background image, overlay color, opacity, gradient, and search
- **Links** — add, remove, rename, and reorder sections and links
- **Subcommands** — create scoped shortcuts with predefined links and freeform URL fields

You can also import/export the full config as a base64 string from the settings header.

## Top-level

| Field | Type | Description |
|---|---|---|
| `version` | `number` | Config schema version (currently `1`) |
| `background` | `object` | Background settings (optional) |
| `search` | `object` | Search bar settings (optional) |
| `modules` | `array` | Array of module configurations |
| `subcommands` | `array` | Scoped launcher commands (optional) |

## `background`

All fields are optional.

| Field | Type | Default | Description |
|---|---|---|---|
| `imageUrl` | `string` | — | URL to a background image. If empty/missing, solid color is used. |
| `color` | `string` | `"#1a1a2e"` | Fallback background color and overlay color (also the first gradient color) |
| `opacity` | `number` | `0.4` | Opacity of the color overlay on top of the image (0–1) |
| `gradient` | `object` | — | Gradient settings (optional, see below) |

## `background.gradient`

Optional. When enabled, a linear gradient is used instead of a solid color for the background (or image overlay).

| Field | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `false` | Whether to use a gradient background |
| `color2` | `string` | `"#000000"` | Second color of the gradient (first color is `background.color`) |
| `direction` | `string` | `"down"` | Gradient direction: `"up"`, `"down"`, `"left"`, or `"right"` |

## `search`

Optional. If missing or `enabled: false`, no search bar is shown.

| Field | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `false` | Whether to show the search/filter bar |
| `placeholder` | `string` | `"Filter links..."` | Placeholder text for the input |

The search bar filters links across all modules by label (case-insensitive substring match). Pressing **Escape** clears the filter. Pressing **Enter** when exactly one link matches navigates to that link.

When `search.enabled` is `false` but subcommands are configured, the launcher remains visible for subcommands and does not show ordinary link results.

## `modules[]`

Each module represents a section of links on the page.

| Field | Type | Default | Description |
|---|---|---|---|
| `type` | `string` | — | Module type (currently only `"links"`) |
| `title` | `string` | — | Section heading |
| `columns` | `number` | `3` | Number of columns in the link grid |
| `links` | `array` | — | Array of link objects |

## `modules[].links[]`

| Field | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | — | Link URL |
| `label` | `string` | — | Display text |
| `icon` | `string` | auto-fetched favicon | URL to an icon image. If omitted, a favicon is fetched from Google's favicon service. |

## `subcommands[]`

Subcommands are one-level scopes in the launcher. Their items do not appear in homepage modules or ordinary link searches.

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Display name used in launcher suggestions |
| `trigger` | `string` | Unique, case-insensitive shortcut of up to 20 letters, numbers, `_`, or `-` |
| `items` | `array` | Predefined destinations; may be empty when `freeform` is present |
| `freeform` | `object` | Optional ordered argument fields and URL template |

Each predefined item has a required `label` and HTTP(S) `url`, plus an optional imported `icon`. A subcommand must have at least one predefined item or a valid freeform definition.

Freeform fields are required positional values. Field names are unique, up to 30 letters, numbers, `_`, or `-`, and each field must appear in the template as a `{field}` placeholder. Templates may not reference unknown fields and must resolve to an HTTP(S) URL. Complete values are URL-encoded during interpolation, so spaces and `/` characters remain inside one argument.

To run a subcommand, type its trigger and press **Tab**, or activate its suggestion with **Enter** or a click. Within the scope:

- **Enter** opens the selected predefined item.
- A live **Open generated destination** option appears after predefined matches when the current value completes the freeform URL. Select it, or press **Enter** when it is the only result, to open it without committing with Tab first.
- **Tab** commits the current value to the next freeform field.
- **Shift+Tab** returns to the previous field and selects its value.
- **Backspace** on an empty field returns to the previous field.
- **Escape** clears field text, or exits the scope when the field is empty.

Example with both kinds of destination:

```json
{
  "name": "GitHub Project",
  "trigger": "ghp",
  "items": [
    {
      "label": "newtab",
      "url": "https://github.com/pablaber/newtab"
    }
  ],
  "freeform": {
    "fields": [{ "name": "repo" }],
    "urlTemplate": "https://github.com/pablaber/{repo}"
  }
}
```

## Example

```json
{
  "version": 1,
  "background": {
    "imageUrl": "https://example.com/bg.jpg",
    "opacity": 0.4,
    "color": "#1a1a2e",
    "gradient": {
      "enabled": true,
      "color2": "#16213e",
      "direction": "down"
    }
  },
  "search": {
    "enabled": true,
    "placeholder": "Filter links..."
  },
  "modules": [
    {
      "type": "links",
      "title": "Favorites",
      "columns": 3,
      "links": [
        { "url": "https://github.com", "label": "GitHub" },
        { "url": "https://news.ycombinator.com", "label": "Hacker News" },
        { "url": "https://youtube.com", "label": "YouTube" }
      ]
    }
  ]
}
```
