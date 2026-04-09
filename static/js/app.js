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
const progressBar = document.getElementById('progress-bar');
const errorBanner = document.getElementById('error-banner');
const errorText = document.getElementById('error-text');
const outputSection = document.getElementById('output-section');

// Trending Repos logic
document.addEventListener('DOMContentLoaded', () => {
    const trendingCards = document.querySelectorAll('.trending-card');
    trendingCards.forEach(card => {
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-url') || card.querySelector('.trending-card__title').textContent;
            const fullUrl = url.startsWith('http') ? url : `https://github.com/${url}`;
            repoInput.value = fullUrl;
            handleAnalyze();
        });
    });
});

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
analyzeBtn.addEventListener('click', () => handleAnalyze());
repoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAnalyze();
});

// AUTO-TRIGGER ON PASTE
repoInput.addEventListener('paste', (e) => {
    // Wait for paste to complete
    setTimeout(() => {
        const val = repoInput.value.trim();
        if (isValidGithubUrl(val)) {
            handleAnalyze();
        }
    }, 50);
});

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function attachAudioBtn() {
    const btn = document.getElementById('generate-audio-btn');
    if (btn) {
        btn.onclick = () => generateAudio();
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function isValidGithubUrl(url) {
    return url.includes('github.com/') || (url.split('/').length >= 2 && !url.includes('.'));
}

function switchTab(tabName) {
    tabBtns.forEach(b => b.classList.remove('active'));
    resultCards.forEach(c => c.classList.remove('active'));

    const btn = document.querySelector(`[data-tab="${tabName}"]`);
    const card = document.getElementById(`card-${tabName}`);
    if (btn) btn.classList.add('active');
    if (card) card.classList.add('active');
}

// Global handleAnalyze for quickAnalyze access
window.handleAnalyze = async function() {
    const repoUrl = repoInput.value.trim();
    if (!repoUrl) return;

    hideError();
    showLoading('Analyzing repository...', 'Fetching commitment history and generating story');
    analyzeBtn.disabled = true;
    audioGenerated = false;

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repo_url: repoUrl })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Analysis failed.');

        analysisData = data;
        renderResults(data);
        outputSection.style.display = 'block';
        outputSection.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
        analyzeBtn.disabled = false;
    }
};

// ── Render All Results ───────────────────────────────────────────────────────
function renderResults(data) {
    statCommits.textContent = data.total_commits;
    statContributors.textContent = data.contributors.length;
    statRepo.textContent = data.repo_name.split('/').pop() || data.repo_name;
    statRating.textContent = data.rating || "Standard";
    
    // Rating colors for light mode
    let ratingColor = '#cf222e'; // github red
    if (data.rating === 'Beginner') ratingColor = '#1f883d'; // github green
    if (data.rating === 'Intermediate') ratingColor = '#9a6700'; // github orange
    statRating.style.color = ratingColor;

    storyText.textContent = data.story;
    storyVerdict.textContent = data.verdict;

    renderFlowchart(data.commits);
    renderPieChart(data.contributors);
    renderBarChart(data.commits);

    audioPlayerWrapper.innerHTML = '';
    audioStatus.textContent = '';
    attachAudioBtn();
    switchTab('text');
}

// ── Mermaid Flowchart ────────────────────────────────────────────────────────
function renderFlowchart(commits) {
    if (!commits || commits.length === 0) {
        flowchartContainer.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-secondary);">No commit data available for flow chart.</p>';
        return;
    }

    const reversed = [...commits].reverse();
    const display = reversed.slice(Math.max(0, reversed.length - 12));
    
    // Header for Mermaid 10
    let mermaidCode = 'graph TD\n';

    display.forEach((commit, i) => {
        const id = `C${i}`;
        const nextId = `C${i + 1}`;
        const author = sanitizeMermaid(commit.author);
        const msg = sanitizeMermaid(truncate(commit.message, 30));
        
        let icon = '📦';
        if (commit.type === 'Bug Fix') icon = '🔧';
        else if (commit.type === 'Feature') icon = '🚀';
        
        // Use single quotes for inner string and wrap whole label in double quotes
        // Avoid <br/> if textContent is used, or ensure it's unescaped
        mermaidCode += `    ${id}["${icon} ${author}<br/>${msg}"]\n`;
        if (i < display.length - 1) mermaidCode += `    ${id} --> ${nextId}\n`;
    });

    // Light Theme Styles
    mermaidCode += `\n    classDef default fill:#ffffff,stroke:#d0d7de,color:#1f2328,stroke-width:1px,font-family:sans-serif\n`;

    flowchartContainer.innerHTML = '';
    const mermaidDiv = document.createElement('div');
    mermaidDiv.className = 'mermaid';
    mermaidDiv.style.opacity = '0'; // Hide until rendered
    mermaidDiv.textContent = mermaidCode;
    flowchartContainer.appendChild(mermaidDiv);

    if (window.mermaid) {
        try {
            mermaid.run({ nodes: [mermaidDiv] }).then(() => {
                mermaidDiv.style.opacity = '1';
                mermaidDiv.style.transition = 'opacity 0.3s ease';
            }).catch(e => {
                console.error("Mermaid error:", e);
                flowchartContainer.innerHTML = '<p style="color:var(--accent-red); font-size:12px; text-align:center;">Failed to render flow chart.</p>';
            });
        } catch (err) {
            console.error("Mermaid run caught error:", err);
        }
    }
}

function sanitizeMermaid(str) {
    if (!str) return '';
    // Remove characters that strictly break Mermaid syntax or quoting
    return str.replace(/"/g, "'")           // Replace double quotes with single
              .replace(/[\[\]\(\)\{\}]/g, '') // Remove brackets/braces
              .replace(/[<>|#;]/g, '')      // Remove other special symbols
              .replace(/\\/g, '')           // Remove backslashes
              .trim();
}

function truncate(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

// ── Chart.js Pie Chart ───────────────────────────────────────────────────────
let pieChartInstance = null;
function renderPieChart(contributors) {
    const labels = contributors.map(c => c.name);
    const values = contributors.map(c => c.commits);
    const colors = ['#0969da', '#1f883d', '#af57db', '#9a6700', '#cf222e', '#656d76', '#bf3989'];

    if (pieChartInstance) pieChartInstance.destroy();
    
    // Register locally if needed
    Chart.register(ChartDataLabels);

    const ctx = pieChartCanvas.getContext('2d');
    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
                datalabels: {
                    color: '#ffffff',
                    font: { weight: 'bold' },
                    formatter: (v, ctx) => {
                        const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        return ((v / sum) * 100).toFixed(0) + '%';
                    }
                }
            },
            cutout: '60%'
        }
    });
}

// ── Chart.js Bar Chart ───────────────────────────────────────────────────────
let barChartInstance = null;
function renderBarChart(commits) {
    const dateCounts = {};
    [...commits].reverse().forEach(c => {
        const d = c.date.split(' at ')[0];
        dateCounts[d] = (dateCounts[d] || 0) + 1;
    });

    const labels = Object.keys(dateCounts);
    const values = Object.values(dateCounts);

    if (barChartInstance) barChartInstance.destroy();

    const ctx = barChartCanvas.getContext('2d');
    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Commits',
                data: values,
                backgroundColor: '#0969da',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 } } },
                x: { grid: { display: false }, ticks: { font: { size: 11 } } }
            },
            plugins: { legend: { display: false }, datalabels: { display: false } }
        }
    });
}

// ── Audio ────────────────────────────────────────────────────────────────────
async function generateAudio() {
    if (!analysisData) return;
    const btn = document.getElementById('generate-audio-btn');
    btn.disabled = true;
    btn.textContent = 'Generating...';
    audioStatus.textContent = '🔊 Preparing narration...';

    try {
        const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: analysisData.story,
                language: langSelect.value
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        audioPlayerWrapper.innerHTML = `<audio controls autoplay style="width: 100%; max-width: 400px; margin: 0 auto; display: block;"><source src="${data.audio_url}" type="audio/mpeg"></audio>`;
        audioStatus.textContent = '✅ Ready to listen';
    } catch (e) {
        audioStatus.textContent = '❌ Error: ' + e.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Regenerate Narration';
    }
}

// ── UI Helpers ───────────────────────────────────────────────────────────────
let progressInterval = null;
function showLoading(text, sub) {
    loadingText.textContent = text;
    loadingSubtext.textContent = sub || 'Fetching complete history...';
    loadingOverlay.classList.add('active');
    
    // Reset and start progress bar
    if (progressBar) {
        progressBar.style.width = '0%';
        let progress = 0;
        if (progressInterval) clearInterval(progressInterval);
        
        progressInterval = setInterval(() => {
            if (progress < 90) {
                // Speed up initially, slow down as it gets near 90%
                const increment = (90 - progress) / 30;
                progress += increment;
                progressBar.style.width = `${progress}%`;
            }
        }, 500);
    }
}

function hideLoading() {
    if (progressInterval) clearInterval(progressInterval);
    if (progressBar) {
        progressBar.style.width = '100%';
        setTimeout(() => {
            loadingOverlay.classList.remove('active');
        }, 300);
    } else {
        loadingOverlay.classList.remove('active');
    }
}

function showError(msg) {
    errorText.textContent = msg;
    errorBanner.style.display = 'block';
}
function hideError() { errorBanner.style.display = 'none'; }
