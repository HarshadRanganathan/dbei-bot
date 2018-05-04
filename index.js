'use strict';

const _ = require('lodash');
const axios = require('axios');
const cheerio = require('cheerio');
const 
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json());

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
    let processingDates = {};
    axios.get(`${URL}`)
        .then((response) => {
            let html = response.data;
            let $ = cheerio.load(html);
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

app.get('/webhook', (req, res) => {
    let VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
    if(mode && token) {
        if(mode == 'subscribe' && token == VERIFY_TOKEN) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post('/webhook', (req, res) => {
    let body = req.body;
    if(body.object === 'page') {
        body.entry.forEach(function(entry) {
            let webhook_event = entry.messaging[0];
        });
        scrapeData((processingDates) => {
            res.status(200).send(processingDates);
        });
    } else {
        res.sendStatus(404);
    }
});

app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));