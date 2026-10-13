# Changelog

## 0.1.1 (2026-10-13)

- Docker image (Dockerfile) and an MCP Bundle (`.mcpb`) for one-click install in Claude Desktop, attached to each GitHub release.
- Cursor plugin manifest (`.cursor-plugin/plugin.json`, `mcp.json`), LobeHub manifest, `CITATION.cff`.
- README: install with Claude Desktop (.mcpb) and Docker. No changes to the tools.

## 0.1.0 (2026-10-12)

First release: six read-only tools (`parse_product_title`, `identify_firearm_model`, `lookup_caliber`, `cost_per_round`,
`find_price_comparison_pages`, `list_supported`) on top of the gunsnprices parser 0.1.1. Runs locally over stdio, no API key.
