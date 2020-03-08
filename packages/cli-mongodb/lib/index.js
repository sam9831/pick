'use strict'

const MongoClient = require('mongodb').MongoClient
const url = 'mongodb://localhost:27017'
const dbName = 'pick'
const logger = require('@pick/cli-log')

function connect() {
  return new Promise((resolve, reject) => {
    MongoClient.connect(
      url,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true
      },
      function(err, client) {
        const db = client.db(dbName)
        resolve({ db, client })
      })
  })
}

function connectAction(docName, action) {
  return new Promise(async (resolve, reject) => {
    const { db, client } = await connect()
    const collection = db.collection(docName)
    try {
      action(collection, function(result) {
        close(client)
        logger.verbose('result', result)
        resolve(result)
      }, function(err) {
        close(client)
        logger.error(err.toString())
        reject(err)
      })
    } catch (err) {
      close(client)
      logger.error(err.toString())
      reject(err)
    }
  })
}

function query(docName) {
  return connectAction(docName, function(collection, onSuccess, onError) {
    collection.find({}, { projection: { _id: 0 } }).toArray(function(err, docs) {
      if (err) {
        onError(err)
      } else {
        onSuccess(docs)
      }
    })
  })
}

function insert(docName, data) {
  return connectAction(docName, function(collection, onSuccess, onError) {
    collection.insertMany(data, function(err, result) {
      if (err) {
        onError(err)
      } else {
        onSuccess(result)
      }
    })
  })
}

function remove(docName, data) {
  return connectAction(docName, function(collection, onSuccess, onError) {
    collection.deleteOne(data, function(err, result) {
      if (err) {
        onError(err)
      } else {
        onSuccess(result)
      }
    })
  })
}

function update(collection, data) {
}

function close(client) {
  client && client.close()
}

module.exports = {
  query,
  insert,
  update,
  remove
}
