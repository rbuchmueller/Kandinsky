const neo4j = require('neo4j-driver');
require('dotenv').config();

const { url, db_username, db_password, database } = process.env;

// @ts-ignore
const driver = neo4j.driver(url, neo4j.auth.basic(db_username, db_password),{ disableLosslessIntegers: true });
//disable so that Integers are not received with low and high but just the number
const session = driver.session({ database });

module.exports = {
    driver, 
    session
};
