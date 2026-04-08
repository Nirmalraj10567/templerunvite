#!/bin/bash

# Flowchart Image Generator Script
# 
# Usage: ./generate-flowcharts.sh [options]
# Options:
#   --format=png|svg   Output format (default: png)
#   --output=dir       Output directory (default: ./flowchart-images)
#   --width=number     Image width (default: 1600)
#   --height=number    Image height (default: 1200)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏛️  Temple Management System - Flowchart Generator${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}\n"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run the Node.js script
node "${SCRIPT_DIR}/generate-flowcharts.cjs" "$@"
