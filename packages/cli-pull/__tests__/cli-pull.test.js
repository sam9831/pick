'use strict'

const { pull } = require('../lib')
const assert = require('assert')
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')

describe('@pick/cli-pull', () => {
  const rootDir = process.cwd()
  const imoocDir = path.resolve(rootDir, 'imooc')
  describe('pull 401 3-1', () => {
    it('should download source code 3-1 in imooc', function(done) {
      pull('401', '3-1', { resourceId: 1, autoCover: true }).then(() => {
        const dir3131 = path.resolve(rootDir, `imooc/401/第3章/第1节/admin-example/src/3-1`)
        const dir3132 = path.resolve(rootDir, `imooc/401/第3章/第1节/admin-example/src/3-2`)
        assert.equal(fs.existsSync(dir3131), true)
        assert.equal(fs.existsSync(dir3132), false)
        fse.removeSync(imoocDir)
        done()
      })
    })
  })
  describe('pull 401 3-2', () => {
    it('should download source code 3-2 in imooc', function(done) {
      pull('401', '3-2', { resourceId: 1, autoCover: true }).then(() => {
        const dir3231 = path.resolve(rootDir, `imooc/401/第3章/第2节/admin-example/src/3-1`)
        const dir3232 = path.resolve(rootDir, `imooc/401/第3章/第2节/admin-example/src/3-2`)
        assert.equal(fs.existsSync(dir3231), true)
        assert.equal(fs.existsSync(dir3232), true)
        fse.removeSync(imoocDir)
        done()
      })
    })
  })
})
