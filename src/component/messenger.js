const _ = require('lodash');
const os = require('os');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const schedule = require('node-schedule');
const constants  = require('./constants');
const dbei =  require('./dbei');
const subscription = require('./subscription');
const notification = require('./notification');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const SEND_API = process.env.SEND_API;
const projectDir = path.join(__dirname, '..', '..');

function callSendAPI(psid, message) {
    let data = { 
        "recipient": { "id": psid }, 
        "message": message 
    };
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

function getProcessingDtsByTitleListTemplate(processingDtsByTitle) {
    let elements = [];
    _.forEach(processingDtsByTitle, (date, title) => {
        elements.push( { 'title': title, 'subtitle': date } );
    });
    let response = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "list",
                "top_element_style": "compact",
                "elements": elements
            }
        }
    };
    return response;
}

function getProcessingDtsByTitleGenericTemplate(processingDtsByTitle) {
    let elements = [];
    _.forEach(processingDtsByTitle, (date, title) => {
        elements.push( { 'title': title, 'subtitle': date } );
    });
    let response = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": elements
            }
        }
    };
    return response;
}

function getSubscriptionTemplate(sender_psid) {
    let elements = [];
    _.forEach(dbei.categories, (title, category) => {
        elements.push( { 'title': title, buttons: [ 
            { 
                "title": "Subscribe", 
                "type": "web_url", 
                "url": "https://dbei-bot.rharshad.com/subscription?psid=" + sender_psid + "&category=" + category, 
                "messenger_extensions": true, 
                "webview_height_ratio": "compact" 
            } 
        ] } );
    });
    let response = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "list",
                "top_element_style": "compact",
                "elements": elements
            }
        }
    };
    return response;
}

function refreshDataStore() {
    dbei.scrapeData()
    .then((processingDates) => {
        let fileStream = fs.createWriteStream(path.join(projectDir, 'data.json'));
        let elements = [];
        _.forEach(processingDates, (date, title) => {
            elements.push( { category: _.findKey(dbei.categories, (val, key) => { return val === title }), date: date } );
        });
        fileStream.write(JSON.stringify({ currentProcessingDates: elements }, null, 4) + os.EOL);
        fileStream.on('error', (err) => {
            console.log(err);
            process.exit(1);
        });
        fileStream.end();
    })
    .catch((err) => {
        console.log(err);
        process.exit(1);
    });
}

schedule.scheduleJob('*/1 * * * *', function() {
    dbei.scrapeData()
        .then((processingDates) => {
            if(_.keys(processingDates).length === 4) {
                let dtsUpdatedCategories = notification.getDtsUpdatedCategories(processingDates);
                _.forEach(dtsUpdatedCategories, (category) => {
                    let psids = subscription.getSubscribers(category);
                    let processingDtByTitle = notification.getCurrentProcessingDtByTitle(processingDates, category); 
                    let processingDt = processingDtByTitle[dbei.categories[category]];
                    let response = getProcessingDtsByTitleGenericTemplate(processingDtByTitle);
                    notification.generateNotificationFile(psids, category, processingDt, response)
                    .then((response) => {
                      console.log(response);  
                    })
                    .catch((err) => {
                      console.log(err);                        
                    });
                });
            }
        }).catch((err) => {
            console.log(err);
        });
});

schedule.scheduleJob('*/2 * * * *', function() {
    notification.processNotifications()
    .then(() => {
        refreshDataStore();
    });
});

module.exports = {
    handleMessage: function(sender_psid, received_message) {
        let response;
        if(received_message.text.toUpperCase() == 'subscribe'.toUpperCase()) {
            response = getSubscriptionTemplate(sender_psid);
            callSendAPI(sender_psid, response);
        } else if(received_message.text.toUpperCase() == 'unsubscribe'.toUpperCase()) {
            callSendAPI(sender_psid, { text: subscription.removeSubscription(sender_psid) });
        } else if(received_message.text) {
            dbei.scrapeData()
                .then((processingDtsByTitle) => {
                    if(_.keys(processingDtsByTitle).length === 4) {
                        let psids = [sender_psid];
                        response = getProcessingDtsByTitleListTemplate(processingDtsByTitle);
                        _.forEach(psids, (psid) => {
                            callSendAPI(psid, { text: constants.GREETING });
                            callSendAPI(psid, response);
                        });
                    } else {
                        callSendAPI(sender_psid, { text: constants.SCRAPING_ERROR });
                    }
                })
                .catch((err) => {
                    callSendAPI(sender_psid, { text: err });
                });
        }
    },
    refreshDataStore: refreshDataStore
}