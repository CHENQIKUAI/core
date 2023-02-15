/* eslint-disable no-restricted-globals */
const { ReactiveEffect } = require('./reactive')
const { queueJob } = require('./scheduler')

const watch = (source, cb) => {
  const getter = () => {
    if (Array.isArray(source)) {
      source.map(i => i)
    } else if (typeof source === 'function') {
      return source()
    } else if (source.__reactive__) {
      traverse(source)
      return source
    }
  }
  const job = () => {
    cb()
  }
  job.allowRecurse = true
  const scheduler = () => {
    queueJob(job)
  }
  const reactiveEffect = new ReactiveEffect(getter, scheduler)

  reactiveEffect.run()
}

function traverse(source) {
  const isObj = value =>
    Object.prototype.toString.call(value) === Object.prototype.toString.call({})
  if (isObj(source)) {
    for (let v in source) {
      traverse(v)
    }
  }
}

module.exports = {
  watch
}
