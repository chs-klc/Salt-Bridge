/**
 * tabs.js
 * Handles tab navigation: loading tab HTML fragments and switching between them.
 */

const TAB_IDS = ['concepts', 'simulation', 'porouspot', 'exam', 'misconceptions', 'summary', 'quiz'];

/**
 * Fetch and inject a tab's HTML content from tabs/<tabId>.html.
 * Runs MathJax typesetting after injection.
 */
async function loadTab(tabId) {
    const container = document.getElementById('tab-' + tabId);
    if (container.dataset.loaded === 'true') return; // already loaded

    try {
        const response = await fetch('tabs/' + tabId + '.html');
        if (!response.ok) throw new Error('Failed to fetch tab: ' + tabId);
        container.innerHTML = await response.text();
        container.dataset.loaded = 'true';

        if (window.MathJax) {
            MathJax.typesetPromise([container]);
        }
    } catch (err) {
        container.innerHTML = '<p class="text-red-500">Error loading content. Please refresh.</p>';
        console.error(err);
    }
}

/**
 * Switch the visible tab and highlight the correct nav button.
 */
async function switchTab(tabId) {
    // Hide all tabs and reset button styles
    TAB_IDS.forEach(id => {
        document.getElementById('tab-' + id).classList.remove('active');
        const btn = document.getElementById('btn-' + id);
        btn.classList.remove('bg-blue-100', 'text-blue-800');
        btn.classList.add('text-slate-600');
    });

    // Load content if not yet loaded
    await loadTab(tabId);

    // Show selected tab and highlight its button
    document.getElementById('tab-' + tabId).classList.add('active');
    const activeBtn = document.getElementById('btn-' + tabId);
    activeBtn.classList.remove('text-slate-600');
    activeBtn.classList.add('bg-blue-100', 'text-blue-800');

    // Special handling for the simulation tab
    if (tabId === 'simulation') {
        // Wait a tick for the canvas element to be in the DOM
        setTimeout(() => {
            initSimulation();
            resizeCanvas();
        }, 50);
    } else if (tabId === 'porouspot') {
        setTimeout(() => {
            initPorousPotSim();
            resizePorousPotCanvas();
        }, 50);
    }
}

// Load the default tab (concepts) on page load
window.addEventListener('DOMContentLoaded', () => {
    switchTab('concepts');
});
