#!/bin/bash
set -e

# Inputs from environment
EVENT_NAME="$1"
REF_NAME="$2"
INPUT_BRANCH="$3"
DETECTED_BRANCH="$4"
INSTRUCTION="$5"
ACTOR="$6"
PR_NUMBER="$7"

echo "🔍 Determining branch and context..."
echo "Event: $EVENT_NAME"
echo "Ref: $REF_NAME"
echo "Input branch: $INPUT_BRANCH"
echo "Detected branch: $DETECTED_BRANCH"
echo "Actor: $ACTOR"
echo "PR number: $PR_NUMBER"

# Determine which branch to analyze
if [ -n "$DETECTED_BRANCH" ]; then
  # From comment detection
  BRANCH="$DETECTED_BRANCH"
  MODE="incremental"
elif [ -n "$INPUT_BRANCH" ]; then
  # From workflow_dispatch input - ALWAYS do full re-evaluation
  BRANCH="$INPUT_BRANCH"
  MODE="full"
elif [ "$EVENT_NAME" = "pull_request" ]; then
  # From PR ready_for_review or synchronize event
  # Get the head branch from the PR using PR number if available
  if [ -n "$PR_NUMBER" ]; then
    BRANCH=$(gh pr view "$PR_NUMBER" --json headRefName -q .headRefName 2>/dev/null || echo "$REF_NAME")
  else
    BRANCH=$(gh pr view --json headRefName -q .headRefName 2>/dev/null || echo "$REF_NAME")
  fi
  MODE="incremental"
elif [ "$EVENT_NAME" = "push" ]; then
  # From push event
  BRANCH="$REF_NAME"
  MODE="incremental"
else
  echo "❌ Could not determine branch to analyze"
  exit 1
fi

# Use GitHub actor as username
USER="$ACTOR"

# Output to GitHub Actions
echo "branch=$BRANCH" >> $GITHUB_OUTPUT
echo "user=$USER" >> $GITHUB_OUTPUT
echo "instruction=$INSTRUCTION" >> $GITHUB_OUTPUT
echo "mode=$MODE" >> $GITHUB_OUTPUT

echo "🌿 Branch: $BRANCH"
echo "👤 User: $USER"
echo "📝 Instruction: $INSTRUCTION"
echo "🔄 Mode: $MODE"
