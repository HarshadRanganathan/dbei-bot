const _ = require('lodash');
const constants = require('./constants');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync(constants.SUBSCRIPTION_STORE);
const db = low(adapter);

db.defaults( { subscriptions: [] } ).write();

/**
 * Checks if the user is already subscribed to receive notifications for the category
 * @param {string} psid 
 * @param {string} category 
 */
function subscriberExists(psid, category) {
    let found = false;
    const doc = db.get(constants.SUBSCRIPTIONS)
                .find( { psid: psid, category: category } )
                .value();
    if(typeof doc != "undefined") found = true;
    return found;
}

/**
 * Add new category subscription
 * @param {string} psid 
 * @param {string} category 
 * @returns subscription message
 */
function addSubscription(psid, category) {
    try {
        if(!subscriberExists(psid, category)) { // TODO: check if category is valid
            db.get(constants.SUBSCRIPTIONS)
            .push( { psid: psid, category: category, startDate: new Date(Date.now()) } )
            .write();
            return constants.SUBSCRIPTION_SUCCESS;
        } else {
            return constants.ERR_SUB_100;
        }
    } catch(err) {
        console.log(err);
        return constants.ERR_SUB_101;
    }
}

/**
 * Removes subscription for a given user, category
 * @param {string} sender_psid 
 * @param {string} category 
 */
function removeSubscription(sender_psid, category) {
    try {
        if(subscriberExists(sender_psid, category)) {
            db.get(constants.SUBSCRIPTIONS) 
            .remove( { psid: sender_psid, category: category } )
            .write();
            return constants.UNSUBSCRIBE_SUCCESS;
        } else {
            return constants.SUBSCRIBER_NOT_EXISTS;
        }
    } catch(err) {
        console.log(err);
        return constants.UNSUBSCRIBE_FAILED;
    }
}

/**
 * Get all subscriptions of an user
 * @param {string} psid 
 */
function getSubscriptions(psid) {
    try {
        const docs = db.get(constants.SUBSCRIPTIONS)
                    .cloneDeep()
                    .value();    
        return _.filter(docs, (doc) => { return doc.psid === psid } ).map(doc => doc.category);
    } catch(err) {
        console.log(err);
        return [];
    }
}

/**
 * Get all subscribers for a category
 * @param {string} category 
 */
function getSubscribers(category) {
    try {
        const docs = db.get(constants.SUBSCRIPTIONS)
                    .cloneDeep()
                    .value();    
        return _.filter(docs, (doc) => { return doc.category === category } ).map(doc => doc.psid);
    } catch(err) {
        console.log(err);
        return [];
    }
}

module.exports = {
    addSubscription: addSubscription,
    removeSubscription: removeSubscription,
    getSubscriptions: getSubscriptions,
    getSubscribers: getSubscribers
}