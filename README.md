<p align="center">
  <img src="public/newtab-transparent.png" alt="newtab logo" width="180" />
</p>

# newtab

A minimal, customizable new-tab homepage built with React and TypeScript. Configuration is stored in the browser's localStorage and is fully editable from a built-in settings page. On first load, a default `config.json` is used to seed the initial config.

<p align="center">
  <img src="public/newtab-example.png" alt="newtab screenshot" width="700" style="border-radius: 12px;" />
</p>

## Installation

```bash
docker run -d \
  -p 3541:3541 \
  tastinggrounds/newtab
```

Then open http://localhost:3541. All configuration is managed from the built-in settings page.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3542 in your browser. Use the settings page to customize, or edit `public/config.json` to change the default seed config.

### Testing

```bash
npm run test          # run tests once
npm run test:watch    # run tests in watch mode
```

## Configuration

All configuration is managed from the built-in settings page, which has two tabs:

- **Background** — configure background image, overlay color, opacity, and gradient
- **Links** — add, remove, rename, and reorder sections and links

Configuration is stored in the browser's localStorage. On first load, a default `config.json` seeds the initial config. You can also import/export the full config as a base64 string from the settings header.

For the full config file schema and examples, see [docs/config-file.md](docs/config-file.md).

## Docker

Build and run with Docker:

```bash
docker build -f docker/Dockerfile -t newtab .

docker run -d \
  -p 3541:3541 \
  newtab
```

Then open http://localhost:3541.

### Loading config via volume mount

You can optionally provide an initial `config.json` by volume-mounting it into the container. This is useful for seeding the config on first load or sharing the same config across multiple instances:

```bash
docker run -d \
  -p 3541:3541 \
  -v /path/to/your/config.json:/usr/share/nginx/html/config.json:ro \
  newtab
```

The volume-mounted config is used as the initial config on first load. Once the config is persisted to localStorage, the local copy takes precedence. You can also use the import/export feature in settings to transfer configs between browsers.

## Browser New Tab

To use this as your browser's new tab page, install the [Custom New Tab URL](https://chromewebstore.google.com/detail/custom-new-tab-url/mmjbdbjnoablegbkcklggeknkfcjkjia) extension (Chrome/Edge) and point it to where you're hosting the app.
