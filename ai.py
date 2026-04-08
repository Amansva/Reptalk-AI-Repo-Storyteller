import requests
import json

LANGUAGE_PROMPTS = {
    "en": "English",
    "hi": "Hindi (हिंदी)",
    "kn": "Kannada (ಕನ್ನಡ)",
    "te": "Telugu (తెలుగు)"
}

def generate_story(commits):
    """Send commit details to Ollama (phi3:mini) and get a short human-readable summary, difficulty rating and verdict.
    
    Args:
        commits: List of commit dicts.
    """
    prompt = """You are a technical code reviewer reading a git log.
Based on the git commit history below, provide a JSON response containing exactly 3 keys:
1. "story": A very short, human-readable summary (max 3 sentences) explaining what changed, how, and by whom.
2. "rating": Rate the codebase complexity based on commits as exactly one of: "Beginner", "Intermediate", or "Challenge".
3. "verdict": A 1-sentence evaluation of how good the repository is based on commit hygiene and message clarity.

Output ONLY valid raw JSON without any markdown code blocks or additional text. DO NOT wrap the output in ```json...```.

Commit History:
"""
    # To prevent context window errors, limit to the latest 50 commits
    latest_commits = commits[:50] if len(commits) > 50 else commits
    
    for c in latest_commits:
        # Truncate file list if too long
        files = c['files_changed']
        if len(files) > 5:
            files_str = ', '.join(files[:5]) + f" and {len(files)-5} more files"
        else:
            files_str = ', '.join(files)
            
        prompt += f"[{c['date']}] {c['author']} made commit: {c['message']}. Files: {files_str}\n"

    # Safety check: if prompt is getting extremely long, strip file details to save space
    if len(prompt) > 8000:
        print("⚠️ Prompt too large, using compact mode (messages only)...")
        prompt = prompt.split("Commit History:")[0] + "Commit History (Summary):\n"
        for c in latest_commits:
            prompt += f"[{c['date']}] {c['author']}: {c['message']}\n"

    print(f"Sending request to Ollama (model: phi3:mini) for structured rating...")

    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "phi3:mini",
                "prompt": prompt,
                "stream": False,
                "format": "json"  # Enforce JSON output for Ollama 
            },
            timeout=200
        )
        response.raise_for_status()
        print("✅ Response received from Ollama!")
        
        raw_output = response.json().get("response", "").strip()
        try:
            # Sometime phi3 outputs markdown regardless, try to clean
            if raw_output.startswith("```json"):
                raw_output = raw_output[7:-3].strip()
            elif raw_output.startswith("```"):
                raw_output = raw_output[3:-3].strip()
                
            parsed_data = json.loads(raw_output)
            
            # If the model used different keys, dump the whole thing so it's not lost
            if "story" not in parsed_data:
                parsed_data["story"] = "Raw AI Output:\n" + raw_output
            
            return parsed_data
            
        except json.JSONDecodeError:
            print(f"❌ Failed to parse JSON from AI: {raw_output}")
            return {
                "story": raw_output[:500] + ("..." if len(raw_output) > 500 else ""), 
                "rating": "Unknown", 
                "verdict": "Could not assess."
            }

    except Exception as e:
        return {"story": f"❌ Request error: {e}", "rating": "Unknown", "verdict": "Error connecting to AI."}


def translate_text(text, target_lang):
    """Translate text to target language using phi3:mini."""
    if target_lang == "en" or target_lang not in LANGUAGE_PROMPTS:
        return text
        
    lang_name = LANGUAGE_PROMPTS[target_lang]
    prompt = f"Translate the following text to {lang_name}. Provide ONLY the translated text, without any explanations or additional comments.\n\nText: {text}"
    
    print(f"Translating to {lang_name} using phi3:mini...")
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "phi3:mini",
                "prompt": prompt,
                "stream": False
            },
            timeout=200
        )
        response.raise_for_status()
        return response.json().get("response", text).strip()
    except Exception as e:
        print(f"Translation error: {e}")
        return text
