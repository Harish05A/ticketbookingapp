
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getMovieAIPrediction(movieTitle: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a short, exciting promotional "Hype Quote" and a "Viewer Persona" (who would enjoy this) for the movie: ${movieTitle}. Format as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hypeQuote: { type: Type.STRING },
            viewerPersona: { type: Type.STRING },
          },
          required: ["hypeQuote", "viewerPersona"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Insight Error:", error);
    return { hypeQuote: "Experience the thrill!", viewerPersona: "All action lovers" };
  }
}

export async function getAdminAnalyticsSummary(bookingsCount: number, revenue: number) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as a cinema business consultant. Analyze these stats: Total Bookings: ${bookingsCount}, Total Revenue: ₹${revenue}. Provide a one-sentence business insight.`,
    });
    return response.text;
  } catch (error) {
    return "Great performance this week!";
  }
}
