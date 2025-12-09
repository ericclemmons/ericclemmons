#!/bin/bash
set -e

BRANCH="$1"
USERNAME="$2"

echo "☂️  Managing umbrella PR for branch: $BRANCH (user: $USERNAME)"

# Check if umbrella PR exists
UMBRELLA_PR=$(gh pr list \
  --head "$BRANCH" \
  --base main \
  --json number \
  --jq '.[0].number' 2>/dev/null || echo "")

# Query all child PRs
echo "🔎 Querying child PRs..."
# Use gh pr list without search to avoid GitHub search API lag
# Filter client-side for pr-split/$USERNAME branches
ALL_PRS=$(gh pr list \
  --state open \
  --json number,title,url,baseRefName,headRefName \
  --limit 100 2>/dev/null || echo "[]")

CHILD_PRS_JSON=$(echo "$ALL_PRS" | jq "[.[] | select(.headRefName | startswith(\"pr-split/$USERNAME\"))]")

CHILD_COUNT=$(echo "$CHILD_PRS_JSON" | jq 'length')
echo "📋 Found $CHILD_COUNT child PRs"

# Build description with hierarchy
if [ "$CHILD_COUNT" -eq 0 ]; then
  BODY="## Active PRs

_No active PRs. Push commits to \`$BRANCH\` to get started._"
else
  BODY="## Active PRs
"
  
  # Build a map of branch -> PR info
  declare -A branch_to_pr
  declare -A pr_base
  declare -A pr_processed
  
  while IFS= read -r pr; do
    NUMBER=$(echo "$pr" | jq -r '.number')
    TITLE=$(echo "$pr" | jq -r '.title')
    BASE=$(echo "$pr" | jq -r '.baseRefName')
    HEAD=$(echo "$pr" | jq -r '.headRefName')
    
    branch_to_pr["$HEAD"]="$NUMBER|$TITLE"
    pr_base["$NUMBER"]="$BASE"
    pr_processed["$NUMBER"]=0
  done < <(echo "$CHILD_PRS_JSON" | jq -c '.[]')
  
  # Function to recursively print PR and its dependencies
  print_pr_tree() {
    local pr_number=$1
    local indent=$2
    local counter=$3
    
    if [ "${pr_processed[$pr_number]}" = "1" ]; then
      return
    fi
    
    pr_processed["$pr_number"]=1
    local base="${pr_base[$pr_number]}"
    
    # Find PR info from branch mapping
    for head in "${!branch_to_pr[@]}"; do
      local info="${branch_to_pr[$head]}"
      local num="${info%%|*}"
      local title="${info#*|}"
      
      if [ "$num" = "$pr_number" ]; then
        if [ "$indent" = "" ]; then
          # Top-level PR (merges to main)
          BODY="$BODY
- #$pr_number"
        else
          # Nested PR (stacked dependency)
          BODY="$BODY
${indent}${counter}. #$pr_number"
        fi
        
        # Find child PRs that depend on this PR
        local child_counter=1
        for child_head in "${!branch_to_pr[@]}"; do
          local child_info="${branch_to_pr[$child_head]}"
          local child_num="${child_info%%|*}"
          local child_base="${pr_base[$child_num]}"
          
          if [ "$child_base" = "$head" ] && [ "${pr_processed[$child_num]}" = "0" ]; then
            print_pr_tree "$child_num" "${indent}  " "$child_counter"
            child_counter=$((child_counter + 1))
          fi
        done
        break
      fi
    done
  }
  
  # Print all top-level PRs (those targeting main)
  for pr_number in "${!pr_base[@]}"; do
    if [ "${pr_base[$pr_number]}" = "main" ]; then
      print_pr_tree "$pr_number" "" ""
    fi
  done
fi

# Create or update umbrella PR
if [ -z "$UMBRELLA_PR" ]; then
  echo "🆕 Creating umbrella PR..."
  
  # Ensure branch is pushed
  git push origin "$BRANCH" 2>/dev/null || true
  
  # Create PR
  PR_URL=$(gh pr create \
    --draft \
    --assignee "$USERNAME" \
    --head "$BRANCH" \
    --base main \
    --title "[WIP] ☂️ $USERNAME" \
    --body "$BODY" 2>&1)
  
  if [ $? -eq 0 ]; then
    # Extract PR number from URL
    UMBRELLA_PR=$(echo "$PR_URL" | grep -oE '[0-9]+$')
    echo "✅ Created umbrella PR #$UMBRELLA_PR"
  else
    echo "❌ Failed to create umbrella PR: $PR_URL"
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
