'use strict'

const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const fse = require('fs-extra')
const Git = require('@pick-star/cli-git')
const logger = require('@pick-star/cli-log')
const { inquirer, createInquirerChoices, isObject, spinner, openDefaultBrowser, request } = require('@pick-star/cli-utils')
const URL_GET_COURSE = 'pick/course/get'
const URL_GET_CHAPTER = 'pick/chapter/get'
const URL_GET_RESOURCE = 'pick/resource/get'

async function pull(courseId, chapterId, { resourceId, autoCover } = {}) {
  logger.verbose('', courseId, chapterId)
  if (!courseId) {
    // 如果课程id不存在，则需要选择课程
    // const course = await mongodb.query('course')
    const course = await request(`${URL_GET_COURSE}`)
    if (course) {
      const choices = createInquirerChoices(course)
      courseId = await inquirer({
        choices,
        defaultValue: choices[0],
        message: '请选择课程'
      })
      logger.verbose('', courseId)
    } else {
      logger.error('', '网络异常')
      return;
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
    // const chapterList = await mongodb.query('chapter')
    const chapterList = await request(`${URL_GET_CHAPTER}`)
    if (chapterList && chapterList[courseId]) {
      logger.verbose('', chapterList[courseId])
      mainChapter = chapterList[courseId]
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
    // const chapterList = await mongodb.query('chapter')
    const chapterList = await request(`${URL_GET_CHAPTER}`)
    if (chapterList && chapterList[courseId]) {
      mainChapter = chapterList[courseId]
    } else {
      logger.error('MISS CHAPTER', `course ${chalk.red(courseId)} doesn't contain any chapter!`)
    }
  }
  if (!subChapterId) {
    // const subChapterList = await mongodb.query('resource')
    const subChapterList = await request(`${URL_GET_RESOURCE}`)
    if (subChapterList && subChapterList[courseId] &&
      subChapterList[courseId][mainChapterId]) {
      subChapter = subChapterList[courseId][mainChapterId]
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
    // const subChapterList = await mongodb.query('resource')
    const subChapterList = await request(`${URL_GET_RESOURCE}`)
    if (subChapterList && subChapterList[courseId] &&
      subChapterList[courseId][mainChapterId]) {
      subChapter = subChapterList[courseId][mainChapterId]
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
    if (!resourceId) {
      resourceId = await inquirer({
        choices: resource,
        defaultValue: resource[0].value,
        message: '请选择需要下载的资源'
      })
    }
    logger.verbose('', resourceId)
    if (+resourceId > 0) {
      const prepareDownloadResource = resource.find(item => +item.value === +resourceId)
      logger.verbose('', prepareDownloadResource)
      await downloadResource(courseId, mainChapterId, subChapterId, prepareDownloadResource, { autoCover })
    } else {
      logger.error('ERROR RESOURCE', `resource not found!`)
      return
    }
  }
}

async function downloadResource(courseId, mainChapterId, subChapterId, prepareDownloadResource, { autoCover }) {
  if (isObject(prepareDownloadResource)) {
    if (prepareDownloadResource.type === 'git') {
      await gitResourceDownload(courseId, mainChapterId, subChapterId, prepareDownloadResource, { autoCover })
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

async function gitResourceDownload(courseId, mainChapterId, subChapterId, prepareDownloadResource, { autoCover }) {
  const resourcePath = `imooc/${courseId}/第${mainChapterId}章/第${subChapterId}节`
  const targetPath = path.resolve(resourcePath, prepareDownloadResource.repository)
  if (fs.existsSync(targetPath)) {
    let cover
    if (!autoCover) {
      cover = await inquirer({
        type: 'confirm',
        defaultValue: false,
        message: '代码已存在，是否覆盖？'
      })
    } else {
      cover = true
    }
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
          `dev${prepareDownloadResource.tag}`,
          prepareDownloadResource.tag
        ])
        spinnerStart.stop(true)
        logger.success('', '下载成功')
        logger.success('', `代码地址：${targetPath}`)
        logger.success('', `代码分支：dev${prepareDownloadResource.tag}`)
      }
    }
    spinnerStart.stop(true)
  } catch (e) {
    spinnerStart.stop(true)
  }
}

module.exports = { pull }
