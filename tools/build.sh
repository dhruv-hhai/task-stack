#!/bin/bash

# Ensure the script fails on any error
set -e

# Create docs directory if it doesn't exist
mkdir -p docs

# Run esbuild to bundle the application
./node_modules/.bin/esbuild src/app.js \
    --bundle \
    --minify \
    --outfile=docs/app.js \
    --format=esm \
    --target=es2020

# Copy index.html to docs
cp src/index.html docs/

# Copy CSS if it exists
if [ -f "src/app.css" ]; then
    cp src/app.css docs/
fi

echo "Build completed successfully!" 