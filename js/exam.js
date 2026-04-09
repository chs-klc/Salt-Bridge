/**
 * exam.js
 * Handles toggling of model answers in the Exam Challenge tab.
 */

/**
 * Show or hide a model answer block.
 * @param {string} id - The element id of the answer div.
 */
function toggleAnswer(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('hidden');
}
