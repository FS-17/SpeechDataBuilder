/**
 * AI Service Handler
 * Manages connections to AI services for speech-to-text
 */

(function () {
  // Available AI service providers
  const AI_PROVIDERS = {
    GOOGLE_AI_STUDIO: {
      name: "Google AI Studio",
      apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/",
      defaultModel: "gemini-2.0-flash-lite",
      docs: "https://ai.google.dev/tutorials/setup",
      testEndpoint: "https://generativelanguage.googleapis.com/v1beta/models",
      audioTranscription: true,
      textGeneration: true,
      models: {
        "gemini-2.0-flash-lite": "Gemini 2.0 Flash-Lite (Default)",
        "gemini-exp-1206": "Gemini 2.0 Pro",
        "gemma-3": "Gemma 3",
      },
    },
    OPENAI: {
      name: "OpenAI",
      apiEndpoint: "https://api.openai.com/v1/",
      defaultModel: "whisper-1",
      docs: "https://platform.openai.com/docs/api-reference",
      testEndpoint: "https://api.openai.com/v1/models",
      audioTranscription: true,
      textGeneration: true,
    },
  };

  // Test the API key and connection
  async function testAPIConnection(provider, apiKey) {
    if (!provider || !apiKey) {
      return { success: false, message: "Missing provider or API key" };
    }

    const providerConfig = AI_PROVIDERS[provider];
    if (!providerConfig) {
      return { success: false, message: "Invalid provider" };
    }

    try {
      const response = await fetch(providerConfig.testEndpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(provider === "OPENAI"
            ? { Authorization: `Bearer ${apiKey}` }
            : { "x-goog-api-key": apiKey }),
        },
      });

      if (response.ok) {
        return { success: true, message: "Connection successful" };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.error?.message || `Error: ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || "Connection failed",
      };
    }
  }

  // Transcribe audio file using AI
  async function transcribeAudio(provider, apiKey, audioFile) {
    if (!provider || !apiKey || !audioFile) {
      return { success: false, message: "Missing required parameters" };
    }

    const providerConfig = AI_PROVIDERS[provider];
    if (!providerConfig || !providerConfig.audioTranscription) {
      return {
        success: false,
        message: "Provider does not support audio transcription",
      };
    }

    try {
      if (provider === "OPENAI") {
        return await transcribeWithOpenAI(apiKey, audioFile, providerConfig);
      } else if (provider === "GOOGLE_AI_STUDIO") {
        return await transcribeWithGoogleAI(apiKey, audioFile, providerConfig);
      } else {
        return { success: false, message: "Unsupported provider" };
      }
    } catch (error) {
      console.error("Transcription error:", error);
      return {
        success: false,
        message: error.message || "Transcription failed",
      };
    }
  }

  // OpenAI-specific transcription implementation
  async function transcribeWithOpenAI(apiKey, audioFile, providerConfig) {
    const formData = new FormData();
    const file =
      audioFile instanceof File
        ? audioFile
        : new File([audioFile], audioFile.name);

    formData.append("file", file);
    formData.append("model", "whisper-1");
    formData.append("response_format", "json");

    // Get the transcription
    const response = await fetch(
      `${providerConfig.apiEndpoint}audio/transcriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      transcript: data.text,
      normalizedText: null,
    };
  }

  // Google AI-specific transcription implementation
  async function transcribeWithGoogleAI(apiKey, audioFile, providerConfig) {
    // Convert audio to base64
    const buffer = await audioFile.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(buffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    const model =
      localStorage.getItem("ai_model") || providerConfig.defaultModel;
    const endpoint = `${providerConfig.apiEndpoint}${model}:generateContent`;

    // Create request payload
    const payload = {
      contents: [
        {
          parts: [
            {
              text: "Please transcribe the following audio file accurately:",
            },
            {
              inlineData: {
                mimeType: audioFile.type || "audio/wav",
                data: base64Audio,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    };

    // Make API request
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Error: ${response.status}`);
    }

    const data = await response.json();
    const transcript = data.candidates[0]?.content?.parts[0]?.text || "";

    return {
      success: true,
      transcript: transcript.replace(/^\s*Transcription:\s*/i, ""),
      normalizedText: null,
    };
  }

  // Normalize transcript using AI
  async function normalizeTranscript(provider, apiKey, transcript) {
    if (!provider || !apiKey || !transcript) {
      return { success: false, message: "Missing required parameters" };
    }

    try {
      if (provider === "OPENAI") {
        return await normalizeWithOpenAI(
          apiKey,
          transcript,
          AI_PROVIDERS[provider]
        );
      } else if (provider === "GOOGLE_AI_STUDIO") {
        return await normalizeWithGoogleAI(
          apiKey,
          transcript,
          AI_PROVIDERS[provider]
        );
      } else {
        return { success: false, message: "Unsupported provider" };
      }
    } catch (error) {
      console.error("Normalization error:", error);
      return {
        success: false,
        message: error.message || "Normalization failed",
      };
    }
  }

  // Google AI-specific normalization implementation
  async function normalizeWithGoogleAI(apiKey, transcript, providerConfig) {
    const model =
      localStorage.getItem("ai_model") || providerConfig.defaultModel;
    const endpoint = `${providerConfig.apiEndpoint}${model}:generateContent`;

    // Create request with prompt for normalization
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Normalize the following transcript for a text-to-speech dataset:
              
Original: "${transcript}"

Rules for normalization:
1. Convert all text to lowercase
2. Spell out numbers, symbols, and abbreviations
3. Remove extra spaces, punctuation, and special characters
4. Preserve the language of the text (don't translate)

Normalized text:`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    };

    // Make API request
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Error: ${response.status}`);
    }

    const data = await response.json();
    const normalizedText = data.candidates[0]?.content?.parts[0]?.text || "";

    return {
      success: true,
      normalizedText: normalizedText.trim(),
    };
  }

  // OpenAI-specific normalization implementation
  async function normalizeWithOpenAI(apiKey, transcript, providerConfig) {
    const endpoint = `${providerConfig.apiEndpoint}chat/completions`;

    // Create request with prompt for normalization
    const payload = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a text normalization assistant that helps prepare text for text-to-speech datasets.",
        },
        {
          role: "user",
          content: `Normalize the following transcript for a text-to-speech dataset:
          
Original: "${transcript}"

Rules for normalization:
1. Convert all text to lowercase
2. Spell out numbers, symbols, and abbreviations
3. Remove extra spaces, punctuation, and special characters
4. Preserve the language of the text (don't translate)

Return only the normalized text without any explanations.`,
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    };

    // Make API request
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Error: ${response.status}`);
    }

    const data = await response.json();
    const normalizedText = data.choices[0]?.message?.content || "";

    return {
      success: true,
      normalizedText: normalizedText.trim(),
    };
  }

  // Export API
  window.aiServiceHandler = {
    getProviders: () => ({ ...AI_PROVIDERS }),
    testConnection: testAPIConnection,
    transcribeAudio: transcribeAudio,
    normalizeText: normalizeTranscript,
    hasValidCredentials: () => {
      const settings = window.settingsHandler?.getSettings?.();
      return !!(settings?.aiSettings?.provider && settings?.aiSettings?.apiKey);
    },
    getCurrentProvider: () => {
      const settings = window.settingsHandler?.getSettings?.();
      return settings?.aiSettings?.provider || "";
    },
  };
})();
