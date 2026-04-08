# Reptalk — Repository Talking AI

Reptalk transforms any GitHub repository into a human-readable story, visual flowcharts, and multilingual audio narrations using AI.

## 📂 File Architecture

Here is a short explanation of how the project is structured and what each file does:

*   **`app.py`**: The main FastAPI backend server. It handles routing (`/`, `/api/analyze`, `/api/tts`), serves HTML/static files, and coordinates the entire workflow.
*   **`extract.py`**: Interacts with Git via subprocesses. It runs `git log` to extract commit hashes, authors, dates, messages, and files changed. It uses heuristics to classify commits (e.g., Bug Fix, Feature).
*   **`ai.py`**: The AI brain. It connects to your local Ollama instance running the `phi3:mini` model. It compiles the commit history into a prompt and asks the AI to generate a highly concise summary. It also contains the `translate_text` function for multilingual support.
*   **`run_from_github.py`**: The orchestrator pipeline. It shallow-clones the requested GitHub repository into a temporary folder, calls `extract.py` to get the commits, and calls `ai.py` to generate the story.
*   **`tts_engine.py`**: Uses Google Text-to-Speech (`gTTS`) to convert the AI-generated (and translated) text into an MP3 file and saves it to the `static/audio` directory.
*   **`templates/index.html`**: The frontend UI structure. It contains the layout, tabs, canvas elements for Chart.js, and the GitHub Dark aesthetics.
*   **`static/css/style.css`**: The styling sheet containing the premium GitHub Dark theme, glassmorphism effects, and animations.
*   **`static/js/app.js`**: The interactive frontend logic. It handles making API requests to the backend, updating the DOM, structuring the Mermaid.js flowcharts, and rendering the Chart.js pie and bar graphs.

---

## 🚀 Deployment Guide (GitHub to Local)

Follow these steps to deploy and run the app locally from a GitHub repository.

### 1. Clone the Code and Install Dependencies

Open your terminal (or Git Bash) and run:

```bash
# Clone the repository (replace with your actual repository URL if hosted on GitHub)
git clone https://github.com/YourUsername/Reptalk.git
cd Reptalk

# (Optional but recommended) Create a virtual environment
python -m venv venv
source venv/Scripts/activate  # On Windows Git Bash/PowerShell

# Install Python requirements
pip install -r requirements.txt
```

> [!IMPORTANT]  
> Make sure you have `git` available in your system's PATH, as the application relies on it to extract commits.

### 2. Install the AI Model via Ollama

The system relies on **Ollama** to run the `phi3:mini` AI model entirely locally.

1.  **Download Ollama**: If you don't have it, download and install it from [ollama.com](https://ollama.com/download).
2.  **Pull the Model (Git Bash / Terminal)**:
    Open a new terminal window or Git Bash and run:
    ```bash
    ollama pull phi3:mini
    ```
3.  **Ensure Ollama is running**:
    Ollama usually runs as a background service automatically. If it isn't running, start it by running `ollama serve` in a dedicated terminal.

### 3. Run the Application

Now that Ollama is ready and your Python packages are installed, start the FastAPI server:

```bash
# In your project root directory (where app.py is located)
python app.py
```

### 4. Open in Browser

Open your web browser and go to:
**http://localhost:8000**

You will see the Reptalk UI. Paste any public GitHub repository URL into the search bar and click **Analyze Repository**. 

> [!TIP]  
> For audio narration in different languages, navigate to the **Audio Narration** tab after the analysis finishes, select your language, and click "Generate Audio".
