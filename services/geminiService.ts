
import { GoogleGenAI, Modality } from "@google/genai";

let ai: GoogleGenAI | null = null;
const getAI = () => {
  if (!ai) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export async function generateSpeech(text: string, voice: string): Promise<string> {
  try {
    const genai = getAI();
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
    throw new Error("Failed to generate audio. Please check your API key and network connection.");
  }
}
