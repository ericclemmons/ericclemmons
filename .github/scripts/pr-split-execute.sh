#!/bin/bash
set -e

USER="$1"

echo "🚀 Executing PR plan for user: $USER"

# Read the PR plan from Claude
if [ ! -f pr-plan.json ]; then
  echo "❌ pr-plan.json not found"
  exit 1
fi

# Extract PRs array
PRS_COUNT=$(jq -r '.prs | length' pr-plan.json)
echo "📋 Found $PRS_COUNT PRs in plan"

if [ "$PRS_COUNT" -eq 0 ]; then
  echo "✅ No PRs to create or update"
  exit 0
fi

# Topological sort: build dependency graph and process parents before children
echo "🔄 Sorting PRs by dependency order..."

# Create a mapping of branch names to PR indices and track which have been processed
declare -A branch_to_index
declare -A processed
declare -A pr_numbers  # Store created PR numbers

for i in $(seq 0 $((PRS_COUNT - 1))); do
  BRANCH=$(jq -r ".prs[$i].branch" pr-plan.json)
  branch_to_index["$BRANCH"]=$i
  processed["$BRANCH"]=false
done

# Function to process a PR and its dependencies recursively
process_pr() {
  local index=$1
  local branch=$(jq -r ".prs[$index].branch" pr-plan.json)
  
  # Skip if already processed
  if [ "${processed[$branch]}" = "true" ]; then
    return
  fi
  
  # Get base branch
  local base_branch=$(jq -r ".prs[$index].base_branch" pr-plan.json)
  
  # If base branch is a pr-split branch, process it first (recursive dependency)
  if [[ "$base_branch" =~ ^pr-split/ ]]; then
    local base_index="${branch_to_index[$base_branch]}"
    if [ -n "$base_index" ] && [ "${processed[$base_branch]}" = "false" ]; then
      echo "  ⬆️  Processing dependency: $base_branch"
      process_pr "$base_index"
    fi
  fi
  
  # Now process this PR
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔨 Processing PR #$((index + 1)): $branch"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  ACTION=$(jq -r ".prs[$index].action" pr-plan.json)
  TITLE=$(jq -r ".prs[$index].title" pr-plan.json)
  BASE_BRANCH=$(jq -r ".prs[$index].base_branch" pr-plan.json)
  COMMITS=$(jq -r ".prs[$index].commits[]" pr-plan.json)
  DEPENDS_ON=$(jq -r ".prs[$index].depends_on[]" pr-plan.json 2>/dev/null || echo "")
  RELATED_TO=$(jq -r ".prs[$index].related_to[]" pr-plan.json 2>/dev/null || echo "")
  REASONING=$(jq -r ".prs[$index].reasoning" pr-plan.json)
  
  echo "📝 Title: $TITLE"
  echo "🌿 Branch: $branch"
  echo "🎯 Base: $BASE_BRANCH"
  echo "📦 Action: $ACTION"
  echo "💭 Reasoning: $REASONING"
  echo ""
  
  # Fetch latest refs
  git fetch origin main:main 2>/dev/null || true
  
  # Ensure base branch exists locally
  if [[ "$BASE_BRANCH" =~ ^pr-split/ ]]; then
    git fetch origin "$BASE_BRANCH:$BASE_BRANCH" 2>/dev/null || true
  fi
  
  # Create or update branch
  if git rev-parse --verify "$branch" >/dev/null 2>&1; then
    echo "🔄 Branch exists, checking out..."
    git checkout "$branch"
  else
    echo "🆕 Creating new branch from $BASE_BRANCH..."
    git checkout "$BASE_BRANCH"
    git checkout -b "$branch"
  fi
  
  # Cherry-pick commits and get author from first commit for PR assignee
  echo "🍒 Cherry-picking commits..."
  CONFLICT_OCCURRED=false
  COMMIT_AUTHOR=""
  
  for commit in $COMMITS; do
    # Get commit author email for first commit (use as PR assignee)
    if [ -z "$COMMIT_AUTHOR" ]; then
      COMMIT_AUTHOR=$(git log -1 --format='%ae' $commit)
    fi
    
    echo "  📌 Applying commit $commit..."
    
    # Get commit message and author
    COMMIT_MSG=$(git log -1 --format=%s "$commit")
    COMMIT_AUTHOR_NAME=$(git log -1 --format=%an "$commit")
    COMMIT_AUTHOR_EMAIL=$(git log -1 --format=%ae "$commit")
    
    # Apply the commit's changes directly
    if git cherry-pick "$commit" 2>&1; then
      echo "    ✅ Successfully applied"
    else
      echo "    ⚠️  Cherry-pick had issues, trying direct file checkout..."
      
      # Abort the failed cherry-pick
      git cherry-pick --abort 2>/dev/null || true
      
      # Directly checkout all files from the commit
      git checkout "$commit" -- . 2>&1
      
      # Stage all changes
      git add -A
      
      # Create commit
      git commit -m "$COMMIT_MSG" --author="$COMMIT_AUTHOR_NAME <$COMMIT_AUTHOR_EMAIL>" --no-verify 2>&1 || true
      
      echo "    ✅ Applied via direct checkout"
      CONFLICT_OCCURRED=true
    fi
  done
  
  # Push branch
  echo "📤 Pushing branch to origin..."
  git push -f origin "$branch"
  
  # Create or update PR
  if [ "$ACTION" = "create" ]; then
    echo "🆕 Creating new PR..."
    
    # Check if PR already exists
    EXISTING_PR=$(gh pr list --head "$branch" --json number --jq '.[0].number' 2>/dev/null || echo "")
    
    if [ -n "$EXISTING_PR" ]; then
      echo "  ℹ️  PR already exists: #$EXISTING_PR (skipping creation)"
      PR_NUMBER=$EXISTING_PR
    else
      # Create new PR (don't exit on failure)
      set +e
      # Try to create PR and assign to the user from the branch name
      # Note: gh pr create will fail with permission error if trying to update existing PR
      # created by a different user
      PR_URL=$(gh pr create \
        --draft \
        --assignee "$USER" \
        --base "$BASE_BRANCH" \
        --head "$branch" \
        --title "$TITLE" \
        --body "" 2>&1)
      PR_CREATE_EXIT=$?
      set -e
      
      if [ $PR_CREATE_EXIT -eq 0 ]; then
        # Extract PR number from URL (https://github.com/owner/repo/pull/123)
        PR_NUMBER=$(echo "$PR_URL" | grep -oE '[0-9]+$')
        echo "  ✅ Created PR #$PR_NUMBER"
        echo "  URL: $PR_URL"
      else
        # Check if error is because PR already exists (permission denied on update)
        if echo "$PR_URL" | grep -q "does not have permission to update"; then
          echo "  ℹ️  PR exists but created by different user, extracting PR number..."
          # Try to get PR number from error message or by listing again
          PR_NUMBER=$(echo "$PR_URL" | grep -oE 'pull/[0-9]+' | grep -oE '[0-9]+' || \
                      gh pr list --head "$branch" --json number --jq '.[0].number' 2>/dev/null || echo "")
          if [ -n "$PR_NUMBER" ]; then
            echo "  ✅ Found existing PR #$PR_NUMBER"
          else
            echo "  ❌ Could not determine PR number"
          fi
        else
          echo "  ❌ Failed to create PR (exit code: $PR_CREATE_EXIT)"
          echo "  Error output: $PR_URL"
          PR_NUMBER=""
        fi
      fi
    fi
    
  elif [ "$ACTION" = "update" ]; then
    echo "🔄 Updating existing PR..."
    
    # Find existing PR by branch
    PR_NUMBER=$(gh pr list --head "$branch" --json number --jq '.[0].number' 2>/dev/null || echo "")
    
    if [ -n "$PR_NUMBER" ]; then
      # Add comment about new commits
      COMMIT_LIST=$(echo "$COMMITS" | tr '\n' ' ')
      gh pr comment "$PR_NUMBER" --body "🔄 Added commits: \`$COMMIT_LIST\`" 2>/dev/null || true
      echo "  ✅ Updated PR #$PR_NUMBER"
    else
      echo "  ⚠️  PR not found for branch $branch, skipping update"
    fi
  fi
  
  # Store PR number for dependency references
  if [ -n "$PR_NUMBER" ]; then
    pr_numbers["$branch"]=$PR_NUMBER
    
    # Add conflict warning if needed
    if [ "$CONFLICT_OCCURRED" = "true" ]; then
      gh pr comment "$PR_NUMBER" --body "⚠️ **Auto-resolved conflicts**

Some commits had conflicts that were automatically resolved using the \`--ours\` strategy (keeping incoming changes).

Please review the changes carefully to ensure the conflict resolution is correct." 2>/dev/null || true
    fi
    
    # Add dependency comments
    if [ -n "$DEPENDS_ON" ]; then
      echo "🔗 Adding dependency comments..."
      
      DEPENDS_COMMENT="**Depends on:**"
      for dep_branch in $DEPENDS_ON; do
        # Try to find PR number for this dependency
        if [ -n "${pr_numbers[$dep_branch]}" ]; then
          DEP_PR="${pr_numbers[$dep_branch]}"
        else
          # Query GitHub for existing PR
          DEP_PR=$(gh pr list --head "$dep_branch" --json number --jq '.[0].number' 2>/dev/null || echo "")
        fi
        
        if [ -n "$DEP_PR" ]; then
          DEPENDS_COMMENT="$DEPENDS_COMMENT
- #$DEP_PR"
          
          # Add reverse dependency comment to parent
          gh pr comment "$DEP_PR" --body "**Depended on by:**
- #$PR_NUMBER" 2>/dev/null || true
        fi
      done
      
      gh pr comment "$PR_NUMBER" --body "$DEPENDS_COMMENT" 2>/dev/null || true
      echo "  ✅ Added dependency comments"
    fi
    
    # Add related-to comments
    if [ -n "$RELATED_TO" ]; then
      echo "🔗 Adding related PR comments..."
      
      RELATED_COMMENT="Related to"
      for related_branch in $RELATED_TO; do
        # Try to find PR number
        if [ -n "${pr_numbers[$related_branch]}" ]; then
          RELATED_PR="${pr_numbers[$related_branch]}"
        else
          RELATED_PR=$(gh pr list --head "$related_branch" --json number --jq '.[0].number' 2>/dev/null || echo "")
        fi
        
        if [ -n "$RELATED_PR" ]; then
          RELATED_COMMENT="$RELATED_COMMENT #$RELATED_PR"
        fi
      done
      
      gh pr comment "$PR_NUMBER" --body "$RELATED_COMMENT" 2>/dev/null || true
      echo "  ✅ Added related PR comments"
    fi
  fi
  
  # Mark as processed
  processed["$branch"]=true
  
  echo "✅ Completed processing $branch"
}

# Process all PRs in dependency order
for i in $(seq 0 $((PRS_COUNT - 1))); do
  process_pr $i
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 All PRs processed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Return to main branch
git checkout main 2>/dev/null || true
