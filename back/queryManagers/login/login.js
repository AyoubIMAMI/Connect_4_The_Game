const mongoDBConnection = require('../mongoDBConnection');
const hashFunction = require('./register')

/**
 * This function manages the request to the login API
 * @param request
 * @param response
 */

function manageRequest(request, response) {
        if (request.method==='POST') {
            let body = '';
            request.on('data', function (data) {
                body += data;
            });

            request.on('end', function () {
                let userInfo={
                    username: body.username,
                    password: hashFunction.hash(body.password),
                }
                mongoDBConnection.findInDataBase(response,userInfo,"log");
            });
        }
        else{
            response.statusCode = 400;
            response.end(`Something in your request (${request.url}) is strange...`);
        }
}

exports.manage = manageRequest;
