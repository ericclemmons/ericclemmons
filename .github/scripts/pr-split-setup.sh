#!/bin/bash
set -e

USER="$1"

echo "🔧 Setting up git environment for user: $USER"

# Configure git as the branch owner (not github-actions bot)
# This allows PRs to be authored by the actual user
git config --global user.name "$USER"
git config --global user.email "$USER@users.noreply.github.com"

# Ensure main branch exists locally
git fetch origin main:main 2>/dev/null || true

echo "✅ Git setup complete"
