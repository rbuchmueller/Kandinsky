import express from 'express'
import cors from 'cors'
import artist from './routes/artist'
import exhibition from './routes/exhibition'
import generativeAI from './routes/generativeAI';
require('dotenv').config()

const app = express()
// List of allowed origins
const allowedOrigins = ['http://localhost:4200', 'https://artvis-cluster.web.app'];

// CORS middleware configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      // If the origin is in the allowed list, allow the request
      console.log('Origin allowed:', origin);
      callback(null, true);
    } else {
      // If the origin is not in the allowed list, block the request
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/artist/', artist)
app.use('/exhibition/', exhibition)
app.use('/ai/', generativeAI);

app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT} \n Press CTRL-C to stop\n`));
