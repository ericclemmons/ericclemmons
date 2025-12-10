#!/bin/bash
set -e

# Requires CLAUDE_CODE_OAUTH_TOKEN environment variable

echo "🤖 Calling Claude CLI for commit analysis..."

# Check for token
if [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
  echo "❌ Error: CLAUDE_CODE_OAUTH_TOKEN is not set"
  exit 1
fi

# Read the prompt from file
PROMPT=$(cat .github/scripts/pr-split-prompt.md)

# Read the commits context
COMMITS_JSON=$(cat commits-context.json)

# Combine prompt with data
cat > full-prompt.txt <<PROMPT_EOF
$PROMPT

$COMMITS_JSON

Respond with ONLY valid JSON matching the output schema above. No markdown, no explanation outside JSON.
PROMPT_EOF

# Call Claude CLI with --print for non-interactive mode
# The CLI will use CLAUDE_CODE_OAUTH_TOKEN automatically
echo "  Calling claude CLI..."
RESPONSE=$(claude --print --output-format json < full-prompt.txt 2>&1)

# Check if command succeeded
if [ $? -ne 0 ]; then
  echo "❌ Claude CLI Error:"
  echo "$RESPONSE"
  exit 1
fi

# The CLI returns JSON with structure: {"type":"result","result":"<actual response>"}
# Extract the actual result
echo "$RESPONSE" | jq -r '.result' > claude-response-raw.txt

# Validate JSON
if ! jq empty claude-response-raw.txt 2>/dev/null; then
  echo "❌ Claude returned invalid JSON:"
  cat claude-response-raw.txt
  exit 1
fi

# Parse and save
cat claude-response-raw.txt | jq '.' > pr-plan.json

echo "✅ Claude analysis complete"
cat pr-plan.json
