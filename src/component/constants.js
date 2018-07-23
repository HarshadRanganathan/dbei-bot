module.exports = Object.freeze({
    CURRENT_PROCESSING_DATES: 'currentProcessingDates',
    GREETING: 'Hey there! Current processing dates',
    RESPONSE: 'Response',
    SUBSCRIPTIONS: 'subscriptions',
    SUBSCRIBER_NOT_EXISTS: 'Hey there! You are not subscribed to any notifications',
    SUBSCRIPTION_SUCCESS: 'Thanks for subscribing. You will now receive notifications on current processing dates as they are updated',
    UNSUBSCRIBE_MESSAGE: 'Simply send \'unsubscribe\' to stop receiving the notifications',
    UNSUBSCRIBE_SUCCESS: 'You have been sucessfully unsubscribed',
    UNSUBSCRIBE_FAILED: 'Oops! There was an error in unsubscribing you. Please reach out to https://fb.me/dbei-bot',   
    NOTIFICATION_FILE_REMOVED: 'Notification file removed',
    ERR_SCR_100: 'Unable to retrieve current processing dates. Please try again after some time',
    ERR_SUB_100: 'You are already subscribed to receive notifications for this category',
    ERR_SUB_101: 'Oops! There was an error registering your subscription. Please reach out to https://fb.me/dbei-bot',
    ERR_NOTIF_100: 'Notification file not generated',
    ERR_NOTIF_101: 'Cannot update current processing date in data.json',
    ERR_NOTIF_102: 'Unable to read notification directory',
    ERR_NOTIF_103: 'Unable to delete notification file'
});