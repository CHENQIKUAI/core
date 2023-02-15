/* eslint-disable no-restricted-globals */
const {
  ReactiveEffect,
  setActiveEffect,
  getActiveEffect,
  getReactiveMap
} = require('./reactive')

function track() {}

function trigger() {}

class ComputedRefImpl {
  __value__ = null
  __getter = null
  __is_ref__ = true

  constructor(getter) {
    this.__getter = getter
    const __scheduler = () => {
      const newV = this.__getter()
      const oldV = this.__value__

      if (newV !== oldV) {
        // 有改变，如何通知watch呢
        this.__value__ = newV
        const reactiveMap = getReactiveMap()
        const dataMap = reactiveMap.get(this)
        if (dataMap) {
          const deps = dataMap.get('__ref__')
          deps &&
            deps.length !== 0 &&
            deps.forEach(dep => dep && dep.scheduler && dep.scheduler())
        }
      }
    }
    const reactiveEffect = new ReactiveEffect(this.__getter, __scheduler)
    const value = reactiveEffect.run()
    this.__value__ = value
  }

  scheduler() {}

  get value() {
    const reactiveMap = getReactiveMap()
    if (!reactiveMap.has(this)) {
      const dataMap = new Map()
      dataMap.set('__ref__', [getActiveEffect()])
      reactiveMap.set(this, dataMap)
    } else {
      const dataMap = reactiveMap.get(this)
      const deps = dataMap.get('__ref__')
      if (!deps) {
        dataMap.set('__ref__', [getActiveEffect()])
      }
    }
    return this.__value__
  }
}

function computed(getter) {
  return new ComputedRefImpl(getter)
}

// eslint-disable-next-line no-restricted-globals
module.exports = {
  computed
}
