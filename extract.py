import subprocess

# Function to classify commit message
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

# Run git log
cmd = ['git', 'log', '--pretty=format:%H|%an|%ad|%s', '--date=short']
output = subprocess.check_output(cmd).decode('utf-8')

# Process commits
commits = []

for line in output.split('\n'):
    parts = line.split('|')
    
    commit = {
        "hash": parts[0],
        "author": parts[1],
        "date": parts[2],
        "message": parts[3],
        "type": classify(parts[3])   # 👈 classification added
    }
    
    commits.append(commit)
from collections import defaultdict

grouped = defaultdict(list)

for c in commits:
    grouped[c["type"]].append(c)
    
    for key, value in grouped.items():
        print(f"\n=== {key} ===")
    for v in value:
        print("-", v["message"])
# Print results
for c in commits:
    print(c)