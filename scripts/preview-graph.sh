#!/bin/sh
# Validates graphs/*.wledgraph and writes previews to .work/graph-previews/<name>/.
# Usage: scripts/preview-graph.sh [name]   (name is the file name without .wledgraph; omit it for every graph)
cd "$(dirname "$0")/.." || exit 1
VITE_GRAPH_PREVIEW=1 VITE_GRAPH_ONLY="$1" exec npx vitest run --project browser demo-graphs.browser.test.ts
