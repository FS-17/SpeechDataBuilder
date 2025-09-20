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

      let addedCount = 0;
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
        addedCount++;
      }

      // If we added any audio files, hide the empty placeholder and update the badge immediately
      if (addedCount > 0) {
        const emptyPlaceholder = document.getElementById("empty-file-list");
        if (emptyPlaceholder) emptyPlaceholder.style.display = "none";
        const fileCountBadge = document.getElementById("file-count");
        if (fileCountBadge) {
          const countNow = fileList.querySelectorAll(".file-item").length;
          fileCountBadge.textContent = countNow;
        }
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
        // Reset any inline styles that may have been set during collapse
        section.style.opacity = "";
        section.style.height = "";
        section.style.margin = "";
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
        // Do not permanently set height/margin to avoid layout break when showing again
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
  // Resolve plugins across versions (v6/v7 UMD names)
  const RegionsPluginFactory =
    (window.Regions && window.Regions.create ? window.Regions : null) ||
    (window.RegionsPlugin && window.RegionsPlugin.create
      ? window.RegionsPlugin
      : null) ||
    (WaveSurfer.regions && WaveSurfer.regions.create
      ? WaveSurfer.regions
      : null);
  const CursorPluginFactory =
    (window.Cursor && window.Cursor.create ? window.Cursor : null) ||
    (window.CursorPlugin && window.CursorPlugin.create
      ? window.CursorPlugin
      : null) ||
    (WaveSurfer.cursor && WaveSurfer.cursor.create ? WaveSurfer.cursor : null);

  const pluginList = [];
  if (RegionsPluginFactory) {
    pluginList.push(
      RegionsPluginFactory.create({
        dragSelection: true,
        slop: 5,
        maxRegions: 1,
        color: "rgba(115, 104, 208, 0.52)",
        maxRegions: 1,
        formatTimeCallback: function (sec) {
          return formatTime(sec);
        },
      })
    );
  }
  if (CursorPluginFactory) {
    pluginList.push(
      CursorPluginFactory.create({
        showTime: true,
        opacity: 1,
        customShowTimeStyle: {
          "background-color": "#000",
          color: "#fff",
          padding: "2px 5px",
          "font-size": "10px",
          "border-radius": "3px",
        },
      })
    );
  }

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
    plugins: pluginList,
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
  const regions = getRegionsList();
  if (regions.length > 1) {
    regions.forEach((existingRegion) => {
      if (existingRegion.id !== region.id) existingRegion.remove();
    });
  }
}

// Resolve regions plugin across versions
function getRegionsPlugin() {
  if (!window.wavesurfer) return null;
  return (
    window.wavesurfer.regions ||
    (window.wavesurfer.plugins && window.wavesurfer.plugins.regions) ||
    null
  );
}

function getRegionsList() {
  const plugin = getRegionsPlugin();
  if (!plugin) return [];
  if (plugin.list) return Object.values(plugin.list);
  if (typeof plugin.getRegions === "function") {
    const r = plugin.getRegions();
    if (Array.isArray(r)) return r;
    if (r && typeof r === "object") return Object.values(r);
  }
  return [];
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

  const regions = getRegionsList();
  if (regions.length === 0) return;
  regions[0].play();
}

// Function to trim the audio to the selected region
function trimAudioToSelection() {
  if (!window.wavesurfer) return;

  const regions = getRegionsList();
  if (regions.length === 0) return;

  const region = regions[0];
  const curFileName = document.getElementById("current-file")?.textContent;
  let audioBuffer = null;
  try {
    if (window.wavesurfer.backend?.buffer) {
      audioBuffer = window.wavesurfer.backend.buffer; // v6 style
    } else if (typeof window.wavesurfer.getDecodedData === "function") {
      audioBuffer = window.wavesurfer.getDecodedData(); // v7 style
    }
  } catch {}

  if (!audioBuffer || !audioBuffer.sampleRate) {
    showTransientNotice(
      "Trimming isn't available with the current audio engine.",
      "warning"
    );
    return;
  }

  // Store the current audio for potential restoration
  if (!window.originalAudio) {
    window.originalAudio = {
      buffer: audioBuffer,
      filename: curFileName,
    };
  }

  // Calculate new buffer parameters
  const start = Math.floor(region.start * audioBuffer.sampleRate);
  const end = Math.floor(region.end * audioBuffer.sampleRate);
  const channels = audioBuffer.numberOfChannels;
  const newDuration = region.end - region.start;

  // Create a new audio buffer
  const ac =
    window.wavesurfer.backend?.ac ||
    (typeof AudioContext !== "undefined" ? new AudioContext() : null);
  if (!ac) {
    showTransientNotice("Browser doesn't support audio trimming.", "warning");
    return;
  }
  const newBuffer = ac.createBuffer(
    channels,
    end - start,
    audioBuffer.sampleRate
  );

  // Copy each channel's data to the new buffer
  for (let channel = 0; channel < channels; channel++) {
    const sourceData = audioBuffer.getChannelData(channel);
    const newData = newBuffer.getChannelData(channel);
    for (let i = 0; i < end - start; i++) {
      newData[i] = sourceData[start + i];
    }
  }

  // Load the new buffer (only if supported)
  if (typeof window.wavesurfer.loadDecodedBuffer === "function") {
    window.wavesurfer.loadDecodedBuffer(newBuffer);
  } else if (typeof window.wavesurfer.loadBlob === "function") {
    // Fallback: encode to WAV and load as blob
    try {
      const wavBlob = audioBufferToWavBlob(newBuffer);
      window.wavesurfer.loadBlob(wavBlob);
    } catch (err) {
      console.warn("Failed to load trimmed audio buffer:", err);
      showTransientNotice("Trimming is limited in this browser.", "warning");
      return;
    }
  } else {
    showTransientNotice(
      "Trimming isn't supported with the current player.",
      "warning"
    );
    return;
  }

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

// Minimal WAV encoder to support loadBlob fallback
function audioBufferToWavBlob(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let result;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numOfChan * bytesPerSample;
  const bufferLength = result.length * bytesPerSample;
  const wavBuffer = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(wavBuffer);

  /* RIFF identifier */ writeString(view, 0, "RIFF");
  /* file length */ view.setUint32(4, 36 + bufferLength, true);
  /* RIFF type */ writeString(view, 8, "WAVE");
  /* format chunk identifier */ writeString(view, 12, "fmt ");
  /* format chunk length */ view.setUint32(16, 16, true);
  /* sample format (raw) */ view.setUint16(20, format, true);
  /* channel count */ view.setUint16(22, numOfChan, true);
  /* sample rate */ view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */ view.setUint16(34, bitDepth, true);
  /* data chunk identifier */ writeString(view, 36, "data");
  /* data chunk length */ view.setUint32(40, bufferLength, true);

  floatTo16BitPCM(view, 44, result);

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

function interleave(inputL, inputR) {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function showTransientNotice(message, type = "info") {
  const notification = document.createElement("div");
  const cls =
    type === "danger"
      ? "alert-danger"
      : type === "warning"
      ? "alert-warning"
      : type === "success"
      ? "alert-success"
      : "alert-info";
  notification.className = `alert ${cls}`;
  notification.textContent = message;
  notification.style.position = "fixed";
  notification.style.top = "10px";
  notification.style.right = "10px";
  notification.style.zIndex = "9999";
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.5s ease-out";
    setTimeout(() => notification.remove(), 500);
  }, 2500);
}

// Function to clear all regions
function clearRegions() {
  const plugin = getRegionsPlugin();
  if (!plugin) return;
  if (typeof plugin.clear === "function") plugin.clear();
  else if (plugin.list) {
    Object.values(plugin.list).forEach((r) => r.remove());
  }
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
      try {
        if (typeof window.wavesurfer.empty === "function") {
          window.wavesurfer.empty();
        }
      } catch {}

      // Small delay to ensure container is visible and sized
      setTimeout(() => {
        // Load audio (support multiple WS versions)
        try {
          if (typeof window.wavesurfer.loadArrayBuffer === "function") {
            window.wavesurfer.loadArrayBuffer(e.target.result);
          } else if (typeof window.wavesurfer.loadBlob === "function") {
            const blob = new Blob([e.target.result]);
            window.wavesurfer.loadBlob(blob);
          } else if (typeof window.wavesurfer.load === "function") {
            const blob = new Blob([e.target.result]);
            const url = URL.createObjectURL(blob);
            window.wavesurfer.load(url);
          }
        } catch (err) {
          console.error("Failed to load audio:", err);
        }
        window.audioLoaded = true;

        // Force wavesurfer to redraw after loading
        try {
          if (typeof window.wavesurfer.drawBuffer === "function") {
            window.wavesurfer.drawBuffer();
          }
        } catch {}

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

// Replace old shortcuts tooltip logic with modal-safe trigger if needed
(function () {
  const btn = document.getElementById("show-keyboard-shortcuts");
  if (btn) {
    btn.addEventListener("click", function () {
      const modalEl = document.getElementById("shortcutsModal");
      if (modalEl && window.bootstrap?.Modal) {
        // Reuse a single instance to avoid duplicate backdrops and stuck modals
        const m =
          bootstrap.Modal.getOrCreateInstance?.(modalEl) ||
          new bootstrap.Modal(modalEl);
        m.show();
      }
    });
  }
})();

// Global capture listener to prevent browser Save Page on Ctrl/Cmd+S
(function () {
  function onSaveShortcut(e) {
    const isSave =
      (e.ctrlKey || e.metaKey) &&
      !e.shiftKey &&
      !e.altKey &&
      e.key?.toLowerCase?.() === "s";
    if (!isSave) return;
    // Prevent browser "Save Page" dialog
    e.preventDefault();
    e.stopPropagation();
    try {
      // Defer to transcript handler; it will no-op if no current file
      if (window.transcriptHandler?.saveTranscript) {
        window.transcriptHandler.saveTranscript();
      }
    } catch (err) {
      console.warn("Save transcript via shortcut failed:", err);
    }
  }

  // Capture phase to intercept before the browser
  document.addEventListener("keydown", onSaveShortcut, { capture: true });
})();

// Batch transcript import logic
(function () {
  // Import: show type selection modal first, then file picker
  const importBtn = document.getElementById("import-transcripts");
  const importInput = document.getElementById("transcript-import-input");
  const importTypeModalEl = document.getElementById("importTypeModal");
  const confirmImportTypeBtn = document.getElementById("confirm-import-type");
  const ljspeechNormalizedOption = document.getElementById(
    "ljspeech-normalized-option"
  );
  let importTypeModal;

  function getSelectedImportType() {
    return (
      document.querySelector('input[name="importType"]:checked')?.value || "csv"
    );
  }

  function updateAcceptForType(type) {
    if (!importInput) return;
    const map = {
      json: ".json",
      csv: ".csv",
      tsv: ".tsv",
      txt: ".txt",
      ljspeech: ".ljspeech,.txt",
    };
    importInput.setAttribute(
      "accept",
      map[type] || ".json,.csv,.txt,.tsv,.ljspeech"
    );
  }

  function onImportTypeChanged() {
    const type = getSelectedImportType();
    updateAcceptForType(type);
    if (ljspeechNormalizedOption) {
      ljspeechNormalizedOption.style.display =
        type === "ljspeech" ? "block" : "none";
    }
  }

  // React to radio changes
  document
    .getElementById("import-type-options")
    ?.addEventListener("change", onImportTypeChanged);

  if (importBtn && importInput) {
    importBtn.addEventListener("click", (e) => {
      e.preventDefault();
      try {
        if (!importTypeModal && window.bootstrap?.Modal) {
          importTypeModal = new bootstrap.Modal(importTypeModalEl);
        }
        if (importTypeModal) {
          // Initialize state based on current selection
          onImportTypeChanged();
          importTypeModal.show();
        } else {
          // Fallback to direct file picker
          importInput.click();
        }
      } catch (err) {
        importInput.click();
      }
    });
  }

  if (confirmImportTypeBtn && importInput) {
    confirmImportTypeBtn.addEventListener("click", () => {
      // Close modal and then open file chooser
      try {
        importTypeModal?.hide();
      } catch {}
      setTimeout(() => importInput.click(), 120);
    });
  }

  if (importInput) {
    importInput.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const chosenType = getSelectedImportType();
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const text = await file.text();

      const includeNormalized =
        document.getElementById("import-ljspeech-normalized")?.checked ?? true;

      try {
        // Prefer chosen type; fall back to extension auto-detect if set to txt but looks like LJSpeech
        const parsed = parseTranscriptFile(text, chosenType || ext, {
          includeNormalized,
        });
        await applyParsedTranscripts(parsed);
      } catch (err) {
        console.error("Import error", err);
        uiHelpers?.showFeedback?.(
          "Failed to import transcripts. " + (err.message || ""),
          "danger"
        );
      } finally {
        // reset input to allow re-importing the same file
        importInput.value = "";
      }
    });
  }

  // Extend parser to support .ljspeech and pass options
  function parseTranscriptFile(text, ext, options = {}) {
    switch (ext) {
      case "json":
        return normalizeJsonTranscripts(JSON.parse(text));
      case "csv":
        return parseDelimited(text, ",");
      case "tsv":
        return parseDelimited(text, "\t");
      case "txt":
        // try TXT blocks first; fallback to LJSpeech-style if pipes are present
        return text.includes("|")
          ? parseLJSpeech(text, options)
          : parseTxtBlocks(text);
      case "ljspeech":
        return parseLJSpeech(text, options);
      default:
        // Try to auto-detect
        if (text.includes("|")) return parseLJSpeech(text, options);
        if (text.includes(",")) return parseDelimited(text, ",");
        return parseTxtBlocks(text);
    }
  }

  // LJSpeech: id|raw|normalized (normalized optional). Map to actual filenames and keep both raw/normalized.
  function parseLJSpeech(text, { includeNormalized = true } = {}) {
    const stripQuotes = (s = "") => {
      s = (s || "").replace(/\uFEFF/g, "").trim(); // remove BOM + trim
      if (
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))
      ) {
        s = s.slice(1, -1).trim();
      }
      return s;
    };

    const lines = text.split(/\r?\n/).filter((l) => l && l.trim().length > 0);
    const map = new Map();
    for (const line of lines) {
      const parts = line.split("|");
      if (parts.length < 2) continue;
      const idField = stripQuotes(parts[0]);
      const raw = stripQuotes(parts[1]);
      const normalized = stripQuotes(parts[2] || "");

      // If ID already has an extension, keep as-is; otherwise default to .wav
      const hasExt = /\.[^./\\]+$/.test(idField);
      const key = hasExt ? idField : `${idField}.wav`;

      // Store both so caller can decide how to apply
      map.set(key, { raw, normalized });
    }
    return map; // Map<filename, transcript>
  }

  // Update applyParsedTranscripts to accept Map or Object
  async function applyParsedTranscripts(parsed) {
    // Normalize to a plain object { filename: transcript }
    let obj;
    if (parsed instanceof Map) {
      obj = Object.fromEntries(parsed);
    } else if (Array.isArray(parsed)) {
      obj = Object.fromEntries(parsed);
    } else {
      obj = parsed;
    }

    const uploaded = (window.uploadedFiles || []).map((f) => f.name);
    if (!uploaded.length) {
      uiHelpers?.showFeedback?.(
        "No audio files are loaded. Upload audio first, then import transcripts.",
        "warning"
      );
      return;
    }

    const byBase = new Map();
    for (const name of uploaded) {
      const base = name.replace(/\.[^/.]+$/, "");
      if (!byBase.has(base)) byBase.set(base, []);
      byBase.get(base).push(name);
    }

    let applied = 0,
      ambiguous = 0,
      missing = 0;
    // Determine preference for normalized from UI when available
    const preferNormalized =
      document.getElementById("import-ljspeech-normalized")?.checked ?? true;

    for (const [key, value] of Object.entries(obj)) {
      // value can be string (single transcript) or object { raw, normalized }
      let raw = "";
      let normalized = "";
      if (value && typeof value === "object" && !Array.isArray(value)) {
        raw = (value.raw ?? "").toString();
        normalized = (value.normalized ?? "").toString();
      } else {
        raw = (value ?? "").toString();
      }

      const t = preferNormalized && normalized ? normalized : raw;
      if (!t) continue;

      if (uploaded.includes(key)) {
        transcriptHandler?.setTranscript?.(key, t);
        if (normalized) {
          window.settingsHandler?.updateNormalizedText?.(normalized, key);
        }
        applied++;
        continue;
      }

      const base = key.replace(/\.[^/.]+$/, "");
      const candidates = byBase.get(base) || [];
      if (candidates.length === 1) {
        const name = candidates[0];
        transcriptHandler?.setTranscript?.(name, t);
        if (normalized) {
          window.settingsHandler?.updateNormalizedText?.(normalized, name);
        }
        applied++;
      } else if (candidates.length > 1) {
        // ambiguous base name
        for (const cand of candidates) {
          transcriptHandler?.setTranscript?.(cand, t);
          if (normalized) {
            window.settingsHandler?.updateNormalizedText?.(normalized, cand);
          }
          applied++;
        }
        ambiguous++;
      } else {
        missing++;
      }
    }

    // Update UI/notify
    const currentFile = document
      .getElementById("current-file")
      ?.textContent?.trim();
    if (currentFile) {
      const newT = transcriptHandler?.getTranscript?.(currentFile) || "";
      const editor = document.getElementById("transcript-editor");
      if (editor) editor.value = newT;
      const normEditor = document.getElementById("normalized-editor");
      const normValue =
        window.settingsHandler?.getNormalizedText?.(currentFile);
      if (normEditor && typeof normValue === "string") {
        normEditor.value = normValue;
      }
      document.dispatchEvent(
        new CustomEvent("app:transcriptSaved", {
          detail: { file: currentFile },
        })
      );
    }

    uiHelpers?.showFeedback?.(
      `Imported transcripts: ${applied}. ${
        ambiguous ? "Ambiguous matches: " + ambiguous + ". " : ""
      }${missing ? "No match for: " + missing + "." : ""}`,
      "success"
    );
  }

  // Leave other helpers (normalizeJsonTranscripts, parseDelimited, parseTxtBlocks, splitCsvLike) intact
})();
