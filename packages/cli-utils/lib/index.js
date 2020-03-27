'use strict';

const inquirer = require('./inquirer')
const Spinner = require('cli-spinner').Spinner
const urllib = require('urllib')
const URL_PREFIX = 'http://book.youbaobao.xyz:7001'

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

async function request(url) {
  try {
    if (url.indexOf('http') < 0 || url.indexOf('https') < 0) {
      if (url.startsWith('/')) {
        url = `${URL_PREFIX}${url}`
      } else {
        url = `${URL_PREFIX}/${url}`
      }
    }
    const response = await urllib.request(url)
    if (response && response.status === 200) {
      if (response.data) {
        return JSON.parse(response.data.toString())
      }
    }
  } catch (e) {
    //
  }
  return null
}

module.exports = {
  isObject,
  inquirer,
  createInquirerChoices,
  spinner,
  openDefaultBrowser,
  request
}
