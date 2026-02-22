import { AnalysisResult, MarketCategory } from "../types";

// Lazy initialization - don't crash if no API key
let ai: any = null;

const getAI = async () => {
  if (ai) return ai;

  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
  if (!apiKey) {
    console.warn("No Gemini API key set. AI features will use mock data.");
    return null;
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    ai = new GoogleGenAI({ apiKey });
    return ai;
  } catch (e) {
    console.warn("Failed to initialize Gemini:", e);
    return null;
  }
};

export const analyzeVirality = async (tweetContent: string): Promise<AnalysisResult> => {
  const aiClient = await getAI();

  if (!aiClient) {
    // Return mock data if no API key
    return {
      hypeScore: Math.floor(Math.random() * 40) + 50,
      reasoning: "AI is vibing too hard. Manual override required.",
      verdict: Math.random() > 0.3 ? "BANG" : "MID",
      narrative: "This content is tapping into the current zeitgeist of internet absurdity."
    };
  }

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Analyze the viral potential and cultural context of this tweet for a prediction market called 'PredBlink'.
      
      Tweet Content: "${tweetContent}"
      
      Provide a JSON response with:
      - hypeScore (integer 0-100)
      - reasoning (string, keep it short, punchy, gen-z slang)
      - verdict (string: "BANG", "FLOP", "MID")
      - narrative (string, 1-2 sentences explaining the CULTURAL CONTEXT of this tweet)
      `,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      hypeScore: 69,
      reasoning: "AI is vibing too hard. Manual override.",
      verdict: "BANG",
      narrative: "This content is tapping into the current zeitgeist of internet absurdity."
    };
  }
};

export const generateMarketDetails = async (tweetContent: string): Promise<{ title: string; description: string; category: MarketCategory }> => {
  const aiClient = await getAI();

  if (!aiClient) {
    return {
      title: "Will this go viral?",
      description: "Betting on the absolute chaos of this tweet.",
      category: "SHITPOST"
    };
  }

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Create a prediction market title and description based on this tweet. 
      Title should be a short question. Description should be hype.
      Category must be one of: SHITPOST, RAGEBAIT, ALPHA, DRAMA.

      Tweet: "${tweetContent}"
      `,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text) as { title: string; description: string; category: MarketCategory };
  } catch (error) {
    return {
      title: "Will this go viral?",
      description: "Betting on the absolute chaos of this tweet.",
      category: "SHITPOST"
    };
  }
};
