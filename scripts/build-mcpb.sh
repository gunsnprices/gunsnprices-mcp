#!/bin/sh
# Builds gunsnprices-mcp-<version>.mcpb (MCP Bundle for one-click install in Claude Desktop and other MCPB clients).
set -e
cd "$(dirname "$0")/.."
V=$(node -p "require('./package.json').version")
STAGE=$(mktemp -d)
cp -R manifest.json package.json package-lock.json README.md LICENSE LICENSE-DATA src "$STAGE/"
mkdir -p "$STAGE/assets" && cp assets/logo-512.png "$STAGE/assets/"
(cd "$STAGE" && npm ci --omit=dev --silent)
npx -y @anthropic-ai/mcpb@2.1.2 validate "$STAGE/manifest.json"
npx -y @anthropic-ai/mcpb@2.1.2 pack "$STAGE" "gunsnprices-mcp-$V.mcpb"
rm -rf "$STAGE"
