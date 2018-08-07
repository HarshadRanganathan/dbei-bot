const _ = require('lodash');
const axios = require('axios');
const constants  = require('./constants');
const templates = require('./templates');
const dbei =  require('./dbei');
const subscription = require('./subscription');

const WELCOME_KEYWORDS = ['hi', 'hello', 'howdy', 'get started'];
const HELP_KEYWORDS = ['help'];
const DBEI_KEYWORDS = ['current', 'processing', 'dates', 'current dates', 'processing dates', 'current processing dates',
'stamp 4', 'support letter', 'stamp 4 support letter', 'stamp 4 dates', 'support letter dates', 'stamp 4 support letter dates', 'stamp 4 support letter prcessing dates',
'employment permit trusted partner', 'employment permit', 'employment permit dates', 'employment permit processing dates', 'trusted partner dates',
'emloyment permit standard', 'emloyment permit standard dates', 'emloyment permit standard processing dates',
'reviews', 'trusted partner', 'review dates', 'review processing dates', 'trusted partner dates'];
const QUICK_REPLY_OPTIONS = ['Dates', 'Subscribe', 'Unsubscribe'];
const SUBSCRIPTION_KEYWORDS = ['subscribe', 'subscription'];
const UNSUBSCRIBE_KEYWORDS = ['unsubscribe'];

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const SEND_API = process.env.SEND_API;

/**
 * Calls the Messenger API to send the message
 * @param {string} psid page scoped id
 * @param {object} message template
 */
function callSendAPI(psid, message) {
    let data = { 
        "recipient": { "id": psid }, 
        "message": message 
    };
    return axios({
        method: 'POST',
        url: `${SEND_API}`,
        params: { access_token: PAGE_ACCESS_TOKEN },
        data: data
    })
    .catch((error) => {
        if (error.response) {
            console.log(error.response.status);
            console.log(error.response.data);
        } else if (error.request) {
            console.log(error.request);
        } else {
            console.log('Error: ', error.message);
        }
    });
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
 * Returns the options to unsubscribe from notifications
 * @param {string} sender_psid 
 */
function unsubscribeOptions(sender_psid) {
    let elements = [];
    let subscriptions = subscription.getSubscriptions(sender_psid);
    if(subscriptions.length > 0) {
        _.forEach(subscriptions, (category) => {
            let option = { 
                'title': dbei.categories[category], 
                buttons: [ 
                    { 
                        "title": "Unsubscribe", 
                        "type": "web_url", 
                        "url": `https://dbei-bot.rharshad.com/unsubscribe?psid=${sender_psid}&category=${category}`, 
                        "messenger_extensions": true, 
                        "webview_height_ratio": "compact" 
                    } 
                ] 
            }; 
            elements.push(option);
        });
        if(elements.length == 1) return templates.genericTemplate(elements);
        else return templates.listTemplate(elements);
    } else {
        return { text: constants.ERR_UNSUB_100 };
    }
}

/**
 * Returns quick reply options
 * @param {text} text 
 */
function quickReplyOptions(text) {
    let quickReplies = [];
    _.forEach(QUICK_REPLY_OPTIONS, (option) => {
        quickReplies.push({ content_type: 'text', title: option, payload: option });
    });
    return templates.quickRepliesTemplate(text, quickReplies);
}   

/**
 * Incoming Message Handler
 * @param {string} sender_psid 
 * @param {object} received_message 
 */
function handleMessage(sender_psid, received_message) {
    if(WELCOME_KEYWORDS.includes(received_message.text.toLowerCase())) {
        callSendAPI(sender_psid, quickReplyOptions(constants.WELCOME_MSG));
    } else if(DBEI_KEYWORDS.includes(received_message.text.toLowerCase())) {
        dbei.scrapeData()
        .then(async (processingDtsByTitle) => {
            await callSendAPI(sender_psid, { text: constants.CURRENT_PROCESSING_DATES_MSG });
            callSendAPI(sender_psid, currentProcessingDtsMessage(processingDtsByTitle));
        })
        .catch((err) => {         
            callSendAPI(sender_psid, { text: err.message });
        });
    } else if(SUBSCRIPTION_KEYWORDS.includes(received_message.text.toLowerCase())) {
        callSendAPI(sender_psid, subscriptionOptions(sender_psid));
    } else if(UNSUBSCRIBE_KEYWORDS.includes(received_message.text.toLowerCase())) {
        callSendAPI(sender_psid, unsubscribeOptions(sender_psid));
    } else if(HELP_KEYWORDS.includes(received_message.text.toLowerCase())) {
        callSendAPI(sender_psid, { text: constants.HELP_MSG });
    } else {
        callSendAPI(sender_psid, quickReplyOptions(constants.ERR_MSG));
    }
}

module.exports = {
    handleMessage: handleMessage,
    currentProcessingDtsMessage: currentProcessingDtsMessage
}