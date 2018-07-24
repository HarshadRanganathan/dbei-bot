const templates = require('../templates'); 
const genericTemplate = require('./generic_template.json');
const listTemplate = require('./list_template.json');

describe('Messenger Templates', () => {
    it('should return generic template', () => {
        let elements = [];
        elements.push( { 'title': 'Support Letters - Stamp 4', 'subtitle': '11 June 2018' } );
        expect(templates.genericTemplate(elements)).toEqual(genericTemplate);
    });
    it('should return list template', () => {
        let elements = [];
        elements.push( { 'title': 'Support Letters - Stamp 4', 'subtitle': '11 June 2018' } );
        elements.push( { 'title': 'Employment Permit - Standard', 'subtitle': '10 April 2018' } );
        expect(templates.listTemplate(elements)).toEqual(listTemplate);
    });
});