You are analyzing commits from a developer's branch to automatically split them into logical, self-contained PRs.

## Input Context
- NEW_COMMITS: Commits not yet in any PR (hash, message, files changed, diff stats, pr_split_id)
- EXISTING_PRS: Open PRs with their commits, files, and pr_split_ids
- BASE_BRANCH: Usually "main"

## PR-Split-ID Trailers
Each commit may have a `PR-Split-ID` trailer (e.g., "add-auth-feature-a1b2c3d4") that:
- Uniquely identifies the commit's purpose/intent
- Survives rebases, amends, and cherry-picks
- Is used to track commits across git history rewrites

**Critical**: When a new commit has a `pr_split_id` that matches any ID in an existing PR's `pr_split_ids` array, that commit MUST be added to that existing PR (use "action": "update"). This is how we handle rebased commits.

## Your Goals
1. Group commits into logical, self-contained PRs that could safely land independently
2. Each PR should be a complete "vertical stripe" - a full feature/fix that doesn't break main
3. Minimize stacking - only create stacks when there's a clear, necessary dependency
4. Detect shared file changes across potential PRs and decide the best strategy

## Decision Rules

### Commit Grouping
- NEW commits can either:
  - Be added to an EXISTING_PR (use "action": "update") if:
    - **MANDATORY**: The commit's `pr_split_id` matches any ID in the PR's `pr_split_ids` array (rebased commit)
    - OR: The commit message/files are logically related to that PR's existing commits
    - OR: The commit extends or fixes something in that PR
  - Create a NEW_PR (use "action": "create") if:
    - No existing PR has matching `pr_split_id`
    - No existing PR matches this commit's purpose
    - Unrelated to existing PRs
- Consider commit order - earlier commits might be dependencies for later ones
- Look for logical cohesion in commit messages and file paths

### Update vs Create Actions
- Use "action": "update" when:
  - **PRIORITY 1**: The commit's `pr_split_id` exists in an EXISTING_PR's `pr_split_ids` (this is a rebased commit)
  - **PRIORITY 2**: An EXISTING_PR already covers this commit's purpose (logically related)
  - The new commits logically extend that PR's work
  - List ONLY the new commits in "commits" array
  - IMPORTANT: Keep the same "branch" name as the existing PR
- Use "action": "create" when:
  - No existing PR has matching `pr_split_id`
  - No existing PR matches this commit's purpose
  - Starting fresh work on a new feature/fix
  - List all commits for this new PR

### Shared File Changes
When multiple commits modify the same file for different purposes:
- **Extract to parent PR:** If the file change is safe to land alone AND doesn't break main
  - Example: Adding a new dependency to package.json that both features need
  - Create PR #0 with just that change, make other PRs depend on it
- **Duplicate in both PRs:** If the file change breaks main alone BUT is needed for both features
  - Example: tsconfig.json changes that only make sense with feature code
  - Apply same change to both PR branches
- **Ask for clarification:** If you cannot determine safety or independence from commit messages + file paths + stats
  - Set "requires_diffs": true with reasoning

### Stacking Strategy
- Prefer independent PRs that can land in any order
- Only create stacks (PR B depends on PR A) when:
  - PR B's code imports/uses code from PR A
  - PR B's feature logically requires PR A's feature to exist first
- Use "base_branch" to indicate dependencies:
  - Independent PR: "base_branch": "main"
  - Stacked PR: "base_branch": "pr-split/user/parent-feature"

## Output Schema
{
  "requires_diffs": false,
  "files_needing_review": [],
  "reasoning": "Brief explanation of analysis approach",
  "prs": [
    {
      "action": "create" | "update",
      "branch": "pr-split/username/descriptive-name",
      "title": "Concise PR title (imperative mood, e.g., 'Add user authentication')",
      "commits": ["hash1", "hash2"],
      "base_branch": "main" | "pr-split/username/other-branch",
      "depends_on": [],
      "related_to": [],
      "reasoning": "Why these commits belong together"
    }
  ]
}

## Examples

### Example 1: Independent Features (New)
Input:
- Commit abc123: "Add authentication system" (files: auth.ts, login.tsx)
- Commit def456: "Add user profile page" (files: profile.tsx, api/user.ts)
- No existing PRs

Output:
{
  "requires_diffs": false,
  "reasoning": "Two unrelated features that can land independently",
  "prs": [
    {
      "action": "create",
      "branch": "pr-split/eric/add-authentication-system",
      "title": "Add authentication system",
      "commits": ["abc123"],
      "base_branch": "main",
      "depends_on": [],
      "related_to": [],
      "reasoning": "Self-contained auth feature"
    },
    {
      "action": "create",
      "branch": "pr-split/eric/add-user-profile-page",
      "title": "Add user profile page",
      "commits": ["def456"],
      "base_branch": "main",
      "depends_on": [],
      "related_to": [],
      "reasoning": "Independent profile feature"
    }
  ]
}

### Example 1b: Rebased Commit (Update via PR-Split-ID)
Input:
- Commit xyz789: "Add authentication system" (files: auth.ts, pr_split_id: "add-auth-system-a1b2c3")
- Existing PRs:
  - PR #42: "Add authentication system" 
    - branch: pr-split/eric/add-authentication-system
    - commits: [abc123]
    - pr_split_ids: ["add-auth-system-a1b2c3"]
    - files: [auth.ts, login.tsx]

Output:
{
  "requires_diffs": false,
  "reasoning": "New commit xyz789 has same PR-Split-ID as existing PR #42, indicating it's a rebased version of abc123",
  "prs": [
    {
      "action": "update",
      "branch": "pr-split/eric/add-authentication-system",
      "title": "Add authentication system",
      "commits": ["xyz789"],
      "base_branch": "main",
      "depends_on": [],
      "related_to": [],
      "reasoning": "Matching PR-Split-ID proves this is the same commit after rebase/amend"
    }
  ]
}

### Example 2: Clear Dependency (Stack)
Input:
- Commit abc123: "Add auth service" (files: auth.ts)
- Commit def456: "Add login page using auth" (files: login.tsx)
- No existing PRs

Output:
{
  "requires_diffs": false,
  "reasoning": "Login page depends on auth service based on commit message",
  "prs": [
    {
      "action": "create",
      "branch": "pr-split/eric/add-auth-service",
      "title": "Add auth service",
      "commits": ["abc123"],
      "base_branch": "main",
      "depends_on": [],
      "related_to": [],
      "reasoning": "Foundation auth service"
    },
    {
      "action": "create",
      "branch": "pr-split/eric/add-login-page",
      "title": "Add login page",
      "commits": ["def456"],
      "base_branch": "pr-split/eric/add-auth-service",
      "depends_on": ["pr-split/eric/add-auth-service"],
      "related_to": [],
      "reasoning": "Depends on auth service"
    }
  ]
}

### Example 3: Shared Config (Extract)
Input:
- Commit abc123: "Add TypeScript strict mode" (files: tsconfig.json)
- Commit def456: "Add auth types" (files: auth.ts)
- Commit ghi789: "Add profile types" (files: profile.ts)
- No existing PRs

Output:
{
  "requires_diffs": false,
  "reasoning": "TypeScript config is shared foundation, extract it",
  "prs": [
    {
      "action": "create",
      "branch": "pr-split/eric/enable-typescript-strict-mode",
      "title": "Enable TypeScript strict mode",
      "commits": ["abc123"],
      "base_branch": "main",
      "depends_on": [],
      "related_to": [],
      "reasoning": "Config foundation for type-safe code"
    },
    {
      "action": "create",
      "branch": "pr-split/eric/add-auth-types",
      "title": "Add auth types",
      "commits": ["def456"],
      "base_branch": "pr-split/eric/enable-typescript-strict-mode",
      "depends_on": ["pr-split/eric/enable-typescript-strict-mode"],
      "related_to": [],
      "reasoning": "Depends on strict mode config"
    },
    {
      "action": "create",
      "branch": "pr-split/eric/add-profile-types",
      "title": "Add profile types",
      "commits": ["ghi789"],
      "base_branch": "pr-split/eric/enable-typescript-strict-mode",
      "depends_on": ["pr-split/eric/enable-typescript-strict-mode"],
      "related_to": [],
      "reasoning": "Depends on strict mode config"
    }
  ]
}

## Now Analyze

