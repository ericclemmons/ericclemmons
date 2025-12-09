#!/bin/bash
set -e

USER="$1"

echo "🔧 Setting up git environment for user: $USER"

# Configure git user for commits (use the actual GitHub user, not the bot)
git config --global user.email "$USER@users.noreply.github.com"
git config --global user.name "$USER"

# Ensure main branch exists locally
git fetch origin main:main 2>/dev/null || true

echo "✅ Git setup complete"
