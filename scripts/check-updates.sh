#!/bin/bash

# Check for package updates across all workspaces in the monorepo
# Usage: ./scripts/check-updates.sh [-u] [-i]
#   -u  Update package.json files (run ncu -u)
#   -i  Install dependencies after update (yarn install)

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPDATE_FLAG=""
INSTALL_FLAG=false

# Parse arguments
while getopts "ui" opt; do
  case $opt in
    u) UPDATE_FLAG="-u" ;;
    i) INSTALL_FLAG=true ;;
    *) echo "Usage: $0 [-u] [-i]"; exit 1 ;;
  esac
done

echo "============================================"
echo "Checking package updates in monorepo"
echo "============================================"
echo ""

# Check root package.json
echo "📦 Root package.json"
echo "--------------------------------------------"
ncu --packageFile "$ROOT_DIR/package.json" $UPDATE_FLAG
echo ""

# Find all workspace package.json files (excluding node_modules)
find "$ROOT_DIR/apps" "$ROOT_DIR/libs" -maxdepth 2 -name "package.json" -type f | sort | while IFS= read -r pkg; do
  # Get relative path for display
  REL_PATH="${pkg#$ROOT_DIR/}"
  echo "📦 $REL_PATH"
  echo "--------------------------------------------"
  ncu --packageFile "$pkg" $UPDATE_FLAG
  echo ""
done

echo "============================================"
echo "✅ Check complete"
echo "============================================"

if [ "$UPDATE_FLAG" = "-u" ]; then
  echo ""
  echo "Package.json files have been updated."

  if [ "$INSTALL_FLAG" = true ]; then
    echo "Running yarn install..."
    cd "$ROOT_DIR" && yarn install
  else
    echo "Run 'yarn install' to install updated dependencies."
  fi
fi
