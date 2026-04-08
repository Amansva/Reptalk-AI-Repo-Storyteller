import os
import uuid
from gtts import gTTS


# Directory to store generated audio files
AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "audio")

# gTTS language code mapping
LANGUAGE_MAP = {
    "en": "en",
    "hi": "hi",
    "kn": "kn",
    "te": "te",
    "ta": "ta",
    "ml": "ml",
}


def generate_audio(text, language="en"):
    """
    Convert text to speech and save as MP3.
    
    Args:
        text: The text to convert to speech.
        language: Language code (en, hi, kn, te, ta, ml).
    
    Returns:
        The filename of the generated audio file (relative path for URL).
    """
    os.makedirs(AUDIO_DIR, exist_ok=True)

    lang_code = LANGUAGE_MAP.get(language, "en")
    filename = f"story_{uuid.uuid4().hex[:8]}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)

    try:
        tts = gTTS(text=text, lang=lang_code, slow=False)
        tts.save(filepath)
        print(f"✅ Audio saved to {filepath}")
        return filename
    except Exception as e:
        print(f"❌ TTS Error: {e}")
        return None
