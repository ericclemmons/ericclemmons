#!/bin/bash
set -e

NEEDS_DIFFS=$(jq -r '.requires_diffs' pr-plan.json)

if [ "$NEEDS_DIFFS" = "true" ]; then
  echo "❌ Cannot determine PR splits without seeing code diffs."
  echo ""
  echo "Claude's reasoning:"
  jq -r '.reasoning' pr-plan.json
  echo ""
  echo "Files needing review:"
  jq -r '.files_needing_review[]' pr-plan.json
  echo ""
  echo "💡 Tip: Write more descriptive commit messages that explain WHAT changed and WHY."
  echo "This allows the splitter to work without analyzing code diffs, keeping costs low."
  echo ""
  echo "Examples of good commit messages:"
  echo "  ✅ 'Add lodash dependency for array utilities'"
  echo "  ✅ 'Create auth service with JWT token handling'"
  echo "  ✅ 'Add user profile page that consumes auth service'"
  echo ""
  echo "Examples of unclear commit messages:"
  echo "  ❌ 'Update config'"
  echo "  ❌ 'Add stuff'"
  echo "  ❌ 'WIP'"
  exit 1
fi
