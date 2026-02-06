"use strict";

export function initTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Toggle active tab button and panel.
            // Remove active class from all buttons and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // Add active class to clicked button and corresponding panel
            button.classList.add('active');
            const tabId = 'tab-' + button.dataset.tab;
            const targetPanel = document.getElementById(tabId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
}
