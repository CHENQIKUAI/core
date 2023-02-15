/* eslint-disable no-restricted-globals */
// eslint-disable-next-line no-restricted-globals
const { queueJob } = require('./scheduler')
let activeEffect = null

class ReactiveEffect {
  constructor(fn, scheduler) {
    this.fn = fn
    this.scheduler = scheduler
  }
  run() {
    try {
      activeEffect = this
      return this.fn()
    } finally {
      activeEffect = null
    }
  }
}

const reactiveMap = new WeakMap()

function reactive(data) {
  data.__reactive__ = true
  return new Proxy(data, {
    get(target, p, receiver) {
      if (p === '__reactive__') {
        return data[p]
      }
      if (!reactiveMap.has(data)) {
        const dataMap = new Map()
        dataMap.set(p, [activeEffect])
        reactiveMap.set(data, dataMap)
      } else {
        const dataMap = reactiveMap.get(data)
        const deps = dataMap.get(p)
        if (!deps) {
          dataMap.set(p, [activeEffect])
        }
      }
      return data[p]
    },
    set(target, p, newValue) {
      const oldValue = data[p]
      data[p] = newValue
      if (oldValue !== newValue) {
        const dataMap = reactiveMap.get(data)
        if (dataMap) {
          const deps = dataMap.get(p)
          if (deps) deps.forEach(i => i && i.scheduler && i.scheduler())
          else {
            const deps = dataMap.get('__iterator__')
            deps.forEach(i => i && i.scheduler && i.scheduler())
          }
        }
      }
    },
    ownKeys(target) {
      const isObj = value =>
        Object.prototype.toString.call(value) ===
        Object.prototype.toString.call({})
      if (isObj(target)) {
        const dataMap = reactiveMap.get(target)
        if (!dataMap) {
          const dataMap = new Map()
          reactiveMap.set(target, dataMap)
          dataMap.set('__iterator__', [activeEffect])
        } else {
          dataMap.set('__iterator__', [activeEffect])
        }
      } else if (Array.isArray(target)) {
      }
      return Reflect.ownKeys(target)
    }
  })
}

module.exports = {
  ReactiveEffect,
  reactive
}
