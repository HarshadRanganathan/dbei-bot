const _ = require('lodash');
const os = require('os');
const fs = require('fs');
const path = require('path');
const constants = require('./constants');
const dbei =  require('./dbei');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('data.json');
const db = low(adapter);
const notificationDir = '../../notifications/';

db.defaults( { currentProcessingDates: [] } ).write();

function callSendAPI(psid, message) {
    let data = { 
        "recipient": { "id": psid }, 
        "message": message, 
        "messaging_type": "MESSAGE_TAG", 
        "tag": "NON_PROMOTIONAL_SUBSCRIPTION" 
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

function getDtsUpdatedCategories(processingDates) {
    let categories = [];
    _.forEach(processingDates, (curDate, title) => {
        let category = _.findKey(dbei.categories, (val, key) => { return val === title });
        let dbCatDate = db.get(constants.CURRENT_PROCESSING_DATES)
            .find( { category: category } )
            .value();
        if(dbCatDate != curDate) categories.push(category);
    });
    return categories;
}

function getCurrentProcessingDate(processingDates, category) {
    let title = categories[category];
    return processingDates[title];
}

function generateNotificationFile(psids, category, processingDate, response) {
    return new Promise((resolve, reject) => {
        let fileStream = fs.createWriteStream(path.join(notificationDir, category));
        let data = {
            psids: psids,
            category: category,
            processingDate: processingDate,
            response: JSON.stringify(response)
        };
        fileStream.write(JSON.stringify(data) + os.EOL);
        fileStream.on('finish', () => { resolve("Notification File Created"); } )
        .on('error', (err) => {
            console.log(err);
            reject('ERR: Notification file not generated for category: ' + category);
        });
        fileStream.end();
    });
}

function updateCategoryDateInDB(category, curProcessingDate) {
    try {
        db.get(constants.CURRENT_PROCESSING_DATES)
        .find( { category: category })
        .assign( { date: curProcessingDate } )
        .write();
    } catch (err) {
        console.log(err);
    }
}

function processNotifications() {
    return new Promise((resolve, reject) => {
        fs.readdir(notificationDir, (err, files) => {
            if(err) {
                console.log(err);
                reject('ERR: Unable to read notification directory contents');   
            }
            files.forEach((file, index) => {
                let data = '';
                let readStream = fs.createReadStream(path.join(notificationDir, file));
                readStream.on('data', (chunk) => {
                    data += chunk;
                });
                let notification = JSON.parse(data);
                _.forEach(notification.psids, (psid) => {
                    callSendAPI(psid, notification.response);
                });
                fs.unlink(path.join(notificationDir, file), (err) => {
                    if(err) {
                        console.log(err);
                        reject('ERR: Unable to delete notification file');   
                    }
                });
                updateCategoryDateInDB();
            });
        });
    });
}

module.exports = {
    getDtsUpdatedCategories: getDtsUpdatedCategories,
    getCurrentProcessingDate: getCurrentProcessingDate,
    generateNotificationFile: generateNotificationFile,
    processNotifications: processNotifications
}