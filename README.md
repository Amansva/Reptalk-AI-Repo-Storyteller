# 🚀 Reptalk — Repository Talking AI

> **RNSIT Hackathon 2026 Project**

## 💡 The Problem
Developers often struggle to understand large, complex GitHub repositories quickly. Reading through hundreds of commits and files is time-consuming and exhausting for new contributors.

## ✨ Our Solution
**Reptalk** uses local AI (Ollama) to scan a repository's entire history and transform it into:
- **A human-readable story** (narrative summary).
- **Visual Flowcharts** (using Mermaid.js).
- **Audio Narrations** (for accessibility).

## 🛠️ Tech Stack
- **Backend:** FastAPI (Python)
- **AI Brain:** Ollama (phi3:mini)
- **Frontend:** HTML5, CSS3 (GitHub Dark Theme), JS
- **Visuals:** Chart.js, Mermaid.js
- **Audio:** Google Text-to-Speech (gTTS)

## 🏗️ How it Works
1. User enters a GitHub URL.
2. `extract.py` pulls commit data via subprocesses.
3. `ai.py` sends context to a local Phi-3 model.
4. The AI generates a summary, which is then visualized and converted to speech.

## 🚀 Future Scope
- Expanding support for multiple languages.
- Support for private repositories via SSH.
