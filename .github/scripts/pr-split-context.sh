#!/bin/bash
set -e

# Inputs from environment
EVENT_NAME="$1"
REF_NAME="$2"
WORKFLOW_BRANCH="$3"
DETECT_BRANCH="$4"
DETECT_INSTRUCTION="$5"
ACTOR="$6"

echo "🔍 Determining context..."

# Determine which branch to analyze and mode
if [ "$EVENT_NAME" = "push" ]; then
  BRANCH="$REF_NAME"
  INSTRUCTION=""
  MODE="incremental"
elif [ "$EVENT_NAME" = "workflow_dispatch" ]; then
  BRANCH="$WORKFLOW_BRANCH"
  INSTRUCTION=""
  MODE="full"
else
  BRANCH="$DETECT_BRANCH"
  INSTRUCTION="$DETECT_INSTRUCTION"
  MODE="incremental"
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
