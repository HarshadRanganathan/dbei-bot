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

module.exports = {
    genericTemplate: genericTemplate,
    listTemplate: listTemplate
};