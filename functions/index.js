const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { GoogleGenAI } = require("@google/genai");

// We read the API key from the environment variable injected during deployment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

exports.analyzeTrade = onCall({ cors: true }, async (request) => {
  if (!GEMINI_API_KEY) {
    throw new HttpsError(
      "failed-precondition",
      "The Gemini API key is missing. Please ensure GEMINI_API_KEY is configured in your deployment secrets."
    );
  }

  // Ensure the user is authenticated (Optional but recommended)
  // if (!request.auth) {
  //   throw new HttpsError("unauthenticated", "You must be signed in to use AI analysis.");
  // }

  const { pair, entry, stopLoss, takeProfit, isLong } = request.data;

  if (!pair || !entry || !stopLoss || !takeProfit) {
    throw new HttpsError("invalid-argument", "Missing trading parameters.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    const promptText = `Analyze this trading setup. Pair: ${pair}, Entry: ${entry}, Stop Loss: ${stopLoss}, Take Profit: ${takeProfit}, Direction: ${isLong ? 'Long' : 'Short'}. Provide a brief structural market analysis and final success probability percentage.`;

    // Using gemini-1.5-flash as the fast/default model
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: promptText,
    });

    return {
      success: true,
      analysis: response.text
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new HttpsError("internal", "Failed to analyze trade using Gemini AI.", error.message);
  }
});
