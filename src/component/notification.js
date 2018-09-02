const _ = require('lodash');
const os = require('os');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const constants = require('./constants');
const dbei =  require('./dbei');
const messenger = require('./messenger');
const subscription = require('./subscription');

const projectDir = path.join(__dirname, '..', '..');
const notificationDir = path.join(__dirname, '..', '..', 'notifications');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const SEND_API = process.env.SEND_API;

/**
 * Calls the Messenger API to send the subscription message
 * @param {string} psid page scoped id
 * @param {object} message template
 */
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
    })
    .catch((error) => {
        if (error.response) {
            console.log('PSID: ', psid);
            console.log('Status code: ', error.response.status);
            console.log('Response: ', error.response.data);
        } else if (error.request) {
            console.log('Request: ', error.request);            
        } else {
            console.log('Error: ', error.message);
        }
    });
}

/**
 * Reads the datastore from project root
 * @param {string} file 
 */
async function readDatastore(file) {
    return new Promise((resolve, reject) => {
        let data = '';
        let readStream = fs.createReadStream(path.join(projectDir, file));
        readStream.on('data', (chunk) => {
            data += chunk;
        })
        .on('end', () => {
            resolve(JSON.parse(data));
        })
        .on('error', (err) => {
            return reject(err);
        });
    });
}

/**
 * Returns categories whose dates have been updated in DBEI site
 * @param {object} processingDates 
 */
async function getUpdatedCategories(processingDates) {
    try {
        let categories = [];
        let dataStore = await readDatastore(constants.DATA_STORE);
        _.forEach(processingDates, (curDate, title) => {
            let category = _.findKey(dbei.categories, (val, key) => { return val === title });
            let doc = _.find(dataStore.currentProcessingDates, { category: category });
            if(doc != null && doc.date != curDate) categories.push(category);
        });
        return categories;
    } catch(err) {
        console.log(err);
        return [];
    }
}

/**
 * Generates file for the given category under notifications directory
 * Content of the file will be as follows:
 * 1. psids - list of subscribers to whom the message needs to be broadcasted
 * 2. category - subscription category
 * 3. processingDate - current processing date
 * 4. response - template message
 * @param {string} psids 
 * @param {string} category 
 * @param {string} processingDate 
 * @param {object} response 
 */
function writeNotification(psids, category, processingDate, response) {
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
            return reject(constants.ERR_NOTIF_100);
        });
        fileStream.end();
    });
}

/**
 * Generates notification files
 */
async function generateNotifications() {
    try {
        let processingDates = await dbei.scrapeData();
        let updatedCategories = await getUpdatedCategories(processingDates);   
        let notificationPromises = updatedCategories.map((category) => {
            let psids = subscription.getSubscribers(category);
            if(psids.length > 0) {
                let title = dbei.categories[category];
                let processingDate = processingDates[title];
                let processingDtsByTitle = {};
                processingDtsByTitle[title] = processingDate;
                let response = messenger.currentProcessingDtsMessage(processingDtsByTitle);
                return writeNotification(psids, category, processingDate, response);
            }
        });
        await Promise.all(notificationPromises);
        if(updatedCategories.length > 0) dbei.refreshDataStore();
    } catch(err) {
        console.log(err);
    }
}

/**
 * Lists the files in the notification directory
 */
function listNotifications() {
    return new Promise((resolve, reject) => {
        fs.readdir(path.join(notificationDir), (err, files) => {
            if(err) reject(constants.ERR_NOTIF_102);   
            _.remove(files, (file) => { return file === '.gitkeep' });
            resolve(files);
        });
    });
}

/**
 * Reads the notification file contents
 * @param {string} file 
 */
function readNotification(file) {
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
}

/**
 * Deletes the notification file
 * @param {string} file 
 */
function deleteNotification(file) {
    return new Promise((resolve, reject) => {
        fs.unlink(path.join(notificationDir, file), (err) => {
            if(err) return reject(constants.ERR_NOTIF_103);   
            resolve(constants.NOTIFICATION_FILE_REMOVED);
        });
    });
}

/**
 * Push notifications to subscribers
 * Actions:
 * 1. Read all notification files
 * 2. Publish notifications to subscribers
 * 3. Delete all notification files
 * 4. Refresh data store
 */
async function publishNotifications() {
    try {
        let files = await listNotifications();
        let notifications = await Promise.all(files.map(readNotification));
        await Promise.all(notifications.map(async (notification) => {
            let data = JSON.parse(notification);
            let msgPromises = data.psids.map((psid) => { return callSendAPI(psid, JSON.parse(data.response)); });
            await Promise.all(msgPromises);
        }));
        await Promise.all(files.map(deleteNotification));
    } catch(err) {
        console.log(err);        
        if(constants.ERR_NOTIF_103 === err)  {
            process.exit(1);
        }
    }
}

module.exports = {
    generateNotifications: generateNotifications,
    publishNotifications: publishNotifications
}