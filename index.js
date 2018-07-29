'use strict';

require('dotenv').config();
const path = require('path');
const CronJob = require('cron').CronJob;
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
let notificationsGenerator = new CronJob('*/3 * * * *', notification.generateNotifications, null, true, 'Europe/Dublin');
console.log('Notification Generator Running: ' + notificationsGenerator.running);


/**
 * Scheduler for publishing notifications
 */
let notificationsPublisher = new CronJob('*/5 * * * *', notification.publishNotifications, null, true, 'Europe/Dublin');
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
    //messenger.refreshDataStore(); // TODO: needs to be handled in a better way
});