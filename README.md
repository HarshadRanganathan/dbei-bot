# dbei-bot
Track current application processing dates for employment permits and support letter processed by the Department of Business, Enterprise and Innovation (Ireland).

This bot utilizes:
- [Node JS](https://nodejs.org/en/)
    - [axios](https://www.npmjs.com/package/axios) for promise based http requests
- [Express](https://www.npmjs.com/package/express) minimalist web framework
- [LowDB](https://github.com/typicode/lowdb) local JSON database
- [Jest](https://jestjs.io/) javascript testing

## Running the App locally
You'll need Node & NPM installed on your local development machine.

#### `npm run start`
Runs the app in express server with fallback port as 1337.

## Configuration
This app requires a local configuration file (.env) in the root directory with the following environment variables

```
DBEI_URL=<dbei_current_processing_dates_url>
SEND_API=<facebook_message_api>
VERIFY_TOKEN=<messenger_webhook_verification_token>
PAGE_ACCESS_TOKEN=<messenger_page_access_token>
```
