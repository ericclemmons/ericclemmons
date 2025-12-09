#!/bin/bash
set -e

echo "🔧 Setting up git environment..."

# Configure git user for commits
git config --global user.email "github-actions[bot]@users.noreply.github.com"
git config --global user.name "github-actions[bot]"

# Ensure main branch exists locally
git fetch origin main:main 2>/dev/null || true

echo "✅ Git setup complete"
