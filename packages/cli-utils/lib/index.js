'use strict';

const inquirer = require('./inquirer')
const Spinner = require('cli-spinner').Spinner

function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]'
}

function createInquirerChoices(o) {
  const res = []
  if (isObject(o)) {
    Object.keys(o).forEach(key => {
      res.push({
        value: key,
        name: o[key]
      })
    })
  }
  return res;
}

function spinner(msg, spinnerString = '|/-\\') {
  const spinner = new Spinner(`${msg}.. %s`)
  spinner.setSpinnerString(spinnerString)
  spinner.start()
  return spinner
}

function openDefaultBrowser(url) {
  const exec = require('child_process').exec;
  switch (process.platform) {
    case "darwin":
      exec('open ' + url);
      break;
    case "win32":
      exec('start ' + url);
      break;
    default:
      exec('xdg-open', [url]);
  }
}

module.exports = {
  isObject,
  inquirer,
  createInquirerChoices,
  spinner,
  openDefaultBrowser
}
