// The http module contains methods to handle http queries.
const http = require('http')
// Let's import our logic.
const fileQuery = require('./queryManagers/front.js')
const apiQuery = require('./queryManagers/api.js')
const aiQuery = require('./logic/ai.js')
const aiAdvancedQuery = require('./logic/aiMC.js')
const gameManagementQuery= require('./queryManagers/game/gameManagement')


/* The http module contains a createServer function, which takes one argument, which is the function that
** will be called whenever a new request arrives to the server.
 */
let server = http.createServer(function (request, response) {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // First, let's check the URL to see if it's a REST request or a file request.
    // We will remove all cases of "../" in the url for security purposes.
    let filePath = request.url.split("/").filter(function(elem) {
        return elem !== "..";
    });

    try {
        // If the URL starts by /api, then it's a REST request (you can change that if you want).
        if (filePath[1] === "api") {
            apiQuery.manage(request, response);
            // If it doesn't start by /api, then it's a request for a file.
        } else {
            fileQuery.manage(request, response);
        }
    } catch(error) {
        console.log(`error while processing ${request.url}: ${error}`)
        response.statusCode = 400;
        response.end(`Something in your request (${request.url}) is strange...`);
    }
// For the server to be listening to request, it needs a port, which is set thanks to the listen function.
});

server.listen(8000);

const { Server } = require("socket.io");
const {MongoClient} = require("mongodb");
const io = new Server(server);

io.on('connection',socket => {
    socket.on('joinRoom', (roomName) => {
        socket.join(roomName);
        io.to(roomName).emit('updateRoom', roomName);
    });
    console.log("Connected");

    socket.on('play',(state) => {
        let gameState = JSON.parse(state);
        io.to(gameState.id).emit('doMove',JSON.stringify(aiQuery.computeMove(gameState)));
    });

    socket.on('playAdv',async (state) => {
        let gameState = JSON.parse(state);

        let next = await aiAdvancedQuery.TestNextMove(gameState.pos);
        console.log("gamestate id "+gameState.id);
        console.log(next);
        io.to(gameState.id).emit('doMove', JSON.stringify(next));
    });

    socket.on('initAdv',(initState) => {
        aiAdvancedQuery.setup(initState);
    });
})
gameManagementQuery.setUpSockets(io);

