import { Router } from 'express';
import exhibitionModel from '../models/exhibition';

// ROUTING
/* app.METHOD(PATH, HANDLER)
Where:
- `app` is an instance of `express`.
- `METHOD` is an [HTTP request method], in lowercase.
- `PATH` is a path on the server.
- `HANDLER` is the function executed when the route is matched.
*/


const exhibition = Router();


exhibition.get('/', async (req, res) => {
    try {
        const result = await exhibitionModel.findAllExhibitions();
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});


export default exhibition;
