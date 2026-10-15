# GunsNPrices MCP server

[![npm](https://img.shields.io/npm/v/gunsnprices-mcp)](https://www.npmjs.com/package/gunsnprices-mcp)
[![Tests](https://github.com/gunsnprices/gunsnprices-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/gunsnprices/gunsnprices-mcp/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT%20%2B%20CC%20BY%204.0%20data-blue)](#license)
[![AllMCPs Verified](https://allmcps.com/api/badge/gunsnprices)](https://allmcps.com/mcp/gunsnprices?verify=8d561c6f-87a3-470b-9a00-a0d43133cfb0)

An [MCP](https://modelcontextprotocol.io) server that helps AI assistants with gun and ammo shopping questions. It reads
firearm and ammunition product titles (brand, model, caliber, magazine capacity, barrel length, rounds per box),
computes cost per round, and points to the [GunsNPrices](https://gunsnprices.com) pages that compare current prices
across 40+ US gun and ammo stores.

It runs locally and needs no API key: everything comes from the open-source
[gunsnprices](https://www.npmjs.com/package/gunsnprices) parser and a snapshot of GunsNPrices page links. It does not
fetch live prices; for "where is it cheapest" questions the assistant gets the GunsNPrices pages to send you to.

## Tools

| Tool | What it does |
|---|---|
| `parse_product_title` | Title → firearm or ammo, brand, model, calibers, magazine capacity, barrel length, rounds per box, cost per round, price comparison pages |
| `identify_firearm_model` | Title or description → brand, model family, exact model (50 brands); decodes Glock part numbers |
| `lookup_caliber` | `9mm Luger`, `300 BLK`, `12ga`, `6.5 CM` → standard caliber name, type and its ammo price page |
| `cost_per_round` | Price + round count (or a title to read it from) → cost per round |
| `find_price_comparison_pages` | Model, brand or caliber → GunsNPrices pages comparing current prices, most specific first |
| `list_supported` | The 50 brands with model recognition, or the 293 known calibers |

All tools are read-only and work offline.

## Install

The server is the npm package `gunsnprices-mcp` and runs with Node.js 18 or newer.

**Claude Code**

```bash
claude mcp add gunsnprices -- npx -y gunsnprices-mcp
```

**Claude Desktop**: add to `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "gunsnprices": {
      "command": "npx",
      "args": ["-y", "gunsnprices-mcp"]
    }
  }
}
```

**Cursor**: the same block in `~/.cursor/mcp.json`.

**VS Code**: `.vscode/mcp.json`:

```json
{
  "servers": {
    "gunsnprices": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "gunsnprices-mcp"]
    }
  }
}
```

**Claude Desktop, one click**: download `gunsnprices-mcp-<version>.mcpb` from the
[latest release](https://github.com/gunsnprices/gunsnprices-mcp/releases/latest) and open it (MCP Bundle, Node.js included
with Claude Desktop).

**Docker**:

```bash
docker build -t gunsnprices-mcp https://github.com/gunsnprices/gunsnprices-mcp.git
```

```json
{
  "mcpServers": {
    "gunsnprices": { "command": "docker", "args": ["run", "-i", "--rm", "gunsnprices-mcp"] }
  }
}
```

## Things to ask

- "What exactly is a `G19 GEN5 9MM 4.02 15RD FS MOS`, and where can I compare prices?"
- "Which of these 9mm listings is cheapest per round: $18.99 for 50, $289 for 1,000, $13.49 for 20?"
- "Is `300 BLK` the same as `.300 AAC Blackout`? Where do I compare ammo prices for it?"
- "Clean up this spreadsheet of gun titles into brand, model, caliber and barrel length."

Example result of `find_price_comparison_pages` for "Glock 19":

```json
{
  "query": "Glock 19",
  "model": { "brand": "Glock", "family": "Glock 19", "model": "Glock 19", "generation": "", "configs": [], "features": [], "source": "title" },
  "gunsnprices_pages": [
    { "kind": "model", "name": "Glock 19", "url": "https://gunsnprices.com/guns/glock-19" },
    { "kind": "brand", "name": "All Glock models", "url": "https://gunsnprices.com/glock-models" },
    { "kind": "search", "name": "GunsNPrices search: Glock 19", "url": "https://gunsnprices.com/en-search/?search=Glock%2019" }
  ]
}
```

## Accuracy

The parsing is the [gunsnprices](https://github.com/gunsnprices/gunsnprices-js) library. On 63,755 listings from 40+
stores it recognizes the same model as gunsnprices.com in 99.97% of cases where the site knows the model, and gets the
caliber right in 97.8% of firearm and 94.9% of ammo titles where it finds one. Details are in the library's README.

## Related

- Parser library: [npm](https://www.npmjs.com/package/gunsnprices), [PyPI](https://pypi.org/project/gunsnprices/)
- Open datasets of calibers and models: [Hugging Face](https://huggingface.co/gunsnprices),
  [GitHub](https://github.com/gunsnprices/firearm-datasets), [Kaggle](https://www.kaggle.com/gunsnprices)

## License

The code is under the [MIT License](LICENSE). The page links in `src/data/` come from the GunsNPrices
[firearm-models](https://huggingface.co/datasets/gunsnprices/firearm-models) dataset and are under
[CC BY 4.0](LICENSE-DATA): credit **GunsNPrices (gunsnprices.com)** with a link.

Questions and corrections: open an issue or write to app@gunsnprices.com.
