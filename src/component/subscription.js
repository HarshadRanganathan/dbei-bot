const _ = require('lodash');
const constants = require('./constants');
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults( { subscriptions: [] } ).write();

function subscriberExists(sender_psid) {
    let found = false;
    const doc = db.get(constants.SUBSCRIPTIONS)
                .find( { psid: sender_psid } )
                .value();
    if(typeof doc != "undefined") found = true;
    return found;
}

function addSubscription(sender_psid) {
    try {
        if(!subscriberExists(sender_psid)) {
            db.get(constants.SUBSCRIPTIONS)
            .push( { psid: sender_psid, subscription_date: new Date(Date.now()) } )
            .write();
            return constants.SUBSCRIPTION_SUCCESS;
        } else {
            return constants.SUBSCRIBER_EXISTS;
        }
    } catch(err) {
        console.log(err);
        return constants.SUBSCRIPTION_FAILED;
    }
}

function removeSubscription(sender_psid) {
    try {
        if(subscriberExists(sender_psid)) {
            db.get(constants.SUBSCRIPTIONS) 
            .remove( { psid: sender_psid } )
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

function getAllSubscriptions() {
    try {
        const docs = db.get(constants.SUBSCRIPTIONS)
                    .cloneDeep()
                    .value();                   
        return _.map(docs, 'psid');
    } catch(err) {
        console.log(err);
        return [];
    } 
}

module.exports = {
    addSubscription: addSubscription,
    removeSubscription: removeSubscription,
    getAllSubscriptions: getAllSubscriptions
}