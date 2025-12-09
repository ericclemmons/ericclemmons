#!/bin/bash
set -e

echo "🔧 Setting up git environment..."

# Ensure main branch exists locally
git fetch origin main:main 2>/dev/null || true

echo "✅ Git setup complete"
