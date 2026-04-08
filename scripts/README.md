# Flowchart Image Generator

This script extracts all Mermaid diagrams from `docs/flowcharts.md` and converts them to PNG or SVG images.

## Prerequisites

- **Node.js** (v14 or higher) - Download from [nodejs.org](https://nodejs.org/)

## Usage

### Quick Start

```bash
cd scripts
./generate-flowcharts.sh
```

Or using Node.js directly:

```bash
node generate-flowcharts.cjs
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--format=png\|svg` | Output image format | `png` |
| `--output=dir` | Output directory | `../flowchart-images` |
| `--width=number` | Image width in pixels | `1600` |
| `--height=number` | Image height in pixels | `1200` |

### Examples

Generate PNG images (default):
```bash
./generate-flowcharts.sh
```

Generate SVG images:
```bash
./generate-flowcharts.sh --format=svg
```

Custom output directory:
```bash
./generate-flowcharts.sh --output=./my-flowcharts
```

Custom size:
```bash
./generate-flowcharts.sh --width=2000 --height=1500
```

All options combined:
```bash
./generate-flowcharts.sh --format=svg --output=./images --width=1920 --height=1080
```

## Output

The script generates:

1. **Individual image files** - One image per flowchart in the specified format
2. **`index.html`** - A beautiful HTML preview page with all flowcharts

### Viewing Results

Open the generated HTML file in your browser:

```bash
# macOS
open ../flowchart-images/index.html

# Linux
xdg-open ../flowchart-images/index.html

# Windows
start ../flowchart-images/index.html
```

## Troubleshooting

### "Node.js is not installed"

Install Node.js from [https://nodejs.org/](https://nodejs.org/)

### "Cannot find module"

The script uses `npx` to run mermaid-cli without global installation. Make sure you have an internet connection for the first run.

### Permission Denied (macOS/Linux)

Make the scripts executable:

```bash
chmod +x generate-flowcharts.sh generate-flowcharts.js
```

## Features

- ✅ Extracts all Mermaid diagrams from markdown
- ✅ Generates high-quality PNG/SVG images
- ✅ Creates beautiful HTML preview with gallery view
- ✅ Click images to view full size
- ✅ Responsive grid layout
- ✅ Progress indicator during generation
- ✅ Automatic cleanup of temp files
