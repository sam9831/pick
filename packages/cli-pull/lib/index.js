'use strict'

const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const fse = require('fs-extra')
const exec = require('child_process').exec
const mongodb = require('@pick/cli-mongodb')
const Git = require('@pick/cli-git')
const logger = require('@pick/cli-log')
const { inquirer, createInquirerChoices, isObject, spinner, openDefaultBrowser } = require('@pick/cli-utils')

async function pull(courseId, chapterId) {
  logger.verbose('', courseId, chapterId)
  if (!courseId) {
    // 如果课程id不存在，则需要选择课程
    const course = await mongodb.query('course')
    if (course.length > 0) {
      const choices = createInquirerChoices(course[0])
      courseId = await inquirer({
        choices,
        defaultValue: choices[0],
        message: '请选择课程'
      })
      logger.verbose('', courseId)
    }
  }
  let mainChapterId = null
  let subChapterId = null
  let mainChapter
  let subChapter
  let resource = null
  if (chapterId) {
    const match = chapterId.match(/([0-9]+)-([0-9]+)/)
    if (match && match.length >= 3) {
      mainChapterId = +match[1]
      subChapterId = +match[2]
    }
    logger.verbose('', mainChapterId, subChapterId)
  }
  if (!mainChapterId) {
    // 如果章节id不存在，则需要选择章节
    const chapterList = await mongodb.query('chapter')
    if (chapterList.length > 0 && chapterList[0][courseId]) {
      logger.verbose('', chapterList[0][courseId])
      mainChapter = chapterList[0][courseId]
      mainChapter.forEach(item => {
        item.name = `第${item.value}章 ${item.name}`
      })
      mainChapterId = await inquirer({
        choices: mainChapter,
        defaultValue: mainChapter[0],
        message: '请选择章节'
      })
      logger.verbose('', mainChapterId)
    } else {
      logger.error('MISS CHAPTER', `course ${chalk.red(courseId)} doesn't contain any chapter!`)
      return
    }
  } else {
    const chapterList = await mongodb.query('chapter')
    if (chapterList.length > 0 && chapterList[0][courseId]) {
      mainChapter = chapterList[0][courseId]
    } else {
      logger.error('MISS CHAPTER', `course ${chalk.red(courseId)} doesn't contain any chapter!`)
    }
  }
  if (!subChapterId) {
    const subChapterList = await mongodb.query('resource')
    if (subChapterList.length > 0 && subChapterList[0][courseId] &&
      subChapterList[0][courseId][mainChapterId]) {
      subChapter = subChapterList[0][courseId][mainChapterId]
      subChapter.forEach(item => {
        item.name = `第${item.value}节 ${item.name}`
      })
      subChapterId = await inquirer({
        choices: subChapter,
        defaultValue: subChapter[0],
        message: '请选择小节'
      })
      logger.verbose('', subChapterId)
    } else {
      logger.error('MISS CHAPTER', `course ${chalk.red(courseId)} chapter ${chalk.red(mainChapterId)} doesn't contain any chapter!`)
      return
    }
  } else {
    const subChapterList = await mongodb.query('resource')
    if (subChapterList.length > 0 && subChapterList[0][courseId] &&
      subChapterList[0][courseId][mainChapterId]) {
      subChapter = subChapterList[0][courseId][mainChapterId]
    } else {
      logger.error('MISS CHAPTER', `course ${chalk.red(courseId)} chapter ${chalk.red(mainChapterId)} doesn't contain any chapter!`)
    }
  }
  if (mainChapterId && subChapterId) {
    resource = subChapter.find(item => +item.value === +subChapterId)
    if (resource) {
      resource = resource.res
      if (!resource) {
        logger.error('ERROR RESOURCE', 'resource not found!')
        return
      }
    } else {
      logger.error('ERROR RESOURCE', 'resource not found!')
      return
    }
  } else {
    logger.error('ERROR CHAPTER', `chapter is error!`)
    return
  }
  if (resource) {
    logger.verbose('', resource)
    // resource.unshift({
    //   name: '全部下载',
    //   value: '0'
    // })
    const resourceId = await inquirer({
      choices: resource,
      defaultValue: resource[0].value,
      message: '请选择需要下载的资源'
    })
    logger.verbose('', resourceId)
    if (+resourceId > 0) {
      const prepareDownloadResource = resource.find(item => +item.value === +resourceId)
      logger.verbose('', prepareDownloadResource)
      await downloadResource(courseId, mainChapterId, subChapterId, prepareDownloadResource)
    } else {
      logger.error('ERROR RESOURCE', `resource not found!`)
      return
    }
  }
}

async function downloadResource(courseId, mainChapterId, subChapterId, prepareDownloadResource) {
  if (isObject(prepareDownloadResource)) {
    if (prepareDownloadResource.type === 'git') {
      await gitResourceDownload(courseId, mainChapterId, subChapterId, prepareDownloadResource)
    } else if (prepareDownloadResource.type === 'web') {
      webResourceOpen(prepareDownloadResource)
    }
  }
}

function webResourceOpen(prepareDownloadResource) {
  if (prepareDownloadResource.url) {
    openDefaultBrowser(prepareDownloadResource.url)
  }
}

async function gitResourceDownload(courseId, mainChapterId, subChapterId, prepareDownloadResource) {
  const resourcePath = `imooc/${courseId}/第${mainChapterId}章/第${subChapterId}节`
  const targetPath = path.resolve(resourcePath, prepareDownloadResource.repository)
  if (fs.existsSync(targetPath)) {
    const cover = await inquirer({
      type: 'confirm',
      defaultValue: false,
      message: '代码已存在，是否覆盖？'
    })
    if (cover) {
      fse.removeSync(targetPath)
    } else {
      return
    }
  } else {
    fse.mkdirpSync(resourcePath) // 创建文件夹
  }
  let spinnerStart = spinner('git clone')
  try {
    let git = new Git(resourcePath, prepareDownloadResource.url)
    await git.clone() // 下载 git 仓库
    git = new Git(targetPath, prepareDownloadResource.url)
    const tags = await git.tags() // 获取 tag 列表
    if (tags.all && prepareDownloadResource.tag) {
      if (tags.all.indexOf(prepareDownloadResource.tag) >= 0) {
        // 创建新分支并切换 tag
        await git.checkout([
          '-b',
          `branch${prepareDownloadResource.tag}`,
          prepareDownloadResource.tag
        ])
      }
    }
    spinnerStart.stop(true)
  } catch (e) {
    spinnerStart.stop(true)
  }
}

async function update() {
  logger.notice('', 'start updating...')
  // resource 数据
  const resData = require('../data/resource')
  await updateData('resource', resData)
  // chapter 数据
  const chapterData = require('../data/chapter')
  await updateData('chapter', chapterData)
  logger.success('', 'update successfully!')
}

async function updateData(docName, data) {
  const dbData = await mongodb.query(docName)
  if (dbData.length > 0) {
    for (let i = 0; i < dbData.length; i++) {
      await mongodb.remove(docName, dbData[i])
    }
  }
  await mongodb.insert(docName, data)
}

module.exports = { pull, update }
