import os
import subprocess
import shutil
from urllib.parse import urlparse

from extract import get_commits, group_commits, get_contributor_stats
from ai import generate_story


TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_repos")


def clone_repo(repo_url):
    """Clone a GitHub repo into a temp directory. Returns the path to the cloned repo."""
    os.makedirs(TEMP_DIR, exist_ok=True)

    repo_name = os.path.basename(urlparse(repo_url).path).replace(".git", "")
    clone_dir = os.path.join(TEMP_DIR, repo_name)

    if os.path.exists(clone_dir):
        print(f"✅ Repo '{repo_name}' already exists, reusing...")
    else:
        print(f"Cloning {repo_url}...")
        try:
            subprocess.run(
                ["git", "clone", "--depth", "50", repo_url, clone_dir],
                check=True,
                capture_output=True,
                text=True,
            )
            print(f"✅ Cloned into {clone_dir}")
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.strip() if e.stderr else str(e)
            print(f"❌ Clone failed: {error_msg}")
            raise RuntimeError(f"Failed to clone repository: {error_msg}")

    return clone_dir


def run_analysis(repo_url):
    """
    Full analysis pipeline: clone → extract → summarize → return structured data.
    Returns a dict with commits, story, and contributor stats.
    """
    # Step 1: Clone repo
    repo_path = clone_repo(repo_url)

    # Step 2: Extract commits (limit 100)
    commits = get_commits(repo_path, limit=100)

    if not commits:
        return {"error": "No commits found in the repository."}

    # Step 3: Get contributor stats
    contributors = get_contributor_stats(commits)

    # Step 4: Generate story and ratings
    ai_data = generate_story(commits)

    # ensure ai_data is dict if raw string leaked
    if isinstance(ai_data, str):
        ai_data = {"story": ai_data, "rating": "Unknown", "verdict": "Could not assess."}

    return {
        "commits": commits,
        "story": ai_data.get("story", "No story generated."),
        "rating": ai_data.get("rating", "Unknown"),
        "verdict": ai_data.get("verdict", ""),
        "contributors": [{"name": name, "commits": count} for name, count in contributors],
        "total_commits": len(commits),
        "repo_name": os.path.basename(repo_path),
    }


def cleanup_repo(repo_name):
    """Remove a cloned repo from temp directory."""
    repo_path = os.path.join(TEMP_DIR, repo_name)
    if os.path.exists(repo_path):
        shutil.rmtree(repo_path)
        print(f"🗑️ Cleaned up {repo_path}")


if __name__ == "__main__":
    print("Script started...")
    repo_url = input("Enter GitHub repo URL: ")
    print(f"You entered: {repo_url}")
    result = run_analysis(repo_url)
    if "error" in result:
        print(result["error"])
    else:
        print(f"\n📖 Story:\n{result['story']}")
        print(f"\n👥 Contributors: {result['contributors']}")