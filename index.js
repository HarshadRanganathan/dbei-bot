'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const CronJob = require('cron').CronJob;
const dbei = require('./src/component/dbei');
const messenger = require('./src/component/messenger');
const notification = require('./src/component/notification');
const subscription = require('./src/component/subscription');
const constants = require('./src/component/constants');
const 
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json());

/**
 * Scheduler for generating notifications
 */
let notificationsGenerator = new CronJob('0 9-18 * * *', notification.generateNotifications, null, true, 'Europe/Dublin');
console.log('Notification Generator Running: ' + notificationsGenerator.running);


/**
 * Scheduler for publishing notifications
 */
let notificationsPublisher = new CronJob('5 9-18 * * *', notification.publishNotifications, null, true, 'Europe/Dublin');
console.log('Notification Publisher Running: ' + notificationsPublisher.running);

/**
 * Webhook challenge endpoint
 */
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

/**
 * Subscription endpoint
 */
app.get('/subscription', (req, res) => {
    let psid = req.query['psid'];
    let category = req.query['category'];
    if(psid && category) {
        let response = subscription.addSubscription(psid, category);
        if(response == constants.SUBSCRIPTION_SUCCESS) {
            res.status(200).sendFile(path.join(__dirname + '/public/subscription_success.html'));
        } else if(response == constants.ERR_SUB_100) {
            res.status(400).sendFile(path.join(__dirname + '/public/subscription_error.html'));
        } else {
            res.status(500).send(response);
        }
    } else {
        res.sendStatus(404);
    }
});

app.get('/unsubscribe', (req, res) => {
    let psid = req.query['psid'];
    let category = req.query['category'];
    if(psid && category) {
        let response = subscription.removeSubscription(psid, category);
        if(response == constants.UNSUBSCRIBE_SUCCESS) {
            res.status(200).sendFile(path.join(__dirname + '/public/unsubscribe_success.html'));
        } else if(response == constants.ERR_UNSUB_100) {
            res.status(400).sendFile(path.join(__dirname + '/public/unsubscribe_error.html'));
        } else {
            res.status(500).send(response);
        }
    } else {
        res.sendStatus(404);
    }
});

/**
 * Messenger webhook endpoint
 */
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
    fs.readdir(__dirname, (err, files) => {
        if(err) console.log('Unable to read files in root directory');
        if(!files.includes(constants.DATA_STORE)) dbei.refreshDataStore();
    });
});