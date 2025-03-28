/**
 * Transcript Handler
 * Manages transcript editing, saving, and retrieval
 */

(function () {
  // Store transcripts in memory
  let transcripts = {};
  let currentTranscript = "";
  let currentAudioFile = null;
  let isEditing = false;
  let autoSaveTimer = null;
  const AUTO_SAVE_DELAY = 2000; // 2 seconds

  // Initialize handler when document is ready
  document.addEventListener("DOMContentLoaded", function () {
    initTranscriptHandlers();
    loadStoredTranscripts();
  });

  // Initialize transcript editor handlers
  function initTranscriptHandlers() {
    const transcriptEditor = document.getElementById("transcript-editor");
    const saveButton = document.getElementById("save-transcript");
    const resetButton = document.getElementById("reset-transcript");
    const transcribeButton = document.getElementById("transcribe-audio");
    const spellcheckButton = document.getElementById("spellcheck-transcript");
    const autoSaveIndicator = document.getElementById("auto-save-indicator");

    // Listen for audio file loaded to update transcript
    document.addEventListener("app:audioLoaded", function (e) {
      if (e.detail?.fileName) {
        currentAudioFile = e.detail.fileName;
        loadTranscriptForFile(currentAudioFile);
      }
    });

    // Setup transcript editor input handling
    if (transcriptEditor) {
      transcriptEditor.addEventListener("input", function () {
        isEditing = true;

        if (autoSaveIndicator) {
          autoSaveIndicator.textContent = "Editing...";
          autoSaveIndicator.className = "text-warning";
        }

        // Clear previous timer if it exists
        if (autoSaveTimer) clearTimeout(autoSaveTimer);

        // Set new timer for auto-save
        autoSaveTimer = setTimeout(function () {
          if (isEditing && currentAudioFile) {
            saveTranscript();
          }
        }, AUTO_SAVE_DELAY);
      });

      // Focus handling
      transcriptEditor.addEventListener("focus", function () {
        addPulseBorderEffect(transcriptEditor);
      });

      transcriptEditor.addEventListener("blur", function () {
        removePulseBorderEffect(transcriptEditor);

        // Save on blur if there are changes
        if (isEditing && currentAudioFile) {
          saveTranscript();
        }
      });
    }

    // Save button click handler
    if (saveButton) {
      saveButton.addEventListener("click", function () {
        if (currentAudioFile) {
          saveTranscript();

          // Show visual feedback
          const originalText = saveButton.innerHTML;
          saveButton.innerHTML = '<i class="fas fa-check"></i> Saved!';
          saveButton.classList.add("btn-success");
          saveButton.classList.remove("btn-outline-success");

          setTimeout(() => {
            saveButton.innerHTML = originalText;
            saveButton.classList.remove("btn-success");
            saveButton.classList.add("btn-outline-success");
          }, 1500);
        }
      });
    }

    // Reset button click handler
    if (resetButton) {
      resetButton.addEventListener("click", function () {
        if (
          currentAudioFile &&
          confirm("Reset transcript to last saved version?")
        ) {
          loadTranscriptForFile(currentAudioFile);

          // Visual feedback
          showFeedback("Transcript reset to last saved version", "info");
        }
      });
    }

    // AI Transcribe button click handler
    if (transcribeButton) {
      transcribeButton.addEventListener("click", function () {
        if (!currentAudioFile) {
          showFeedback("No audio file selected", "error");
          return;
        }

        // Check if AI service is properly configured
        if (
          !window.aiServiceHandler ||
          !window.aiServiceHandler.hasValidCredentials()
        ) {
          showSettingsRequiredDialog();
          return;
        }

        // Get the current file from uploadedFiles
        const file = window.uploadedFiles.find(
          (f) => f.name === currentAudioFile
        );
        if (!file) {
          showFeedback("Audio file not found", "error");
          return;
        }

        // Show loading state
        transcribeButton.disabled = true;
        transcribeButton.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Transcribing...';

        // Use AI service to transcribe
        const aiSettings = window.settingsHandler.getAISettings();

        window.aiServiceHandler
          .transcribeAudio(aiSettings.provider, aiSettings.apiKey, file)
          .then((result) => {
            if (result.success && result.transcript) {
              // Update transcript editor
              const transcriptEditor =
                document.getElementById("transcript-editor");
              if (transcriptEditor) {
                transcriptEditor.value = result.transcript;

                // Save the new transcript
                saveTranscript();

                // Generate normalized text if needed
                if (
                  window.settingsHandler.getSettings().transcriptFormat ===
                  "ljspeech"
                ) {
                  const normalizedEditor =
                    document.getElementById("normalized-editor");
                  if (normalizedEditor) {
                    if (result.normalizedText) {
                      normalizedEditor.value = result.normalizedText;
                      window.settingsHandler.updateNormalizedText(
                        result.normalizedText,
                        currentAudioFile
                      );
                    } else {
                      window.aiServiceHandler
                        .normalizeText(
                          aiSettings.provider,
                          aiSettings.apiKey,
                          result.transcript
                        )
                        .then((normResult) => {
                          if (normResult.success && normResult.normalizedText) {
                            normalizedEditor.value = normResult.normalizedText;
                            window.settingsHandler.updateNormalizedText(
                              normResult.normalizedText,
                              currentAudioFile
                            );
                          }
                        });
                    }
                  }
                }

                showFeedback("Transcription complete!", "success");
              }
            } else {
              showFeedback(result.message || "Transcription failed", "error");
            }
          })
          .catch((error) => {
            console.error("Transcription error:", error);
            showFeedback("Error during transcription", "error");
          })
          .finally(() => {
            transcribeButton.disabled = false;
            transcribeButton.innerHTML =
              '<i class="fas fa-magic"></i> AI Transcribe';
          });
      });
    }

    // Spellcheck button click handler
    if (spellcheckButton) {
      spellcheckButton.addEventListener("click", function () {
        // This is a simple implementation since browsers have built-in spellcheck
        const transcriptEditor = document.getElementById("transcript-editor");
        if (transcriptEditor) {
          // Force spellcheck to run by toggling attributes
          const originalSpellcheck =
            transcriptEditor.getAttribute("spellcheck");
          transcriptEditor.setAttribute("spellcheck", "false");
          setTimeout(() => {
            transcriptEditor.setAttribute(
              "spellcheck",
              originalSpellcheck || "true"
            );
            transcriptEditor.focus();
            showFeedback(
              "Spellcheck enabled - misspelled words will be underlined",
              "info"
            );
          }, 100);
        }
      });
    }

    // Initialize normalized text handlers
    initNormalizedTextHandlers();
  }

  // Initialize normalized text handling
  function initNormalizedTextHandlers() {
    const normalizedEditor = document.getElementById("normalized-editor");
    const saveNormalizedBtn = document.getElementById("save-normalized");
    const resetNormalizedBtn = document.getElementById("reset-normalized");
    const regenerateNormalizedBtn = document.getElementById(
      "regenerate-normalized"
    );
    const normalizedAutoSaveIndicator = document.getElementById(
      "normalized-auto-save-indicator"
    );

    // Listen for input in normalized editor
    if (normalizedEditor) {
      normalizedEditor.addEventListener("input", function () {
        if (normalizedAutoSaveIndicator) {
          normalizedAutoSaveIndicator.textContent = "Editing...";
          normalizedAutoSaveIndicator.className = "text-warning";
        }

        // Auto-save normalized text
        if (currentAudioFile) {
          if (window.settingsHandler?.updateNormalizedText) {
            window.settingsHandler.updateNormalizedText(
              normalizedEditor.value,
              currentAudioFile
            );

            if (normalizedAutoSaveIndicator) {
              setTimeout(() => {
                normalizedAutoSaveIndicator.textContent = "Saved";
                normalizedAutoSaveIndicator.className = "text-success";
              }, 300);
            }
          }
        }
      });

      // Focus effect
      normalizedEditor.addEventListener("focus", function () {
        addPulseBorderEffect(normalizedEditor);
      });

      normalizedEditor.addEventListener("blur", function () {
        removePulseBorderEffect(normalizedEditor);
      });
    }

    // Save normalized button
    if (saveNormalizedBtn) {
      saveNormalizedBtn.addEventListener("click", function () {
        if (currentAudioFile && normalizedEditor) {
          if (window.settingsHandler?.updateNormalizedText) {
            window.settingsHandler.updateNormalizedText(
              normalizedEditor.value,
              currentAudioFile
            );

            // Visual feedback
            const originalText = saveNormalizedBtn.innerHTML;
            saveNormalizedBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
            saveNormalizedBtn.classList.add("btn-success");
            saveNormalizedBtn.classList.remove("btn-outline-success");

            setTimeout(() => {
              saveNormalizedBtn.innerHTML = originalText;
              saveNormalizedBtn.classList.remove("btn-success");
              saveNormalizedBtn.classList.add("btn-outline-success");
            }, 1500);
          }
        }
      });
    }

    // Reset normalized button
    if (resetNormalizedBtn) {
      resetNormalizedBtn.addEventListener("click", function () {
        if (currentAudioFile && confirm("Reset normalized text?")) {
          if (window.settingsHandler?.getNormalizedText) {
            const normalizedText =
              window.settingsHandler.getNormalizedText(currentAudioFile) || "";
            if (normalizedEditor) {
              normalizedEditor.value = normalizedText;
            }
          }
        }
      });
    }

    // Regenerate normalized button
    if (regenerateNormalizedBtn) {
      regenerateNormalizedBtn.addEventListener("click", function () {
        if (!currentAudioFile) {
          showFeedback("No audio file selected", "error");
          return;
        }

        const transcriptEditor = document.getElementById("transcript-editor");
        if (!transcriptEditor || !transcriptEditor.value) {
          showFeedback("No transcript to normalize", "warning");
          return;
        }

        // Check AI service configuration
        if (
          !window.aiServiceHandler ||
          !window.aiServiceHandler.hasValidCredentials()
        ) {
          showSettingsRequiredDialog();
          return;
        }

        // Show loading state
        regenerateNormalizedBtn.disabled = true;
        regenerateNormalizedBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Generating...';

        // Use AI to normalize text
        const aiSettings = window.settingsHandler.getAISettings();

        window.aiServiceHandler
          .normalizeText(
            aiSettings.provider,
            aiSettings.apiKey,
            transcriptEditor.value
          )
          .then((result) => {
            if (result.success && result.normalizedText) {
              // Update normalized editor
              if (normalizedEditor) {
                normalizedEditor.value = result.normalizedText;

                // Save the normalized text
                if (window.settingsHandler?.updateNormalizedText) {
                  window.settingsHandler.updateNormalizedText(
                    result.normalizedText,
                    currentAudioFile
                  );
                }

                showFeedback("Text normalized successfully", "success");
              }
            } else {
              showFeedback(result.message || "Normalization failed", "error");
            }
          })
          .catch((error) => {
            console.error("Normalization error:", error);
            showFeedback("Error during normalization", "error");
          })
          .finally(() => {
            regenerateNormalizedBtn.disabled = false;
            regenerateNormalizedBtn.innerHTML =
              '<i class="fas fa-sync-alt"></i> Auto-Generate';
          });
      });
    }
  }

  // Save current transcript
  function saveTranscript() {
    if (!currentAudioFile) return;

    const transcriptEditor = document.getElementById("transcript-editor");
    const autoSaveIndicator = document.getElementById("auto-save-indicator");

    if (transcriptEditor) {
      currentTranscript = transcriptEditor.value;
      transcripts[currentAudioFile] = currentTranscript;

      // Save to localStorage
      saveTranscriptsToStorage();

      // Update UI to show saved state
      isEditing = false;

      if (autoSaveIndicator) {
        autoSaveIndicator.textContent = "Saved";
        autoSaveIndicator.className = "text-success";
      }

      // Dispatch event for other components
      document.dispatchEvent(
        new CustomEvent("app:transcriptSaved", {
          detail: {
            fileName: currentAudioFile,
            transcript: currentTranscript,
          },
        })
      );
    }
  }

  // Load transcript for a specific file
  function loadTranscriptForFile(fileName) {
    if (!fileName) return;

    const transcriptEditor = document.getElementById("transcript-editor");
    const normalizedEditor = document.getElementById("normalized-editor");

    if (transcriptEditor) {
      // Get transcript from memory or empty string if not found
      currentTranscript = transcripts[fileName] || "";
      transcriptEditor.value = currentTranscript;

      // Reset editing state
      isEditing = false;

      // Update normalized text if relevant
      if (normalizedEditor && window.settingsHandler?.getNormalizedText) {
        const normalizedText =
          window.settingsHandler.getNormalizedText(fileName) || "";
        normalizedEditor.value = normalizedText;
      }

      // Update UI indicators
      const autoSaveIndicator = document.getElementById("auto-save-indicator");
      if (autoSaveIndicator) {
        autoSaveIndicator.textContent = currentTranscript
          ? "All changes saved"
          : "No transcript yet";
        autoSaveIndicator.className = "text-success";
      }
    }
  }

  // Load transcripts from localStorage
  function loadStoredTranscripts() {
    try {
      const storedTranscripts = localStorage.getItem("transcripts");
      if (storedTranscripts) {
        transcripts = JSON.parse(storedTranscripts);
      }
    } catch (error) {
      console.error("Error loading transcripts:", error);
    }
  }

  // Save transcripts to localStorage
  function saveTranscriptsToStorage() {
    try {
      localStorage.setItem("transcripts", JSON.stringify(transcripts));
    } catch (error) {
      console.error("Error saving transcripts:", error);
    }
  }

  // Show feedback message
  function showFeedback(message, type = "info") {
    // Create a feedback toast
    const toast = document.createElement("div");
    toast.className = `toast-notification toast-${type}`;

    // Add styles directly for simplicity
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 16px;
      background-color: var(--card-bg, white);
      color: var(--text-primary, black);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      min-width: 300px;
      z-index: 9999;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
    `;

    // Toast variant styling
    const colors = {
      success: "var(--success-color, #0cce6b)",
      info: "var(--accent-color, #00c6ff)",
      warning: "var(--warning-color, #ffd166)",
      error: "var(--danger-color, #ef476f)",
    };

    // Icon styling
    const iconDiv = document.createElement("div");
    iconDiv.style.cssText = `
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: ${colors[type] || colors.info};
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      color: white;
    `;

    // Message styling
    const messageDiv = document.createElement("div");
    messageDiv.style.cssText = `
      flex: 1;
      font-weight: 500;
      color: var(--text-primary, black);
    `;

    // Add content
    iconDiv.innerHTML = `<i class="fas fa-${getIconForType(type)} fa-sm"></i>`;
    messageDiv.textContent = message;

    // Clear previous content and add new content
    toast.innerHTML = "";
    toast.appendChild(iconDiv);
    toast.appendChild(messageDiv);

    // Add to document
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.style.transform = "translateY(0)";
      toast.style.opacity = "1";
    }, 10);

    // Auto remove after 4 seconds
    setTimeout(() => {
      toast.style.transform = "translateY(10px)";
      toast.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 4000);
  }

  // Get appropriate icon for feedback type
  function getIconForType(type) {
    switch (type) {
      case "success":
        return "check-circle";
      case "warning":
        return "exclamation-triangle";
      case "error":
        return "times-circle";
      default:
        return "info-circle";
    }
  }

  // Show dialog for missing AI settings
  function showSettingsRequiredDialog() {
    // Create dialog element
    const dialog = document.createElement("div");
    dialog.className = "settings-dialog";
    dialog.innerHTML = `
      <div class="settings-dialog-content">
        <div class="settings-dialog-header">
          <h5><i class="fas fa-cog me-2"></i>AI Configuration Required</h5>
          <button class="btn-close" id="close-settings-dialog"></button>
        </div>
        <div class="settings-dialog-body">
          <p>AI services require API keys to be configured in Settings.</p>
          <p>Would you like to go to the Settings page to set up your API keys?</p>
        </div>
        <div class="settings-dialog-footer">
          <button class="btn btn-secondary" id="cancel-settings-dialog">Cancel</button>
          <button class="btn btn-primary" id="goto-settings">Go to Settings</button>
        </div>
      </div>
    `;

    // Add styles
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    // Dialog content styles
    const dialogContent = dialog.querySelector(".settings-dialog-content");
    if (dialogContent) {
      dialogContent.style.cssText = `
        background-color: var(--card-bg, white);
        color: var(--text-primary, black);
        border-radius: 10px;
        width: 100%;
        max-width: 500px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        transform: translateY(-20px);
        transition: transform 0.3s ease;
      `;
    }

    // Header styles
    const dialogHeader = dialog.querySelector(".settings-dialog-header");
    if (dialogHeader) {
      dialogHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(var(--border-color-rgb, 0, 0, 0), 0.1);
        color: var(--text-primary, black);
      `;
    }

    // Body styles
    const dialogBody = dialog.querySelector(".settings-dialog-body");
    if (dialogBody) {
      dialogBody.style.cssText = `
        padding: 20px;
        color: var(--text-primary, black);
      `;
    }

    // Footer styles
    const dialogFooter = dialog.querySelector(".settings-dialog-footer");
    if (dialogFooter) {
      dialogFooter.style.cssText = `
        padding: 16px 20px;
        border-top: 1px solid rgba(var(--border-color-rgb, 0, 0, 0), 0.1);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      `;
    }

    // Add to document
    document.body.appendChild(dialog);

    // Animation
    setTimeout(() => {
      dialog.style.opacity = "1";
      if (dialogContent) {
        dialogContent.style.transform = "translateY(0)";
      }
    }, 10);

    // Close handlers
    function closeDialog() {
      dialog.style.opacity = "0";
      if (dialogContent) {
        dialogContent.style.transform = "translateY(-20px)";
      }
      setTimeout(() => {
        document.body.removeChild(dialog);
      }, 300);
    }

    // Button click handlers
    dialog
      .querySelector("#close-settings-dialog")
      ?.addEventListener("click", closeDialog);
    dialog
      .querySelector("#cancel-settings-dialog")
      ?.addEventListener("click", closeDialog);
    dialog
      .querySelector("#goto-settings")
      ?.addEventListener("click", function () {
        closeDialog();
        document.getElementById("settings-tab")?.click();
      });
  }

  // Add pulse border effect to focused textarea
  function addPulseBorderEffect(element) {
    element.style.borderColor = "var(--primary-color)";
    element.style.boxShadow = "0 0 0 3px rgba(58, 134, 255, 0.15)";
  }

  // Remove pulse border effect
  function removePulseBorderEffect(element) {
    element.style.borderColor = "";
    element.style.boxShadow = "";
  }

  // Export public API
  window.transcriptHandler = {
    saveTranscript: saveTranscript,
    getAllTranscripts: function () {
      return { ...transcripts };
    },
    getTranscript: function (fileName) {
      return transcripts[fileName] || "";
    },
    setTranscript: function (fileName, text) {
      if (fileName) {
        transcripts[fileName] = text || "";
        saveTranscriptsToStorage();

        // Update current transcript if this is the current file
        if (fileName === currentAudioFile) {
          currentTranscript = text || "";
          const transcriptEditor = document.getElementById("transcript-editor");
          if (transcriptEditor) {
            transcriptEditor.value = currentTranscript;
          }
        }
      }
    },
    clearTranscripts: function () {
      if (
        confirm(
          "Are you sure you want to clear all transcripts? This cannot be undone."
        )
      ) {
        transcripts = {};
        saveTranscriptsToStorage();
        return true;
      }
      return false;
    },
  };
})();
