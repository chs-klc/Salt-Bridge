/**
 * quiz.js
 * Handles the multiple-choice quiz: answer checking and feedback display.
 */

/**
 * Called when a quiz option button is clicked.
 * @param {HTMLButtonElement} btn - The button that was clicked.
 * @param {string} selectedOption - The option letter chosen (e.g. 'A').
 */
function checkQuiz(btn, selectedOption) {
    const container  = btn.closest('.quiz-q');
    const correct    = container.dataset.correct;
    const buttons    = container.querySelectorAll('button');
    const feedback   = container.querySelector('.feedback');

    // Disable all options in this question
    buttons.forEach(b => {
        b.disabled = true;
        b.classList.remove('hover:bg-slate-50');
        b.classList.add('cursor-not-allowed', 'opacity-50');
    });

    feedback.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');

    if (selectedOption === correct) {
        btn.classList.add('bg-green-200', 'border-green-500', 'opacity-100');
        btn.classList.remove('opacity-50');
        feedback.classList.add('bg-green-100', 'text-green-800');
        feedback.innerHTML = '<i class="fa-solid fa-check-circle"></i> Correct!';

        // Add question-specific explanations
        if (correct === 'B' && container.innerHTML.includes('particles pass')) {
            feedback.innerHTML += ' Electrons stay in the wire. Only mobile ions move through the bridge.';
        }
        if (correct === 'A' && container.innerHTML.includes('nitrate ions')) {
            feedback.innerHTML += ' Anions (negative) flow to the Anode (Zinc) to balance the newly formed positive Zn²⁺ ions.';
        }
        if (correct === 'C' && container.innerHTML.includes('unsuitable')) {
            feedback.innerHTML += ' PbCl₂ is insoluble. The precipitate blocks the salt bridge, stopping the cell.';
        }
    } else {
        btn.classList.add('bg-red-200', 'border-red-500', 'opacity-100');
        btn.classList.remove('opacity-50');
        feedback.classList.add('bg-red-100', 'text-red-800');
        feedback.innerHTML = '<i class="fa-solid fa-times-circle"></i> Incorrect. The correct answer is ' + correct + '.';
    }
}
