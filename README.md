# newtab

A minimal, customizable new-tab homepage built with React and TypeScript. It reads all configuration from a static `config.json` file and renders a clean dark-themed homepage with an optional background image, search/filter bar, and organized link modules.

![Screenshot placeholder](screenshot.png)

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser. Edit `public/config.json` to customize.

## Configuration

All configuration lives in `public/config.json` (or volume-mounted at runtime in Docker).

### Top-level

| Field | Type | Description |
|---|---|---|
| `version` | `number` | Config schema version (currently `1`) |
| `background` | `object` | Background settings (optional) |
| `search` | `object` | Search bar settings (optional) |
| `modules` | `array` | Array of module configurations |

### `background`

All fields are optional.

| Field | Type | Default | Description |
|---|---|---|---|
| `imageUrl` | `string` | — | URL to a background image. If empty/missing, solid color is used. |
| `color` | `string` | `"#1a1a2e"` | Fallback background color and overlay color |
| `opacity` | `number` | `0.4` | Opacity of the color overlay on top of the image (0–1) |

### `search`

Optional. If missing or `enabled: false`, no search bar is shown.

| Field | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `false` | Whether to show the search/filter bar |
| `placeholder` | `string` | `"Filter links..."` | Placeholder text for the input |

The search bar filters links across all modules by label (case-insensitive substring match). Pressing **Escape** clears the filter. Pressing **Enter** when exactly one link matches navigates to that link.

### `modules[]`

Each module represents a section of links on the page.

| Field | Type | Default | Description |
|---|---|---|---|
| `type` | `string` | — | Module type (currently only `"links"`) |
| `title` | `string` | — | Section heading |
| `columns` | `number` | `3` | Number of columns in the link grid |
| `links` | `array` | — | Array of link objects |

### `modules[].links[]`

| Field | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | — | Link URL |
| `label` | `string` | — | Display text |
| `icon` | `string` | auto-fetched favicon | URL to an icon image. If omitted, a favicon is fetched from Google's favicon service. |

### Example

```json
{
  "version": 1,
  "background": {
    "imageUrl": "https://example.com/bg.jpg",
    "opacity": 0.4,
    "color": "#1a1a2e"
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

## Docker

Build and run with Docker:

```bash
docker build -f docker/Dockerfile -t newtab .

docker run -d \
  -p 8080:80 \
  -v /path/to/your/config.json:/usr/share/nginx/html/config.json:ro \
  newtab
```

Then open http://localhost:8080.

The `config.json` is volume-mounted so you can update it without rebuilding the image.

## Browser New Tab

To use this as your browser's new tab page, install the [Custom New Tab URL](https://chromewebstore.google.com/detail/custom-new-tab-url/mmjbdbjnoablegbkcklggeknkfcjkjia) extension (Chrome/Edge) and point it to where you're hosting the app.
