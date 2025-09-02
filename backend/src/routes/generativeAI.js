import { Router } from 'express';
import generativeAIModel from '../models/generativeAI';

const generativeAI = Router();

generativeAI.post('/', async (req, res) => {
  try {
    const { prompt } = req.body;
    const generatedContent = await generativeAIModel.generateContent(prompt);
    res.json({ content: generatedContent });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default generativeAI;
