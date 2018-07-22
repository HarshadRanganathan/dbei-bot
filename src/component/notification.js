const _ = require('lodash');
const os = require('os');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const constants = require('./constants');
const dbei =  require('./dbei');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('data.json');
const db = low(adapter);
const notificationDir = path.join(__dirname, '..', '..', 'notifications');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const SEND_API = process.env.SEND_API;

function callSendAPI(psid, message) {
    let data = { 
        "recipient": { "id": psid }, 
        "message": message, 
        "messaging_type": "MESSAGE_TAG", 
        "tag": "NON_PROMOTIONAL_SUBSCRIPTION" 
    };        
    return axios({
        method: 'POST',
        url: SEND_API,
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

function getCurrentProcessingDtByTitle(processingDtsByTitle, category) {
    let processingDtByTitle = {};
    let title = dbei.categories[category];
    let date = processingDtsByTitle[title];
    processingDtByTitle[title] = date
    return processingDtByTitle;
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
            reject(constants.ERR_NOTIF_100);
        });
        fileStream.end();
    });
}

function processNotifications() {
    return new Promise((resolve, reject) => {
        fs.readdir(path.join(notificationDir), (err, files) => {
            if(err) return reject(constants.ERR_NOTIF_102);   
            _.remove(files, (file) => { return file === '.gitkeep' });
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
        let actions = notifications.map((notification) => {
            let data = JSON.parse(notification);            
            let msgs = data.psids.map((psid) => {
                callSendAPI(psid, JSON.parse(data.response));
            });
            return Promise.all(msgs);
        });
        return Promise.all(actions);
    })
    .then((responses) => {
        return new Promise((resolve, reject) => {
            fs.readdir(path.join(notificationDir), (err, files) => {
                if(err) return reject(constants.ERR_NOTIF_102);   
                let removeActions = files.map((file) => {
                    return new Promise((resolve, reject) => {
                        fs.unlink(path.join(notificationDir, file), (err) => {
                            if(err) return reject(constants.ERR_NOTIF_103);   
                            resolve();
                        });
                    });
                });      
                return Promise.all(removeActions);          
            });
            resolve();
        });
    })
    .catch((err) => {
        console.log(err);        
        if(constants.ERR_NOTIF_103 === err)  {
            process.exit(1);
        }
    });
}

module.exports = {
    getDtsUpdatedCategories: getDtsUpdatedCategories,
    getCurrentProcessingDtByTitle: getCurrentProcessingDtByTitle,
    generateNotificationFile: generateNotificationFile,
    processNotifications: processNotifications
}