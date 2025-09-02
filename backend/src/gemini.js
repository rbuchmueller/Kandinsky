const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access your API key as an environment variable (see "Set up your API key" above)
//const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const genAI = new GoogleGenerativeAI("AIzaSyDRjOqh1VbhpBwTb3E_Bwwhhvkd-NJWvzc");

async function run() {
//parameters
/*     const generationConfig = {
        stopSequences: ["stop"],
        maxOutputTokens: 10,
        temperature: 0.9,
        topP: 0.1,
        topK: 16,
      };
       */

  // The Gemini 1.5 models are versatile and work with both text-only and multimodal prompts
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"}); //,generationConfig

  const prompt = "Verbindung zwischen Gino Severini und Umberto Boccioni in 6 Sätzen."

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  console.log(text);
}

run();