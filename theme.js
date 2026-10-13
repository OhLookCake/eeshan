var themeButton = document.querySelector('.theme-btn');

function updateThemeButton() {
    var dark = document.documentElement.classList.contains('dark');
    themeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="var(--theme-toggle-fill)"/></svg>';
    themeButton.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}

themeButton.addEventListener('click', function () {
    document.documentElement.classList.toggle('dark');
    var dark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme-eeshan', dark ? 'dark' : 'light');
    updateThemeButton();
});

updateThemeButton();
