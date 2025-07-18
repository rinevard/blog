// Customize the copy button behavior for Notion-like functionality
document.addEventListener('DOMContentLoaded', function () {
    // Wait for Prism to be fully loaded
    setTimeout(function () {
        if (typeof Prism !== 'undefined' && Prism.plugins && Prism.plugins.toolbar) {
            // Override Prism copy button settings
            Prism.plugins.toolbar.registerButton('copy-to-clipboard', function (env) {
                const button = document.createElement('button');
                button.className = 'copy-to-clipboard-button';
                button.textContent = 'Copy'; // Explicitly set the button text

                button.addEventListener('click', function () {
                    // Get the code text
                    const codeText = env.element.textContent;

                    // Copy to clipboard
                    navigator.clipboard.writeText(codeText).then(function () {
                        // Add temporary 'copied' class for visual feedback
                        button.classList.add('copied');
                        setTimeout(function () {
                            button.classList.remove('copied');
                        }, 300);
                    }).catch(function (err) {
                        console.error('Failed to copy text: ', err);
                    });
                });

                return button;
            });
        }
    }, 500); // Give time for Prism to initialize
}); 