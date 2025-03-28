/**
 * Settings Handler
 * Manages application settings, particularly transcript format options
 */

(function () {
  // Default settings
  const DEFAULT_SETTINGS = {
    transcriptFormat: "default", // default, ljspeech, commonvoice, custom
    customFormat: {
      delimiter: "|",
      includeMetadata: false,
      template: "{filename}{delimiter}{transcript}",
    },
    audioSettings: {
      autoPlay: false,
      // playbackRate removed as it's now controlled directly from the UI
    },
    ljspeechOptions: {
      normalizeText: true,
      manualNormalized: {}, // Store manually entered normalized text by filename
      currentNormalizedText: "", // Currently edited normalized text
      preserveNonLatinCharacters: true, // Add new option for handling non-Latin scripts
    },
    aiSettings: {
      provider: "", // GOOGLE_AI_STUDIO, OPENAI
      apiKey: "", // Encrypted or hashed in production
      activeModel: "",
    },
  };

  // Storage key for settings
  const SETTINGS_STORAGE_KEY = "speech-data-builder-settings";

  // Format definitions
  const FORMAT_DEFINITIONS = {
    default: {
      name: "Default",
      description: "Simple filename and transcript pairs using comma separator",
      example:
        "file1.wav,This is the transcript for file one.\nfile2.wav,This is the transcript for file two.",
      formatter: (fileName, transcript) => {
        return `${fileName},${transcript}`;
      },
    },
    ljspeech: {
      name: "LJSpeech",
      description:
        "Format used by LJSpeech dataset with three columns: filename|raw text|normalized text",
      example:
        "file1|This is the transcript for file one.|this is the transcript for file one\nfile2|This is transcript #2!|this is transcript number two",
      formatter: (fileName, transcript) => {
        // Strip extension from filename for LJSpeech format
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        // Create normalized text version
        const normalizedText = normalizeTranscript(transcript);
        return `${baseName}|${transcript}|${normalizedText}`;
      },
    },
    commonvoice: {
      name: "Common Voice",
      description: "CSV format similar to Mozilla Common Voice dataset",
      example:
        'client_id,path,sentence,up_votes,down_votes,age,gender,accent\n,file1.mp3,"This is the transcript for file one.",,,,,\n,file2.mp3,"This is the transcript for file two.",,,,,',
      formatter: (fileName, transcript) => {
        // Format as CSV with Common Voice fields
        return `,"${fileName}","${transcript.replace(/"/g, '""')}",,,,,"`;
      },
    },
    custom: {
      name: "Custom",
      description: "Custom format with configurable delimiter and template",
      example: "[Configurable based on settings]",
      formatter: (fileName, transcript, settings) => {
        const { delimiter, template } = settings.customFormat;
        return template
          .replace("{filename}", fileName)
          .replace("{transcript}", transcript)
          .replace("{delimiter}", delimiter);
      },
    },
  };

  // Helper function to normalize text for LJSpeech format
  function normalizeTranscript(text) {
    if (!text) return "";

    // Detect if the text contains mainly non-Latin script (e.g., Arabic)
    const nonLatinPattern =
      /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u1100-\u11FF\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/;
    const hasNonLatin = nonLatinPattern.test(text);

    // Check if we should preserve non-Latin script handling
    const settings = window.settingsHandler?.getSettings();
    const preserveNonLatin =
      settings?.ljspeechOptions?.preserveNonLatinCharacters !== false;

    // If the text is mainly non-Latin and preservation is enabled, use specialized handling
    if (hasNonLatin && preserveNonLatin) {
      return normalizeNonLatinText(text);
    }

    // Otherwise, use standard Latin normalization
    return normalizeLatinText(text);
  }

  // Function to handle normalization of non-Latin scripts (like Arabic)
  function normalizeNonLatinText(text) {
    // For non-Latin scripts, we want to be more careful with normalization
    // to preserve the script's integrity

    // Remove specific punctuation but keep the core text intact
    let normalized = text.replace(/[!?.,:;'"،؛]/g, " ");

    // Handle digits for both Arabic and Latin numbers
    // Arabic numerals ٠١٢٣٤٥٦٧٨٩
    const arabicDigits = {
      "٠": "صفر",
      "١": "واحد",
      "٢": "اثنان",
      "٣": "ثلاثة",
      "٤": "أربعة",
      "٥": "خمسة",
      "٦": "ستة",
      "٧": "سبعة",
      "٨": "ثمانية",
      "٩": "تسعة",
    };

    // Replace Arabic numerals with their word equivalents
    for (const [digit, word] of Object.entries(arabicDigits)) {
      const regex = new RegExp(digit, "g");
      normalized = normalized.replace(regex, word);
    }

    // Handle Latin numerals that might be mixed in
    normalized = normalized.replace(/\d+/g, (match) => {
      // Convert to equivalent in the detected language
      // This is a simplified approach - would need expansion for complex numbers
      return match
        .split("")
        .map((d) => {
          // Map Latin digits 0-9 to their word equivalents based on context
          // For now, just keep the digits (could be expanded with a proper mapping)
          return d;
        })
        .join(" ");
    });

    // Clean up extra spaces
    normalized = normalized.replace(/\s+/g, " ").trim();

    return normalized;
  }

  // Function to handle normalization of Latin scripts (English, etc.)
  function normalizeLatinText(text) {
    // Original Latin script normalization logic
    // 1. Convert to lowercase
    // 2. Replace numbers with words
    // 3. Remove most punctuation
    let normalized = text.toLowerCase();

    // Replace common numbers
    const numberMap = {
      0: "zero",
      1: "one",
      2: "two",
      3: "three",
      4: "four",
      5: "five",
      6: "six",
      7: "seven",
      8: "eight",
      9: "nine",
      10: "ten",
      11: "eleven",
      12: "twelve",
      13: "thirteen",
      14: "fourteen",
      15: "fifteen",
      16: "sixteen",
      17: "seventeen",
      18: "eighteen",
      19: "nineteen",
      20: "twenty",
      30: "thirty",
      40: "forty",
      50: "fifty",
      60: "sixty",
      70: "seventy",
      80: "eighty",
      90: "ninety",
      100: "one hundred",
      1000: "one thousand",
    };

    // Replace numbers with their word equivalents
    Object.entries(numberMap).forEach(([num, word]) => {
      const regex = new RegExp(`\\b${num}\\b`, "g");
      normalized = normalized.replace(regex, word);
    });

    // Handle other numbers not in map (simple digits)
    normalized = normalized.replace(/\d+/g, (match) => {
      return match
        .split("")
        .map((d) => numberMap[d] || d)
        .join(" ");
    });

    // Remove special characters except apostrophes in words
    normalized = normalized
      .replace(/[^\w\s']|_/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return normalized;
  }

  // Initialize settings
  let currentSettings = { ...DEFAULT_SETTINGS };

  // Current audio file being edited - needed to associate normalized text
  let currentAudioFile = null;

  // Load settings when DOM is ready
  document.addEventListener("DOMContentLoaded", function () {
    loadSettings();

    // Set up settings tab
    const settingsTab = document.getElementById("settings-tab");
    if (settingsTab) {
      settingsTab.addEventListener("click", function (e) {
        e.preventDefault();
        showSettingsUI();
      });
    }

    // Listen for audio file load to update the normalized text field
    document.addEventListener("app:audioLoaded", function (e) {
      if (e.detail && e.detail.fileName) {
        currentAudioFile = e.detail.fileName;

        // Update normalized text field if it exists
        updateNormalizedTextField();
      }
    });

    // Listen for transcript changes to potentially update normalized text
    document.addEventListener("app:transcriptSaved", function (e) {
      if (e.detail && e.detail.fileName && e.detail.transcript) {
        if (
          currentSettings.transcriptFormat === "ljspeech" &&
          currentSettings.ljspeechOptions.normalizeText
        ) {
          // Generate normalized text for this file
          const normalizedText = normalizeTranscript(e.detail.transcript);

          // Store it if we don't have a manual override
          if (
            !currentSettings.ljspeechOptions.manualNormalized[e.detail.fileName]
          ) {
            currentSettings.ljspeechOptions.manualNormalized[
              e.detail.fileName
            ] = normalizedText;

            // If this is current file, update field if it exists
            if (e.detail.fileName === currentAudioFile) {
              updateNormalizedTextField();
            }
          }
        }
      }
    });

    // Listen for transcript format changes and update UI
    document
      .getElementById("transcript-format")
      ?.addEventListener("change", function () {
        const format = this.value;
        const normalizedColumn = document.getElementById("normalized-column");

        if (normalizedColumn) {
          if (format === "ljspeech") {
            normalizedColumn.classList.remove("d-none");
          } else {
            normalizedColumn.classList.add("d-none");
          }
        }

        // Save the new format
        if (currentSettings) {
          currentSettings.transcriptFormat = format;
          saveSettings();
        }

        // Notify about format change
        document.dispatchEvent(
          new CustomEvent("app:formatChanged", {
            detail: { format },
          })
        );
      });

    // If we have saved API settings, validate the key in the background
    setTimeout(function () {
      if (
        currentSettings.aiSettings &&
        currentSettings.aiSettings.provider &&
        currentSettings.aiSettings.apiKey &&
        window.aiServiceHandler
      ) {
        // Test the API key silently on startup to validate it's still working
        window.aiServiceHandler
          .testConnection(
            currentSettings.aiSettings.provider,
            currentSettings.aiSettings.apiKey
          )
          .then((result) => {
            if (result.success) {
              console.log("Saved API key validated successfully");

              // Optional: Show a small notification that the API key is valid
              const notification = document.createElement("div");
              notification.className = "alert alert-success";
              notification.style.position = "fixed";
              notification.style.bottom = "10px";
              notification.style.right = "10px";
              notification.style.zIndex = "9999";
              notification.style.padding = "5px 15px";
              notification.style.fontSize = "0.9rem";
              notification.innerHTML = `<i class="fas fa-check-circle me-2"></i>Connected to ${
                result.message.split("to ")[1] || "AI service"
              }`;

              document.body.appendChild(notification);

              // Remove notification after 3 seconds
              setTimeout(() => {
                notification.style.opacity = "0";
                notification.style.transition = "opacity 0.5s ease";
                setTimeout(() => {
                  if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                  }
                }, 500);
              }, 3000);
            } else {
              console.warn("Saved API key validation failed:", result.message);
            }
          })
          .catch((err) => {
            console.error("Error validating saved API key:", err);
          });
      }
    }, 2000); // Wait for other components to initialize
  });

  // Update the normalized text field on the settings UI if it exists
  function updateNormalizedTextField() {
    const normalizedInput = document.getElementById("ljspeech-normalized-text");
    if (normalizedInput && currentAudioFile) {
      // Get stored normalized text for this file, or empty string if none
      const normalizedText =
        currentSettings.ljspeechOptions.manualNormalized[currentAudioFile] ||
        "";
      normalizedInput.value = normalizedText;
      currentSettings.ljspeechOptions.currentNormalizedText = normalizedText;

      // Log for debugging
      console.log(`Updated normalized text field for: ${currentAudioFile}`);
    }
  }

  // Load settings from localStorage
  function loadSettings() {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        currentSettings = JSON.parse(storedSettings);
        console.log("Settings loaded:", currentSettings);
      }

      // Dispatch event to notify that settings are loaded
      document.dispatchEvent(
        new CustomEvent("app:settingsLoaded", {
          detail: { settings: currentSettings },
        })
      );

      // Update UI elements based on loaded settings
      setTimeout(() => {
        updateUIForCurrentFormat(currentSettings.transcriptFormat);
      }, 0);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  // Helper function to update UI based on format
  function updateUIForCurrentFormat(format) {
    const normalizedColumn = document.getElementById("normalized-column");
    if (normalizedColumn) {
      // Only show if format is ljspeech AND an audio file is loaded
      if (format === "ljspeech" && window.audioLoaded) {
        normalizedColumn.classList.remove("d-none");
      } else {
        normalizedColumn.classList.add("d-none");
      }
    }
  }

  // Save settings to localStorage
  function saveSettings() {
    try {
      // Before saving to localStorage, optionally encrypt the API key for better security
      const settingsToSave = JSON.parse(JSON.stringify(currentSettings));

      // For enhanced security in a production environment, you could encrypt the API key
      // settingsToSave.aiSettings.apiKey = encryptApiKey(settingsToSave.aiSettings.apiKey);

      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(settingsToSave)
      );
      console.log("Settings saved:", settingsToSave);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  }

  // Show settings UI
  function showSettingsUI() {
    // Hide other UI components
    document.getElementById("file-sidebar").classList.add("d-none");
    document.getElementById("audio-editor").classList.add("d-none");

    const exportContainer = document.getElementById("export-container");
    if (exportContainer) exportContainer.classList.add("d-none");

    // Set this tab as active
    document
      .querySelectorAll(".nav-link")
      .forEach((tab) => tab.classList.remove("active"));
    document.getElementById("settings-tab").classList.add("active");

    // Create settings UI if it doesn't exist
    let settingsUI = document.getElementById("settings-container");
    if (!settingsUI) {
      settingsUI = createSettingsUI();
      document.querySelector(".main-page").appendChild(settingsUI);
    }

    // Show settings UI
    settingsUI.classList.remove("d-none");

    // Update UI to reflect current settings
    updateSettingsUI();
  }

  // Create settings UI
  function createSettingsUI() {
    const settingsUI = document.createElement("div");
    settingsUI.id = "settings-container";
    settingsUI.className = "row mt-4";

    settingsUI.innerHTML = `
      <div class="col-md-8 offset-md-2">
        <div class="card">
          <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Settings</h5>
          </div>
          
          <div class="card-body">
            <!-- Transcript Format Settings -->
            <div class="mb-4">
              <h5>Transcript Format</h5>
              <p class="text-muted small">Choose how transcripts will be formatted when exported</p>
              
              <div class="form-group mb-3">
                <label for="transcript-format" class="form-label">Format Style</label>
                <select id="transcript-format" class="form-select">
                  <option value="default">Default</option>
                  <option value="ljspeech">LJSpeech</option>
                  <option value="commonvoice">Common Voice</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              
              <!-- Custom Format Options (initially hidden) -->
              <div id="custom-format-options" class="border rounded p-3 mb-3 bg-light d-none">
                <div class="form-group mb-3">
                  <label for="custom-delimiter" class="form-label">Delimiter</label>
                  <input type="text" id="custom-delimiter" class="form-control" value="|">
                </div>
                <div class="form-group mb-3">
                  <label for="custom-template" class="form-label">Template</label>
                  <input type="text" id="custom-template" class="form-control" value="{filename}{delimiter}{transcript}">
                  <small class="form-text text-muted">
                    Available variables: {filename}, {transcript}, {delimiter}
                  </small>
                </div>
              </div>
              
              <!-- Normalization Options for LJSpeech format -->
              <div id="ljspeech-format-options" class="border rounded p-3 mb-3 bg-light d-none">
                <div class="form-group mb-3">
                  <div class="form-check">
                    <input type="checkbox" id="preserve-non-latin" class="form-check-input" checked>
                    <label for="preserve-non-latin" class="form-check-label">Preserve non-Latin scripts (Arabic, Chinese, etc.)</label>
                    <small class="form-text text-muted d-block">
                      Enables special handling for languages like Arabic to maintain proper normalization.
                    </small>
                  </div>
                </div>
              </div>
              
              <!-- Format Preview -->
              <div class="border rounded p-3 mb-3">
                <label class="form-label">Format Preview</label>
                <div class="format-description text-muted small mb-2" id="format-description"></div>
                <pre class="bg-light p-2 rounded" id="format-preview" style="max-height: 100px; overflow-y: auto;"></pre>
              </div>
            </div>
            
            <!-- AI Integration Settings -->
            <div class="mb-4">
              <h5>AI Integration</h5>
              <p class="text-muted small">Configure AI services for transcript generation</p>
              
              <div class="form-group mb-3">
                <label for="ai-provider" class="form-label">Service Provider</label>
                <select id="ai-provider" class="form-select">
                  <option value="">None (Manual transcription only)</option>
                  <option value="OPENAI">OpenAI (Whisper for audio, GPT for text)</option>
                  <option value="GOOGLE_AI_STUDIO">Google AI Studio (Gemini)</option>
                </select>
              </div>
              
              <div id="api-key-container" class="mb-3 d-none">
                <label for="api-key" class="form-label">API Key</label>
                <div class="input-group">
                  <input type="password" id="api-key" class="form-control" placeholder="Enter your API key">
                  <button class="btn btn-outline-secondary" type="button" id="toggle-api-key">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button class="btn btn-outline-primary" type="button" id="test-api-key">
                    Test Connection
                  </button>
                </div>
                <div id="api-key-status" class="form-text mt-2"></div>
                <div class="form-text text-muted mt-1">
                  <i class="fas fa-info-circle"></i> 
                  Your API key is stored locally in your browser and is never sent to our servers.
                </div>
              </div>
              
              <div id="model-selection-container" class="mb-3 d-none">
                <label for="ai-model" class="form-label">Model</label>
                <select id="ai-model" class="form-select">
                  <!-- Will be populated dynamically -->
                </select>
                <div class="form-text text-muted mt-1">
                  <i class="fas fa-info-circle"></i> 
                  Select the AI model to use for text generation
                </div>
              </div>
              
              <div id="provider-info" class="alert alert-info d-none">
                <span id="provider-docs-message"></span>
                <a href="#" target="_blank" id="provider-docs-link">Learn more</a>
              </div>
            </div>
            
            <!-- Audio Playback Settings -->
            <div class="mb-4">
              <h5>Audio Playback</h5>
              <div class="form-check mb-2">
                <input class="form-check-input" type="checkbox" id="auto-play">
                <label class="form-check-label" for="auto-play">
                  Auto-play when selecting files
                </label>
              </div>
              <!-- Playback rate option removed as it's now in the main UI -->
            </div>
            
            <!-- Data Management Settings -->
            <div class="mb-4">
              <h5>Data Management</h5>
              <p class="text-muted small">Manage locally stored data and cache</p>
              
              <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Clearing cache will delete all saved transcripts and normalized text. This action cannot be undone.
              </div>
              
              <button id="clear-cache-btn" class="btn btn-outline-danger">
                <i class="fas fa-trash-alt me-2"></i>Clear Cache
              </button>
              <div id="clear-cache-status" class="mt-2"></div>
            </div>
            
            <!-- Actions -->
            <div class="d-flex justify-content-between">
              <button id="reset-settings" class="btn btn-outline-secondary">
                Reset to Defaults
              </button>
              <button id="save-settings" class="btn btn-primary">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add event listeners after creating the UI
    setTimeout(() => {
      // Format selection change
      document
        .getElementById("transcript-format")
        .addEventListener("change", function () {
          const format = this.value;

          // Show/hide custom format options
          const customOptions = document.getElementById(
            "custom-format-options"
          );
          if (customOptions) {
            customOptions.classList.toggle("d-none", format !== "custom");
          }

          // Show/hide LJSpeech format options
          const ljspeechOptions = document.getElementById(
            "ljspeech-format-options"
          );
          if (ljspeechOptions) {
            ljspeechOptions.classList.toggle("d-none", format !== "ljspeech");
          }

          // Update preview and notify about format change
          updateFormatPreview(format);
          document.dispatchEvent(new CustomEvent("app:settingsChanged"));
        });

      // Custom format changes
      const customDelimiter = document.getElementById("custom-delimiter");
      const customTemplate = document.getElementById("custom-template");

      if (customDelimiter) {
        customDelimiter.addEventListener("input", () =>
          updateCustomFormatPreview()
        );
      }

      if (customTemplate) {
        customTemplate.addEventListener("input", () =>
          updateCustomFormatPreview()
        );
      }

      // Non-Latin script preservation setting
      const preserveNonLatinCheck =
        document.getElementById("preserve-non-latin");
      if (preserveNonLatinCheck) {
        preserveNonLatinCheck.addEventListener("change", function () {
          // Update the setting immediately
          currentSettings.ljspeechOptions.preserveNonLatinCharacters =
            this.checked;
          // Update preview
          updateFormatPreview(currentSettings.transcriptFormat);
        });
      }

      // Save settings
      document
        .getElementById("save-settings")
        .addEventListener("click", function () {
          saveSettingsFromUI();

          // Show success message
          const successMsg = document.createElement("div");
          successMsg.className = "alert alert-success";
          successMsg.innerHTML =
            '<i class="fas fa-check-circle me-2"></i>Settings saved successfully!';
          successMsg.style.position = "fixed";
          successMsg.style.top = "10px";
          successMsg.style.right = "10px";
          successMsg.style.zIndex = "9999";
          successMsg.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
          document.body.appendChild(successMsg);

          // Remove message after 2 seconds
          setTimeout(() => {
            successMsg.style.opacity = "0";
            successMsg.style.transition = "opacity 0.5s ease-out";
            setTimeout(() => {
              if (successMsg.parentNode) {
                successMsg.parentNode.removeChild(successMsg);
              }
            }, 500);
          }, 2000);
        });

      // Reset settings
      document
        .getElementById("reset-settings")
        .addEventListener("click", function () {
          if (confirm("Reset all settings to default values?")) {
            currentSettings = { ...DEFAULT_SETTINGS };
            updateSettingsUI();
            saveSettings();
          }
        });

      // Back to main UI
      document
        .getElementById("files-tab")
        .addEventListener("click", function () {
          const settingsUI = document.getElementById("settings-container");
          if (settingsUI) settingsUI.classList.add("d-none");

          document.getElementById("file-sidebar").classList.remove("d-none");
          document.getElementById("audio-editor").classList.remove("d-none");

          document
            .querySelectorAll(".nav-link")
            .forEach((tab) => tab.classList.remove("active"));
          this.classList.add("active");
        });

      // AI provider change handler
      const aiProviderSelect = document.getElementById("ai-provider");
      const apiKeyContainer = document.getElementById("api-key-container");
      const providerInfo = document.getElementById("provider-info");
      const providerDocsMessage = document.getElementById(
        "provider-docs-message"
      );
      const providerDocsLink = document.getElementById("provider-docs-link");

      if (aiProviderSelect) {
        aiProviderSelect.addEventListener("change", function () {
          const selectedProvider = this.value;
          const modelSelectionContainer = document.getElementById(
            "model-selection-container"
          );
          const modelSelect = document.getElementById("ai-model");

          if (selectedProvider) {
            apiKeyContainer.classList.remove("d-none");

            // Show and populate model selection for Google AI Studio
            if (selectedProvider === "GOOGLE_AI_STUDIO" && modelSelect) {
              modelSelectionContainer.classList.remove("d-none");
              modelSelect.innerHTML = ""; // Clear existing options

              const providers = window.aiServiceHandler.getProviders();
              const googleModels = providers.GOOGLE_AI_STUDIO.models;

              Object.entries(googleModels).forEach(([modelId, modelName]) => {
                const option = document.createElement("option");
                option.value = modelId;
                option.textContent = modelName;
                modelSelect.appendChild(option);
              });

              // Set default or saved model
              modelSelect.value =
                currentSettings?.aiSettings?.activeModel || "gemini-pro";
            } else {
              modelSelectionContainer.classList.add("d-none");
            }

            // Show provider-specific information
            if (
              window.aiServiceHandler &&
              window.aiServiceHandler.getProviders
            ) {
              const providers = window.aiServiceHandler.getProviders();
              const provider = providers[selectedProvider];

              if (provider) {
                providerInfo.classList.remove("d-none");
                providerDocsMessage.textContent = `Learn more about ${provider.name} API: `;
                providerDocsLink.href = provider.docs;

                // Update provider-specific UI elements
                if (provider.audioTranscription) {
                  providerDocsMessage.textContent +=
                    "Supports audio transcription. ";
                } else {
                  providerDocsMessage.textContent += "Text generation only. ";
                }
              }
            }
          } else {
            apiKeyContainer.classList.add("d-none");
            modelSelectionContainer.classList.add("d-none");
            providerInfo.classList.add("d-none");
          }
        });
      }

      // Toggle API key visibility
      const toggleApiKeyBtn = document.getElementById("toggle-api-key");
      const apiKeyInput = document.getElementById("api-key");

      if (toggleApiKeyBtn && apiKeyInput) {
        toggleApiKeyBtn.addEventListener("click", function () {
          const type =
            apiKeyInput.getAttribute("type") === "password"
              ? "text"
              : "password";
          apiKeyInput.setAttribute("type", type);
          this.innerHTML =
            type === "password"
              ? '<i class="fas fa-eye"></i>'
              : '<i class="fas fa-eye-slash"></i>';
        });
      }

      // Test API key connection
      const testApiKeyBtn = document.getElementById("test-api-key");
      const apiKeyStatus = document.getElementById("api-key-status");

      if (testApiKeyBtn && apiKeyStatus && window.aiServiceHandler) {
        testApiKeyBtn.addEventListener("click", async function () {
          const provider = aiProviderSelect.value;
          const apiKey = apiKeyInput.value.trim();

          if (!provider || !apiKey) {
            apiKeyStatus.textContent =
              "Please select a provider and enter an API key";
            apiKeyStatus.className = "form-text text-warning mt-2";
            return;
          }

          testApiKeyBtn.disabled = true;
          testApiKeyBtn.innerHTML =
            '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Testing...';
          apiKeyStatus.textContent = "Testing connection...";
          apiKeyStatus.className = "form-text text-info mt-2";

          try {
            const result = await window.aiServiceHandler.testConnection(
              provider,
              apiKey
            );

            if (result.success) {
              apiKeyStatus.textContent = result.message;
              apiKeyStatus.className = "form-text text-success mt-2";
            } else {
              apiKeyStatus.textContent = result.message;
              apiKeyStatus.className = "form-text text-danger mt-2";
            }
          } catch (error) {
            apiKeyStatus.textContent = `Error testing connection: ${error.message}`;
            apiKeyStatus.className = "form-text text-danger mt-2";
          } finally {
            testApiKeyBtn.disabled = false;
            testApiKeyBtn.innerHTML = "Test Connection";
          }
        });
      }

      // Clear cache button
      const clearCacheBtn = document.getElementById("clear-cache-btn");
      const clearCacheStatus = document.getElementById("clear-cache-status");

      if (clearCacheBtn) {
        clearCacheBtn.addEventListener("click", function () {
          if (
            confirm(
              "Are you sure you want to clear all saved transcripts and normalized text? This action cannot be undone."
            )
          ) {
            clearCache();

            if (clearCacheStatus) {
              clearCacheStatus.textContent = "Cache cleared successfully!";
              clearCacheStatus.className = "text-success mt-2";

              // Clear the status message after a few seconds
              setTimeout(() => {
                clearCacheStatus.textContent = "";
              }, 3000);
            }
          }
        });
      }
    }, 100);

    return settingsUI;
  }

  // Function to clear cache and reset stored data
  function clearCache() {
    // Clear stored normalized text
    if (currentSettings.ljspeechOptions) {
      currentSettings.ljspeechOptions.manualNormalized = {};
      currentSettings.ljspeechOptions.currentNormalizedText = "";
    }

    // Save settings to persist the cleared cache
    saveSettings();

    // Clear transcripts in transcript handler if it exists
    if (
      window.transcriptHandler &&
      typeof window.transcriptHandler.clearTranscripts === "function"
    ) {
      window.transcriptHandler.clearTranscripts();
    }

    console.log("Cache cleared successfully");

    // Show success notification
    const notification = document.createElement("div");
    notification.className = "alert alert-success";
    notification.style.position = "fixed";
    notification.style.bottom = "10px";
    notification.style.right = "10px";
    notification.style.zIndex = "9999";
    notification.style.padding = "5px 15px";
    notification.style.fontSize = "0.9rem";
    notification.innerHTML = `<i class="fas fa-check-circle me-2"></i>Cache cleared successfully`;

    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transition = "opacity 0.5s ease";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    }, 3000);
  }

  // Update settings UI to match current settings
  function updateSettingsUI() {
    // Transcript format
    const formatSelect = document.getElementById("transcript-format");
    if (formatSelect) {
      formatSelect.value = currentSettings.transcriptFormat;

      // Show/hide custom format options
      const customOptions = document.getElementById("custom-format-options");
      if (customOptions) {
        customOptions.classList.toggle(
          "d-none",
          currentSettings.transcriptFormat !== "custom"
        );
      }

      // Show/hide LJSpeech format options
      const ljspeechOptions = document.getElementById(
        "ljspeech-format-options"
      );
      if (ljspeechOptions) {
        ljspeechOptions.classList.toggle(
          "d-none",
          currentSettings.transcriptFormat !== "ljspeech"
        );
      }
    }

    // Custom format options
    const customDelimiter = document.getElementById("custom-delimiter");
    if (customDelimiter) {
      customDelimiter.value = currentSettings.customFormat.delimiter;
    }

    const customTemplate = document.getElementById("custom-template");
    if (customTemplate) {
      customTemplate.value = currentSettings.customFormat.template;
    }

    // LJSpeech options
    const preserveNonLatinCheck = document.getElementById("preserve-non-latin");
    if (preserveNonLatinCheck) {
      preserveNonLatinCheck.checked =
        currentSettings.ljspeechOptions.preserveNonLatinCharacters !== false;
    }

    // Update normalized text field
    updateNormalizedTextField();

    // Audio settings
    const autoPlay = document.getElementById("auto-play");
    if (autoPlay) {
      autoPlay.checked = currentSettings.audioSettings.autoPlay;
    }

    // Update preview
    updateFormatPreview(currentSettings.transcriptFormat);

    // AI settings
    const aiProviderSelect = document.getElementById("ai-provider");
    const apiKeyInput = document.getElementById("api-key");
    const apiKeyContainer = document.getElementById("api-key-container");
    const providerInfo = document.getElementById("provider-info");
    const providerDocsMessage = document.getElementById(
      "provider-docs-message"
    );
    const providerDocsLink = document.getElementById("provider-docs-link");

    if (aiProviderSelect) {
      aiProviderSelect.value = currentSettings?.aiSettings?.provider || "";

      // Show/hide API key container based on provider selection
      if (apiKeyContainer) {
        apiKeyContainer.classList.toggle(
          "d-none",
          !currentSettings?.aiSettings?.provider
        );
      }

      // Update provider-specific information if a provider is selected
      if (
        currentSettings?.aiSettings?.provider &&
        window.aiServiceHandler?.getProviders
      ) {
        const providers = window.aiServiceHandler.getProviders();
        const provider = providers[currentSettings.aiSettings.provider];

        if (
          provider &&
          providerInfo &&
          providerDocsMessage &&
          providerDocsLink
        ) {
          providerInfo.classList.remove("d-none");
          providerDocsMessage.textContent = `Learn more about ${provider.name} API: `;
          providerDocsLink.href = provider.docs;

          // Update provider-specific UI elements
          if (provider.audioTranscription) {
            providerDocsMessage.textContent += "Supports audio transcription. ";
          } else {
            providerDocsMessage.textContent += "Text generation only. ";
          }
        }
      } else if (providerInfo) {
        providerInfo.classList.add("d-none");
      }
    }

    if (apiKeyInput) {
      apiKeyInput.value = currentSettings?.aiSettings?.apiKey || "";
    }
  }

  // Update format preview based on selected format
  function updateFormatPreview(format) {
    const previewElement = document.getElementById("format-preview");
    const descriptionElement = document.getElementById("format-description");

    if (!previewElement || !descriptionElement) return;

    const formatInfo = FORMAT_DEFINITIONS[format];

    if (formatInfo) {
      descriptionElement.textContent = formatInfo.description;

      if (format === "ljspeech") {
        // For LJSpeech, show different examples based on normalization setting
        if (currentSettings.ljspeechOptions.normalizeText) {
          previewElement.textContent = formatInfo.example;
        } else {
          // Without normalization, show duplication example
          previewElement.textContent =
            "file1|This is the transcript for file one.|This is the transcript for file one.\nfile2|This is transcript #2!|This is transcript #2!";
        }
      } else {
        previewElement.textContent = formatInfo.example;
      }
    }
  }

  // Update custom format preview
  function updateCustomFormatPreview() {
    const delimiterInput = document.getElementById("custom-delimiter");
    const templateInput = document.getElementById("custom-template");
    const previewElement = document.getElementById("format-preview");

    if (!delimiterInput || !templateInput || !previewElement) return;

    const delimiter = delimiterInput.value;
    const template = templateInput.value;

    // Generate example using the template
    const example1 = template
      .replace("{filename}", "file1.wav")
      .replace("{transcript}", "This is the transcript for file one.")
      .replace("{delimiter}", delimiter);

    const example2 = template
      .replace("{filename}", "file2.wav")
      .replace("{transcript}", "This is the transcript for file two.")
      .replace("{delimiter}", delimiter);

    previewElement.textContent = `${example1}\n${example2}`;
  }

  // When settings are saved
  function saveSettingsFromUI() {
    // Ensure aiSettings exists
    if (!currentSettings.aiSettings) {
      currentSettings.aiSettings = {
        provider: "",
        apiKey: "",
        activeModel: "",
      };
    }

    // Transcript format
    const formatSelect = document.getElementById("transcript-format");
    if (formatSelect) {
      const newFormat = formatSelect.value;
      const oldFormat = currentSettings.transcriptFormat;

      // Only trigger event if format actually changed
      if (newFormat !== oldFormat) {
        currentSettings.transcriptFormat = newFormat;
        // Notify about format change
        document.dispatchEvent(
          new CustomEvent("app:formatChanged", {
            detail: { format: newFormat },
          })
        );
      }
    }

    // Custom format options
    const customDelimiter = document.getElementById("custom-delimiter");
    if (customDelimiter) {
      currentSettings.customFormat.delimiter = customDelimiter.value;
    }

    const customTemplate = document.getElementById("custom-template");
    if (customTemplate) {
      currentSettings.customFormat.template = customTemplate.value;
    }

    // LJSpeech options for non-Latin script handling
    const preserveNonLatinCheck = document.getElementById("preserve-non-latin");
    if (preserveNonLatinCheck) {
      currentSettings.ljspeechOptions.preserveNonLatinCharacters =
        preserveNonLatinCheck.checked;
    }

    // Save current normalized text if changed
    const normalizedTextField = document.getElementById(
      "ljspeech-normalized-text"
    );
    if (normalizedTextField && currentAudioFile) {
      currentSettings.ljspeechOptions.manualNormalized[currentAudioFile] =
        normalizedTextField.value;
    }

    // Audio settings
    const autoPlay = document.getElementById("auto-play");
    if (autoPlay) {
      currentSettings.audioSettings.autoPlay = autoPlay.checked;
    }

    // AI settings
    const aiProviderSelect = document.getElementById("ai-provider");
    const apiKeyInput = document.getElementById("api-key");
    const modelSelect = document.getElementById("ai-model");

    if (aiProviderSelect) {
      currentSettings.aiSettings.provider = aiProviderSelect.value;
    }

    if (apiKeyInput) {
      currentSettings.aiSettings.apiKey = apiKeyInput.value.trim();
    }

    if (
      modelSelect &&
      currentSettings.aiSettings.provider === "GOOGLE_AI_STUDIO"
    ) {
      currentSettings.aiSettings.activeModel = modelSelect.value;
    }

    // Save to storage
    saveSettings();

    // Show success message after successful save
    showSuccessMessage();
  }

  function showSuccessMessage() {
    const successMsg = document.createElement("div");
    successMsg.className = "alert alert-success";
    successMsg.innerHTML =
      '<i class="fas fa-check-circle me-2"></i>Settings saved successfully!';
    successMsg.style.position = "fixed";
    successMsg.style.top = "10px";
    successMsg.style.right = "10px";
    successMsg.style.zIndex = "9999";
    successMsg.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
    document.body.appendChild(successMsg);

    // Remove message after 2 seconds
    setTimeout(() => {
      successMsg.style.opacity = "0";
      successMsg.style.transition = "opacity 0.5s ease-out";
      setTimeout(() => {
        if (successMsg.parentNode) {
          successMsg.parentNode.removeChild(successMsg);
        }
      }, 500);
    }, 2000);
  }

  // Export API for use by other modules
  window.settingsHandler = {
    getSettings: function () {
      return { ...currentSettings };
    },

    getTranscriptFormatter: function () {
      const format = currentSettings.transcriptFormat;
      const formatInfo = FORMAT_DEFINITIONS[format];

      if (format === "custom") {
        return (fileName, transcript) => {
          return formatInfo.formatter(fileName, transcript, currentSettings);
        };
      } else if (format === "ljspeech") {
        return (fileName, transcript) => {
          if (!fileName || !transcript) {
            return `${fileName || ""}|${transcript || ""}|${transcript || ""}`;
          }

          // Strip extension from filename for LJSpeech format
          const baseName = fileName.replace(/\.[^/.]+$/, "");

          // Check if we have a manual normalized text for this file
          let normalizedText;

          // First check for manual override
          if (
            currentSettings.ljspeechOptions.manualNormalized &&
            currentSettings.ljspeechOptions.manualNormalized[fileName]
          ) {
            normalizedText =
              currentSettings.ljspeechOptions.manualNormalized[fileName];
          }
          // Only auto-normalize if enabled and no manual text exists
          else if (currentSettings.ljspeechOptions.normalizeText) {
            normalizedText = normalizeTranscript(transcript);
            // Store it for future use
            if (!currentSettings.ljspeechOptions.manualNormalized) {
              currentSettings.ljspeechOptions.manualNormalized = {};
            }
            currentSettings.ljspeechOptions.manualNormalized[fileName] =
              normalizedText;
          }
          // If auto-normalize is disabled and no manual text, just use the transcript
          else {
            normalizedText = transcript;
          }

          return `${baseName}|${transcript}|${normalizedText}`;
        };
      } else {
        return formatInfo.formatter;
      }
    },

    // Add public method to access the normalization function directly
    normalizeTranscript: function (text) {
      return normalizeTranscript(text || "");
    },

    updateSettings: function (newSettings) {
      currentSettings = { ...currentSettings, ...newSettings };
      saveSettings();
    },

    // Add method to update normalized text for current file
    updateNormalizedText: function (text, fileName) {
      // Use provided fileName if available, otherwise fall back to currentAudioFile
      const targetFile = fileName || currentAudioFile;

      if (targetFile) {
        if (!currentSettings.ljspeechOptions.manualNormalized) {
          currentSettings.ljspeechOptions.manualNormalized = {};
        }

        // Store the normalized text with the specified filename
        currentSettings.ljspeechOptions.manualNormalized[targetFile] = text;

        // Update current normalized text if it's the active file
        if (targetFile === currentAudioFile) {
          currentSettings.ljspeechOptions.currentNormalizedText = text;
        }

        // Save settings to persist changes
        saveSettings();

        // Log for debugging
        console.log(`Updated normalized text for file: ${targetFile}`);
      } else {
        console.warn("No file specified for updateNormalizedText");
      }
    },

    // Get normalized text for a specific file
    getNormalizedText: function (fileName) {
      if (!fileName) {
        console.warn("No fileName provided to getNormalizedText");
        return "";
      }

      if (
        fileName &&
        currentSettings.ljspeechOptions.manualNormalized &&
        currentSettings.ljspeechOptions.manualNormalized[fileName]
      ) {
        // Log for debugging
        console.log(`Retrieved normalized text for: ${fileName}`);
        return currentSettings.ljspeechOptions.manualNormalized[fileName];
      }

      console.log(`No saved normalized text found for: ${fileName}`);
      return "";
    },

    updateUIForFormat: function () {
      updateUIForCurrentFormat(currentSettings.transcriptFormat);
    },

    // Get AI settings
    getAISettings: function () {
      return { ...currentSettings.aiSettings };
    },

    clearCache: clearCache,
  };
})();
