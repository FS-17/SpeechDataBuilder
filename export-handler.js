/**
 * Export Handler - Simplified version
 * Manages dataset export functionality
 */

(function () {
  const EXPORT_FORMATS = {
    json: { extension: ".json", mimeType: "application/json" },
    csv: { extension: ".csv", mimeType: "text/csv" },
    txt: { extension: ".txt", mimeType: "text/plain" },
  };

  document.addEventListener("DOMContentLoaded", function () {
    const exportTab = document.getElementById("export-tab");

    if (exportTab) {
      exportTab.addEventListener("click", function (e) {
        e.preventDefault();

        // Create export UI if it doesn't exist
        if (!document.getElementById("export-container")) {
          createExportUI();
        }

        // Show export UI, hide other sections
        document.getElementById("export-container").classList.remove("d-none");
        document.getElementById("file-sidebar").classList.add("d-none");
        document.getElementById("audio-editor").classList.add("d-none");

        // Hide settings container if it exists
        const settingsContainer = document.getElementById("settings-container");
        if (settingsContainer) {
          settingsContainer.classList.add("d-none");
        }

        // Set this tab as active
        document
          .querySelectorAll(".nav-link")
          .forEach((tab) => tab.classList.remove("active"));
        exportTab.classList.add("active");

        updateExportSummary();
      });
    }

    document
      .getElementById("files-tab")
      .addEventListener("click", function (e) {
        e.preventDefault();
        const exportUI = document.getElementById("export-container");
        if (exportUI) exportUI.classList.add("d-none");

        document.getElementById("file-sidebar").classList.remove("d-none");
        document.getElementById("audio-editor").classList.remove("d-none");

        document
          .querySelectorAll(".nav-link")
          .forEach((tab) => tab.classList.remove("active"));
        this.classList.add("active");

        // Check and update format-dependent UI elements when returning to main tab
        if (
          window.settingsHandler &&
          window.settingsHandler.updateUIForFormat
        ) {
          window.settingsHandler.updateUIForFormat();
        }
      });
  });

  function createExportUI() {
    const exportUI = document.createElement("div");
    exportUI.id = "export-container";
    exportUI.className = "row mt-4 d-none";

    exportUI.innerHTML = `
      <div class="col-md-8 offset-md-2">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">Export Dataset</h5>
          </div>
          <div class="card-body">
            <div class="mb-4">
              <h6>Export Format</h6>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="exportFormat" id="formatCsv" value="csv" checked>
                <label class="form-check-label" for="formatCsv">CSV</label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="exportFormat" id="formatJson" value="json">
                <label class="form-check-label" for="formatJson">JSON</label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="exportFormat" id="formatTxt" value="txt">
                <label class="form-check-label" for="formatTxt">Plain Text</label>
              </div>
            </div>

            <!-- Include Audio Files Option -->
            <div class="mb-4">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="include-audio">
                <label class="form-check-label" for="include-audio">
                  Include Audio Files
                </label>
                <div class="text-muted small mt-1">
                  Audio files will be exported in a zip file along with the transcripts
                </div>
              </div>
            </div>

            <!-- Audio File Type Selection -->
            <div class="mb-4 d-none" id="audio-file-type-container">
              <label for="audio-file-type" class="form-label">Audio File Type</label>
              <select id="audio-file-type" class="form-select">
                <option value="original">Original</option>
                <option value="wav">WAV</option>
                <option value="mp3">MP3</option>
              </select>
            </div>

            <div class="mb-4">
              <h6>Transcript Format</h6>
              <p class="current-format-info text-muted mb-3 small" id="current-format-info">
                Using default format. Change in Settings.
              </p>
              <div class="card bg-light">
                <div class="card-body py-2">
                  <pre id="format-example" class="mb-0 small" style="max-height: 60px; overflow-y: auto;"></pre>
                </div>
              </div>
            </div>
            
            <!-- Dataset statistics -->
            <div class="mb-4">
              <div class="row g-3">
                <div class="col-md-4">
                  <div class="card bg-light">
                    <div class="card-body py-2">
                      <div class="d-flex justify-content-between align-items-center">
                        <span>Total Files:</span>
                        <span class="badge bg-primary" id="export-total-files">0</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="card bg-light">
                    <div class="card-body py-2">
                      <div class="d-flex justify-content-between align-items-center">
                        <span>With Transcripts:</span>
                        <span class="badge bg-success" id="export-with-transcripts">0</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="card bg-light">
                    <div class="card-body py-2">
                      <div class="d-flex justify-content-between align-items-center">
                        <span>Audio Size:</span>
                        <span class="badge bg-info" id="export-audio-size">0 MB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="d-grid gap-2">
              <button id="export-btn" class="btn btn-primary">
                <i class="fas fa-download me-2"></i>Export Dataset
              </button>
              <button id="export-settings-btn" class="btn btn-outline-secondary">
                <i class="fas fa-cog me-2"></i>Change Transcript Format
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.querySelector(".main-page").appendChild(exportUI);

    // Add event listener to toggle audio file type visibility
    const includeAudioCheckbox = document.getElementById("include-audio");
    const audioFileTypeContainer = document.getElementById(
      "audio-file-type-container"
    );

    if (includeAudioCheckbox && audioFileTypeContainer) {
      includeAudioCheckbox.addEventListener("change", function () {
        if (this.checked) {
          audioFileTypeContainer.classList.remove("d-none");
        } else {
          audioFileTypeContainer.classList.add("d-none");
        }
      });
    }

    // Add export button click handler
    initExportButton();

    document
      .getElementById("export-settings-btn")
      .addEventListener("click", function () {
        // Switch to settings tab
        document.getElementById("settings-tab").click();
      });
  }

  async function exportDataset() {
    try {
      // Verify transcriptHandler exists and has data
      if (!window.transcriptHandler?.getAllTranscripts) {
        throw new Error("Transcript handler not available");
      }

      // Check if we have uploaded files
      if (!window.uploadedFiles || window.uploadedFiles.length === 0) {
        throw new Error("No files available to export");
      }

      const allTranscripts = window.transcriptHandler.getAllTranscripts() || {};
      if (Object.keys(allTranscripts).length === 0) {
        throw new Error("No transcripts available to export");
      }

      // Filter transcripts to only include currently uploaded files
      const currentFileNames = window.uploadedFiles.map((file) => file.name);
      const filteredTranscripts = {};

      Object.entries(allTranscripts).forEach(([fileName, transcript]) => {
        if (currentFileNames.includes(fileName)) {
          filteredTranscripts[fileName] = transcript;
        }
      });

      // Check if we have any transcripts after filtering
      if (Object.keys(filteredTranscripts).length === 0) {
        throw new Error("No transcripts available for the current files");
      }

      const selectedFormat =
        document.querySelector('input[name="exportFormat"]:checked')?.value ||
        "txt";
      const includeAudio =
        document.getElementById("include-audio")?.checked || false;
      const audioFileType =
        document.getElementById("audio-file-type")?.value || "original";

      let dataToExport;
      switch (selectedFormat) {
        case "json":
          dataToExport = formatAsJson(filteredTranscripts);
          break;
        case "csv":
          dataToExport = formatAsCsv(filteredTranscripts);
          break;
        default:
          dataToExport = formatAsTxt(filteredTranscripts);
      }

      if (includeAudio && window.uploadedFiles?.length > 0) {
        const zip = new JSZip();

        // Add transcript file
        zip.file(
          `transcripts${EXPORT_FORMATS[selectedFormat].extension}`,
          dataToExport
        );

        // Add audio files
        const audioFolder = zip.folder("audio");
        for (const file of window.uploadedFiles) {
          if (file && file.name) {
            const convertedFile = await convertAudioFile(file, audioFileType);
            audioFolder.file(convertedFile.name, convertedFile.blob);
          }
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadFile(zipBlob, "speech-dataset.zip", "application/zip");
      } else {
        const fileName = `speech-dataset${EXPORT_FORMATS[selectedFormat].extension}`;
        downloadFile(
          new Blob([dataToExport]),
          fileName,
          EXPORT_FORMATS[selectedFormat].mimeType
        );
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert(
        error.message || "Export failed. Please check the console for details."
      );
    }
  }

  function updateExportSummary() {
    // Safely get total files
    const fileList = document.getElementById("file-list");
    const totalFiles = fileList ? fileList.children.length : 0;

    // Safely get transcripts count for current files only
    let filesWithTranscripts = 0;
    if (
      window.transcriptHandler &&
      window.transcriptHandler.getAllTranscripts &&
      window.uploadedFiles
    ) {
      const transcripts = window.transcriptHandler.getAllTranscripts();
      const currentFileNames = window.uploadedFiles.map((file) => file.name);

      // Count only transcripts that belong to currently uploaded files
      if (transcripts) {
        filesWithTranscripts = Object.keys(transcripts).filter((fileName) =>
          currentFileNames.includes(fileName)
        ).length;
      }
    }

    // Update UI elements if they exist
    const totalFilesEls = document.querySelectorAll("#export-total-files");
    const withTranscriptsEls = document.querySelectorAll(
      "#export-with-transcripts"
    );
    const audioSizeEl = document.getElementById("export-audio-size");

    // Update all instances of the elements
    totalFilesEls.forEach((el) => (el.textContent = totalFiles));
    withTranscriptsEls.forEach((el) => (el.textContent = filesWithTranscripts));

    // Update file size
    if (audioSizeEl && window.uploadedFiles) {
      let totalSize = 0;
      try {
        totalSize = window.uploadedFiles.reduce(
          (acc, file) => acc + (file ? file.size : 0),
          0
        );
      } catch (error) {
        console.warn("Error calculating total size:", error);
      }
      const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
      audioSizeEl.textContent = `${sizeMB} MB`;
    }

    // Update format info
    updateFormatInfo();
  }

  function updateFormatInfo() {
    const formatInfoEl = document.getElementById("current-format-info");
    const formatExampleEl = document.getElementById("format-example");

    if (!formatInfoEl || !formatExampleEl) return;

    try {
      const settings = window.settingsHandler
        ? window.settingsHandler.getSettings()
        : null;
      if (!settings) {
        formatInfoEl.textContent = "Using default format";
        formatExampleEl.textContent = "file.wav\nTranscript text";
        return;
      }
    } catch (error) {
      console.warn("Error updating format info:", error);
      formatInfoEl.textContent = "Using default format";
      formatExampleEl.textContent = "file.wav\nTranscript text";
    }
  }

  function formatAsJson(transcripts) {
    if (!transcripts || typeof transcripts !== "object") {
      throw new Error("Invalid transcript data");
    }

    const currentDate = new Date().toISOString();
    const settings = window.settingsHandler?.getSettings() || {
      transcriptFormat: "default",
    };

    const formatter = window.settingsHandler?.getTranscriptFormatter?.();
    const hasFormatter = formatter && typeof formatter === "function";

    const formattedData = [];
    Object.entries(transcripts).forEach(([fileName, transcript]) => {
      try {
        // Format the output based on the current settings
        let formattedEntry = {
          fileName: fileName, // Keep the full filename with extension
          transcript: transcript || "",
        };

        // Different handling based on format type
        if (settings.transcriptFormat === "ljspeech" && hasFormatter) {
          // For LJSpeech, split the formatted output to get components
          const formatted = formatter(fileName, transcript || "");
          const parts = formatted.split("|");
          if (parts.length > 1) {
            formattedEntry.normalizedTranscript = parts[2] || "";
          }
        }

        formattedData.push(formattedEntry);
      } catch (error) {
        console.warn(`Error formatting transcript for ${fileName}:`, error);
        formattedData.push({
          fileName: fileName,
          transcript: transcript || "",
        });
      }
    });

    return JSON.stringify(
      {
        metadata: {
          exportDate: currentDate,
          totalFiles: formattedData.length,
          format: settings.transcriptFormat,
        },
        data: formattedData,
      },
      null,
      2
    );
  }

  function formatAsCsv(transcripts) {
    const settings = window.settingsHandler?.getSettings() || {
      transcriptFormat: "default",
    };

    const formatter = window.settingsHandler?.getTranscriptFormatter?.();
    const hasFormatter = formatter && typeof formatter === "function";

    // Define CSV headers based on format
    let headers = "FileName,Transcript";
    if (settings.transcriptFormat === "ljspeech") {
      headers = "FileName|Transcript|NormalizedTranscript";
    }

    let csv = headers + "\n";

    Object.entries(transcripts).forEach(([fileName, transcript]) => {
      try {
        if (settings.transcriptFormat === "ljspeech" && hasFormatter) {
          const formatted = formatter(fileName, transcript || "");
          const parts = formatted
            .split("|")
            .map((part) => part.replace(/"/g, '""'));
          csv += `${fileName}|${parts[1] || ""}|${parts[2] || ""}\n`;
        } else {
          // Keep the full filename with extension
          csv += `${fileName}|${(transcript || "").replace(/"/g, '""')}\n`;
        }
      } catch (error) {
        console.warn(`Error formatting CSV row for ${fileName}:`, error);
        // Add unformatted row as fallback with full filename
        csv += `${fileName}|${(transcript || "").replace(/"/g, '""')}\n`;
      }
    });

    return csv;
  }

  function formatAsTxt(transcripts) {
    let txt = "";
    const settings = window.settingsHandler?.getSettings() || {
      transcriptFormat: "default",
    };

    const formatter = window.settingsHandler?.getTranscriptFormatter?.();
    const hasFormatter = formatter && typeof formatter === "function";

    try {
      Object.entries(transcripts).forEach(([fileName, transcript]) => {
        try {
          if (settings.transcriptFormat === "ljspeech" && hasFormatter) {
            txt += `${fileName}|${transcript || ""}|${
              settings.ljspeechOptions?.manualNormalized[fileName] ||
              transcript ||
              ""
            }\n`;
          } else {
            // Keep the full filename with extension
            txt += `${fileName}\n${transcript || ""}\n\n`;
          }
        } catch (error) {
          console.warn(`Error formatting text for ${fileName}:`, error);
          txt += `${fileName}\n${transcript || ""}\n\n`;
        }
      });
    } catch (error) {
      console.warn("Error using transcript formatter:", error);
      Object.entries(transcripts).forEach(([fileName, transcript]) => {
        txt += `${fileName}\n${transcript || ""}\n\n`;
      });
    }

    return txt;
  }

  function downloadFile(blob, filename, mimeType) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);

    // Trigger download
    link.click();

    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
  }

  // Add event listener for export button with proper error handling
  function initExportButton() {
    const exportBtn = document.getElementById("export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", async function () {
        try {
          exportBtn.disabled = true;
          exportBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Exporting...';
          await exportDataset();
        } catch (error) {
          console.error("Export failed:", error);
          alert(
            error.message ||
              "Export failed. Please check the console for details."
          );
        } finally {
          exportBtn.disabled = false;
          exportBtn.innerHTML =
            '<i class="fas fa-download me-2"></i>Export Dataset';
        }
      });
    }
  }

  async function convertAudioFile(file, targetType) {
    if (targetType === "original" || !file) {
      return { name: file.name, blob: file };
    }

    // Simple implementation - in a real app, you would use a library for conversion
    const convertedBlob = file;
    const newExtension = targetType === "wav" ? ".wav" : ".mp3";
    const newName = file.name.replace(/\.[^/.]+$/, newExtension);

    return { name: newName, blob: convertedBlob };
  }
})();
