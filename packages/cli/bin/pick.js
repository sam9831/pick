#!/usr/bin/env node

const program = require('commander')
const packageConfig = require('../package')

function check() {
  console.log(packageConfig.version)
}

function env() {
  const argv = process.argv
  if (argv.indexOf('--debug') > 0) {
    process.env.LOG_LEVEL = 'verbose'
  } else {
    process.env.LOG_LEVEL = 'info'
  }
}

function register() {
  program.version(packageConfig.version).usage('<command> [options]')

  program
    .command('pull [id] [chapter]')
    .description('下载课程资源')
    .action(async (id, chapter) => {
      try {
        require('@pick-star/cli-pull').pull(id, chapter)
      } catch (e) {
        console.error(e)
      }
    })

  // program
  //   .command('update')
  //   .description('更新课程资源')
  //   .action(async () => {
  //     try {
  //       require('@pick-star/cli-pull').update()
  //     } catch (e) {
  //       console.error(e)
  //     }
  //   })

  program
    .option('--debug', '打开调试模式')
    .parse(process.argv)

  if (process.argv.length < 3) {
    program.outputHelp()
    console.log()
  }
}

(async function() {
  env()
  check()
  register()
})()

