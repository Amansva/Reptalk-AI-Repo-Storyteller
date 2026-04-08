import os
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from run_from_github import run_analysis
from tts_engine import generate_audio

app = FastAPI(title="DevTeller", description="GitHub Repository Story Generator")

# Setup directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

os.makedirs(os.path.join(STATIC_DIR, "audio"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "css"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "js"), exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Templates
templates = Jinja2Templates(directory=TEMPLATES_DIR)


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Serve the main UI."""
    return templates.TemplateResponse(request=request, name="index.html")


@app.post("/api/analyze")
async def analyze(request: Request):
    """
    Clone repo, extract commits, generate AI summary, and return all data.
    Expects JSON: { "repo_url": "...", "language": "en" }
    """
    try:
        body = await request.json()
        repo_url = body.get("repo_url", "").strip()
        language = body.get("language", "en").strip()

        if not repo_url:
            return JSONResponse({"error": "Please enter a GitHub repository URL."}, status_code=400)

        # Validate URL format
        if not repo_url.startswith("https://github.com/"):
            return JSONResponse({"error": "Please enter a valid GitHub URL (https://github.com/...)."}, status_code=400)

        # Run the full analysis pipeline
        result = run_analysis(repo_url)

        if "error" in result:
            return JSONResponse({"error": result["error"]}, status_code=400)

        return JSONResponse(result)

    except Exception as e:
        print(f"❌ Analysis error: {e}")
        return JSONResponse({"error": f"An error occurred: {str(e)}"}, status_code=500)


@app.post("/api/tts")
async def text_to_speech(request: Request):
    """
    Generate audio from text in the specified language (translating first).
    Expects JSON: { "text": "...", "language": "en" }
    """
    try:
        from ai import translate_text
        body = await request.json()
        text = body.get("text", "").strip()
        language = body.get("language", "en").strip()

        if not text:
            return JSONResponse({"error": "No text provided for audio generation."}, status_code=400)

        # Translate text first
        translated_text = translate_text(text, language)

        filename = generate_audio(translated_text, language=language)

        if filename:
            return JSONResponse({"audio_url": f"/static/audio/{filename}"})
        else:
            return JSONResponse({"error": "Failed to generate audio."}, status_code=500)

    except Exception as e:
        print(f"❌ TTS error: {e}")
        return JSONResponse({"error": f"TTS error: {str(e)}"}, status_code=500)


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "DevTeller"}


if __name__ == "__main__":
    import sys
    import io
    # Fix Unicode output on Windows console
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    import uvicorn
    print("Starting DevTeller server...")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)