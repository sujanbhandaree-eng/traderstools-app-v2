import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const { pair, entry, sl, tp, isLong } = req.body;

    const prompt = `As a professional trading analyst, evaluate this ${isLong ? 'Long' : 'Short'} setup for ${pair}:
    - Entry: ${entry}
    - Stop Loss: ${sl}
    - Take Profit: ${tp}
    
    Provide a concise risk assessment and market outlook.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ analysis: text });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ message: "Analysis failed on the server." });
  }
}
