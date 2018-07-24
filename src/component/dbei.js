const _ = require('lodash');
const os = require('os');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const constants = require('./constants');

const categories = {
    'EPTP': 'Employment Permit - Trusted Partner',
    'EPS': 'Employment Permit - Standard',
    'RTPS': 'Reviews - Trusted Partner & Standard',
    'SLS4': 'Support Letters - Stamp 4'
};
const selectors = {
    'Employment Permit - Trusted Partner': 'table:contains("Employment Permit applications received by Employer Type") tr:contains("Trusted Partner") td:nth-of-type(2)',
    'Employment Permit - Standard': 'table:contains("Employment Permit applications received by Employer Type") tr:contains("Standard") td:nth-of-type(2)',
    'Reviews - Trusted Partner & Standard': 'table:contains("Reviews for Trusted Partner and Standard Employment Permit Applications") tr:contains("Reviews received") td:nth-of-type(2)',
    'Support Letters - Stamp 4': 'table:contains("Requests for Support Letters for a Stamp 4") tr:contains("Requests received") td:nth-of-type(2)'
};

const projectDir = path.join(__dirname, '..', '..');

const DBEI_URL = process.env.DBEI_URL;

/**
 * Scrapes current processing dates from DBEI site
 * @returns {object} processing dates for each selector
 * @throws Error
 */
async function scrapeData() {
    let processingDtsByTitle = {};
    try {
        let response = await axios.get(`${DBEI_URL}`);
        let html = response.data; 
        let $ = cheerio.load(html);
        _.forEach(selectors, (selector, title) => {
            processingDtsByTitle[title] = $(selector).text();
        });        
        return processingDtsByTitle;
    } catch(error) {
        if (error.response) {
            console.log(error.response.status);
            console.log(error.response.data);
        } else if (error.request) {
            console.log(error.request);
        } else {
            console.log('Error: ', error.message);
        }
        throw new Error(constants.ERR_SCR_100);
    }
}

/**
 * Refreshes the data store
 */
function refreshDataStore() {
    scrapeData()
    .then((processingDates) => {
        let fileStream = fs.createWriteStream(path.join(projectDir, 'data.json'));
        let elements = [];
        _.forEach(processingDates, (date, title) => {
            elements.push( { category: _.findKey(categories, (val, key) => { return val === title }), date: date } );
        });
        fileStream.write(JSON.stringify({ currentProcessingDates: elements }, null, 4) + os.EOL);
        fileStream.on('error', (err) => {
            console.log(err);
            process.exit(1);
        });
        fileStream.end();
        console.log('Data store refreshed');
    })
    .catch((err) => {
        console.log(err);
        process.exit(1);
    });
}

module.exports = {
    scrapeData: scrapeData,
    refreshDataStore: refreshDataStore,
    categories: categories
}