const databaseManager = require('../databaseManager.js');
const hashFunction = require('./register.js')

/**
 * This function manages the request to the login API
 * @param request
 * @param response
 */

const COLLECTION_NAME = "log";

function manageRequest(request, response) {
    if (request.method === 'POST') {
        let body = '';
        request.on('data', function (data) {
            body += data;
        });

        request.on('end', function () {
            let userInfo = {
                username: body.username,
                password: hashFunction.hash(body.password),
            }
            databaseManager.findInDataBase(response, userInfo, COLLECTION_NAME)
                .then(() => console.log("Looking for user in database"));
        });
    } else {
        response.statusCode = 400;
        response.end(`Something in your request (${request.url}) is strange...`);
    }
}

exports.manage = manageRequest;
