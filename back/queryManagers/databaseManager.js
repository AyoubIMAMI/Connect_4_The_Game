const {ObjectId: ObjectID} = require("mongodb");
const socketManager = require("./game/socketManager.js");
const MongoClient = require('mongodb').MongoClient;


//url to connect to the database
const url = 'mongodb://admin:admin@mongodb/admin?directConnection=true';
const client = new MongoClient(url, {useNewUrlParser: true, useUnifiedTopology: true});

const CONNECT_4 = "connect4";
const LOG = "log";
const GAMES = "games";
const CHAT = "chat";

/**
 * This function log in the user in the database and change the token
 * @param response
 * @param currentUser user to log in
 * @param collectionName name of the collection to use here its log
 * @returns {Promise<void>}
 */
async function loginInDataBase(response, currentUser, collectionName) {
    try {
        const jwt = require('jsonwebtoken');
        const secret = '4QuartsSecretKey';

        await client.connect();
        console.log('Connected to database');
        console.log(currentUser);

        const db = client.db(CONNECT_4);
        const collection = db.collection(collectionName);

        const item = await collection.findOne(currentUser);
        const token = jwt.sign({userId: item._id, name: item.name}, secret);

        await collection.updateOne(
            {username: item.username},
            {$set: {token: token}}
        );
        let newItem = await collection.findOne({token: token});

        response.writeHead(200, {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token});
        response.end(newItem);
    } catch (err) {
        console.error('Failed to create database or user', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end({status: 'failure'});
    } finally {
        await client.close();
    }
}

/**
 * This function create a new user in the database
 * @param response
 * @param valueToFind value to find in the database
 * @param collectionName name of the collection to use here its log
 * @param verifyValue value to verify if the user already exist
 * @returns {Promise<void>}
 */
async function createInDataBase(response, valueToFind, collectionName, verifyValue) {
    try {
        await client.connect();
        console.log('Connected to database');

        const db = client.db("connect4");
        const collection = db.collection(collectionName);
        const item = await collection.findOne(verifyValue);

        if (item != null) {
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.end({status: 'failure'});
        } else {
            const result = await collection.insertOne(valueToFind);
            console.log('Document inserted', result.insertedId);
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.end({status: 'success'});
        }
    } catch (err) {
        console.error('Failed to create database or user', err);
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end({status: 'failure'});
    } finally {
        await client.close();
    }
}

/**
 * This function find everything in the database that match the valueToFind
 * @param response
 * @param valueToFind value to find in the database
 * @param collectionName name of the collection to use here its log
 * @returns {Promise<void>}
 */
async function findEverythingInDataBase(response, valueToFind, collectionName) {
    try {
        await client.connect();
        console.log('Connected to database');

        const db = client.db("connect4");
        const collection = db.collection(collectionName);
        const items = await collection.find(valueToFind).toArray();

        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(items);
    } catch (err) {
        console.error('Failed to create database or user', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end({status: 'failure'});
    } finally {
        await client.close();
    }
}

/**
 * this function add a friend request to a user in the database
 * @param response
 * @param requestFrom user who does the request
 * @param valueToInsert friend to add
 * @returns {Promise<void>}
 */
async function friendRequest(response, requestFrom, valueToInsert) {
    try {
        // database connection
        await client.connect();
        const db = client.db(CONNECT_4);
        const collection = db.collection(LOG);

        // finding the friend to add
        const friendItem = await collection.findOne({username: valueToInsert});

        // user not found security
        if (friendItem === null) {
            response.end({status: 'User not found'});
            return;
        }

        // finding the user who does the request
        const user = await collection.findOne({token: requestFrom});
        let userRequest = user.requestSent;
        let userFriends = user.friends;
        let userRequestReceived = user.requestReceived;

        // security to avoid spam request or to add a friend the user already has or add oneself
        if (userRequest.includes(valueToInsert) || userFriends.includes(valueToInsert) || valueToInsert === user.username) {
            return;
        }

        // if both the users ask each other, they automatically accept each other
        if (userRequestReceived.includes(valueToInsert)) {
            await acceptFriendRequest(response, requestFrom, valueToInsert);
        }

        // adding the friend request in the user database
        userRequest.push(valueToInsert);
        await collection.updateOne({token: requestFrom}, {$set: {requestSent: userRequest}});

        // send the friend request to the friend
        let friendRequestReceived = friendItem.requestReceived;
        friendRequestReceived.push(user.username);
        await collection.updateOne({username: friendItem.username}, {$set: {requestReceived: friendRequestReceived}});

        // response
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end({status: 'success'});
    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end({status: 'failure'});
    } finally {
        await client.close();
    }
}

/**
 * Retrieve the friend list of a user
 * @param response the response to send
 * @param requestFrom the user who does the request
 * @returns {Promise<void>}
 */
async function retrieveFriendList(response, requestFrom) {
    try {
        // database connection
        await client.connect();
        const db = client.db(CONNECT_4);
        const collection = db.collection(LOG);

        // finding the user who does the request
        const user = await collection.findOne({token: requestFrom});
        let userFriends = user.friends;

        // answer the data
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(userFriends);
    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end({status: 'failure'});
    } finally {
        await client.close();
    }
}

/**
 * Retrieve all the stats of a user (elo, win, lose, draw)
 * @param response
 * @param requestFrom user who does the request
 * @param friendName friendName because we use this function to see the stats of a friend
 * @returns {Promise<void>}
 */
async function retrieveAllStats(response, requestFrom, friendName) {
    try {
        // database connection
        await client.connect();
        const db = client.db(CONNECT_4);
        const collection = db.collection(LOG);

        let user;
        let userRequest = await collection.findOne({token: requestFrom});

        if (friendName === userRequest.username) {
            user = userRequest;
        } else {
            if (!userRequest.friends.includes(friendName)) {
                response.writeHead(404, {'Content-Type': 'application/json'});
                response.end({status: 'failure'});
                return;
            }
            user = await collection.findOne({username: friendName});
        }

        // finding the user who does the request
        const userElo = user.elo;
        const userWins = user.wins;
        const userLosses = user.losses;
        const userDraws = user.draws;
        const nbFriends = user.friends.length;

        // answer the data
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end({eloPlayer: userElo, wins: userWins, losses: userLosses, draws: userDraws, nbFriends: nbFriends});
    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end({status: 'failure'});
    } finally {
        await client.close();
    }
}

/**
 * Remove a friend from the friend list of a user
 * @param response
 * @param requestFrom user who does the request
 * @param friendToRemove friend to remove
 * @returns {Promise<void>}
 */
async function removeFriend(response, requestFrom, friendToRemove) {
    try {
        // database connection
        await client.connect();
        const db = client.db(CONNECT_4);
        const collection = db.collection(LOG);

        // finding the user who does the request
        const user = await collection.findOne({token: requestFrom});
        const friend = await collection.findOne({username: friendToRemove});
        let userFriends = user.friends;
        let friendFriends = friend.friends;

        // finding and removing the friend to remove
        for (let i = 0; i < userFriends.length; i++) {
            if (userFriends[i] === friendToRemove) {
                userFriends.splice(i, 1);
                break;
            }
        }

        for (let i = 0; i < friendFriends.length; i++) {
            if (friendFriends[i] === user.username) {
                friendFriends.splice(i, 1);
                break;
            }
        }

        // update database
        await collection.updateOne({token: requestFrom}, {$set: {friends: userFriends}});
        await collection.updateOne({username: friendToRemove}, {$set: {friends: friendFriends}});

        // response
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end({status: 'success'});
    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end({status: 'failure'});
    } finally {
        await client.close();
    }
}

/**
 * retrieve the friends requests of a user
 * @param response
 * @param requestFrom user who does the request
 * @returns {Promise<void>}
 */
async function retrieveFriendRequest(response, requestFrom) {
    try {
        // database connection
        await client.connect();
        const db = client.db(CONNECT_4);
        const collection = db.collection(LOG);

        // finding the user and its received friends requests
        const user = await collection.findOne({token: requestFrom});
        let userFriendRequests = user.requestReceived;

        // answer the data
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(userFriendRequests);
    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end({status: 'failure'});
    } finally {
        await client.close();
    }
}

/**
 * Accept a friend request
 * @param response
 * @param requestFrom user who does the request
 * @param friendToAccept friend to accept
 * @returns {Promise<void>}
 */
async function acceptFriendRequest(response, requestFrom, friendToAccept) {
    try {
        // database connection
        await client.connect();
        const db = client.db(CONNECT_4);
        const collection = db.collection(LOG);

        // finding the user and the friend
        const user = await collection.findOne({token: requestFrom});
        const friend = await collection.findOne({username: friendToAccept});

        // adding each other as friend
        let userFriendList = user.friends;
        let friendFriendList = friend.friends;
        userFriendList.push(friend.username);
        friendFriendList.push(user.username);

        // update database
        await collection.updateOne({token: requestFrom}, {$set: {friends: userFriendList}});
        await collection.updateOne({username: friendToAccept}, {$set: {friends: friendFriendList}});

        const friendRequestSent = await removingReceivedAndSentRequests(user, friend, requestFrom, collection);
        await collection.updateOne({username: friendToAccept}, {$set: {requestSent: friendRequestSent}});

        // response
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end({status: 'success'});
    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end({status: 'failure'});
    } finally {
        await client.close();
    }
}

/**
 * Decline a friend request
 * @param response
 * @param requestFrom user who does the request (the one who received the request)
 * @param friendToDecline friend to decline
 * @returns {Promise<void>}
 */
async function declineFriendRequest(response, requestFrom, friendToDecline) {
    try {
        // database connection
        await client.connect();
        const db = client.db(CONNECT_4);
        const collection = db.collection(LOG);

        // finding the user and the friend
        const user = await collection.findOne({token: requestFrom});
        const friend = await collection.findOne({username: friendToDecline});

        const friendRequestSent = await removingReceivedAndSentRequests(user, friend, requestFrom, collection);
        await collection.updateOne({username: friendToDecline}, {$set: {requestSent: friendRequestSent}});

        // response
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end({status: 'success'});
    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end({status: 'failure'});
    } finally {
        await client.close();
    }
}

async function removingReceivedAndSentRequests(user, friend, requestFrom, collection) {
    try {
        // removing the received and sent requests
        let userRequestReceived = user.requestReceived;
        for (let i = 0; i < userRequestReceived.length; i++) {
            if (userRequestReceived[i] === friend.username) {
                userRequestReceived.splice(i, 1);
                break;
            }
        }

        let friendRequestSent = friend.requestSent;
        for (let i = 0; i < friendRequestSent.length; i++) {
            if (friendRequestSent[i] === user.username) {
                friendRequestSent.splice(i, 1);
                break;
            }
        }

        // update database
        await collection.updateOne({token: requestFrom}, {$set: {requestReceived: userRequestReceived}});
        return friendRequestSent
    } catch (err) {
        console.error('Error', err);
    } finally {
        await client.close();
    }
}

async function createGame(response, body) {
    try {
        await client.connect();
        const db = client.db(CONNECT_4);

        const collection = db.collection(LOG);
        const item = await collection.findOne({token: body.userToken});
        const tab = {
            gameType: body.gameType,
            name: body.name,
            tab: body.tab,
            userID: item._id
        };
        await createInDataBase(response, tab, GAMES, tab);
    } catch (err) {
        console.error('Error', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end({status: 'failure'});
    } finally {
        await client.close();
    }
}

async function findAllGames(response, body) {
    try {
        await client.connect();
        const db = client.db(CONNECT_4);

        const collection = db.collection(LOG);
        const item = await collection.findOne({token: body.token});

        await findEverythingInDataBase(response, {userID: item._id}, GAMES);
    } catch (err) {
        console.error('Error', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end({status: 'failure'});
    } finally {
        await client.close();
    }
}

async function retrieveGames(response, body) {
    try {
        await client.connect();
        const db = client.db(CONNECT_4);

        const collection = db.collection(LOG);
        const item = await collection.findOne({token: body.token});
        response.end({userReel: item != null});
    } catch (err) {
        console.error('Failed to create database or user', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end({status: 'failure'});
    } finally {
        await client.close();
    }
}

async function retrieveGamesWithId(response, body) {
    try {
        await client.connect();
        const db = client.db(CONNECT_4);

        const gameCollection = db.collection(GAMES);
        const collection = db.collection(LOG);
        const item = await collection.findOne({token: body.token});

        let games = (await gameCollection.find({userID: item._id}).toArray());
        games = games.filter(game => game._id.toString() === body.id);
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(games[0]);
    } catch (e) {
        console.error('Failed to create database or user', e);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end({status: 'failure'});
    } finally {
        await client.close();
    }
}

async function deleteAllGames(response, body) {
    try {
        await client.connect();
        const db = client.db(CONNECT_4);
        const gameCollection = db.collection(GAMES);

        const collection = db.collection(LOG);
        const item = await collection.findOne({token: body.token});
        await gameCollection.deleteMany({userID: item._id});
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end({status: 'success'});
    } catch (err) {
        console.error('Failed to delete the game', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end({status: 'failure'});
    } finally {
        await client.close();
    }
}

/**
 * This function retrieves the user from the database
 * @param token the token of the user
 */
async function retrieveUserFromDataBase(token) {
    try {
        await client.connect();
        const db = client.db(CONNECT_4);

        const collection = db.collection(LOG);
        return await collection.findOne({token: token});
    } catch (err) {
        console.error('Error', err);
    } finally {
        await client.close();
    }
}

/**
 * This function retrieves the user from the database by name
 * @param name the name of the user
 */
async function retrieveUserFromDataBaseByName(name) {
    try {
        await client.connect();
        const db = client.db(CONNECT_4);
        const collection = db.collection(LOG);
        return await collection.findOne({username: name});
    } catch (err) {
        console.error('Error', err);
    } finally {
        await client.close();
    }
}

/**
 * This function add a message to the database between two users
 * @param from the user who sent the message
 * @param to the user who received the message
 * @param message the message
 * @param heReads if the user has read the message
 */
async function saveMessageToDataBase(from, to, message, heReads) {
    try {
        await client.connect();
        const db = client.db(CONNECT_4);
        const chatCollection = db.collection(CHAT);
        return await chatCollection.insertOne({from: from, to: to, message: message, heReads: heReads});
    } catch (err) {
        console.error('Error', err);
    } finally {
        await client.close();
    }
}

/**
 * this function load all the messages to a user
 * @param to the user who received the message
 */
async function loadAllMessagePending(to) {
    try {
        await client.connect();
        console.log('Connected to database');
        const db = client.db(CONNECT_4);
        const chatCollection = db.collection(CHAT);
        return await chatCollection.find({to: to, heReads: false}).toArray();
    } catch (err) {
        console.error('Error', err);
    } finally {
        await client.close();
    }
}

/**
 * load all the messages from a user to another
 * @param from the user who sent the message
 * @param to the user who received the message
 * @param connectedSockets
 */
async function loadAllMessageFromConversation(from, to, connectedSockets) {
    try {
        await client.connect();
        console.log('Connected to database');
        const db = client.db(CONNECT_4);
        const chatCollection = db.collection(CHAT);
        console.log("updating: from " + from + " to " + to);
        await chatCollection.updateMany({from: from, to: to}, {$set: {heReads: true}});
        if (socketManager.findSocketByName(to, connectedSockets) === null)
            return [];
        socketManager.findSocketByName(to, connectedSockets).emit('loadAllMessagePending', await loadAllMessagePending(to));
        return await chatCollection.find({$or: [{from: from, to: to}, {from: to, to: from}]}).toArray();
    } catch (err) {
        console.error('Error', err);
    } finally {
        await client.close();
    }
}

/**
 * add a win to the user in the database if he wins
 * @param requestFrom the user who won
 * @returns {Promise<void>}
 */
async function addWins(requestFrom) {
    try {
        await client.connect();
        const db = client.db(CONNECT_4);
        const collection = db.collection(LOG);
        const user = await collection.findOne({username: requestFrom});
        let userWins = user.wins + 1;
        await collection.updateOne({username: requestFrom}, {$set: {wins: userWins}});
    } catch (err) {
        console.error('Token not found', err);
    } finally {
        await client.close();
    }
}

/**
 * add a loss to the user in the database if he loses
 * @param requestFrom the user who lost
 * @returns {Promise<void>}
 */
async function addLosses(requestFrom) {
    try {
        await client.connect();
        const db = client.db(CONNECT_4);
        const collection = db.collection(LOG);
        const user = await collection.findOne({username: requestFrom});
        let userLosses = user.losses + 1;
        await collection.updateOne({username: requestFrom}, {$set: {losses: userLosses}});
    } catch (err) {
        console.error('Token not found', err);
    } finally {
        await client.close();
    }
}

/**
 * add a draw to the user in the database if he draws
 * @param requestFrom
 * @returns {Promise<void>}
 */
async function addDraws(requestFrom) {
    try {
        await client.connect();
        const db = client.db(CONNECT_4);
        const collection = db.collection(LOG);
        const user = await collection.findOne({username: requestFrom});
        let userDraws = user.draws + 1;
        await collection.updateOne({username: requestFrom}, {$set: {draws: userDraws}});
    } catch (err) {
        console.error('Token not found', err);
    } finally {
        await client.close();
    }
}

/**
 * update the elo of the user in the database after a game
 * @param requestFrom
 * @param elo the new elo
 * @returns {Promise<void>}
 */
async function addElo(requestFrom, elo) {
    try {
        await client.connect();
        const db = client.db(CONNECT_4);
        const collection = db.collection(LOG);
        await collection.updateOne({username: requestFrom}, {$set: {elo: elo}});
    } catch (err) {
        console.error('Token not found', err);
    } finally {
        await client.close();
    }
}

async function updateSetToRead(request, to) {
    try {
        await client.connect();
        const db = client.db(CONNECT_4);
        const chatCollection = db.collection(CHAT);
        return await chatCollection.updateOne({
            _id: new ObjectID(request.item.insertedId),
            to: to.username
        }, {$set: {heReads: true}});
    } catch (err) {
        console.error('Error', err);
    } finally {
        await client.close();
    }
}

// here we export all the functions to be used in other files
exports.findInDataBase = loginInDataBase;
exports.createInDataBase = createInDataBase;
exports.findEverythingInDataBase = findEverythingInDataBase;

exports.retrieveUserFromDataBase = retrieveUserFromDataBase;
exports.retrieveUserFromDataBaseByName = retrieveUserFromDataBaseByName;

exports.friendRequest = friendRequest;
exports.retrieveFriendList = retrieveFriendList;
exports.removeFriend = removeFriend;
exports.retrieveFriendRequest = retrieveFriendRequest;
exports.acceptFriendRequest = acceptFriendRequest;
exports.declineFriendRequest = declineFriendRequest;
exports.retrieveAllStats = retrieveAllStats;

exports.createGame = createGame;
exports.findAllGames = findAllGames;
exports.retrieveGames = retrieveGames;
exports.retrieveGamesWithId = retrieveGamesWithId;
exports.deleteAllGames = deleteAllGames;

exports.saveMessageToDataBase = saveMessageToDataBase;
exports.loadAllMessagePending = loadAllMessagePending;
exports.loadAllMessageFromConversation = loadAllMessageFromConversation;
exports.updateSetToRead = updateSetToRead;

exports.addWins = addWins;
exports.addLosses = addLosses;
exports.addDraws = addDraws;
exports.addElo = addElo;
