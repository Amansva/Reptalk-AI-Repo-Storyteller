import subprocess
import os
from collections import defaultdict


def classify(msg):
    msg = msg.lower()
    if "fix" in msg or "bug" in msg:
        return "Bug Fix"
    elif "add" in msg or "feature" in msg or "implement" in msg:
        return "Feature"
    elif "refactor" in msg:
        return "Refactor"
    elif "doc" in msg:
        return "Documentation"
    else:
        return "Other"


def get_diff_summary(commit_hash, repo_dir):
    """Get files changed and lines added/removed for a commit."""
    try:
        cmd = ['git', 'show', '--stat', '--format=', commit_hash]
        output = subprocess.check_output(
            cmd, stderr=subprocess.STDOUT, cwd=repo_dir
        ).decode('utf-8').strip()

        files_changed = []
        for line in output.split('\n'):
            line = line.strip()
            if '|' in line:  # lines like "file.py | 10 ++--"
                files_changed.append(line.split('|')[0].strip())

        # Get summary line e.g. "3 files changed, 20 insertions(+), 5 deletions(-)"
        summary_line = output.split('\n')[-1].strip() if output else ""

        return files_changed, summary_line
    except subprocess.CalledProcessError:
        return [], ""


def get_commits(repo_dir, limit=30):
    """Run git log and return parsed commits with diff info.
    
    Args:
        repo_dir: Path to the git repository.
        limit: Maximum number of commits to retrieve (default 30).
    """
    cmd = [
        'git', 'log',
        f'-{limit}',
        '--pretty=format:%H|%an|%ae|%ad|%s',
        '--date=format:%B %d, %Y at %I:%M %p'
    ]
    try:
        output = subprocess.check_output(
            cmd, stderr=subprocess.STDOUT, cwd=repo_dir
        ).decode('utf-8')
    except subprocess.CalledProcessError as e:
        print(f"Error running git log: {e.output.decode()}")
        return []

    commits = []
    for line in output.strip().split('\n'):
        if not line.strip():
            continue
        parts = line.split('|', 4)
        if len(parts) < 5:
            continue

        hash_val   = parts[0]
        author     = parts[1]
        email      = parts[2]
        date       = parts[3]
        message    = parts[4]

        files_changed, diff_summary = get_diff_summary(hash_val, repo_dir)

        commit = {
            "hash":          hash_val[:7],        # short hash
            "author":        author,
            "email":         email,
            "date":          date,
            "message":       message,
            "type":          classify(message),
            "files_changed": files_changed,
            "diff_summary":  diff_summary,
        }
        commits.append(commit)

    return commits


def group_commits(commits):
    grouped = defaultdict(list)
    for c in commits:
        grouped[c["type"]].append(c)
    return grouped


def get_contributor_stats(commits):
    """Get top 5 contributors by commit count."""
    author_counts = defaultdict(int)
    for c in commits:
        author_counts[c["author"]] += 1
    
    sorted_contributors = sorted(author_counts.items(), key=lambda x: x[1], reverse=True)
    return sorted_contributors[:5]


def print_grouped(grouped):
    for key, value in grouped.items():
        print(f"\n=== {key} ===")
        for v in value:
            print(f"  [{v['date']}] {v['author']} — {v['message']}")
            if v["files_changed"]:
                print(f"    Files: {', '.join(v['files_changed'])}")
            if v["diff_summary"]:
                print(f"    Changes: {v['diff_summary']}")


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    commits = get_commits(os.getcwd())
    print(f"DEBUG: Found {len(commits)} commits\n")

    if not commits:
        print("No commits found. Make sure you are inside a git repo.")
    else:
        grouped = group_commits(commits)
        print_grouped(grouped)