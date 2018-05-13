const _ = require('lodash');
const axios = require('axios');
const schedule = require('node-schedule');
const constants  = require('./constants');
const dbei =  require('./dbei');
const subscription = require('./subscription');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const SEND_API = 'https://graph.facebook.com/v2.6/me/messages';

function callSendAPI(psid, message, mtype) {
    let data;
    if(constants.SUBSCRIPTIONS === mtype) {
        data = { 
            "recipient": { "id": psid }, 
            "message": message, 
            "messaging_type": "MESSAGE_TAG", 
            "tag": "NON_PROMOTIONAL_SUBSCRIPTION" 
        };
    } else {
        data = { 
            "recipient": { "id": psid }, 
            "message": message 
        };
    }
    axios({
        method: 'POST',
        url: `${SEND_API}`,
        params: { access_token: PAGE_ACCESS_TOKEN },
        data: data
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

function sendCurrentProcessingDates(psids, processingDates, mtype) {
    let elements = [];
    _.forEach(processingDates, (date, title) => {
        elements.push( { 'title': title, 'subtitle': date } );
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
    _.forEach(psids, (psid) => {
        callSendAPI(psid, { text: constants.GREETING }, mtype);
        callSendAPI(psid, response, mtype);
    });
}

schedule.scheduleJob('0 17 * * MON', function() {
    console.log('Subscription notification triggered');
    dbei.scrapeData()
        .then((processingDates) => {
            if(_.keys(processingDates).length === 4) {
                let psids = subscription.getAllSubscriptions();
                sendCurrentProcessingDates(psids, processingDates, constants.SUBSCRIPTIONS);
            } 
        }).catch((err) => {
            console.log(err);
        });
});

module.exports = {
    handleMessage: function(sender_psid, received_message) {
        let response;
        if(received_message.text.toUpperCase() == 'subscribe'.toUpperCase()) {
            let message = subscription.addSubscription(sender_psid);
            callSendAPI(sender_psid, { text: message }, constants.RESPONSE);
            if(constants.SUBSCRIPTION_SUCCESS === message) callSendAPI(sender_psid, { text: constants.UNSUBSCRIBE_MESSAGE } );
        } else if(received_message.text.toUpperCase() == 'unsubscribe'.toUpperCase()) {
            callSendAPI(sender_psid, { text: subscription.removeSubscription(sender_psid) }, constants.RESPONSE);
        } else if(received_message.text) {
            dbei.scrapeData()
                .then((processingDates) => {
                    if(_.keys(processingDates).length === 4) {
                        let psids = [sender_psid];
                        sendCurrentProcessingDates(psids, processingDates, constants.RESPONSE);
                    } else {
                        callSendAPI(sender_psid, { text: constants.SCRAPING_ERROR }, constants.RESPONSE);
                    }
                })
                .catch((err) => {
                    callSendAPI(sender_psid, { text: err }, constants.RESPONSE);
                });
        }
    }
}