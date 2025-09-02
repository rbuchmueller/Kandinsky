const { Semaphore } = require('async-mutex');

// Create a semaphore with a count of 1 to act like a mutex
const dbSemaphore = new Semaphore(1);

module.exports = dbSemaphore;
