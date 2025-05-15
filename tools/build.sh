#!/bin/bash

# Ensure the script fails on any error
set -e

# Create dist directory if it doesn't exist
mkdir -p dist

# Run esbuild to bundle the application
./node_modules/.bin/esbuild src/app.js \
    --bundle \
    --minify \
    --outfile=dist/app.js \
    --format=esm \
    --target=es2020

# Copy index.html to dist
cp src/index.html dist/

# Copy CSS if it exists
if [ -f "src/app.css" ]; then
    cp src/app.css dist/
fi

echo "Build completed successfully!" 