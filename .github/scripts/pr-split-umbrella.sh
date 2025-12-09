#!/bin/bash
set -e

BRANCH="$1"
USER="$2"

echo "☂️  Managing umbrella PR for branch: $BRANCH"

# Check if umbrella PR exists
UMBRELLA_PR=$(gh pr list \
  --head "$BRANCH" \
  --base main \
  --json number \
  --jq '.[0].number' 2>/dev/null || echo "")

# Query all child PRs
echo "🔎 Querying child PRs..."
CHILD_PRS_JSON=$(gh pr list \
  --search "head:pr-split/$USER/* is:open author:$USER" \
  --json number,title,url \
  --limit 100 2>/dev/null || echo "[]")

CHILD_COUNT=$(echo "$CHILD_PRS_JSON" | jq 'length')
echo "📋 Found $CHILD_COUNT child PRs"

# Build description
if [ "$CHILD_COUNT" -eq 0 ]; then
  BODY="## Active PRs

_No active PRs. Push commits to \`$BRANCH\` to get started._"
else
  BODY="## Active PRs
"
  
  # Add each child PR as a list item
  while IFS= read -r pr; do
    NUMBER=$(echo "$pr" | jq -r '.number')
    TITLE=$(echo "$pr" | jq -r '.title')
    BODY="$BODY
- #$NUMBER $TITLE"
  done < <(echo "$CHILD_PRS_JSON" | jq -c '.[]')
fi

# Create or update umbrella PR
if [ -z "$UMBRELLA_PR" ]; then
  echo "🆕 Creating umbrella PR..."
  
  # Ensure branch is pushed
  git push origin "$BRANCH" 2>/dev/null || true
  
  # Create PR
  UMBRELLA_PR=$(gh pr create \
    --draft \
    --head "$BRANCH" \
    --base main \
    --title "[WIP] ☂️ $USER" \
    --body "$BODY" \
    --json number \
    --jq '.number' 2>&1)
  
  if [[ "$UMBRELLA_PR" =~ ^[0-9]+$ ]]; then
    echo "✅ Created umbrella PR #$UMBRELLA_PR"
  else
    echo "❌ Failed to create umbrella PR: $UMBRELLA_PR"
    exit 1
  fi
else
  echo "🔄 Updating umbrella PR #$UMBRELLA_PR..."
  
  # Update PR description
  gh pr edit "$UMBRELLA_PR" --body "$BODY" 2>/dev/null || true
  
  echo "✅ Updated umbrella PR #$UMBRELLA_PR"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "☂️  Umbrella PR #$UMBRELLA_PR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
