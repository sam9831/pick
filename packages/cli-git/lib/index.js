'use strict';

const SimpleGit = require('simple-git/promise')

class Git {
  constructor(dir, remote) {
    this.repo = SimpleGit(dir)
    this.remote = remote
  }

  clone() {
    return this.repo.clone(this.remote)
  }

  tags() {
    return this.repo.tags()
  }

  checkout(tag) {
    return this.repo.checkout(tag)
  }
}

module.exports = Git;
