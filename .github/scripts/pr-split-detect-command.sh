#!/bin/bash
set -e

EVENT_NAME="$1"
PR_NUMBER_FROM_REVIEW="$2"
PR_NUMBER_FROM_ISSUE="$3"
COMMENT_BODY="$4"

# Get PR context
if [ "$EVENT_NAME" = "pull_request_review_comment" ]; then
  PR_NUMBER="$PR_NUMBER_FROM_REVIEW"
else
  PR_NUMBER="$PR_NUMBER_FROM_ISSUE"
fi

# Get PR head branch
BRANCH=$(gh pr view $PR_NUMBER --json headRefName -q .headRefName)

# If this is umbrella PR (dev/*), use it; if child PR (pr-split/*), find umbrella
if [[ "$BRANCH" =~ ^dev/ ]]; then
  echo "branch=$BRANCH" >> $GITHUB_OUTPUT
else
  # Extract user from child PR branch (pr-split/user/feature)
  USER=$(echo "$BRANCH" | cut -d'/' -f2)
  echo "branch=dev/$USER" >> $GITHUB_OUTPUT
fi

# Extract instruction (everything after 🔀)
INSTRUCTION=$(echo "$COMMENT_BODY" | sed -n 's/.*🔀[[:space:]]*\(.*\)/\1/p' | tr '\n' ' ')
echo "instruction=$INSTRUCTION" >> $GITHUB_OUTPUT

echo "🔍 Detected branch: $BRANCH"
echo "📝 User instruction: $INSTRUCTION"
