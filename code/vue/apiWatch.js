/* eslint-disable no-restricted-globals */
const { ReactiveEffect, getActiveEffect } = require('./reactive')
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
    } else if (source.__is_ref__) {
      return source.value
    }
  }
  let newValue, oldValue
  function job() {
    if (newValue !== oldValue) {
      oldValue = newValue
      cb(newValue, oldValue)
    }
  }
  job.allowRecurse = true
  const scheduler = (newV, oldV) => {
    newValue = newV
    queueJob(job)
  }
  const reactiveEffect = new ReactiveEffect(getter, scheduler)

  oldValue = reactiveEffect.run()
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
