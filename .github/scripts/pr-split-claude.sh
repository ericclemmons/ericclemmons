#!/bin/bash
set -e

echo "🤖 Calling Claude API with OAuth token..."

# Check for token
if [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
  echo "❌ Error: CLAUDE_CODE_OAUTH_TOKEN is not set"
  exit 1
fi

# Read the prompt from file
PROMPT=$(cat .github/scripts/pr-split-prompt.md)

# Read the commits context
COMMITS_JSON=$(cat commits-context.json)

# Combine prompt with data into a temp file to avoid YAML escaping issues
cat > full-prompt.txt <<PROMPT_EOF
$PROMPT

$COMMITS_JSON

Respond with ONLY valid JSON matching the output schema above. No markdown, no explanation outside JSON.
PROMPT_EOF

FULL_PROMPT=$(cat full-prompt.txt)

# Build JSON payload
CONTENT_JSON=$(echo "$FULL_PROMPT" | jq -Rs .)
cat > api-request.json <<API_EOF
{
  "model": "claude-3-5-haiku-20241022",
  "max_tokens": 4096,
  "messages": [{
    "role": "user",
    "content": $CONTENT_JSON
  }]
}
API_EOF

# Call Claude API with OAuth Bearer token
RESPONSE=$(curl -s https://api.anthropic.com/v1/messages \
  -H "Authorization: Bearer $CLAUDE_CODE_OAUTH_TOKEN" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d @api-request.json)

# Check for API errors
if echo "$RESPONSE" | jq -e '.error' >/dev/null 2>&1; then
  ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message')
  echo "❌ Claude API Error: $ERROR_MSG"
  exit 1
fi

# Extract JSON response
echo "$RESPONSE" | jq -r '.content[0].text' > claude-response-raw.txt

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
