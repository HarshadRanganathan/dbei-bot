const os = require('os');
const fs = require('fs');

function addSubscriber(sender_psid) {
    return new Promise((resolve, reject) => {
        let fileStream = fs.createWriteStream('.subscribers', { flags: 'a' });
        fileStream.write(sender_psid + os.EOL);
        fileStream.on('finish', () => { resolve("Subscription Successful"); } )
        .on('error', (err) => {
            console.log('Failed to register new subscriber with psid [%s]', sender_psid);
            console.log(err);
            reject('ERR: Subscription failed');
        });
        fileStream.end();
    });
}

addSubscriber('1080444444438592')
.then((message) => {
    console.log(message);
})
.catch((err) => {
    console.log(err);
});