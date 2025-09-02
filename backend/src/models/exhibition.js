const dbSemaphore = require('../semaphoreHandler');
const math = require('mathjs');
const { session } = require('../db');  // Ensure this is correctly importing the session

class Exhibition {
    constructor(data) {
        this.id = Number(data.id); 
        this.start_date = formatDateString(data.startdate);
        this.end_date = formatDateString(data.enddate);
        this.name = data.title;
        this.took_place_in_country = data.country;
        this.city = data.city;
        this.type = data.type;
        this.duration = data.duration;
        this.exhibited_artists = data.exhibited_artists;
        this.europeanRegion = data.europeanRegion;
        this.took_place_in_old_country = data.tookPlaceInOldCountry;
        this.oldEuropeanRegion = data.oldEuropeanRegion;

    }
}

function formatDateString(dateString) {
    const date = new Date(dateString);
  
    const dateOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
  
    const formattedDate = date.toLocaleDateString('en-US', dateOptions);
    const formattedTime = '00:00:00'; // Fixed time value
    return `${formattedDate} ${formattedTime}`;
}

const findAllExhibitions = async () => {
    const query = `MATCH (n:Exhibition) WHERE n.forUse = true AND n.startdate >= '1905' AND n.startdate < '1916' RETURN n`;


    
    try {
        return await dbSemaphore.runExclusive(async () => {
            const result = await session.run(query);
            return processExhibitions(result);
        });
    } catch (error) {
        console.error('Error finding exhibitions:', error);
        throw error;
    } 
};

const processExhibitions = (result) => {
    const exhibitions = [];
    
    result.records.forEach(record => {
        const data = record.get('n').properties;  // Access the properties of the node
        const exhibition = new Exhibition(data);
        exhibitions.push(exhibition);
    });
    
    return exhibitions;
};

module.exports = {
    findAllExhibitions
};
