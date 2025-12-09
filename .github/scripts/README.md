# PR Splitter

Automatically splits your monolithic development branches into logical, reviewable PRs.

## How It Works

### 1. Commit Tracking with Trailers

Every commit gets a unique `PR-Split-ID` trailer automatically added via Husky's `prepare-commit-msg` hook:

```
Add authentication system

PR-Split-ID: add-authentication-system-a1b2c3d4
```

**Why trailers?**
- Survive rebases, amends, and cherry-picks
- Uniquely identify a commit's "intent" across git history rewrites
- Enable the splitter to recognize "this is the same commit after rebase, update the existing PR"

### 2. Triggering the Splitter

The splitter only runs when you explicitly trigger it:

**Option A: Comment with 🔀**
Comment `🔀` on your umbrella PR (e.g., `dev/ericclemmons`) to run the splitter.

**Option B: Manual workflow dispatch**
Go to Actions → PR Splitter → Run workflow

### 3. Analysis Process

1. **Extract commits**: Finds all commits in your branch ahead of `main`
2. **Query existing PRs**: Checks for open PRs from `pr-split/username`
3. **Extract trailers**: Reads `PR-Split-ID` from each commit
4. **Call Claude**: Sends commit + PR context to Claude API
5. **Group commits**: Claude groups commits by:
   - **Priority 1**: Matching PR-Split-IDs (rebased commits go to existing PRs)
   - **Priority 2**: Logical cohesion (related work grouped together)

### 4. PR Management

- **Create**: New PRs for novel work
- **Update**: Add commits to existing PRs (especially rebased commits)
- **Reopen**: Automatically reopens PRs closed by force-push (within 5 minutes)
- **Stack**: Creates dependency chains when needed (PR B depends on PR A)

## Example Workflow

```bash
# Day 1: Start work
git checkout -b dev/eric
git commit -m "Add auth service"
git commit -m "Add login page"
git push

# Trigger splitter
# Comment 🔀 on umbrella PR
# Result: 2 PRs created
# - PR #1: "Add auth service"
# - PR #2: "Add login page" (depends on #1)

# Day 2: Rebase onto main
git fetch origin main:main
git rebase main
git push -f

# Trigger splitter again
# Comment 🔀 on umbrella PR
# Result: Same 2 PRs updated (not duplicated!)
# - PR #1: Updated with rebased commit (same PR-Split-ID)
# - PR #2: Updated with rebased commit (same PR-Split-ID)
```

## Architecture

```
.github/
├── workflows/
│   └── pr-splitter.yml          # GitHub Actions workflow
├── scripts/
│   ├── pr-split-context.sh      # Determine branch & context
│   ├── pr-split-setup.sh        # Setup git environment
│   ├── pr-split-analyze.sh      # Extract commits + PRs + trailers → JSON
│   ├── pr-split-claude.sh       # Call Claude API with context
│   ├── pr-split-prompt.md       # Claude's instructions
│   ├── pr-split-check-diffs.sh  # Verify if diffs needed
│   ├── pr-split-execute.sh      # Create/update PRs based on plan
│   └── pr-split-umbrella.sh     # Update umbrella PR description
└── hooks/
    └── prepare-commit-msg       # (moved to .husky/)

.husky/
└── prepare-commit-msg           # Adds PR-Split-ID trailers
```

## Configuration

### Required Secrets

- `ANTHROPIC_API_KEY`: For Claude API access

### Branch Naming

- Umbrella branch: `dev/username` (e.g., `dev/eric`)
- Split PR branches: `pr-split/username/feature-name`

## Troubleshooting

### Duplicate PRs Created

If you see duplicate PRs, ensure:
1. Husky hook is installed (`pnpm install` runs it)
2. Commits have `PR-Split-ID` trailers (`git log --format="%(trailers)"`)
3. You're using 🔀 trigger (not auto-push, which is disabled)

### PR Not Updated After Rebase

Check if:
1. The commit has a `PR-Split-ID` trailer
2. The existing PR's commits also have trailers
3. The IDs match between old and new commits

### Hook Not Running

```bash
# Verify Husky is installed
ls -la .husky/

# Reinstall hooks
pnpm install

# Test manually
echo "test" > test.txt
git add .
git commit -m "Test"
git log -1 --format="%(trailers)"
# Should show: PR-Split-ID: test-abc12345
```

## Development

### Testing the Hook Locally

```bash
# Create test commit
echo "test" > test.txt
git add .
git commit -m "Test feature"

# Verify trailer was added
git log -1 --format="%B"
# Should show:
# Test feature
#
# PR-Split-ID: test-feature-abc12345
```

### Testing the Splitter

```bash
# Trigger via workflow dispatch
gh workflow run pr-splitter.yml -f branch=dev/eric

# Or trigger via comment (on a PR)
# Comment: 🔀

# Check logs
gh run list --workflow=pr-splitter.yml
gh run view <run-id> --log
```

## Credits

Built with:
- [Claude](https://claude.ai) for intelligent commit grouping
- [Husky](https://typicode.github.io/husky/) for git hooks
- [GitHub Actions](https://github.com/features/actions) for automation
