const _ = require('lodash');
const axios = require('axios');
const dbei =  require('./dbei');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const SEND_API = 'https://graph.facebook.com/v2.6/me/messages';

function callSendAPI(sender_psid, response) {
    let request_body = { "recipient": { "id": sender_psid }, "message": response };
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

module.exports = {
    handleMessage: function(sender_psid, received_message) {
        let response;
        if(received_message.text) {
            dbei.scrapeData((processingDates) => {
                let elements = []
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
                callSendAPI(sender_psid, { 'text' : 'Hey there! Current processing dates' });
                callSendAPI(sender_psid, response);
            });
        }
    }
}