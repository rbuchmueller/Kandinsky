const dbSemaphore = require('../semaphoreHandler');
const math = require('mathjs');

let latestArtists = [];
let latestRelationships = [];
let latestMinLimit = -1;
let latestMaxLimit = -1;
let latestValue = '';


class Artist {
    constructor(data) {
        this.id = Number(data.id); 
        this.firstname = data.firstname;
        this.lastname = data.lastname;
        this.birthyear = data.birthyear;
        this.birthplace = data.birthplace;
        this.deathyear = data.deathyear
        this.deathplace = data.deathplace;
        this.nationality = data.country;
        this.sex = data.sex;
        this.title = data.title;
        this.techniques = data.artForms;
        this.amount_techniques=data.distinctArtForms.length;
        this.distinct_techniques=data.distinctArtForms;
        this.europeanRegionNationality = data.europeanRegionNationality
        this.most_exhibited_in = data.mostExhibitedInCountry;
        this.europeanRegionMostExhibited =  data.europeanRegionMostExhibitedInCountry;
        this.most_exhibited_in_amount = data.mostExhibitedInCountryAmount;
        this.total_exhibited_artworks = data.TotalExhibitedArtworks;
        this.deathcountry = data.deathCountry;
        this.europeanRegionDeath = data.europeanRegionDeathCountry
        this.birthcountry = data.birthCountry;
        this.europeanRegionBirth = data.europeanRegionBirthCountry;
        this.total_exhibitions = data.TotalExhibitions;
        this.techniques_freq = data.artFormsFreq;
        this.cluster = -1; // Default value
        this.overall_avg_date =formatDateString(data.overall_avg_date);
        this.avg_start_date = data.avg_start_date;
        this.avg_end_date = data.avg_end_date;
        this.avg_duration = data.avg_duration;
        this.participated_in_exhibition = data.participated_in_exhibition;
        this.oldBirthCountry = data.oldBirthCountry;
        this.oldDeathCountry = data.oldDeathCountry;
        this.mostExhibitedInOldCountry = data.mostExhibitedInOldCountry;
        this.europeanRegionOldBirth = data.europeanRegionOldBirthCountry;
        this.europeanRegionOldDeath = data.europeanRegionOldDeathCountry;
        this.europeanRegionMostExhibitedInOldCountry = data.europeanRegionOldMostExhibitedInCountry;
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
  
  



// Define European regions based on country codes
/*   const europeanRegions = {
    "North Europe": ["DK", "EE", "FI", "IS", "IE", "LV", "LT", "NO", "SE"],
    "Eastern Europe": ["AZ", "BY", "BG", "CZ", "HU", "MD", "PL", "RO", "RU", "SK", "UA"],
    "Southern Europe": ["BA", "HR", "GI", "GR", "IT", "ME", "PT", "RS", "SI", "ES"],
    "Western Europe": ["AT", "BE", "FR", "DE", "LU", "MC", "NL", "CH", "GB"],
    "Others": [
        "US", "AU", "GE", "MX", "AM", "IL", "CL", "AR", "CA", "DO", "PE", "JP", "TR",
        "BR", "ZA", "NZ", "VE", "GT", "UY", "SV", "PY", "IN", "PF", "KZ", "UZ", "VN", 
        "NA", "JO", "IR", "KH", "JM", "SA", "DZ", "CN", "EG", "VI", "ID", "CU", "TN", 
        "MQ", "MU", "LK", "EC", "SG", "BL", "TH", "BO"
      ]
    }; */

    


/*   const allCountries = [
    "GB", "ID", "UA", "CH", "RU", "NL", "DE", "BY", "IT", "LT", "US", "HU", "FR", "AU", "BE", "CZ", "AT", "NO", 
    "GR", "SE", "PL", "LV", "FI", "ES", "MD", "CA", "BG", "GE", "DZ", "MX", "AZ", "RO", "EE", "DK", "AR", "UY", 
    "CU", "PT", "HR", "SI", "TN", "EG", "SK", "TR", "VI", "RS", "IE", "DO", "JP", "MQ", "IN", "MU", "ME", "CL", 
    "ZA", "NZ", "KH", "LU", "GI", "VE", "GT", "SV", "PY", "LK", "BA", "EC", "BR", "SG", "BL", "PE", "TH", "PF", 
    "AM", "IL", "MC", "CN", "UZ", "KZ", "MA", "BO", "VN", "NA", "JO", "IR", "JM", "SA"
  ]
  // Create a set of all countries in europeanRegions
const categorizedCountries = new Set();
Object.values(europeanRegions).forEach(regionCountries => {
  regionCountries.forEach(country => {
    categorizedCountries.add(country);
  });
});

// Find countries in allCountries that are not in categorizedCountries
const uncategorizedCountries = allCountries.filter(country => !categorizedCountries.has(country));

console.log(uncategorizedCountries);
   */

class exhibited_with {
    constructor(startData, endData, relationshipData) {
        this.startId = Math.min(startData.id, endData.id);
        this.endId = Math.max(startData.id, endData.id);
        this.sharedExhibitions = relationshipData.sharedExhibitions;
        this.sharedExhibitionMinArtworks = relationshipData.sharedExhibitionMinArtworks;
    }
} 



const findAllNationalityTechnique = async () => {
    const { session } = require('../db');
    return await dbSemaphore.runExclusive(async () => {
        console.log('Semaphore acquired by normal')
    
    const result = await session.run(
   // Collect 25 distinct artists based on some criteria
    `MATCH (a:Artist)
    WHERE a.artForms <> [] AND a.country <> '\\N'
    WITH a
    LIMIT 25
    WITH collect(a) AS selectedArtists

    // For each artist in the selected group, find all exhibited relationships within this group
    UNWIND selectedArtists AS a
    MATCH p=(a)-[r:EXHIBITED_WITH]-(b)
    WHERE b IN selectedArtists
    RETURN p
    `);

    return await processResult(result); 
});
};

/* const findAllNationalityTechniqueAmount = async (minLimit, maxLimit) => {
    const { session } = require('../db');
    return await dbSemaphore.runExclusive(async () => {
        console.log('Semaphore acquired by amount')
    const result = await session.run(
   // Collect artists where total
    `MATCH (a:Artist)
    WHERE a.artForms <> [] AND a.country <> '\\N' AND a.TotalExhibitedArtworks >= $minLimit AND a.TotalExhibitedArtworks <= $maxLimit
    WITH a
    WITH collect(a) AS selectedArtists

    // For each artist in the selected group, find all exhibited relationships within this group
    UNWIND selectedArtists AS a
    MATCH p=(a)-[r:EXHIBITED_WITH]-(b)
    WHERE b IN selectedArtists
    RETURN p
    `
    ,{ minLimit: parseInt(minLimit), maxLimit: parseInt(maxLimit) } );// Ensure these are correctly passed as integers);
    

    return await processResult(result);
});
}; */


const findAllBirthcountryTechnique = async () => {
    const { session } = require('../db');
    return await dbSemaphore.runExclusive(async () => {
    const result = await session.run(
   // Collect 25 distinct artists based on some criteria
    `MATCH (a:Artist)
    WHERE a.artForms <> [] AND a.birthCountry <> '\\N'
    WITH a
    LIMIT 25
    WITH collect(a) AS selectedArtists

    // For each artist in the selected group, find all exhibited relationships within this group
    UNWIND selectedArtists AS a
    MATCH p=(a)-[r:EXHIBITED_WITH]-(b)
    WHERE b IN selectedArtists
    RETURN p
    `);

    return await processResult(result);
});
};

/* const findAllBirthcountryTechniqueAmount = async (minLimit,maxLimit) => {
    const { session } = require('../db');
    return await dbSemaphore.runExclusive(async () => {
    const result = await session.run(
   // Collect 25 distinct artists based on some criteria
    `MATCH (a:Artist) 
    WHERE a.artForms <> [] AND a.birthCountry <> '\\N' AND a.TotalExhibitedArtworks >= $minLimit AND a.TotalExhibitedArtworks <= $maxLimit
    WITH a
    WITH collect(a) AS selectedArtists

    // For each artist in the selected group, find all exhibited relationships within this group
    UNWIND selectedArtists AS a
    MATCH p=(a)-[r:EXHIBITED_WITH]-(b)
    WHERE b IN selectedArtists
    RETURN p
    `
    ,{ minLimit: parseInt(minLimit), maxLimit: parseInt(maxLimit) } );// Ensure these are correctly passed as integers);
    

    return await processResult(result);
});
}; */

const findAllDeathcountryTechnique = async () => {
    const { session } = require('../db');
    return await dbSemaphore.runExclusive(async () => {
    const result = await session.run(
   // Collect 25 distinct artists based on some criteria
    `MATCH (a:Artist)
    WHERE a.artForms <> [] AND a.deathCountry <> '\\N'
    WITH a
    LIMIT 25
    WITH collect(a) AS selectedArtists

    // For each artist in the selected group, find all exhibited relationships within this group
    UNWIND selectedArtists AS a
    MATCH p=(a)-[r:EXHIBITED_WITH]-(b)
    WHERE b IN selectedArtists
    RETURN p
    `);

    return await processResult(result);

});
};
/* 
const findAllDeathcountryTechniqueAmount = async (minLimit,maxLimit) => {
    const { session } = require('../db');
    return await dbSemaphore.runExclusive(async () => {
    const result = await session.run(
   // Collect 25 distinct artists based on some criteria
    `MATCH (a:Artist)
    WHERE a.artForms <> [] AND a.deathCountry <> '\\N'  AND a.TotalExhibitedArtworks >= $minLimit AND a.TotalExhibitedArtworks <= $maxLimit
    WITH a
    WITH collect(a) AS selectedArtists

    // For each artist in the selected group, find all exhibited relationships within this group
    UNWIND selectedArtists AS a
    MATCH p=(a)-[r:EXHIBITED_WITH]-(b)
    WHERE b IN selectedArtists
    RETURN p
    `
    ,{ minLimit: parseInt(minLimit), maxLimit: parseInt(maxLimit) } );// Ensure these are correctly passed as integers);
    

    return await processResult(result);

});
}; */


const findAllMostExhibitedInTechnique = async () => {
    const { session } = require('../db');
    return await dbSemaphore.runExclusive(async () => {
    const result = await session.run(
   // Collect 25 distinct artists based on some criteria
    `MATCH (a:Artist)
    WHERE a.artForms <> [] AND a.mostExhibitedInCountry <> '\\N' AND a.unclearMostExhibitedInCountry = FALSE 
    WITH a
    LIMIT 25
    WITH collect(a) AS selectedArtists

    // For each artist in the selected group, find all exhibited relationships within this group
    UNWIND selectedArtists AS a
    MATCH p=(a)-[r:EXHIBITED_WITH]-(b)
    WHERE b IN selectedArtists
    RETURN p
    `);

    return await processResult(result);
});
};

/* const findAllMostExhibitedInTechniqueAmount = async (minLimit,maxLimit) => {
    const { session } = require('../db');
    return await dbSemaphore.runExclusive(async () => {
    const result = await session.run(
   // Collect 25 distinct artists based on some criteria
    `MATCH (a:Artist)
    WHERE a.artForms <> [] AND a.mostExhibitedInCountry <> '\\N' AND a.unclearMostExhibitedInCountry = FALSE  AND a.TotalExhibitedArtworks >= $minLimit AND a.TotalExhibitedArtworks <= $maxLimit
    WITH a
    WITH collect(a) AS selectedArtists

    // For each artist in the selected group, find all exhibited relationships within this group
    UNWIND selectedArtists AS a
    MATCH p=(a)-[r:EXHIBITED_WITH]-(b)
    WHERE b IN selectedArtists
    RETURN p
    `
    ,{ minLimit: parseInt(minLimit), maxLimit: parseInt(maxLimit) } );// Ensure these are correctly passed as integers);
    

    return await processResult(result);

});
}; */


const findAllTechniques = async () => {
    const { session } = require('../db');
    return await dbSemaphore.runExclusive(async () => {
    const result = await session.run(
   // Collect 25 distinct artists based on some criteria
    `MATCH (a:Artist)
    WHERE a.artForms <> [] AND a.artFormsFreq <> '{}'
    WITH a
    LIMIT 25
    WITH collect(a) AS selectedArtists

    // For each artist in the selected group, find all exhibited relationships within this group
    UNWIND selectedArtists AS a
    MATCH p=(a)-[r:EXHIBITED_WITH]-(b)
    WHERE b IN selectedArtists
    RETURN p
    `);

    return await processResult(result);

});
};



  // Assuming 'artists' is an array of artist nodes and 'relationships' is an array of edges with weights
const normalizeLogarithmically = (values) => {
    const logMaxValue = Math.log1p(Math.max(...values.values()));
    const logMinValue = Math.log1p(Math.min(...values.values()));
    const range = logMaxValue - logMinValue;
    const normalized = new Map();
   
    values.forEach((value, id) => {
        normalized.set(id, (Math.log1p(value) - logMinValue) / range); // Normalize by dividing by the max degree
    });
    return normalized;
};

function countArtistsByRegion(clusteredArtists) {
    const regionOrder = ["North Europe", "Eastern Europe", "Southern Europe", "Western Europe", "Others", "\\N"];
    return clusteredArtists.map(cluster => {
        const regionCounts = cluster.reduce((counts, artist) => {
            const region = artist.europeanRegionNationality || "\\N";
            counts[region] = (counts[region] || 0) + 1;
            return counts;
        }, {});

        const totalArtists = cluster.length;
        const regionProportions = regionOrder.reduce((proportions, region) => {
            proportions[region] = (regionCounts[region] || 0) / totalArtists;
            return proportions;
        }, {});

        return { cluster, regionProportions };
    });
}



function sortClustersByRegionProportions(clusteredArtists) {
    const countedClusters = countArtistsByRegion(clusteredArtists);

    // Sort clusters based on the highest region proportion and then by region proportions
    countedClusters.sort((a, b) => {
        const maxProportionA = Math.max(...Object.values(a.regionProportions));
        const maxProportionB = Math.max(...Object.values(b.regionProportions));

        // Sort by the highest proportion region
        if (maxProportionA !== maxProportionB) {
            return maxProportionB - maxProportionA;
        }

        // Sort within the highest proportion region by the proportion values
        const sortedRegionsA = Object.entries(a.regionProportions).sort(([, propA], [, propB]) => propB - propA);
        const sortedRegionsB = Object.entries(b.regionProportions).sort(([, propA], [, propB]) => propB - propA);

        for (let i = 0; i < sortedRegionsA.length; i++) {
            if (sortedRegionsA[i][1] !== sortedRegionsB[i][1]) {
                return sortedRegionsB[i][1] - sortedRegionsA[i][1];
            }
        }

        return 0;
    });

    return countedClusters.map(clusterData => clusterData.cluster);
}




async function spectralClustering(artists, relationships, k) {
    console.log('cluster')
    // Step 0: Extract sharedExhibitionMinArtworks values for normalization
    const sharedExhibitionValues = new Map();
    relationships.forEach(relationship => {
        const id = relationship.startId;
        const value = relationship.sharedExhibitionMinArtworks;
        sharedExhibitionValues.set(id, value);
    });

    // Step 0.1: Normalize sharedExhibitionMinArtworks values
    const normalizedSharedExhibitionValues = normalizeLogarithmically(sharedExhibitionValues);

    // Step 1: Construct the adjacency matrix
    const size = artists.length;
    const adjacencyMatrix = math.zeros(size, size);

    relationships.forEach(relationship => {
        const i = artists.findIndex(artist => artist.id === relationship.startId);
        const j = artists.findIndex(artist => artist.id === relationship.endId);
        const weight = normalizedSharedExhibitionValues.get(relationship.startId);

        adjacencyMatrix.set([i, j], Number(weight));
        adjacencyMatrix.set([j, i], Number(weight)); // since it's an undirected graph
    });   

    // Step 2: Construct the degree matrix
    const degreeMatrix = adjacencyMatrix.map((value, index, matrix) => {
        return index[0] === index[1] ? Number(math.sum(matrix._data[index[0]])) : 0;
    });

    // Step 3: Construct the Laplacian matrix
    const laplacianMatrix = math.subtract(degreeMatrix, adjacencyMatrix);

   // Step 4: Compute the eigenvalues and eigenvectors
   const eigensystem = math.eigs(laplacianMatrix);

   // Check if the eigenvalues and eigenvectors are defined and not empty
   if (!eigensystem || eigensystem.values.length === 0) {
       throw new Error("Eigenvectors are undefined or missing data.");
   }
 

   // Extract the first three eigenvectors
const firstThreeEigenvectors = eigensystem.eigenvectors.slice(0, k);

// Initialize the feature matrix
const featureMatrixU = [];

// Loop over the eigenvectors
for (let i = 0; i < firstThreeEigenvectors.length; i++) {
    const vector = firstThreeEigenvectors[i].vector.toArray(); // Convert DenseMatrix to array
    featureMatrixU.push(vector); // Push the vector as a column in the feature matrix
}

// Transpose the feature matrix to have columns as data points
const featureMatrixUTransposed = math.transpose(featureMatrixU);
      // Perform initial kMeans Clustering
      let clusters = kMeansClustering(featureMatrixUTransposed, k, 1); // Assume minClusterSize = 1 for basic example

      const minSize = Math.floor(size / k);
      const maxSize = Math.ceil(size / k);
      // Redistribute clusters here
      clusters = redistributeClusters(featureMatrixUTransposed, clusters, k, minSize, maxSize); // Example sizes
  
   // Assuming kMeansClustering and other related functions are d
   
    // Associate artists with their clusters
    const clusterArray = artists.map((artist, index) => ({
        ...artist,
        cluster: clusters[index]
    }));
    // Associate artists with their clusters
    const clusterAssignments = artists.map((artist, index) => {
    artist.cluster = clusters[index]; // Assign the cluster to the artist
        
});
   
    // Initialize an array of k empty arrays for the clusters
let clusteredArtists = Array.from({ length: k }, () => []);

// Populate the cluster arrays with artists
artists.forEach((artist, index) => {
  const clusterIndex = clusters[index]; // Retrieve the cluster index assigned to the artist
  clusteredArtists[clusterIndex].push(artist); // Add the artist to the corresponding cluster
});
clusteredArtists = sortClustersByRegionProportions(clusteredArtists);


// Update clusterMap with the new cluster indices after sorting
const clusterMap = new Map();
clusteredArtists.forEach((cluster, sortedClusterIndex) => {
  cluster.forEach(artist => {
    clusterMap.set(artist.id, sortedClusterIndex); // Correctly associate artist ID with new cluster index
  });
});

  // Update the cluster property of each artist to reflect the sorted cluster index
  artists.forEach(artist => {
    artist.cluster = clusterMap.get(artist.id);
});



const intraClusterRelationships = Array.from({ length: k }, () => []);
const singleInterClusterRelationships = Array.from({ length: k }, () => []);
const interClusterRelationshipsMap = new Map();

relationships.forEach(relationship => {
    const clusterA = clusterMap.get(relationship.startId);
    const clusterB = clusterMap.get(relationship.endId);

    if (clusterA === clusterB) {
        intraClusterRelationships[clusterA].push(relationship);
    } else {
        singleInterClusterRelationships[clusterA].push(relationship);
        singleInterClusterRelationships[clusterB].push(relationship);
        const key = `${Math.min(clusterA, clusterB)}-${Math.max(clusterA, clusterB)}`;
        if (!interClusterRelationshipsMap.has(key)) {
            interClusterRelationshipsMap.set(key, { 
                startId: Math.min(clusterA, clusterB), 
                endId: Math.max(clusterA, clusterB), 
                sharedExhibitions: 0, 
                sharedExhibitionMinArtworks: 0 
            });
        }
        const aggregatedRelationship = interClusterRelationshipsMap.get(key);
        aggregatedRelationship.sharedExhibitions += relationship.sharedExhibitions;
        aggregatedRelationship.sharedExhibitionMinArtworks += relationship.sharedExhibitionMinArtworks;
    }
});

const interClusterRelationships = Array.from(interClusterRelationshipsMap.values()).map(rel => 
    new exhibited_with(
        { id: rel.startId }, 
        { id: rel.endId }, 
        { sharedExhibitions: rel.sharedExhibitions, sharedExhibitionMinArtworks: rel.sharedExhibitionMinArtworks }
    )
);

// Sorting by source.id, then target.id
interClusterRelationships.sort((a, b) => {
    if (a.startId !== b.startId) {
        return a.startId - b.startId;
    }
    return a.endId - b.endId;
});


console.log('cluster finished')
return [
    clusteredArtists,
    intraClusterRelationships,
    interClusterRelationships,  // You might want to further organize this by cluster pairs if needed
    singleInterClusterRelationships
];

}

function redistributeClusters(data, clusters, k, minClusterSize, maxClusterSize) {
    const centroids = calculateCentroids(data, clusters, k);
    let clusterSizes = new Array(k).fill(0);
    clusters.forEach(cluster => clusterSizes[cluster]++);

    const needsHelp = clusterSizes.map((size, index) => ({
        index,
        size,
        type: size < minClusterSize ? 'undersized' : (size > maxClusterSize ? 'oversized' : 'ok')
    })).filter(stat => stat.type !== 'ok');

    needsHelp.forEach(need => {
        if (need.type === 'oversized') {
            data.forEach((point, idx) => {
                if (clusters[idx] === need.index) {
                    const currentClusterIndex = need.index;
                    let closest = { index: -1, distance: Infinity };
                    
                    centroids.forEach((centroid, index) => {
                        if (index !== currentClusterIndex && clusterSizes[index] < maxClusterSize) {
                            const distance = euclideanDistance(point, centroid);
                            if (distance < closest.distance) {
                                closest = { index, distance };
                            }
                        }
                    });

                    if (closest.index !== -1) {
                        clusters[idx] = closest.index;
                        clusterSizes[currentClusterIndex]--;
                        clusterSizes[closest.index]++;
                    }
                }
            });
        }
    });

    return clusters;
}

function calculateCentroids(data, clusters, k) {
    const centroids = Array(k).fill(null).map(() => []);
    data.forEach((point, index) => {
        centroids[clusters[index]].push(point);
    });
    return centroids.map(cluster => cluster.reduce((mean, point) => 
        mean.map((m, idx) => m + point[idx] / cluster.length), new Array(data[0].length).fill(0))
    );
}

function kMeansClustering(data, k) {
    const maxIterations = 500;
    let bestCentroids = [];
    let bestClusterAssignments = [];
    let minTotalDistance = Infinity;

    for (let initialization = 0; initialization < 10; initialization++) { // Try multiple random initializations
        let centroids = initializeCentroidsPlusPlus(data, k);
        let clusterAssignments = [];

        for (let iteration = 0; iteration < maxIterations; iteration++) {
            const newClusterAssignments = assignPointsToCentroids(data, centroids);
            const newCentroids = updateCentroids(data, newClusterAssignments, k);

            if (centroidsEqual(newCentroids, centroids)) {
                clusterAssignments = newClusterAssignments;
                break;
            }

            centroids = newCentroids;
        }

        const totalDistance = calculateTotalDistance(data, centroids, clusterAssignments);
        if (totalDistance < minTotalDistance) {
            bestCentroids = centroids;
            bestClusterAssignments = clusterAssignments;
            minTotalDistance = totalDistance;
        }
    }

    return bestClusterAssignments;
}

function initializeCentroidsPlusPlus(data, k) {
    const centroids = [data[Math.floor(Math.random() * data.length)]];
    for (let i = 1; i < k; i++) {
        const distances = data.map(point => Math.min(...centroids.map(centroid => euclideanDistance(point, centroid))));
        const totalDistance = distances.reduce((a, b) => a + b, 0);
        const probabilities = distances.map(distance => distance / totalDistance);
        const cumulativeProbabilities = probabilities.reduce((acc, prob, index) => {
            if (index === 0) acc.push(prob);
            else acc.push(acc[index - 1] + prob);
            return acc;
        }, []);
        
        const rand = Math.random();
        const nextCentroidIndex = cumulativeProbabilities.findIndex(cumProb => cumProb >= rand);
        centroids.push(data[nextCentroidIndex]);
    }
    return centroids;
}


function assignPointsToCentroids(data, centroids) {
    const clusterAssignments = [];
    for (const point of data) {
        let minDistance = Infinity;
        let closestCentroidIndex = -1;
        for (let i = 0; i < centroids.length; i++) {
            const distance = euclideanDistance(point, centroids[i]);
            if (distance < minDistance) {
                minDistance = distance;
                closestCentroidIndex = i;
            }
        }
        clusterAssignments.push(closestCentroidIndex);
    }
    return clusterAssignments;
}

function updateCentroids(data, clusterAssignments, k) {
    const newCentroids = new Array(k).fill(0).map(() => new Array(data[0].length).fill(0));
    const clusterCounts = new Array(k).fill(0);

    for (let i = 0; i < data.length; i++) {
        const clusterIndex = clusterAssignments[i];
        for (let j = 0; j < data[i].length; j++) {
            newCentroids[clusterIndex][j] += data[i][j];
        }
        clusterCounts[clusterIndex]++;
    }

    for (let i = 0; i < k; i++) {
        if (clusterCounts[i] !== 0) {
            for (let j = 0; j < newCentroids[i].length; j++) {
                newCentroids[i][j] /= clusterCounts[i];
            }
        } else {
            // If no points were assigned to this cluster, keep the centroid unchanged
        }
    }

    return newCentroids;
}

function centroidsEqual(centroids1, centroids2) {
    for (let i = 0; i < centroids1.length; i++) {
        for (let j = 0; j < centroids1[i].length; j++) {
            if (centroids1[i][j] !== centroids2[i][j]) {
                return false;
            }
        }
    }
    return true;
}

function euclideanDistance(point1, point2) {
    let sum = 0;
    for (let i = 0; i < point1.length; i++) {
        sum += (point1[i] - point2[i]) ** 2;
    }
    return Math.sqrt(sum);
}

function calculateTotalDistance(data, centroids, clusterAssignments) {
    let totalDistance = 0;
    for (let i = 0; i < data.length; i++) {
        totalDistance += euclideanDistance(data[i], centroids[clusterAssignments[i]]);
    }
    return totalDistance;
}

const processResult = (result) => {
    const artistsId = new Set();
    const relationships = [];
    const artists = [];
    
    result.records.forEach(record => {
        const relationship = record.get('p');

        const startData = relationship.start.properties;
        const endData = relationship.end.properties;
        const relationshipData = relationship.segments[0].relationship.properties;
        const relation = new exhibited_with(startData, endData, relationshipData);
        
        relationships.push(relation);
    
        // Check if the artist with the same ID hasn't been created yet
        const artistId = startData.id;
        if (!artistsId.has(artistId)) {
            const artist = new Artist(startData);
            artistsId.add(artistId);
            artists.push(artist);
            // Store the artist object as needed
        }
    
        const otherArtistId = endData.id;
        if (!artistsId.has(otherArtistId)) {
            const otherArtist = new Artist(endData);
            artistsId.add(otherArtistId);
            artists.push(otherArtist);
        }
    });

    return [artists, relationships];
};

function removeEmptyClusters(clusteredArtists) {
    // Remove empty clusters and reassign IDs
    const nonEmptyClusters = clusteredArtists.filter(cluster => cluster.length > 0);
    const newClusterMap = new Map();

    nonEmptyClusters.forEach((cluster, newIndex) => {
        cluster.forEach(artist => {
            newClusterMap.set(artist.id, newIndex);
        });
    });

    const newClusteredArtists = Array.from({ length: nonEmptyClusters.length }, () => []);

    clusteredArtists.forEach(cluster => {
        cluster.forEach(artist => {
            const newClusterId = newClusterMap.get(artist.id);
            newClusteredArtists[newClusterId].push(artist);
            artist.cluster = newClusterId; // Update the artist's cluster ID
        });
    });

    return newClusteredArtists;
}



const findAllNationalityTechniqueAmount = async (minLimit, maxLimit) => {
    const query = `
        MATCH (a:Artist)
        WHERE a.artForms <> [] AND a.country <> '\\N' AND a.TotalExhibitedArtworks >= $minLimit AND a.TotalExhibitedArtworks <= $maxLimit
        WITH a
        WITH collect(a) AS selectedArtists

        UNWIND selectedArtists AS a
        MATCH p=(a)-[r:EXHIBITED_WITH]-(b)
        WHERE b IN selectedArtists
        RETURN p
    `;
    return streamQuery(query, { minLimit: parseInt(minLimit), maxLimit: parseInt(maxLimit) });
};

const findAllBirthcountryTechniqueAmount = async (minLimit, maxLimit) => {
    const query = `
        MATCH (a:Artist)
        WHERE a.artForms <> [] AND a.birthCountry <> '\\N' AND a.TotalExhibitedArtworks >= $minLimit AND a.TotalExhibitedArtworks <= $maxLimit
        WITH a
        WITH collect(a) AS selectedArtists

        UNWIND selectedArtists AS a
        MATCH p=(a)-[r:EXHIBITED_WITH]-(b)
        WHERE b IN selectedArtists
        RETURN p
    `;
    return streamQuery(query, { minLimit: parseInt(minLimit), maxLimit: parseInt(maxLimit) });
};

const findAllDeathcountryTechniqueAmount = async (minLimit, maxLimit) => {
    const query = `
        MATCH (a:Artist)
        WHERE a.artForms <> [] AND a.deathCountry <> '\\N' AND a.TotalExhibitedArtworks >= $minLimit AND a.TotalExhibitedArtworks <= $maxLimit
        WITH a
        WITH collect(a) AS selectedArtists

        UNWIND selectedArtists AS a
        MATCH p=(a)-[r:EXHIBITED_WITH]-(b)
        WHERE b IN selectedArtists
        RETURN p
    `;
    return streamQuery(query, { minLimit: parseInt(minLimit), maxLimit: parseInt(maxLimit) });
};

const findAllMostExhibitedInTechniqueAmount = async (minLimit, maxLimit) => {
    const query = `
        MATCH (a:Artist)
        WHERE a.artForms <> [] AND a.mostExhibitedInCountry <> '\\N' AND a.unclearMostExhibitedInCountry = FALSE AND a.TotalExhibitedArtworks >= $minLimit AND a.TotalExhibitedArtworks <= $maxLimit
        WITH a
        WITH collect(a) AS selectedArtists

        UNWIND selectedArtists AS a
        MATCH p=(a)-[r:EXHIBITED_WITH]-(b)
        WHERE b IN selectedArtists
        RETURN p
    `;
    return streamQuery(query, { minLimit: parseInt(minLimit), maxLimit: parseInt(maxLimit) });
};

const findAllArtists = async () => {

    const { session } = require('../db');
    const query = `MATCH (n:Artist) RETURN n.id as id, n.firstname as firstname, n.lastname as lastname, n.TotalExhibitedArtworks  as artworks`;
    return await dbSemaphore.runExclusive(async () => {
    const result = await session.run(query);

    return await processArtists(result);

    });
}


const processArtists = (result) => {
    const artists = [];
    
    result.records.forEach(record => {
        const id = record.get('id');
        const firstname = record.get('firstname');
        const lastname = record.get('lastname');
        const artworks = record.get('artworks');
        artists.push({ id, firstname, lastname,artworks });
    });
   

    return artists;
};



const streamQuery = async (query, params) => {
    const { session } = require('../db');
    return await dbSemaphore.runExclusive(async () => {
        const result = session.run(query, params);

        const artistsId = new Set();
        const relationships = [];
        const artists = [];

        await new Promise((resolve, reject) => {
            result.subscribe({
                onNext: record => {
                    const relationship = record.get('p');

                    const startData = relationship.start.properties;
                    const endData = relationship.end.properties;
                    const relationshipData = relationship.segments[0].relationship.properties;
                    const relation = new exhibited_with(startData, endData, relationshipData);

                    relationships.push(relation);

                    const artistId = startData.id;
                    if (!artistsId.has(artistId)) {
                        const artist = new Artist(startData);
                        artistsId.add(artistId);
                        artists.push(artist);
                    }

                    const otherArtistId = endData.id;
                    if (!artistsId.has(otherArtistId)) {
                        const otherArtist = new Artist(endData);
                        artistsId.add(otherArtistId);
                        artists.push(otherArtist);
                    }
                },
                onCompleted: () => {
                    resolve([artists, relationships]);
                },
                onError: error => {
                    reject(error);
                },
            });
        });

        return [artists, relationships];
    });
};

const findAllRange = async (minLimit, maxLimit) => {
    const query = `
        MATCH (a:Artist)
        WHERE a.TotalExhibitedArtworks >= $minLimit AND a.TotalExhibitedArtworks <= $maxLimit
        WITH a
        WITH collect(a) AS selectedArtists

        UNWIND selectedArtists AS a
        MATCH p=(a)-[r:EXHIBITED_WITH]-(b)
        WHERE b IN selectedArtists
        RETURN p
    `;
    return streamQuery(query, { minLimit: parseInt(minLimit), maxLimit: parseInt(maxLimit) });
};





async function spectralClusteringNationality(min, max, k) {
    try {
        // To only retrieve the artists, when min/max got changed
        if(latestMinLimit!=min || latestMaxLimit!=max  || latestValue !== 'nationality')    {
            const [artists, relationships] = await findAllNationalityTechniqueAmount(min, max);
            latestArtists = artists;
            latestRelationships = relationships;
            latestMinLimit=min;
            latestMaxLimit=max;
            latestValue = 'nationality';
            console.log( latestMinLimit, latestMaxLimit)
        }
        const artistsWithClusters= await spectralClustering(latestArtists, latestRelationships, k);

        return artistsWithClusters;
    } catch (error) {
        console.error(error);
    }
}
async function spectralClusteringBirthcountry(min, max, k) {
    try {
        if(latestMinLimit!=min || latestMaxLimit!=max  || latestValue !== 'birthcountry')    {
            const [artists, relationships] = await findAllBirthcountryTechniqueAmount(min, max);
            latestArtists = artists;
            latestRelationships = relationships;
            latestMinLimit=min;
            latestMaxLimit=max;
            latestValue = 'birthcountry';
        }
        const artistsWithClusters= await spectralClustering(latestArtists, latestRelationships, k);
        return artistsWithClusters;
    } catch (error) {
        console.error(error);
    }
}
async function spectralClusteringDeathcountry(min, max, k) 
{
    try {
        if(latestMinLimit!=min || latestMaxLimit!=max  || latestValue !== 'deathcountry')    {
            const [artists, relationships] = await findAllDeathcountryTechniqueAmount(min, max);
            latestArtists = artists;
            latestRelationships = relationships;
            latestMinLimit=min;
            latestMaxLimit=max;
            latestValue = 'deathcountry';
        }
        const artistsWithClusters= await spectralClustering(latestArtists, latestRelationships, k);
        return artistsWithClusters;
    } catch (error) {
        console.error(error);
    }
}
async function spectralClusteringMostExhibited(min, max, k) {
    try {
        if(latestMinLimit!=min || latestMaxLimit!=max  || latestValue !== 'mostexhibited')    {
            const [artists, relationships] = await findAllMostExhibitedInTechniqueAmount(min, max);
            latestArtists = artists;
            latestRelationships = relationships;
            latestMinLimit=min;
            latestMaxLimit=max;
            latestValue = 'mostexhibited';
        }
        const artistsWithClusters= await spectralClustering(latestArtists, latestRelationships, k);
        return artistsWithClusters;
    } catch (error) {
        console.error(error);
    }
}

async function spectralClusteringRange(min, max, k) {
    try {
        // To only retrieve the artists, when min/max got changed
        if(latestMinLimit!=min || latestMaxLimit!=max)    {
            const [artists, relationships] = await findAllRange(min, max);
            latestArtists = artists;
            latestRelationships = relationships;
            latestMinLimit=min;
            latestMaxLimit=max;
            latestValue = 'nationality';
            console.log( latestMinLimit, latestMaxLimit)
        }
        const artistsWithClusters= await spectralClustering(latestArtists, latestRelationships, k);

        return artistsWithClusters;
    } catch (error) {
        console.error(error);
    }
}



module.exports = {
    findAllNationalityTechnique,
    findAllBirthcountryTechnique,
    findAllDeathcountryTechnique,
    findAllMostExhibitedInTechnique,
    findAllTechniques, 
    findAllNationalityTechniqueAmount, 
    findAllBirthcountryTechniqueAmount,
    findAllDeathcountryTechniqueAmount,
    findAllMostExhibitedInTechniqueAmount,
    spectralClusteringNationality,
    spectralClusteringBirthcountry,
    spectralClusteringDeathcountry,
    spectralClusteringMostExhibited,
    findAllRange,
    spectralClusteringRange,
    findAllArtists
};