import requests
import json

LANGUAGE_PROMPTS = {
    "en": "English",
    "hi": "Hindi (हिंदी)",
    "kn": "Kannada (ಕನ್ನಡ)",
    "te": "Telugu (తెలుగు)",
    "me": "Malayalam (മലയാളം)",
}

def generate_story(commits):
    """Send commit details to Ollama (phi3:mini) and get a short human-readable summary, difficulty rating and verdict.
    
    Args:
        commits: List of commit dicts (containing start, middle, and end of history).
    """
    prompt = """You are a technical code reviewer reading a git log that spans the entire life of a repository.
Based on the provided commit history (which includes the beginning, middle milestones, and the latest state), provide a JSON response containing exactly 3 keys:
1. "story": A short, human-readable summary (upto 6 sentences) telling the story of the repository's evolution. Mention how it started, what major shifts happened in the middle, and where it stands today.
2. "rating": Rate the codebase complexity based on commits as exactly one of: "Beginner", "Intermediate", or "Challenge".
3. "verdict": A 1-sentence evaluation of the project's journey and current health.

Output ONLY valid raw JSON without any markdown code blocks or additional text. DO NOT wrap the output in ```json...```.

Commit History (Selected Milestones):
"""
    # The commits list is already bookended (Newest ... Middle ... Oldest)
    # We'll reverse it for the prompt so the AI reads it chronologically (Oldest -> Newest)
    chronological_commits = list(reversed(commits))
    
    for c in chronological_commits:
        # Truncate file list if too long
        files = c.get('files_changed', [])
        if len(files) > 3:
            files_str = ', '.join(files[:3]) + f" and {len(files)-3} more files"
        else:
            files_str = ', '.join(files) if files else "N/A"
            
        prompt += f"[{c['date']}] {c['author']}: {c['message']}. (Files: {files_str})\n"

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


#My own AI 
#Using ai to help me earn money automatically 
