const pickButton = document.getElementById('pick-prompt');
const prompts = Array.from(document.querySelectorAll('.prompt-card'));
let previous = -1;
pickButton.hidden = false;
pickButton.addEventListener('click', () => {
    // Choose a different prompt on consecutive clicks.
    let index = Math.floor(Math.random() * (previous === -1 ? prompts.length : prompts.length - 1));
    if (index >= previous && previous !== -1) index += 1;
    if (previous !== -1) prompts[previous].classList.remove('selected');
    const prompt = prompts[index];
    prompt.classList.add('selected');
    document.getElementById('prompt-announcement').textContent =
        `November ${index + 1}: ${prompt.querySelector('h3').textContent}.`;
    prompt.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    previous = index;
});
