
const { MongoClient } = require('mongodb');
const url = "mongodb://localhost:27017/";

try {
    (async() =>  {
        const mongoConnection = await MongoClient.connect(url, {useUnifiedTopology: true});
        const db = mongoConnection.db("test");
        await db.collection("users").insertOne({name : 1234});
    })();
    } catch(err) {
        console.log(err);
}

module.exports = MongoClient;