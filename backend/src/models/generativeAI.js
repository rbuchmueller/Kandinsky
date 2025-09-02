const { GoogleGenerativeAI } = require("@google/generative-ai");

class GenerativeAIModel {
  constructor() {
    // Initialize the GoogleGenerativeAI instance with the API key from environment variables
    this.genAI = new GoogleGenerativeAI(process.env.API_KEY);
  }

  async generateContent(prompt) {
    try {
      // Get the model instance
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      console.log("Prompt:", prompt);

      // Generate content based on the prompt
      const result = await model.generateContent(prompt);

      // Access the generated text
      if (
        result.response &&
        result.response.candidates &&
        result.response.candidates.length > 0 &&
        result.response.candidates[0].content &&
        result.response.candidates[0].content.parts &&
        result.response.candidates[0].content.parts.length > 0
      ) {
        // Extract the text from the correct path in the response
        const text = result.response.candidates[0].content.parts[0].text;
        console.log("Text generated");
        return text;
      } else {
        throw new Error("No content generated.");
      }
    } catch (error) {
      console.error("Error generating content:", error);
      throw error;
    }
  }
}

module.exports = new GenerativeAIModel();
