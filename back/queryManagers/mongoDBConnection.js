const {ObjectId: ObjectID} = require("mongodb");

const MongoClient = require('mongodb').MongoClient;
//url to connect to the database
const url = 'mongodb://admin:admin@mongodb/admin?directConnection=true';
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

/**
 * This function log in the user in the database and change the token
 * @param response
 * @param currentUser user to log in
 * @param collectionName name of the collection to use here its log
 * @returns {Promise<void>}
 */
async function loginInDataBase(response,currentUser,collectionName) {
    try {
        const jwt = require('jsonwebtoken');
        const secret = 'secretKeyyyy';

        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db("connect4");
        const collection = db.collection(collectionName);
        console.log(currentUser);
        const item = await collection.findOne(currentUser);
        if(item === null)
            throw new TypeError("Invalid credentials!");

        console.log("ITEM FROM MONGODB:" + item);
        const token = jwt.sign({userId: item._id, name: item.name}, secret);

        await collection.updateOne(
            {username: item.username},
            { $set: { token: token } }
        );
        let newItem = await collection.findOne({token:token});
        console.log("NEW ID ")
        if(newItem === null)
            throw new TypeError("No user with this ID!");
        response.writeHead(200, {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token});
        response.end(JSON.stringify(newItem));
        console.log("THIS IS THE TOKEN:"+token);

    } catch (err) {
        console.error('Failed to create database or user', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ status: 'failure' }));
    } finally {
        await client.close();
    }
}

/**
 * This function create a new user in the database
 * @param response
 * @param valueToFind value to find in the database
 * @param collectionName name of the collection to use here its log
 * @param verifValue value to verify if the user already exist
 * @returns {Promise<void>}
 */

async function createInDataBase(response,valueToFind,collectionName,verifValue) {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db("connect4");
        const collection = db.collection(collectionName);
        const item = await collection.findOne(verifValue);
        if (item!=null) {
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.end(JSON.stringify({status: 'failure'}));
        }
        else{
            const result = await collection.insertOne(valueToFind);
            console.log('Document inserted', result.insertedId);
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.end(JSON.stringify({ status: 'success' }));
        }
    } catch (err) {
        console.error('Failed to create database or user', err);
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ status: 'failure' }));
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

async function findEverythingInDataBase(response,valueToFind,collectionName){
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db("connect4");
        //await db.addUser("admin", "admin", {roles: [{role: "readWrite", db: "connect4"}]});
        const collection = db.collection(collectionName);
        const items = await collection.find(valueToFind).toArray();
        console.log(items);
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify(items));
    } catch (err) {
        console.error('Failed to create database or user', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ status: 'failure' }));
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

async function  friendRequest(response, requestFrom, valueToInsert) {
    const collectionName = "log";
    try {
        // database connection
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);

        // finding the friend to add
        const friendItem = await collection.findOne({username: valueToInsert});

        // user not found security
        if (friendItem === null) {
            response.end(JSON.stringify({ status: 'User not found' }));
            return;
        }

        // finding the user who does the request
        const user = await collection.findOne({token: requestFrom});
        if(user === null)
            throw new TypeError("No user with this ID!");
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
        response.end(JSON.stringify({ status: 'success' }));

    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
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
    const collectionName = "log";
    try {
        // database connection
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);

        // finding the user who does the request
        const user = await collection.findOne({token: requestFrom});
        if(user === null)
            throw new TypeError("No user with this ID!");
        let userFriends = user.friends;

        // answer the data
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify(userFriends));

    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
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
async function retrieveAllStats(response, requestFrom,friendName){
    const collectionName = "log";
    try {
        // database connection
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);


        let user;
        let userRequest =  await collection.findOne({token: requestFrom});
        if(userRequest === null)
            throw new TypeError("No user with this ID!");
        if(friendName === userRequest.username){
              user = userRequest;
        }else{
            if(!userRequest.friends.includes(friendName)){
                response.writeHead(404, {'Content-Type': 'application/json'});
                response.end(JSON.stringify({status: 'failure'}));
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
        response.end(JSON.stringify({eloPlayer: userElo, wins: userWins, losses: userLosses, draws: userDraws, nbFriends: nbFriends}));

    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
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
    const collectionName = "log";
    try {
        // database connection
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);

        // finding the user who does the request
        const user = await collection.findOne({token: requestFrom});
        if(user === null)
            throw new TypeError("No user with this ID!");
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
        response.end(JSON.stringify({ status: 'success' }));

    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
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
    const collectionName = "log";
    try {
        // database connection
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);

        // finding the user and its received friends requests
        const user = await collection.findOne({token: requestFrom});
        if(user === null)
            throw new TypeError("No user with this ID!");
        let userFriendRequests = user.requestReceived;

        // answer the data
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify(userFriendRequests));

    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
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

async function  acceptFriendRequest(response, requestFrom, friendToAccept) {
    const collectionName = "log";
    try {
        // database connection
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);

        // finding the user and the friend
        const user = await collection.findOne({token: requestFrom});
        if(user === null)
            throw new TypeError("No user with this ID!");
        const friend = await collection.findOne({username: friendToAccept});

        // adding each other as friend
        let userFriendList = user.friends;
        let friendFriendList = friend.friends;
        userFriendList.push(friend.username);
        friendFriendList.push(user.username);

        // update database
        await collection.updateOne({token: requestFrom}, {$set: {friends: userFriendList}});
        await collection.updateOne({username: friendToAccept}, {$set: {friends: friendFriendList}});

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
        await collection.updateOne({username: friendToAccept}, {$set: {requestSent: friendRequestSent}});

        // response
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ status: 'success' }));

    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
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
async function  declineFriendRequest(response, requestFrom, friendToDecline) {
    const collectionName = "log";
    try {
        // database connection
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);

        // finding the user and the friend
        const user = await collection.findOne({token: requestFrom});
        if(user === null)
            throw new TypeError("No user with this ID!");
        const friend = await collection.findOne({username: friendToDecline});

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
        await collection.updateOne({username: friendToDecline}, {$set: {requestSent: friendRequestSent}});

        // response
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ status: 'success' }));

    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
    } finally {
        await client.close();
    }
}

async function createGame(response, body) {
    await client.connect();
    const db = client.db("connect4");

    const collection = db.collection("log");
    console.log(body);
    const item = await collection.findOne({token: body.userToken});
    if (item === null)
        throw new TypeError("No user with this ID!");
    console.log("THIS IS ITEM");
    console.log(item);
    const tab = {
        gameType: body.gameType,
        name: body.name,
        tab: body.tab,
        userID: item._id
    };
    console.log("THIS IS TAB:")
    console.log(tab);
    await createInDataBase(response, tab, "games", tab);
}

async function findAllGames(response, body) {
    await client.connect();
    const db = client.db("connect4");

    const collection = db.collection("log");
    console.log(body);
    console.log(body.token);
    const item = await collection.findOne({token: body.token});

    console.log(item);

    if (item === null)
        throw new TypeError("No user with this ID!");

    await findEverythingInDataBase(response, {userID: item._id}, "games");
}

async function retrieveGames(response, body) {
    try {
        console.log("retrieveGameWithId")
        await client.connect();
        console.log(body);
        console.log('Connected to MongoDB');
        const db = client.db("connect4");

        const collection = db.collection("log");
        const item = await collection.findOne({token: body.token});
        console.log("THE TOKEN: " + body.token);
        console.log("THE ITEM: " + item.toString());
        response.end(JSON.stringify({userReel: item != null}));
    } catch (err) {
        console.error('Failed to create database or user', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
    } finally {
        await client.close();
    }
}

async function retrieveGamesWithId(response, body) {
    try {
        console.log("retrieveGameWithId")
        await client.connect();
        console.log(body);
        console.log('Connected to MongoDB');
        const db = client.db("connect4");

        const gameCollection = db.collection("games");

        const collection = db.collection("log");
        const item = await collection.findOne({token: body.token});
        if (item === null)
            throw new TypeError("No user with this ID!");
        let games = (await gameCollection.find({userID: item._id}).toArray());
        games = games.filter(game => game._id.toString() === body.id);
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify(games[0]));
    } catch (e) {
        console.error('Failed to create database or user', e);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
    } finally {
        await client.close();
    }
}

async function deleteAllGames(response, body) {
    try {
        console.log("deleteOneGame")
        await client.connect();
        console.log(body);
        console.log('Connected to MongoDB');
        const db = client.db("connect4");
        const gameCollection = db.collection("games");


        const collection = db.collection("log");
        const item = await collection.findOne({token: body.token});
        if (item === null)
            throw new TypeError("No user with this ID!");

        console.log("bodyParsed.token: ", body.token);
        const result = await gameCollection.deleteMany({userID: item._id});
        console.log("Document deleted", result.deletedCount);
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'success'}));
    } catch (err) {
        console.error('Failed to delete the game', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
    } finally {
        await client.close();
    }
}

/**
 * This function retrieves the user from the database
 * @param token the token of the user
 * @returns {Promise<Document & {_id: InferIdType<Document>}>}
 */
async function retrieveUserFromDataBase(token){
    await client.connect();
    const db = client.db("connect4");
    const gameCollection = db.collection("games");

    const collection = db.collection("log");
    const item = await collection.findOne({token:token});
    return item;
}

/**
 * This function retrieves the user from the database by name
 * @param name the name of the user
 * @returns {Promise<Document & {_id: InferIdType<Document>}>}
 */
async function retrieveUserFromDataBaseByName(name){
    await client.connect();
    const db = client.db("connect4");
    const collection = db.collection("log");
    let user = await collection.findOne({username: name});
    return user;
}

/**
 * This function add a message to the database between two users
 * @param from the user who sent the message
 * @param to the user who received the message
 * @param message the message
 * @param heReads if the user has read the message
 * @returns {Promise<InsertOneResult<Document>>}
 */
async function saveMessageToDataBase(from,to,message,heReads){
    await client.connect();
    const db = client.db("connect4");
    const chatCollection = db.collection("chat");
    const item = await chatCollection.insertOne({from:from,to:to,message:message,heReads:heReads});
    return item;
}

/**
 * this function load all the messages to a user
 * @param to the user who received the message
 * @returns {Promise<WithId<Document>[]>}
 */
async function loadAllMessagePending(to){
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db("connect4");
    const chatCollection = db.collection("chat");
    const item = await chatCollection.find({to:to,heReads:false}).toArray();
    return item;
}

/**
 * load all the messages from a user to another
 * @param from the user who sent the message
 * @param to the user who received the message
 * @returns {Promise<WithId<Document>[]>}
 */
async function loadAllMessageFromConversation(from,to){
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db("connect4");
    const chatCollection = db.collection("chat");
    console.log("updating: from "+from+" to "+to);
    await chatCollection.updateMany({from:from,to: to}, {$set: {heReads: true}});
    if (findSocketByName(to,connectedSockets)===null)
        return [];
    findSocketByName(to,connectedSockets).emit('loadAllMessagePending', await loadAllMessagePending(to));
    const item = await chatCollection.find({ $or:[{from:from,to:to},{from:to,to:from}]}).toArray();
    return item;
}

/**
 * add a win to the user in the database if he wins
 * @param requestFrom the user who won
 * @returns {Promise<void>}
 */
async function addWins(requestFrom){
    const collectionName = "log";
    try {
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);
        const user = await collection.findOne({username: requestFrom});
        let userWins = user.wins + 1;
        await collection.updateOne({username: requestFrom}, {$set: {wins: userWins}});
    }
    catch (err) {
        console.error('Token not found', err);

    }
    finally {
        await client.close();
    }
}

/**
 * add a loss to the user in the database if he loses
 * @param requestFrom the user who lost
 * @returns {Promise<void>}
 */
async function addLosses(requestFrom){
    const collectionName = "log";
    try {
        console.log("ONE MORE LOST");
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);
        const user = await collection.findOne({username: requestFrom});
        let userLosses = user.losses + 1;
        await collection.updateOne({username: requestFrom}, {$set: {losses: userLosses}});
    }
    catch (err) {
        console.error('Token not found', err);

    }
    finally {
        await client.close();
    }
}

/**
 * add a draw to the user in the database if he draws
 * @param requestFrom
 * @returns {Promise<void>}
 */
async function addDraws(requestFrom){
    const collectionName = "log";
    try {
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);
        const user = await collection.findOne({username: requestFrom});
        let userDraws = user.draws + 1;
        await collection.updateOne({username: requestFrom}, {$set: {draws: userDraws}});
    }
    catch (err) {
        console.error('Token not found', err);
    }
    finally {
        await client.close();
    }
}

/**
 * update the elo of the user in the database after a game
 * @param requestFrom
 * @param elo the new elo
 * @returns {Promise<void>}
 */
async function addElo(requestFrom, elo){
    const collectionName = "log";
    try {
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);
        await collection.updateOne({username: requestFrom}, {$set: {elo: elo}});
    }
    catch (err) {
        console.error('Token not found', err);

    }
    finally {
        await client.close();
    }
}

async function updateSetToRead(request) {
    await client.connect();
    const db = client.db("connect4");
    const chatCollection = db.collection("chat");
    return await chatCollection.updateOne({
        _id: new ObjectID(request.item.insertedId),
        to: to.username
    }, {$set: {heReads: true}});
}

// here we export all the functions to be used in other files
exports.findInDataBase = loginInDataBase;
exports.createInDataBase = createInDataBase;
exports.findEverythingInDataBase = findEverythingInDataBase;

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

exports.retrieveUserFromDataBase = retrieveUserFromDataBase;
exports.retrieveUserFromDataBaseByName = retrieveUserFromDataBaseByName;
exports.saveMessageToDataBase = saveMessageToDataBase;
exports.loadAllMessagePending = loadAllMessagePending;
exports.loadAllMessageFromConversation = loadAllMessageFromConversation;
exports.addWins = addWins;
exports.addLosses = addLosses;
exports.addDraws = addDraws;
exports.addElo = addElo;

exports.updateSetToRead = updateSetToRead;
