let _ = require('lodash');
let axios = require('axios');
let cheerio = require('cheerio');

const URL = 'https://dbei.gov.ie/en/What-We-Do/Workplace-and-Skills/Employment-Permits/Current-Application-Processing-Dates/';

const codes = {
    'Employment Permit - Trusted Partner': 'EPTP',
    'Employment Permit - Standard': 'EPS',
    'Reviews - Trusted Partner & Standard': 'RTPAS',
    'Support Letters - Stamp 4': 'SLS4'
}

const selectors = {
    'EPTP': 'table:contains("Employment Permit applications received by Employer Type") tr:contains("Trusted Partner") td:nth-of-type(2)',
    'EPS': 'table:contains("Employment Permit applications received by Employer Type") tr:contains("Standard") td:nth-of-type(2)',
    'RTPAS': 'table:contains("Reviews for Trusted Partner and Standard Employment Permit Applications") tr:contains("Reviews received") td:nth-of-type(2)',
    'SLS4': 'table:contains("Requests for Support Letters for a Stamp 4") tr:contains("Requests received") td:nth-of-type(2)'
}

function scrapeData(callback) {
    const processingDates = {};
    axios.get(`${URL}`)
        .then((response) => {
            const html = response.data;
            const $ = cheerio.load(html);
            _.forEach(selectors, (selector, code) => {
                processingDates[code] = $(selector).text();
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

scrapeData((processingDates) => {
    console.log(processingDates);
});

