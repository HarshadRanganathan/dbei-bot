const _ = require('lodash');
const axios = require('axios');
const constants  = require('./constants');
const templates = require('./templates');
const dbei =  require('./dbei');
const subscription = require('./subscription');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const SEND_API = process.env.SEND_API;

/**
 * Calls the Messenger API to send the message
 * @param {string} psid page scoped id
 * @param {object} message template
 */
function callSendAPI(psid, message) {
    try {
        let data = { 
            "recipient": { "id": psid }, 
            "message": message 
        };
        axios({
            method: 'POST',
            url: SEND_API,
            params: { access_token: PAGE_ACCESS_TOKEN },
            data: data
        });
    } catch(error) {
        if (error.response) {
            console.log(error.response.status);
            console.log(error.response.data);
        } else if (error.request) {
            console.log(error.request);
        } else {
            console.log('Error: ', error.message);
        }
    }
}

/**
 * Returns current processing dates as templates
 * If only one title needs to be displayed then we need to make use of generic template
 * @link https://developers.facebook.com/docs/messenger-platform/reference/template/generic
 * @link https://developers.facebook.com/docs/messenger-platform/reference/template/list
 * @param {object} processingDtsByTitle 
 * @returns messenger template
 */
function currentProcessingDtsMessage(processingDtsByTitle) {
    let elements = [];
    _.forEach(processingDtsByTitle, (date, title) => {
        elements.push( { 'title': title, 'subtitle': date } );
    });
    if(elements.length == 1) return templates.genericTemplate(elements);
    else return templates.listTemplate(elements);
}

/**
 * Returns the subscription options for the psid user
 * @param {string} sender_psid 
 * @returns messenger template
 */
function subscriptionOptions(sender_psid) {
    let elements = [];
    _.forEach(dbei.categories, (title, category) => {
        let option = { 
            'title': title, 
            buttons: [ 
                { 
                    "title": "Subscribe", 
                    "type": "web_url", 
                    "url": `https://dbei-bot.rharshad.com/subscription?psid=${sender_psid}&category=${category}`, 
                    "messenger_extensions": true, 
                    "webview_height_ratio": "compact" 
                } 
            ] 
        }; 
        elements.push(option);
    });
    return templates.listTemplate(elements);
}

/**
 * Incoming Message Handler
 * @param {string} sender_psid 
 * @param {object} received_message 
 */
function handleMessage(sender_psid, received_message) {
    if(received_message.text.toUpperCase() == 'subscribe'.toUpperCase()) {
        callSendAPI(sender_psid, subscriptionOptions(sender_psid));
    } else if(received_message.text.toUpperCase() == 'unsubscribe'.toUpperCase()) {
        callSendAPI(sender_psid, { text: subscription.removeSubscription(sender_psid) });
    } else if(received_message.text) {
        dbei.scrapeData()
        .then((processingDtsByTitle) => {
            let psids = [sender_psid]; // fix for message delivery order
            _.forEach(psids, (psid) => {
                callSendAPI(psid, { text: constants.GREETING });
                callSendAPI(psid, currentProcessingDtsMessage(processingDtsByTitle));
            });
        })
        .catch((err) => {
            callSendAPI(sender_psid, { text: err.message });
        });
    }
}

module.exports = {
    handleMessage: handleMessage,
    currentProcessingDtsMessage: currentProcessingDtsMessage
}