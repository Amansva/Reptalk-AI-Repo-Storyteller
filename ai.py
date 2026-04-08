import requests

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
    for c in commits:
        prompt += f"[{c['date']}] {c['author']} made commit: {c['message']}. Files: {', '.join(c['files_changed'])}\n"

    print(f"Sending request to Ollama (model: phi3:mini) for structured rating...")

    try:
        import json
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "phi3:mini",
                "prompt": prompt,
                "stream": False,
                "format": "json"  # Enforce JSON output for Ollama 
            },
            timeout=120
        )
        response.raise_for_status()
        print("✅ Response received from Ollama!")
        
        raw_output = response.json().get("response", "").strip()
        try:
            # Sometime phi3 outputs markdown regardless, try to clean
            if raw_output.startswith("```json"):
                raw_output = raw_output[7:-3].strip()
            return json.loads(raw_output)
        except json.JSONDecodeError:
            print(f"❌ Failed to parse JSON from AI: {raw_output}")
            return {
                "story": raw_output[:300] + "...", 
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
            timeout=120
        )
        response.raise_for_status()
        return response.json().get("response", text).strip()
    except Exception as e:
        print(f"Translation error: {e}")
        return text