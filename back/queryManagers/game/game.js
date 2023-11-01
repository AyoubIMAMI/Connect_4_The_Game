const {MongoClient, ObjectId} = require("mongodb");
const mongoDBConnection = require("../mongoDBConnection");


/**
 *
 * @fileoverview This file the manager of the game API
 *
 * @author      Weel Ben Aissa
 * @author      Ayoub Imami
 * @author      Mourad Karrakchou
 *
 */


/**
 * This function manages the request to the Game API
 * @param request
 * @param response
 */
function manageRequest(request, response) {
    console.log("in manageRequest in game.js")

    const MongoClient = require('mongodb').MongoClient;

    const url = 'mongodb://admin:b0ttle0fW4t3r@mongodb/admin?directConnection=true';
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    let filePath = request.url.split("/").filter(function(elem) {
        return elem !== "..";
    });
    if (request.method==='POST') {
        let body = '';
        request.on('data', function (data) {
            body += data;
        });

        response.statusCode = 200;
        if (filePath[3]==null){
            request.on('end', function () {
                async function createGame() {
                    await client.connect();
                    let bodyParsed=JSON.parse(body);
                    const db = client.db("connect4");

                    const collection = db.collection("log");
                    console.log(bodyParsed);
                    const item = await collection.findOne({token:bodyParsed.userToken});
                    if(item === null) {
                        console.log("No user with this ID!");
                        return;
                    }
                    console.log("THIS IS ITEM");
                    console.log(item);
                    const tab = {
                        gameType: bodyParsed.gameType,
                        name: bodyParsed.name,
                        tab: bodyParsed.tab,
                        userID: item._id
                    };
                    console.log("THIS IS TAB:")
                    console.log(tab);
                    await mongoDBConnection.createInDataBase(response,tab,"games",tab);
                }
                createGame();
            });
            }
        else if(filePath[3]==="retrieveGames"){
            request.on('end', function () {
                async function findAllGames() {
                    await client.connect();
                    let bodyParsed=JSON.parse(body);
                    const db = client.db("connect4");

                    const collection = db.collection("log");
                    console.log(bodyParsed);
                    console.log(bodyParsed.token);
                    const item = await collection.findOne({token:bodyParsed.token});

                    console.log(item);

                    if(item === null) {
                        console.log("No user with this ID!");
                        return;
                    }

                    await mongoDBConnection.findEverythingInDataBase(response, {userID: item._id}, "games");
                }
                findAllGames();
            });
        }
        else if(filePath[3]==="verifToken"){
            request.on('end', function () {
                async function retriveGames() {
                    try {
                        console.log("retrieveGameWithId")
                        await client.connect();
                        let bodyParsed=JSON.parse(body);
                        console.log(bodyParsed);
                        console.log('Connected to MongoDB');
                        const db = client.db("connect4");
                        //await db.addUser("admin", "admin", {roles: [{role: "readWrite", db: "connect4"}]});
                        const gameCollection = db.collection("games");

                        const collection = db.collection("log");
                        const item = await collection.findOne({token:bodyParsed.token});
                        console.log("THE TOKEN: "+bodyParsed.token);
                        console.log("THE ITEM: "+item.toString());
                        response.end(JSON.stringify({userReel:item!=null}));
                    } catch (err) {
                        console.error('Failed to create database or user', err);
                        response.writeHead(400, {'Content-Type': 'application/json'});
                        response.end(JSON.stringify({ status: 'failure' }));
                    } finally {
                        await client.close();
                    }
                }
                retriveGames();
            });

        }
        else if(filePath[3]==="retrieveGameWithId"){
            request.on('end', function () {
                async function retriveGames() {
                    try {
                        console.log("retrieveGameWithId")
                        await client.connect();
                        let bodyParsed=JSON.parse(body);
                        console.log(bodyParsed);
                        console.log('Connected to MongoDB');
                        const db = client.db("connect4");
                        //await db.addUser("admin", "admin", {roles: [{role: "readWrite", db: "connect4"}]});
                        const gameCollection = db.collection("games");

                        const collection = db.collection("log");
                        const item = await collection.findOne({token:bodyParsed.token});
                        if(item === null) {
                            console.log("No user with this ID!");
                            return;
                        }
                        let games = (await gameCollection.find({userID: item._id}).toArray());
                        games=games.filter(game => game._id.toString() === bodyParsed.id);
                        response.writeHead(200, {'Content-Type': 'application/json'});
                        response.end(JSON.stringify(games[0]));
                    } catch (err) {
                        console.error('Failed to create database or user', err);
                        response.writeHead(400, {'Content-Type': 'application/json'});
                        response.end(JSON.stringify({ status: 'failure' }));
                    } finally {
                        await client.close();
                    }
                }
                retriveGames();
            });

        }
        else if(filePath[3]==="deleteGame"){
            request.on('end', function () {
                async function deleteAllGame() {
                    try {
                        console.log("deleteOneGame")
                        await client.connect();
                        let bodyParsed=JSON.parse(body);
                        console.log(bodyParsed);
                        console.log('Connected to MongoDB');
                        const db = client.db("connect4");
                        const gameCollection = db.collection("games");


                        const collection = db.collection("log");
                        const item = await collection.findOne({token:bodyParsed.token});
                        if(item === null) {
                            console.log("No user with this ID!");
                            return;
                        }

                        console.log("bodyParsed.token: ",bodyParsed.token);
                        const result = await gameCollection.deleteMany({userID: item._id});
                        console.log("Document deleted", result.deletedCount);
                        response.writeHead(200, {'Content-Type': 'application/json'});
                        response.end(JSON.stringify({ status: 'success' }));
                    } catch (err) {
                        console.error('Failed to delete the game', err);
                        response.writeHead(400, {'Content-Type': 'application/json'});
                        response.end(JSON.stringify({ status: 'failure' }));
                    } finally {
                        await client.close();
                    }
                }
                deleteAllGame();
            });
        }
    }
    else{
        response.statusCode = 400;
        response.end(`Something in your request (${request.url}) is strange...`);
    }

}

exports.manage = manageRequest;
