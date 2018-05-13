const _ = require('lodash');
const axios = require('axios');
const schedule = require('node-schedule');
const constants  = require('./constants');
const dbei =  require('./dbei');
const subscription = require('./subscription');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const SEND_API = 'https://graph.facebook.com/v2.6/me/messages';

function callSendAPI(psid, response) {
    let request_body = { "recipient": { "id": psid }, "message": response };
    axios({
        method: 'POST',
        url: `${SEND_API}`,
        params: { access_token: PAGE_ACCESS_TOKEN },
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

function sendCurrentProcessingDates(psids, processingDates) {
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
        callSendAPI(psid, { text: constants.GREETING } );
        callSendAPI(psid, response);
    });
}

schedule.scheduleJob('', function() {
    dbei.scrapeData()
        .then((processingDates) => {
            if(_.keys(processingDates).length === 4) {
                let psids = subscription.getAllSubscriptions();
                sendCurrentProcessingDates(psids, processingDates);
            } 
        }).catch((err) => {
            console.log(err);
        });
});

module.exports = {
    handleMessage: function(sender_psid, received_message) {
        let response;
        if(received_message.text == 'subscribe') {
            let message = subscription.addSubscription(sender_psid);
            callSendAPI(sender_psid, { text: message } );
            if(constants.SUBSCRIPTION_SUCCESS === message) callSendAPI(sender_psid, { text: constants.UNSUBSCRIBE_MESSAGE } );
        } else if(received_message.text == 'unsubscribe') {
            callSendAPI(sender_psid, { text: subscription.removeSubscription(sender_psid) } );
        } else if(received_message.text) {
            dbei.scrapeData()
                .then((processingDates) => {
                    if(_.keys(processingDates).length === 4) {
                        let psids = [sender_psid];
                        sendCurrentProcessingDates(psids, processingDates);
                    } else {
                        callSendAPI(sender_psid, { text: constants.SCRAPING_ERROR } );
                    }
                })
                .catch((err) => {
                    callSendAPI(sender_psid, { text: err } );
                });
        }
    }
}