/* eslint-disable no-restricted-globals */
// eslint-disable-next-line no-restricted-globals
const { ReactiveEffect } = require('./reactive')
const { queueJob } = require('./scheduler')

const watch = (source, cb) => {
  const getter = () => {
    if (Array.isArray(source)) {
      source.map(i => i)
    } else if (typeof source === 'function') {
      return source()
    } else if (source.__reactive__) {
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

// eslint-disable-next-line no-restricted-globals
module.exports = {
  watch
}
