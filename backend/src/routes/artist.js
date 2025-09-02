import { Router } from 'express';
import artistModel from '../models/artist';

// ROUTING
/* app.METHOD(PATH, HANDLER)
Where:
- `app` is an instance of `express`.
- `METHOD` is an [HTTP request method], in lowercase.
- `PATH` is a path on the server.
- `HANDLER` is the function executed when the route is matched.
*/


const artist = Router();


artist.get('/', async (req, res) => {
    try {
        const result = await artistModel.findAllArtists();
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

artist.get('/nationality/technique', async (req, res) => {
    try {
        const result = await artistModel.findAllNationalityTechnique();
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
artist.get('/birthcountry/technique', async (req, res) => {
    try {
        const result = await artistModel.findAllBirthcountryTechnique();
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
artist.get('/deathcountry/technique', async (req, res) => {
    try {
        const result = await artistModel.findAllDeathcountryTechnique();
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

artist.get('/mostexhibitedincountry/technique', async (req, res) => {
    try {
        const result = await artistModel.findAllMostExhibitedInTechnique();
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

artist.get('/technique', async (req, res) => {
    try {
        const result = await artistModel.findAllTechniques();
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
artist.get('/amount/nationality/technique', async (req, res) => {
    const minLimit = req.query.minLimit;
    const maxLimit = req.query.maxLimit;
    
    try {
        const result = await artistModel.findAllNationalityTechniqueAmount(minLimit,maxLimit);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

artist.get('/amount/birthcountry/technique', async (req, res) => {
    const minLimit = req.query.minLimit;
    const maxLimit = req.query.maxLimit;
    
    try {
        const result = await artistModel.findAllBirthcountryTechniqueAmount(minLimit,maxLimit);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
artist.get('/amount/deathcountry/technique', async (req, res) => {
    const minLimit = req.query.minLimit;
    const maxLimit = req.query.maxLimit;
    
    try {
        const result = await artistModel.findAllDeathcountryTechniqueAmount(minLimit,maxLimit);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
artist.get('/amount/mostexhibitedincountry/technique', async (req, res) => {
    const minLimit = req.query.minLimit;
    const maxLimit = req.query.maxLimit;
    
    try {
        const result = await artistModel.findAllMostExhibitedInTechniqueAmount(minLimit,maxLimit);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
artist.get('/amount', async (req, res) => {
    const minLimit = req.query.minLimit;
    const maxLimit = req.query.maxLimit;
    
    try {
        const result = await artistModel.findAllRange(minLimit,maxLimit);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
artist.get('/cluster/nationality', async (req, res) => {
    const minLimit = req.query.minLimit;
    const maxLimit = req.query.maxLimit;
    const k = parseInt(req.query.k); // Parse k parameter as integer

    try {
        const result = await artistModel.spectralClusteringNationality(minLimit, maxLimit, k);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
artist.get('/cluster/birthcountry', async (req, res) => {
    const minLimit = req.query.minLimit;
    const maxLimit = req.query.maxLimit;
    const k = parseInt(req.query.k); // Parse k parameter as integer

    try {
        const result = await artistModel.spectralClusteringBirthcountry(minLimit, maxLimit, k);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
artist.get('/cluster/deathcountry', async (req, res) => {
    const minLimit = req.query.minLimit;
    const maxLimit = req.query.maxLimit;
    const k = parseInt(req.query.k); // Parse k parameter as integer

    try {
        const result = await artistModel.spectralClusteringDeathcountry(minLimit, maxLimit, k);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
artist.get('/cluster/mostexhibited', async (req, res) => {
    const minLimit = req.query.minLimit;
    const maxLimit = req.query.maxLimit;
    const k = parseInt(req.query.k); // Parse k parameter as integer

    try {
        const result = await artistModel.spectralClusteringMostExhibited(minLimit, maxLimit, k);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

artist.get('/cluster', async (req, res) => {
    const minLimit = req.query.minLimit;
    const maxLimit = req.query.maxLimit;
    const k = parseInt(req.query.k); // Parse k parameter as integer

    try {
        const result = await artistModel.spectralClusteringRange(minLimit, maxLimit, k);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
export default artist;
