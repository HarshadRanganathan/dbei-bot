const _ = require('lodash');
const axios = require('axios');
const cheerio = require('cheerio');

const DBEI_URL = 'https://dbei.gov.ie/en/What-We-Do/Workplace-and-Skills/Employment-Permits/Current-Application-Processing-Dates/';
const selectors = {
    'Employment Permit - Trusted Partner': 'table:contains("Employment Permit applications received by Employer Type") tr:contains("Trusted Partner") td:nth-of-type(2)',
    'Employment Permit - Standard': 'table:contains("Employment Permit applications received by Employer Type") tr:contains("Standard") td:nth-of-type(2)',
    'Reviews - Trusted Partner & Standard': 'table:contains("Reviews for Trusted Partner and Standard Employment Permit Applications") tr:contains("Reviews received") td:nth-of-type(2)',
    'Support Letters - Stamp 4': 'table:contains("Requests for Support Letters for a Stamp 4") tr:contains("Requests received") td:nth-of-type(2)'
}

module.exports = {
    scrapeData: function(callback) {
        let processingDates = {};
        axios.get(`${DBEI_URL}`)
            .then((response) => {
                let html = response.data;
                let $ = cheerio.load(html);
                _.forEach(selectors, (selector, title) => {
                    processingDates[title] = $(selector).text();
                });
                callback(processingDates);
            })
            .catch((error) => {
                if (error.response) {
                    console.log(error.response.data);
                    console.log(error.response.status);
                    console.log(error.response.headers);
                } else if (error.request) {
                    console.log(error.request);
                } else {
                    console.log('Error: ', error.message);
                }
            });
    }
}