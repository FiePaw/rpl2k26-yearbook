// Enable scroll on non-landing pages
document.addEventListener('DOMContentLoaded', function() {
    // Check if page has main-content (non-landing pages)
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        document.body.classList.add('has-main-content');
    }
});
