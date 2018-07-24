const fs = require('fs');
const path = require('path');
const moxios = require('moxios');
const constants = require('../constants');
const dbei = require('../dbei');

describe('Data Scraping', () => {
    let response;
    beforeEach(() => {
        moxios.install();
        response = fs.readFileSync(path.resolve(__dirname, 'dbei.html'), 'utf-8');
    });
    afterEach(() => {
        moxios.uninstall();
    });
    it('should return processing dates', async () => {
        let result = { 
            "Employment Permit - Standard": "10 April 2018",
            "Employment Permit - Trusted Partner": "11 June 2018",
            "Reviews - Trusted Partner & Standard": "5 July 2018",
            "Support Letters - Stamp 4": "11 June2018",
        };
        moxios.wait(() => {
            let request = moxios.requests.mostRecent();
            request.respondWith({
                status: 200,
                response: response
            });
        });
        let processingDtsByTitle = await dbei.scrapeData();
        expect(processingDtsByTitle).toEqual(result);
    });
    it('should throw error', async () => {
        moxios.wait(() => {
            let request = moxios.requests.mostRecent();
            request.respondWith({
                status: 404,
                response: 'Page not found'
            });
        });
        await expect(dbei.scrapeData()).rejects.toThrowError(constants.ERR_SCR_100);
    });
});