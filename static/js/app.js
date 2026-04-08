// ── State ────────────────────────────────────────────────────────────────────
let analysisData = null;
let audioGenerated = false;

// ── DOM Refs ─────────────────────────────────────────────────────────────────
const repoInput = document.getElementById('repo-url');
const langSelect = document.getElementById('language');
const analyzeBtn = document.getElementById('analyze-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const loadingSubtext = document.getElementById('loading-subtext');
const errorBanner = document.getElementById('error-banner');
const errorText = document.getElementById('error-text');
const outputSection = document.getElementById('output-section');

// Tab buttons
const tabBtns = document.querySelectorAll('.tab-btn');
const resultCards = document.querySelectorAll('.result-card');

// Result elements
const storyText = document.getElementById('story-text');
const flowchartContainer = document.getElementById('flowchart-container');
const pieChartCanvas = document.getElementById('pie-chart');
const barChartCanvas = document.getElementById('bar-chart');
const audioPlayerWrapper = document.getElementById('audio-player-wrapper');
const audioStatus = document.getElementById('audio-status');

// Stats
const statCommits = document.getElementById('stat-commits');
const statContributors = document.getElementById('stat-contributors');
const statRepo = document.getElementById('stat-repo');
const statRating = document.getElementById('stat-rating');
const storyVerdict = document.getElementById('story-verdict');

// ── Event Listeners ──────────────────────────────────────────────────────────
analyzeBtn.addEventListener('click', handleAnalyze);
repoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAnalyze();
});

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Audio generate button (attached after DOM render in renderResults)
function attachAudioBtn() {
    const btn = document.getElementById('generate-audio-btn');
    if (btn) {
        btn.addEventListener('click', () => generateAudio());
    }
}

// ── Tab Switching ────────────────────────────────────────────────────────────
function switchTab(tabName) {
    tabBtns.forEach(b => b.classList.remove('active'));
    resultCards.forEach(c => c.classList.remove('active'));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`card-${tabName}`).classList.add('active');
}

// ── Main Analysis ────────────────────────────────────────────────────────────
async function handleAnalyze() {
    const repoUrl = repoInput.value.trim();
    const language = langSelect.value;

    if (!repoUrl) {
        showError('Please enter a GitHub repository URL.');
        return;
    }

    hideError();
    showLoading('Cloning repository...', 'This may take a moment for large repos');
    analyzeBtn.disabled = true;
    audioGenerated = false;

    try {
        updateLoading('Analyzing commits & generating story...', 'Using Mistral AI via Ollama');

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repo_url: repoUrl })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Analysis failed.');
        }

        analysisData = data;
        renderResults(data);

    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
        analyzeBtn.disabled = false;
    }
}

// ── Render All Results ───────────────────────────────────────────────────────
function renderResults(data) {
    // Stats bar
    statCommits.textContent = data.total_commits;
    statContributors.textContent = data.contributors.length;
    statRepo.textContent = truncate(data.repo_name, 15);
    
    // AI Difficulty Rating & Verdict
    statRating.textContent = data.rating || "Unknown";
    let ratingColor = '#ef4444'; // default red (Challenge)
    if (data.rating === 'Beginner') ratingColor = '#10b981'; // green
    if (data.rating === 'Intermediate') ratingColor = '#f59e0b'; // yellow
    statRating.style.color = ratingColor;

    // Text summary & verdict
    storyText.textContent = data.story;
    storyVerdict.textContent = data.verdict || "No verdict provided.";

    // Flowchart
    renderFlowchart(data.commits);

    // Pie chart
    renderPieChart(data.contributors);

    // Bar chart (Timeline)
    renderBarChart(data.commits);

    // Reset audio section
    audioPlayerWrapper.innerHTML = '';
    audioStatus.textContent = 'Click "Generate Audio" to create a narration of the story.';
    const genBtn = document.getElementById('generate-audio-btn');
    if (genBtn) {
        genBtn.disabled = false;
        genBtn.innerHTML = '🎙️ Generate Audio';
    }

    // Show output section and default to text tab
    outputSection.classList.add('active');
    switchTab('text');
}

// ── Mermaid Flowchart ────────────────────────────────────────────────────────
function renderFlowchart(commits) {
    // Build mermaid graph from commits (chronological order)
    const reversed = [...commits].reverse();
    let mermaidCode = 'graph TD\n';

    // Limit to 15 for readability
    const display = reversed.slice(Math.max(0, reversed.length - 15));

    display.forEach((commit, i) => {
        const id = `C${i}`;
        const nextId = `C${i + 1}`;

        const authorClean = sanitizeMermaid(commit.author);
        const msgClean = sanitizeMermaid(truncate(commit.message, 35));
        const dateClean = sanitizeMermaid(commit.date.split(' at ')[0]);

        // Build label with line breaks
        let icon = '📦';
        if (commit.type === 'Bug Fix') icon = '🔧';
        else if (commit.type === 'Feature') icon = '🚀';
        else if (commit.type === 'Refactor') icon = '♻️';
        else if (commit.type === 'Documentation') icon = '📝';

        const label = `${icon} ${authorClean}<br/>${msgClean}<br/>${dateClean}`;

        mermaidCode += `    ${id}["${label}"]\n`;

        if (i < display.length - 1) {
            mermaidCode += `    ${id} --> ${nextId}\n`;
        }
    });

    // Style definitions
    mermaidCode += `\n    classDef bugfix fill:#7f1d1d,stroke:#ef4444,color:#fca5a5\n`;
    mermaidCode += `    classDef feature fill:#1e3a5f,stroke:#3b82f6,color:#93c5fd\n`;
    mermaidCode += `    classDef refactor fill:#3b1f6e,stroke:#8b5cf6,color:#c4b5fd\n`;
    mermaidCode += `    classDef docs fill:#1a3a2a,stroke:#10b981,color:#6ee7b7\n`;
    mermaidCode += `    classDef other fill:#1e293b,stroke:#64748b,color:#94a3b8\n`;

    display.forEach((commit, i) => {
        const id = `C${i}`;
        if (commit.type === 'Bug Fix') mermaidCode += `    class ${id} bugfix\n`;
        else if (commit.type === 'Feature') mermaidCode += `    class ${id} feature\n`;
        else if (commit.type === 'Refactor') mermaidCode += `    class ${id} refactor\n`;
        else if (commit.type === 'Documentation') mermaidCode += `    class ${id} docs\n`;
        else mermaidCode += `    class ${id} other\n`;
    });

    // Clear old content and create a fresh mermaid element
    flowchartContainer.innerHTML = '';
    const mermaidDiv = document.createElement('div');
    mermaidDiv.className = 'mermaid';
    mermaidDiv.textContent = mermaidCode;
    flowchartContainer.appendChild(mermaidDiv);

    // Use mermaid.run() for Mermaid v10+
    if (window.mermaid) {
        mermaid.run({ nodes: [mermaidDiv] }).catch(err => {
            console.warn('Mermaid render warning:', err);
        });
    }
}

function sanitizeMermaid(str) {
    // Remove characters that break Mermaid syntax
    return str
        .replace(/"/g, "'")
        .replace(/[<>{}|()[\]#&;]/g, '')
        .replace(/\\/g, '');
}

function truncate(str, maxLen) {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen) + '...';
}

// ── Chart.js Pie Chart ───────────────────────────────────────────────────────
let pieChartInstance = null;

function renderPieChart(contributors) {
    const labels = contributors.map(c => c.name);
    const values = contributors.map(c => c.commits);
    const colors = [
        '#8b5cf6',
        '#3b82f6',
        '#06b6d4',
        '#10b981',
        '#f59e0b',
        '#ec4899',
        '#ef4444',
    ];

    if (pieChartInstance) {
        pieChartInstance.destroy();
    }

    const ctx = pieChartCanvas.getContext('2d');
    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: 'rgba(10, 10, 15, 0.8)',
                borderWidth: 3,
                hoverBorderColor: '#fff',
                hoverBorderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#8888a0',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 13,
                        },
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 12,
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(20, 20, 35, 0.95)',
                    titleColor: '#f0f0f5',
                    bodyColor: '#8888a0',
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    titleFont: { family: "'Inter', sans-serif", weight: '600' },
                    bodyFont: { family: "'Inter', sans-serif" },
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.parsed} commits`;
                        }
                    }
                }
            },
            cutout: '55%',
            animation: {
                animateRotate: true,
                duration: 1200,
                easing: 'easeOutQuart',
            }
        }
    });
}

// ── Chart.js Bar Chart (Timeline) ────────────────────────────────────────────
let barChartInstance = null;

function renderBarChart(commits) {
    // Group commits by date (YYYY-MM-DD format based on original date string)
    const dateCounts = {};
    const reversed = [...commits].reverse();
    
    reversed.forEach(c => {
        // Simple extraction of the date part (e.g., "April 08, 2026")
        const dateStr = c.date.split(' at ')[0]; 
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    });

    const labels = Object.keys(dateCounts);
    const values = Object.values(dateCounts);

    if (barChartInstance) {
        barChartInstance.destroy();
    }

    const ctx = barChartCanvas.getContext('2d');
    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Commits',
                data: values,
                backgroundColor: '#58a6ff',
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 20, right: 20, bottom: 20, left: 20 }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, color: '#8b949e' },
                    grid: { color: 'var(--border-color)' }
                },
                x: {
                    ticks: { 
                        color: 'var(--text-secondary)',
                        autoSkip: true,
                        maxTicksLimit: 15,
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#161b22',
                    titleColor: '#c9d1d9',
                    bodyColor: '#8b949e',
                    borderColor: '#30363d',
                    borderWidth: 1,
                    cornerRadius: 6,
                    titleFont: { family: "'Inter', sans-serif", weight: '600' }
                }
            }
        }
    });
}

// ── Audio Generation ─────────────────────────────────────────────────────────
async function generateAudio() {
    if (!analysisData || !analysisData.story) return;

    const genBtn = document.getElementById('generate-audio-btn');
    if (genBtn) {
        genBtn.disabled = true;
        genBtn.innerHTML = '<span class="btn-spinner"></span> Generating...';
    }
    audioStatus.textContent = '🔊 Generating audio narration... Please wait.';
    audioPlayerWrapper.innerHTML = '';

    try {
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: analysisData.story,
                language: document.getElementById('language').value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Audio generation failed.');
        }

        audioPlayerWrapper.innerHTML = `
            <audio controls autoplay id="audio-player">
                <source src="${data.audio_url}" type="audio/mpeg">
                Your browser does not support the audio element.
            </audio>
        `;
        audioStatus.textContent = '✅ Audio ready! Press play to listen.';
        audioGenerated = true;
        if (genBtn) {
            genBtn.innerHTML = '🎙️ Regenerate Audio';
            genBtn.disabled = false;
        }

    } catch (err) {
        audioStatus.textContent = `❌ ${err.message}`;
        if (genBtn) {
            genBtn.innerHTML = '🎙️ Retry';
            genBtn.disabled = false;
        }
    }
}

// ── Loading Helpers ──────────────────────────────────────────────────────────
function showLoading(text, subtext) {
    loadingText.textContent = text;
    loadingSubtext.textContent = subtext || '';
    loadingOverlay.classList.add('active');
}

function updateLoading(text, subtext) {
    loadingText.textContent = text;
    if (subtext) loadingSubtext.textContent = subtext;
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// ── Error Helpers ────────────────────────────────────────────────────────────
function showError(message) {
    errorText.textContent = message;
    errorBanner.classList.add('active');
}

function hideError() {
    errorBanner.classList.remove('active');
}
