#!/bin/bash
set -e

BRANCH="$1"
USER="$2"
MODE="${3:-incremental}" # incremental (default) or full

echo "🔍 Analyzing commits in branch: $BRANCH"
echo "👤 User: $USER"
echo "🔄 Mode: $MODE"

# Fetch the branch if it exists remotely
git fetch origin $BRANCH:$BRANCH 2>/dev/null || true

# Get all commits in the branch
ALL_COMMITS=$(git log main..$BRANCH --format="%H" 2>/dev/null || echo "")

if [ -z "$ALL_COMMITS" ]; then
  echo "❌ No commits found in $BRANCH ahead of main"
  echo '{"new_commits": [], "existing_prs": []}' > commits-context.json
  exit 0
fi

echo "📊 Found $(echo "$ALL_COMMITS" | wc -l | tr -d ' ') total commits"

# Query existing PRs from this user in pr-split namespace
echo "🔎 Querying existing PRs from pr-split/$USER..."
EXISTING_PRS_JSON=$(gh pr list \
  --search "head:pr-split/$USER is:open" \
  --json number,headRefName,title,baseRefName,state,url \
  --limit 100 2>/dev/null || echo "[]")

echo "📋 Found $(echo "$EXISTING_PRS_JSON" | jq 'length') existing PRs"

# In full mode, close existing PRs and analyze all commits
if [ "$MODE" = "full" ]; then
  echo "🔄 Full mode: closing existing PRs..."
  for pr_number in $(echo "$EXISTING_PRS_JSON" | jq -r '.[].number'); do
    echo "  Closing PR #$pr_number..."
    gh pr close $pr_number --comment "Closing for full re-evaluation" 2>/dev/null || true
  done
  
  # Analyze all commits
  NEW_COMMITS=()
  for commit in $ALL_COMMITS; do
    NEW_COMMITS+=("$commit")
  done
  echo "🆕 Full mode: analyzing all ${#NEW_COMMITS[@]} commits"
else
  # Incremental mode: only analyze commits not in existing PRs
  echo "➕ Incremental mode: finding new commits..."
  
  # Build array of commits already in PRs
  KNOWN_COMMITS=()
  for pr_number in $(echo "$EXISTING_PRS_JSON" | jq -r '.[].number'); do
    echo "  Checking PR #$pr_number..."
    PR_COMMITS=$(gh pr view $pr_number --json commits --jq '.commits[].oid' 2>/dev/null || echo "")
    
    if [ -n "$PR_COMMITS" ]; then
      while IFS= read -r commit; do
        KNOWN_COMMITS+=("$commit")
      done <<< "$PR_COMMITS"
    fi
  done

  # Find NEW commits (not in any existing PR)
  NEW_COMMITS=()
  for commit in $ALL_COMMITS; do
    if [[ ! " ${KNOWN_COMMITS[@]} " =~ " ${commit} " ]]; then
      NEW_COMMITS+=("$commit")
    fi
  done

  echo "🆕 Found ${#NEW_COMMITS[@]} new commits to analyze"
fi

# Build JSON context for Claude
echo "📝 Building commit context..."

# Start JSON structure
cat > commits-context.json <<EOF
{
  "base_branch": "main",
  "user_branch": "$BRANCH",
  "user": "$USER",
  "new_commits": [
EOF

# Add each new commit
first=true
for commit in "${NEW_COMMITS[@]}"; do
  if [ "$first" = false ]; then
    echo "," >> commits-context.json
  fi
  first=false
  
  # Get commit details
  COMMIT_SUBJECT=$(git log -1 --format="%s" $commit)
  COMMIT_BODY=$(git log -1 --format="%b" $commit)
  
  # Get files changed
  FILES_CHANGED=$(git diff-tree --no-commit-id --name-only -r $commit)
  
  # Get file stats (additions/deletions)
  FILE_STATS=$(git diff-tree --no-commit-id --numstat $commit)
  
  # Build files array with stats
  FILES_JSON="["
  files_first=true
  while IFS=$'\t' read -r added deleted filepath; do
    # Skip empty lines
    if [ -z "$filepath" ]; then
      continue
    fi
    
    # Skip large generated files and lockfiles
    if [[ "$filepath" =~ (package-lock\.json|pnpm-lock\.yaml|yarn\.lock|Cargo\.lock|go\.sum|\.min\.js|\.bundle\.js|dist/|build/) ]]; then
      continue
    fi
    
    if [ "$files_first" = false ]; then
      FILES_JSON="$FILES_JSON,"
    fi
    files_first=false
    
    FILES_JSON="$FILES_JSON{\"path\":$(echo "$filepath" | jq -Rs .),\"added\":$added,\"deleted\":$deleted}"
  done <<< "$FILE_STATS"
  FILES_JSON="$FILES_JSON]"
  
  # Build commit JSON
  cat >> commits-context.json <<COMMIT_EOF
    {
      "hash": "$commit",
      "subject": $(echo "$COMMIT_SUBJECT" | jq -Rs .),
      "body": $(echo "$COMMIT_BODY" | jq -Rs .),
      "files": $FILES_JSON
    }
COMMIT_EOF
done

# Close new_commits array
echo "" >> commits-context.json
echo "  ]," >> commits-context.json

# Add existing PRs context
echo '  "existing_prs": [' >> commits-context.json

first_pr=true
for pr_number in $(echo "$EXISTING_PRS_JSON" | jq -r '.[].number'); do
  if [ "$first_pr" = false ]; then
    echo "," >> commits-context.json
  fi
  first_pr=false
  
  PR_TITLE=$(echo "$EXISTING_PRS_JSON" | jq -r ".[] | select(.number == $pr_number) | .title")
  PR_BRANCH=$(echo "$EXISTING_PRS_JSON" | jq -r ".[] | select(.number == $pr_number) | .headRefName")
  PR_BASE=$(echo "$EXISTING_PRS_JSON" | jq -r ".[] | select(.number == $pr_number) | .baseRefName")
  
  # Get commits in this PR
  PR_COMMITS=$(gh pr view $pr_number --json commits --jq '.commits[].oid' 2>/dev/null || echo "")
  PR_COMMITS_JSON="["
  commits_first=true
  while IFS= read -r commit_hash; do
    if [ -z "$commit_hash" ]; then
      continue
    fi
    if [ "$commits_first" = false ]; then
      PR_COMMITS_JSON="$PR_COMMITS_JSON,"
    fi
    commits_first=false
    PR_COMMITS_JSON="$PR_COMMITS_JSON\"$commit_hash\""
  done <<< "$PR_COMMITS"
  PR_COMMITS_JSON="$PR_COMMITS_JSON]"
  
  # Get files in this PR
  PR_FILES=$(gh pr view $pr_number --json files --jq '.files[].path' 2>/dev/null || echo "")
  PR_FILES_JSON="["
  files_first=true
  while IFS= read -r filepath; do
    if [ -z "$filepath" ]; then
      continue
    fi
    if [ "$files_first" = false ]; then
      PR_FILES_JSON="$PR_FILES_JSON,"
    fi
    files_first=false
    PR_FILES_JSON="$PR_FILES_JSON$(echo "$filepath" | jq -Rs .)"
  done <<< "$PR_FILES"
  PR_FILES_JSON="$PR_FILES_JSON]"
  
  cat >> commits-context.json <<PR_EOF
    {
      "number": $pr_number,
      "title": $(echo "$PR_TITLE" | jq -Rs .),
      "branch": $(echo "$PR_BRANCH" | jq -Rs .),
      "base_branch": $(echo "$PR_BASE" | jq -Rs .),
      "commits": $PR_COMMITS_JSON,
      "files": $PR_FILES_JSON
    }
PR_EOF
done

# Close existing_prs array and JSON
echo "" >> commits-context.json
echo "  ]" >> commits-context.json
echo "}" >> commits-context.json

echo "✅ Commit context prepared"
echo ""
echo "Summary:"
jq -r '"  - New commits: \(.new_commits | length)\n  - Existing PRs: \(.existing_prs | length)"' commits-context.json
