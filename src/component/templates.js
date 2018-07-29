/**
 * @link https://developers.facebook.com/docs/messenger-platform/reference/template/generic
 * @param {array} elements 
 */
function genericTemplate(elements) {
    return {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": elements
            }
        }
    };
}

/**
 * @link https://developers.facebook.com/docs/messenger-platform/reference/template/list
 * @param {array} elements 
 */
function listTemplate(elements) {
    return {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "list",
                "top_element_style": "compact",
                "elements": elements
            }
        }
    };
}

/**
 * @link https://developers.facebook.com/docs/messenger-platform/send-messages/quick-replies/
 * @param {text} text 
 * @param {array} quickReplies 
 */
function quickRepliesTemplate(text, quickReplies) {
    return {
        "text": text,
        "quickReplies": quickReplies
    }
}

module.exports = {
    genericTemplate: genericTemplate,
    listTemplate: listTemplate,
    quickRepliesTemplate: quickRepliesTemplate
};