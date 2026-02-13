# Configuration

Configuration is stored in the browser's localStorage. On first load (when no localStorage data exists), the app fetches `config.json` to seed the initial config. All subsequent changes are saved to localStorage and the seed file is not read again. The settings page has two tabs:

- **Background** — configure background image, overlay color, opacity, and gradient
- **Links** — add, remove, rename, and reorder sections and links

You can also import/export the full config as a base64 string from the settings header.

## Top-level

| Field | Type | Description |
|---|---|---|
| `version` | `number` | Config schema version (currently `1`) |
| `background` | `object` | Background settings (optional) |
| `search` | `object` | Search bar settings (optional) |
| `modules` | `array` | Array of module configurations |

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
