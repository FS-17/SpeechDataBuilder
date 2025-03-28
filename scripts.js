document.addEventListener("DOMContentLoaded", function () {
  // Global state
  window.audioLoaded = false;

  // Initialize components
  initWaveform();
  initNavigation();
  initFormatListeners();

  /**
   * Simple file upload handler
   */
  (function () {
    // Get DOM elements
    const fileInput = document.getElementById("file-input");
    const uploadBtn = document.getElementById("upload-btn");
    const uploadDropzone = document.getElementById("upload-dropzone");
    const fileList = document.getElementById("file-list");

    if (!fileInput || !uploadBtn || !uploadDropzone || !fileList) {
      console.error("Required upload elements not found");
      return;
    }

    // State flags
    let isUploading = false;
    let isProcessingClick = false;

    // Store uploaded files
    window.uploadedFiles = [];

    // Event listeners
    fileInput.addEventListener("change", (e) => {
      if (isUploading) return;
      isUploading = true;
      if (e.target.files?.length > 0) handleFiles(e.target.files);
      isUploading = false;
    });

    uploadBtn.addEventListener("click", () => {
      if (isProcessingClick) return;
      isProcessingClick = true;
      fileInput.click();
      setTimeout(() => {
        isProcessingClick = false;
      }, 300);
    });

    // Drag and drop handlers
    uploadDropzone.addEventListener("dragover", function (e) {
      e.preventDefault();
      this.classList.add("active");
    });

    uploadDropzone.addEventListener("dragleave", function () {
      this.classList.remove("active");
    });

    uploadDropzone.addEventListener("drop", function (e) {
      e.preventDefault();
      this.classList.remove("active");
      if (isUploading) return;
      isUploading = true;
      if (e.dataTransfer.files?.length > 0) handleFiles(e.dataTransfer.files);
      isUploading = false;
    });

    // Make dropzone clickable
    uploadDropzone.addEventListener("click", (e) => {
      if (e.target !== fileInput) fileInput.click();
    });

    // Process uploaded files
    function handleFiles(files) {
      // Hide hero section when files are uploaded
      hideMarketingSectionsOnFileUpload();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("audio/")) {
          console.warn("Skipping non-audio file:", file.name);
          continue;
        }

        // Add to global uploaded files array
        window.uploadedFiles.push(file);

        // Create file item in the list
        const fileItem = document.createElement("li");
        fileItem.className = "list-group-item file-item";
        fileItem.innerHTML = `
          <div class="d-flex justify-content-between align-items-center">
            <span>${file.name}</span>
            <span class="badge">${formatFileSize(file.size)}</span>
          </div>
        `;

        // Add click handler to select file
        fileItem.addEventListener("click", function () {
          document
            .querySelectorAll(".file-item")
            .forEach((item) => item.classList.remove("active"));
          fileItem.classList.add("active");
          window.loadAudioFile(file, file.name);
        });

        fileList.appendChild(fileItem);
      }
    }

    // Format file size for display
    function formatFileSize(bytes) {
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }
  })();
});

// Initialize format change listeners
function initFormatListeners() {
  // Listen for settings format changes
  document.addEventListener("app:formatChanged", (e) => {
    if (e.detail?.format) updateNormalizedColumnVisibility(e.detail.format);
  });

  // Listen for settings loaded event
  document.addEventListener("app:settingsLoaded", (e) => {
    if (e.detail?.settings)
      updateNormalizedColumnVisibility(e.detail.settings.transcriptFormat);
  });

  // Listen for audio loaded event
  document.addEventListener("app:audioLoaded", (e) => {
    window.audioLoaded = true;
    if (window.settingsHandler?.getSettings) {
      const settings = window.settingsHandler.getSettings();
      updateNormalizedColumnVisibility(settings.transcriptFormat);
    }
  });

  // Initially hide normalized column by default
  setTimeout(() => {
    const normalizedColumn = document.getElementById("normalized-column");
    if (normalizedColumn) normalizedColumn.classList.add("d-none");
  }, 100);
}

// Helper function to update normalized column visibility
function updateNormalizedColumnVisibility(format) {
  const normalizedColumn = document.getElementById("normalized-column");
  if (!normalizedColumn) return;

  if (format === "ljspeech" && window.audioLoaded) {
    normalizedColumn.classList.remove("d-none");
  } else {
    normalizedColumn.classList.add("d-none");
  }
}

// Function to initialize navigation
function initNavigation() {
  document.querySelectorAll(".nav-link").forEach((tab) => {
    tab.addEventListener("click", function (e) {
      // Get the clicked tab's id
      const tabId = this.id;

      // First, remove active class from all tabs
      document.querySelectorAll(".nav-link").forEach((t) => {
        t.classList.remove("active");
      });

      // Then add active class to clicked tab
      this.classList.add("active");

      // Toggle marketing sections visibility based on active tab
      toggleMarketingSections(tabId);

      // Perform tab-specific actions
      if (tabId === "files-tab") {
        // Show file management interface
        document.getElementById("file-sidebar").classList.remove("d-none");
        document.getElementById("audio-editor").classList.remove("d-none");

        // Hide settings if visible
        const settingsContainer = document.getElementById("settings-container");
        if (settingsContainer) settingsContainer.classList.add("d-none");

        // Hide export if visible
        const exportContainer = document.getElementById("export-container");
        if (exportContainer) exportContainer.classList.add("d-none");
      } else if (tabId === "settings-tab") {
        // Show settings interface
        document.getElementById("file-sidebar").classList.add("d-none");
        document.getElementById("audio-editor").classList.add("d-none");

        // Create settings UI if not already created
        let settingsContainer = document.getElementById("settings-container");
        if (!settingsContainer) {
          settingsContainer = window.settingsHandler?.createSettingsUI();
        }

        if (settingsContainer) {
          settingsContainer.classList.remove("d-none");
        }

        // Hide export if visible
        const exportContainer = document.getElementById("export-container");
        if (exportContainer) exportContainer.classList.add("d-none");
      } else if (tabId === "export-tab") {
        // Show export interface
        document.getElementById("file-sidebar").classList.add("d-none");
        document.getElementById("audio-editor").classList.add("d-none");

        // Hide settings if visible
        const settingsContainer = document.getElementById("settings-container");
        if (settingsContainer) settingsContainer.classList.add("d-none");

        // Create or show export UI
        let exportContainer = document.getElementById("export-container");
        if (exportContainer) {
          exportContainer.classList.remove("d-none");
        }
      }
    });
  });
}

// Function to toggle visibility of marketing sections (hero, features, how-it-works)
function toggleMarketingSections(activeTabId) {
  const marketingSections = [
    document.querySelector(".hero-section"),
    document.querySelector(".features-section"),
    document.querySelector(".how-it-works-section"),
  ];

  // Only show marketing sections on the files tab (main view)
  const shouldShowMarketing = activeTabId === "files-tab";

  marketingSections.forEach((section) => {
    if (section) {
      if (shouldShowMarketing) {
        section.classList.remove("d-none");
      } else {
        section.classList.add("d-none");
      }
    }
  });
}

// Function to hide marketing sections when files are uploaded
function hideMarketingSectionsOnFileUpload() {
  const marketingSections = [
    document.querySelector(".hero-section"),
    document.querySelector(".features-section"),
    document.querySelector(".how-it-works-section"),
  ];

  // Hide marketing sections with a nice fade-out effect
  marketingSections.forEach((section) => {
    if (section) {
      // Add transition if it doesn't exist
      if (!section.style.transition) {
        section.style.transition =
          "opacity 0.5s ease, height 0.5s ease, margin 0.5s ease";
      }

      // First fade out
      section.style.opacity = "0";

      // Then hide after transition completes
      setTimeout(() => {
        section.classList.add("d-none");
        section.style.height = "0";
        section.style.margin = "0";
      }, 500);
    }
  });

  // Set a flag to remember that marketing sections have been hidden
  window.marketingSectionsHidden = true;
}

// Function to initialize WaveSurfer
function initWaveform() {
  // Define gradient colors for waveform
  const gradient = document.createElement("canvas").getContext("2d");
  const gradientFill = gradient.createLinearGradient(0, 0, 0, 128);
  gradientFill.addColorStop(0, "rgba(58, 134, 255, 0.8)");
  gradientFill.addColorStop(1, "rgba(109, 93, 252, 0.4)");

  const progressGradient = document.createElement("canvas").getContext("2d");
  const progressGradientFill = progressGradient.createLinearGradient(
    0,
    0,
    0,
    128
  );
  progressGradientFill.addColorStop(0, "rgba(58, 134, 255, 1)");
  progressGradientFill.addColorStop(1, "rgba(109, 93, 252, 0.8)");

  // Create WaveSurfer instance with enhanced styling - Updated for WaveSurfer v7.x
  window.wavesurfer = WaveSurfer.create({
    container: "#waveform",
    waveColor: gradientFill,
    progressColor: progressGradientFill,
    cursorColor: "rgba(58, 134, 255, 0.7)",
    height: 140,
    barWidth: 3,
    barGap: 1,
    barRadius: 3,
    normalize: true,
    minPxPerSec: 50,
    hideScrollbar: true,
    autoCenter: true,
    plugins: [
      WaveSurfer.regions.create({
        dragSelection: true,
        slop: 5,
        maxRegions: 1,
        color: "rgba(115, 104, 208, 0.52)",
        maxRegions: 1,

        formatTimeCallback: function (sec) {
          return formatTime(sec);
        },
      }),
      WaveSurfer.cursor.create({
        showTime: true,
        opacity: 1,
        customShowTimeStyle: {
          "background-color": "#000",
          color: "#fff",
          padding: "2px 5px",
          "font-size": "10px",
          "border-radius": "3px",
        },
      }),
    ],
  });

  // Add loading indicator
  const loadingIndicator = document.createElement("div");
  loadingIndicator.id = "waveform-loading";
  loadingIndicator.innerHTML = `
    <div class="spinner">
      <div class="bounce1"></div>
      <div class="bounce2"></div>
      <div class="bounce3"></div>
    </div>
    <div class="loading-text">Loading audio...</div>
  `;
  loadingIndicator.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
    transition: opacity 0.3s ease;
    opacity: 0;
    pointer-events: none;
    border-radius: var(--border-radius);
  `;

  const spinnerStyle = document.createElement("style");
  spinnerStyle.textContent = `
    .spinner {
      width: 70px;
      text-align: center;
    }
    
    .spinner > div {
      width: 12px;
      height: 12px;
      background-color: var(--primary-color);
      border-radius: 100%;
      display: inline-block;
      animation: sk-bouncedelay 1.4s infinite ease-in-out both;
      margin: 0 3px;
    }
    
    .spinner .bounce1 {
      animation-delay: -0.32s;
    }
    
    .spinner .bounce2 {
      animation-delay: -0.16s;
    }
    
    .loading-text {
      margin-top: 12px;
      font-size: 14px;
      color: var(--text-secondary);
    }
    
    @keyframes sk-bouncedelay {
      0%, 80%, 100% { 
        transform: scale(0);
      } 40% { 
        transform: scale(1.0);
      }
    }
  `;
  document.head.appendChild(spinnerStyle);

  const waveformContainer = document.getElementById("waveform-container");
  if (waveformContainer) {
    waveformContainer.style.position = "relative";
    waveformContainer.appendChild(loadingIndicator);
  }

  // Set up WaveSurfer event listeners
  window.wavesurfer.on("loading", function (percent) {
    const loadingElement = document.getElementById("waveform-loading");
    if (loadingElement) {
      loadingElement.style.opacity = "1";
      loadingElement.querySelector(
        ".loading-text"
      ).textContent = `Loading audio... ${Math.round(percent)}%`;
    }
  });

  window.wavesurfer.on("ready", function () {
    // Hide loading indicator with fade effect
    const loadingElement = document.getElementById("waveform-loading");
    if (loadingElement) {
      loadingElement.style.opacity = "0";
    }

    showAudioEditor();
    updateTimeDisplay();

    // Add a subtle animation to the waveform to draw attention
    const waveformElement = document.querySelector("#waveform wave");
    if (waveformElement) {
      waveformElement.style.transition = "transform 0.5s ease-out";
      waveformElement.style.transform = "scaleY(0.9)";
      setTimeout(() => {
        waveformElement.style.transform = "scaleY(1)";
      }, 100);
    }

    document.dispatchEvent(new CustomEvent("wavesurfer:ready"));

    // Auto-play if enabled in settings
    if (window.settingsHandler?.getSettings) {
      const settings = window.settingsHandler.getSettings();
      if (settings.audioSettings?.autoPlay) {
        window.wavesurfer.play();
        updatePlayButton(true);
      }
    }
  });

  // Region events - updated for v7
  window.wavesurfer.on("region-created", function (region) {
    ensureSingleRegion(region);
    updateRegionControls(true);

    // Add subtle animation to region
    region.element.style.transition = "background 0.3s ease";
    const originalColor = region.element.style.background;
    region.element.style.background = "rgba(109, 93, 252, 0.4)";
    setTimeout(() => {
      region.element.style.background = originalColor;
    }, 300);
  });

  window.wavesurfer.on("region-update-end", () => updateRegionControls(true));
  window.wavesurfer.on("region-removed", () => updateRegionControls(false));

  window.wavesurfer.on("error", (err) => {
    console.error("WaveSurfer error:", err);
    const loadingElement = document.getElementById("waveform-loading");
    if (loadingElement) {
      loadingElement.querySelector(
        ".loading-text"
      ).textContent = `Error loading audio: ${err.message}`;
      loadingElement.querySelector(".loading-text").style.color =
        "var(--danger-color)";

      // Add a retry button
      if (!loadingElement.querySelector(".retry-button")) {
        const retryButton = document.createElement("button");
        retryButton.className = "btn btn-sm btn-primary mt-3 retry-button";
        retryButton.innerHTML = '<i class="fas fa-redo-alt me-2"></i>Retry';
        retryButton.addEventListener("click", function () {
          const fileName = document.getElementById("current-file").textContent;
          // Find the file in the uploaded files
          const file = window.uploadedFiles.find((f) => f.name === fileName);
          if (file) {
            window.loadAudioFile(file, fileName);
          } else {
            alert("File not found. Please try uploading again.");
          }
        });
        loadingElement.appendChild(retryButton);
      }
    }
  });

  window.wavesurfer.on("timeupdate", updateTimeDisplay);
  window.wavesurfer.on("seeking", updateTimeDisplay);

  // Add play/pause animation
  window.wavesurfer.on("play", function () {
    updatePlayButton(true);

    // Add a subtle pulse animation to the waveform
    const waveformElement = document.querySelector("#waveform wave");
    if (waveformElement) {
      waveformElement.classList.add("pulse-animation");
    }
  });

  window.wavesurfer.on("pause", function () {
    updatePlayButton(false);

    // Remove pulse animation
    const waveformElement = document.querySelector("#waveform wave");
    if (waveformElement) {
      waveformElement.classList.remove("pulse-animation");
    }
  });

  // Add pulse animation style
  const pulseStyle = document.createElement("style");
  pulseStyle.textContent = `
    .pulse-animation {
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% {
        transform: scaleY(1);
      }
      50% {
        transform: scaleY(1.02);
      }
      100% {
        transform: scaleY(1);
      }
    }
  `;
  document.head.appendChild(pulseStyle);

  // Set up play/stop toggle button
  setupPlayButton();

  // Set up volume control
  setupVolumeControl();

  // Set up playback speed control
  setupPlaybackSpeed();

  // Initialize audio cutting controls
  initAudioCuttingControls();
}

// Show audio editor and hide empty state
function showAudioEditor() {
  const playbackControls = document.getElementById("playback-controls");
  const waveformContainer = document.getElementById("waveform-container");
  const editingTools = document.getElementById("editing-tools");
  const emptyState = document.getElementById("empty-state");
  const transcriptSection = document.getElementById("transcript-section");

  if (playbackControls) playbackControls.classList.remove("d-none");
  if (waveformContainer) waveformContainer.classList.remove("d-none");
  if (editingTools) editingTools.classList.remove("d-none");
  if (transcriptSection) transcriptSection.classList.remove("d-none");
  if (emptyState) emptyState.classList.add("d-none");

  // Enable buttons that require audio to be loaded
  document.querySelectorAll("#editing-tools button").forEach((btn) => {
    btn.removeAttribute("disabled");
  });
}

// Ensure only one region exists at a time
function ensureSingleRegion(region) {
  const regions = Object.values(window.wavesurfer.regions.list);
  if (regions.length > 1) {
    regions.forEach((existingRegion) => {
      if (existingRegion.id !== region.id) existingRegion.remove();
    });
  }
}

// Setup play/pause button
function setupPlayButton() {
  const playBtn = document.getElementById("play-btn");
  if (!playBtn) return;

  playBtn.addEventListener("click", function () {
    if (window.wavesurfer.isPlaying()) {
      window.wavesurfer.pause();
    } else {
      window.wavesurfer.play();
    }
  });

  // Update button state when playback ends
  wavesurfer.on("finish", function () {
    updatePlayButton(false);
  });
}

// Update play button state
function updatePlayButton(isPlaying) {
  const playBtn = document.getElementById("play-btn");
  if (!playBtn) return;

  if (isPlaying) {
    playBtn.innerHTML = '<i class="fas fa-pause" style="margin: 0px"></i>';
    playBtn.classList.remove("btn-primary");
    playBtn.classList.add("btn-danger");
  } else {
    playBtn.innerHTML = '<i class="fas fa-play" style="margin: 0px"></i>';
    playBtn.classList.remove("btn-danger");
    playBtn.classList.add("btn-primary");
  }
}

// Setup volume slider
function setupVolumeControl() {
  const volumeSlider = document.getElementById("volume-slider");
  if (volumeSlider) {
    volumeSlider.addEventListener("input", function () {
      wavesurfer.setVolume(this.value / 100);
    });
  }
}

// Setup playback speed control
function setupPlaybackSpeed() {
  const playbackSpeedSelect = document.getElementById("playback-speed");
  if (!playbackSpeedSelect) return;

  playbackSpeedSelect.addEventListener("change", function () {
    const speed = parseFloat(this.value);
    wavesurfer.setPlaybackRate(speed);
    showSpeedNotification(speed);
  });

  // Set initial value from settings if available
  if (window.settingsHandler?.getSettings) {
    const settings = window.settingsHandler.getSettings();
    if (settings.audioSettings?.playbackRate) {
      const rate = settings.audioSettings.playbackRate.toString();
      playbackSpeedSelect.value = rate;
      wavesurfer.setPlaybackRate(parseFloat(rate));
    }
  }
}

// Show speed change notification
function showSpeedNotification(speed) {
  const notification = document.createElement("div");
  notification.className = "alert alert-info";
  notification.innerHTML = `<i class="fas fa-tachometer-alt me-2"></i> Playback speed: ${speed}x`;
  notification.style.position = "fixed";
  notification.style.bottom = "10px";
  notification.style.right = "10px";
  notification.style.zIndex = "9999";
  notification.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
  notification.style.padding = "8px 16px";
  document.body.appendChild(notification);

  // Remove notification after 1.5 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.5s ease-out";
    setTimeout(() => {
      if (notification.parentNode)
        notification.parentNode.removeChild(notification);
    }, 500);
  }, 1500);
}

// Initialize audio cutting controls
function initAudioCuttingControls() {
  const editingTools = document.getElementById("editing-tools");
  if (!editingTools) {
    console.error("Editing tools container not found");
    return;
  }

  // Create cutting controls row
  const cuttingControlsRow = document.createElement("div");
  cuttingControlsRow.className = "row g-2 mt-2";
  cuttingControlsRow.id = "cutting-controls";
  cuttingControlsRow.innerHTML = `
    <div class="col-md-4">
      <button class="btn btn-outline-primary w-100" id="play-region" disabled>
        <i class="fas fa-play-circle"></i><br>
        Play Selected Region
      </button>
    </div>
    <div class="col-md-4">
      <button class="btn btn-outline-danger w-100" id="trim-audio" disabled>
        <i class="fas fa-cut"></i><br>
        Trim to Selection
      </button>
    </div>
    <div class="col-md-4">
      <button class="btn btn-outline-secondary w-100" id="clear-region" disabled>
        <i class="fas fa-times-circle"></i><br>
        Clear Selection
      </button>
    </div>
  `;

  // Add controls to the editing tools container
  editingTools.appendChild(cuttingControlsRow);

  // Set up button event handlers
  document
    .getElementById("play-region")
    ?.addEventListener("click", playSelectedRegion);
  document
    .getElementById("trim-audio")
    ?.addEventListener("click", trimAudioToSelection);
  document
    .getElementById("clear-region")
    ?.addEventListener("click", clearRegions);
}

// Function to enable/disable region control buttons
function updateRegionControls(hasRegion) {
  const playRegionBtn = document.getElementById("play-region");
  const trimAudioBtn = document.getElementById("trim-audio");
  const clearRegionBtn = document.getElementById("clear-region");

  if (playRegionBtn) playRegionBtn.disabled = !hasRegion;
  if (trimAudioBtn) trimAudioBtn.disabled = !hasRegion;
  if (clearRegionBtn) clearRegionBtn.disabled = !hasRegion;
}

// Function to play the selected region
function playSelectedRegion() {
  if (!window.wavesurfer) return;

  const regions = Object.values(window.wavesurfer.regions.list);
  if (regions.length === 0) return;
  regions[0].play();
}

// Function to trim the audio to the selected region
function trimAudioToSelection() {
  if (!window.wavesurfer) return;

  const regions = Object.values(window.wavesurfer.regions.list);
  if (regions.length === 0) return;

  const region = regions[0];

  // Store the current audio for potential restoration
  if (!window.originalAudio) {
    window.originalAudio = {
      buffer: window.wavesurfer.backend.buffer,
      filename: document.getElementById("current-file").textContent,
    };
  }

  // Calculate new buffer parameters
  const start = Math.floor(
    region.start * window.wavesurfer.backend.buffer.sampleRate
  );
  const end = Math.floor(
    region.end * window.wavesurfer.backend.buffer.sampleRate
  );
  const channels = window.wavesurfer.backend.buffer.numberOfChannels;
  const newDuration = region.end - region.start;

  // Create a new audio buffer
  const newBuffer = window.wavesurfer.backend.ac.createBuffer(
    channels,
    end - start,
    window.wavesurfer.backend.buffer.sampleRate
  );

  // Copy each channel's data to the new buffer
  for (let channel = 0; channel < channels; channel++) {
    const sourceData = window.wavesurfer.backend.buffer.getChannelData(channel);
    const newData = newBuffer.getChannelData(channel);
    for (let i = 0; i < end - start; i++) {
      newData[i] = sourceData[start + i];
    }
  }

  // Load the new buffer
  window.wavesurfer.loadDecodedBuffer(newBuffer);

  // Show notification to user
  const notification = document.createElement("div");
  notification.className = "alert alert-success";
  notification.innerHTML = `<i class="fas fa-check-circle"></i> Audio trimmed successfully (${newDuration.toFixed(
    2
  )} seconds)`;
  notification.style.position = "fixed";
  notification.style.top = "10px";
  notification.style.right = "10px";
  notification.style.zIndex = "9999";
  document.body.appendChild(notification);

  // Remove notification after 3 seconds
  setTimeout(() => {
    document.body.removeChild(notification);
  }, 3000);

  // Clear regions after trimming
  clearRegions();
}

// Function to clear all regions
function clearRegions() {
  if (!window.wavesurfer?.regions) return;
  window.wavesurfer.regions.clear();
  updateRegionControls(false);
}

// Update time display
function updateTimeDisplay() {
  if (!window.wavesurfer) return;

  const currentTimeDisplay = document.getElementById("current-time");
  const totalTimeDisplay = document.getElementById("total-time");

  if (currentTimeDisplay && totalTimeDisplay) {
    const currentTime = window.wavesurfer.getCurrentTime();
    const duration = window.wavesurfer.getDuration();

    currentTimeDisplay.textContent = formatTime(currentTime);
    totalTimeDisplay.textContent = formatTime(duration);
  }
}

// Format time as MM:SS
function formatTime(time) {
  if (!isFinite(time)) return "0:00";

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Global function to load audio files
window.loadAudioFile = function (file, fileName) {
  if (!file || !window.wavesurfer) {
    console.error("Missing file or wavesurfer instance");
    return;
  }

  // Update current file display
  const currentFileDisplay = document.getElementById("current-file");
  if (currentFileDisplay) currentFileDisplay.textContent = fileName;

  // Make sure waveform container is visible first
  const waveformContainer = document.getElementById("waveform-container");
  if (waveformContainer) {
    waveformContainer.classList.remove("d-none");
    // Force layout recalculation
    waveformContainer.offsetHeight;
  }

  // Show audio editor UI elements before loading the audio
  showAudioEditor();

  // Load the audio file with a slight delay to ensure DOM is ready
  try {
    const fileReader = new FileReader();

    fileReader.onload = function (e) {
      // Clear previous audio
      window.wavesurfer.empty();

      // Small delay to ensure container is visible and sized
      setTimeout(() => {
        // Load audio
        window.wavesurfer.loadArrayBuffer(e.target.result);
        window.audioLoaded = true;

        // Force wavesurfer to redraw after loading
        window.wavesurfer.drawBuffer();

        // Ensure proper layout after drawing
        if (waveformContainer) {
          // Force browser to recalculate layout
          waveformContainer.style.display = "none";
          waveformContainer.offsetHeight; // Force reflow
          waveformContainer.style.display = "";
        }

        // Dispatch event for other components
        document.dispatchEvent(
          new CustomEvent("app:audioLoaded", {
            detail: { fileName, file },
          })
        );
      }, 50); // Small delay
    };

    fileReader.onerror = (error) => console.error("FileReader error:", error);
    fileReader.readAsArrayBuffer(file);
  } catch (error) {
    console.error("Error loading audio file:", error);
  }
};
