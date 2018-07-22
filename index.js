'use strict';

require('dotenv').config();
const _ = require('lodash');
const os = require('os');
const fs = require('fs');
const dbei = require('./src/component/dbei');
const messenger = require('./src/component/messenger');
const subscription = require('./src/component/subscription');
const 
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json());

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

app.get('/subscription', (req, res) => {
    let psid = req.query['psid'];
    let category = req.query['category'];
    let response = subscription.addSubscription(psid, category);
    res.status(200).send(response);
});

app.post('/webhook', (req, res) => {
    let body = req.body;
    if(body.object === 'page') {
        body.entry.forEach(function(entry) {
            let webhook_event = entry.messaging[0];
            let sender_psid = webhook_event.sender.id;
            messenger.handleMessage(sender_psid, webhook_event.message); 
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

app.listen(process.env.PORT || 1337, () => {
    dbei.scrapeData()
        .then((processingDates) => {
            fs.stat('data.json', (err, stat) => {
                if(err != null && err.code == 'ENOENT') {
                    let fileStream = fs.createWriteStream('data.json');
                    let elements = [];
                    _.forEach(processingDates, (date, title) => {
                        elements.push( { category: _.findKey(dbei.categories, (val, key) => { return val === title }), date: date } );
                    });
                    fileStream.write(JSON.stringify({ currentProcessingDates: elements }, null, 4) + os.EOL);
                    fileStream.on('finish', () => { console.log("Data file inititalized"); } )
                    .on('error', (err) => {
                        console.log(err);
                        process.exit(1);
                    });
                    fileStream.end();
                }
            });
        })
        .catch((err) => {
            console.log(err);
            process.exit(1);
        });
});