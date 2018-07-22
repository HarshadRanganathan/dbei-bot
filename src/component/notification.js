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
        let doc = db.get(constants.CURRENT_PROCESSING_DATES)
            .find( { category: category } )
            .value();
        if(doc.date != curDate) categories.push(category);
    });
    return categories;
}

function getCurrentProcessingDate(processingDates, category) {
    let title = dbei.categories[category];
    return processingDates[title];
}

function generateNotificationFile(psids, category, processingDate, response) {
    return new Promise((resolve, reject) => {
        let fileStream = fs.createWriteStream(path.resolve(notificationDir, category));
        let data = {
            psids: psids,
            category: category,
            processingDate: processingDate,
            response: JSON.stringify(response)
        };
        fileStream.write(JSON.stringify(data, null, 4) + os.EOL);
        fileStream.on('finish', () => { resolve("Notification File Created"); } )
        .on('error', (err) => {
            console.log(err);
            reject(constants.ERR_NOTIF_100);
        });
        fileStream.end();
    });
}

function updateCategoryDateInDB(category, curProcessingDate, resolve, reject) {
    try {
        db.get(constants.CURRENT_PROCESSING_DATES)
        .find( { category: category } )
        .assign( { date: curProcessingDate } )
        .write();
        resolve('Notification successfully processed for category: ' + category);
    } catch (err) {
        console.log(err);
        reject(constants.ERR_NOTIF_101);
    }
}

function processNotifications() {
    return new Promise((resolve, reject) => {
        fs.readdir(path.resolve(notificationDir), (err, files) => {
            if(err) {
                console.log(err);
                reject(constants.ERR_NOTIF_102);   
            }
            files.forEach((file, index) => {
                let data = '';
                let readStream = fs.createReadStream(path.resolve(notificationDir, file));
                readStream.on('data', (chunk) => {
                    data += chunk;
                });
                let notification = JSON.parse(data);
                _.forEach(notification.psids, (psid) => {
                    callSendAPI(psid, notification.response);
                });
                fs.unlinkSync(path.join(notificationDir, file), (err) => {
                    if(err) {
                        console.log(err);
                        reject(constants.ERR_NOTIF_103);   
                    }
                });
                updateCategoryDateInDB(notification.category, notification.processingDate, resolve, reject);
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