'use strict'

const assert = require('assert');
const Mongodb = require('..')
const url = 'mongodb://localhost:27017'
const dbName = 'pick'
const dbNameTest = 'test'

describe('mongodb connect', () => {
  it('connect', function(done) {
    const client = new Mongodb(url, dbName)
    client.connect().then(({ db, client }) => {
      assert(db, true)
      assert(client, true)
      client.close()
      done()
    })
  }).timeout(2000)

  it('insert data', function(done) {
    const client = new Mongodb(url, dbNameTest)
    client.insert('test', [{ a: 1 }]).then(result => {
      assert(result.result.ok, 1)
      done()
    })
  }).timeout(2000)

  it('query data', function(done) {
    const client = new Mongodb(url, dbNameTest)
    client.query('test').then(result => {
      assert(result.length > 0, true)
      done()
    })
  }).timeout(2000)
})
