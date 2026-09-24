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
app.get('/health', async (req, res) => {
  const { driver } = require('./db')
  const session = driver.session({ database: process.env.database })

  try {
    const result = await session.run('MATCH (n) RETURN count(n) AS count')
    const records = result.records[0].get('count')

    if (records < 1) {
      return res.status(503).json({ status: 'error', message: 'Neo4j contains no records' })
    }

    return res.json({ status: 'ok', records })
  } catch (error) {
    console.error('Health check failed:', error)
    return res.status(503).json({ status: 'error', message: 'Neo4j is unavailable' })
  } finally {
    await session.close()
  }
})
app.use('/artist/', artist)
app.use('/exhibition/', exhibition)
app.use('/ai/', generativeAI);

app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT} \n Press CTRL-C to stop\n`));
