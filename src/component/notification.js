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
const notificationDir = path.join(__dirname, '..', '..', 'notifications');

function callSendAPI(psid, message) {
    let data = { 
        "recipient": { "id": psid }, 
        "message": message, 
        "messaging_type": "MESSAGE_TAG", 
        "tag": "NON_PROMOTIONAL_SUBSCRIPTION" 
    };
    return axios({
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
        if(doc != null && doc.date != curDate) categories.push(category);
    });
    return categories;
}

function getCurrentProcessingDate(processingDates, category) {
    let title = dbei.categories[category];
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
        fs.readdir(path.join(notificationDir), (err, files) => {
            if(err) return reject(constants.ERR_NOTIF_102);   
            resolve(files);
        });
    })
    .then((files) => {
        let notifications = files.map((file) => {
            return new Promise((resolve, reject) => {
                let data = '';
                let readStream = fs.createReadStream(path.join(notificationDir, file));
                readStream.on('data', (chunk) => {
                    data += chunk;
                })
                .on('end', () => {
                    resolve(data);
                })
                .on('error', (err) => {
                    return reject(err);
                });
            });
        });
        return Promise.all(notifications);
    })
    .then((notifications) => {
        console.log(notifications);
        let actions = notifications.map((notification) => {
            let msgs = notification.psids.map((psid) => {
                callSendAPI(psid, data.response);
            });
            return Promise.all(msgs);
        });
        Promise.all(actions);
    })
    .then((responses) => {
        console.log(responses);
        return new Promise((resolve, reject) => {
            fs.unlink(path.join(notificationDir, file), (err) => {
                if(err) {
                    console.log(err);
                    return reject(constants.ERR_NOTIF_103);   
                }
                resolve();
            });
        });
    })
    .then(() => {
        return new Promise((resolve, reject) => {
            updateCategoryDateInDB(data.category, data.processingDate, resolve, reject);
        });
    });
}

module.exports = {
    getDtsUpdatedCategories: getDtsUpdatedCategories,
    getCurrentProcessingDate: getCurrentProcessingDate,
    generateNotificationFile: generateNotificationFile,
    processNotifications: processNotifications
}