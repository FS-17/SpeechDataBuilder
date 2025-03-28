/**
 * Speech Data Builder Utilities
 * Essential utilities for the application
 */

// Helper functions for UI feedback
const uiHelpers = {
  // Show feedback message
  showFeedback(message, type = "info") {
    const existingFeedback = document.getElementById("keyboard-feedback");
    if (existingFeedback) {
      existingFeedback.remove();
    }

    const feedback = document.createElement("div");
    feedback.id = "keyboard-feedback";

    // Get colors from CSS variables
    const colors = {
      info: "var(--accent-color, #00c6ff)",
      success: "var(--success-color, #0cce6b)",
      warning: "var(--warning-color, #ffd166)",
      error: "var(--danger-color, #ef476f)",
    };

    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--card-background, white);
      color: ${colors[type] || colors.info};
      border-left: 4px solid ${colors[type] || colors.info};
      border-radius: 8px;
      padding: 12px 20px;
      box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.1));
      z-index: 9999;
      font-weight: 500;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    // Add icon based on feedback type
    const icons = {
      info: "fa-info-circle",
      success: "fa-check-circle",
      warning: "fa-exclamation-triangle",
      error: "fa-times-circle",
    };

    feedback.innerHTML = `
      <i class="fas ${icons[type] || icons.info}"></i>
      ${message}
    `;

    document.body.appendChild(feedback);

    // Fade in
    setTimeout(() => {
      feedback.style.opacity = "1";
    }, 10);

    // Automatically remove after 2 seconds
    setTimeout(() => {
      feedback.style.opacity = "0";
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 300);
    }, 2000);
  },
};

// Export to global scope
window.uiHelpers = uiHelpers;
