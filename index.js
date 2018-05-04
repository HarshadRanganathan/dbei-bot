'use strict';

require("dotenv").config();
const _ = require('lodash');
const axios = require('axios');
const cheerio = require('cheerio');
const 
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const DBEI_URL = 'https://dbei.gov.ie/en/What-We-Do/Workplace-and-Skills/Employment-Permits/Current-Application-Processing-Dates/';
const SEND_API = 'https://graph.facebook.com/v2.6/me/messages';

const selectors = {
    'Employment Permit - Trusted Partner': 'table:contains("Employment Permit applications received by Employer Type") tr:contains("Trusted Partner") td:nth-of-type(2)',
    'Employment Permit - Standard': 'table:contains("Employment Permit applications received by Employer Type") tr:contains("Standard") td:nth-of-type(2)',
    'Reviews - Trusted Partner & Standard': 'table:contains("Reviews for Trusted Partner and Standard Employment Permit Applications") tr:contains("Reviews received") td:nth-of-type(2)',
    'Support Letters - Stamp 4': 'table:contains("Requests for Support Letters for a Stamp 4") tr:contains("Requests received") td:nth-of-type(2)'
}

function scrapeData(callback) {
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

function callSendAPI(sender_psid, response) {
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }
    axios({
        method: 'POST',
        url: `${SEND_API}`,
        params: {
            access_token: PAGE_ACCESS_TOKEN
        },
        data: request_body
    }).catch((error) => {
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

function handleMessage(sender_psid, received_message) {
    let response;
    if(received_message.text) {
        scrapeData((processingDates) => {
            let elements = []
            _.forEach(processingDates, (date, title) => {
                elements.push({
                    'title': title,
                    'subtitle': date
                });
            });
            response = {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "list",
                        "top_element_style": "compact",
                        "elements": elements
                    }
                }
            }
            callSendAPI(sender_psid, { 'text' : 'Hey there! Current processing dates' });
            callSendAPI(sender_psid, response);
        });
    }
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
            let sender_psid = webhook_event.sender.id;
            handleMessage(sender_psid, webhook_event.message); 
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));