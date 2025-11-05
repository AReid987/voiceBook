
import { GoogleGenAI, Modality } from "@google/genai";

let ai: GoogleGenAI | null = null;
let currentApiKey: string | null = null;

function getAI(apiKey: string) {
  if (ai && currentApiKey === apiKey) {
    return ai;
  }
  if (!apiKey) {
    throw new Error("API key is missing.");
  }
  ai = new GoogleGenAI({ apiKey });
  currentApiKey = apiKey;
  return ai;
}

export async function generateSpeech(text: string, voice: string, apiKey: string): Promise<string> {
  try {
    const genai = getAI(apiKey);
    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return base64Audio;
    } else {
      throw new Error("No audio data received from API.");
    }
  } catch (error) {
    console.error("Error generating speech:", error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
       throw new Error("The provided API key is not valid. Please check it and try again.");
    }
    throw new Error("Failed to generate audio. Please check your API key and network connection.");
  }
}
