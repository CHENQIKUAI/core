import { TrackOpTypes, TriggerOpTypes } from './operations'
import { extend, isArray, isIntegerKey, isMap, toNumber } from '@vue/shared'
import { EffectScope, recordEffectScope } from './effectScope'
import {
  createDep,
  Dep,
  finalizeDepMarkers,
  initDepMarkers,
  newTracked,
  wasTracked
} from './dep'
import { ComputedRefImpl } from './computed'

// The main WeakMap that stores {target -> key -> dep} connections.
// Conceptually, it's easier to think of a dependency as a Dep class
// which maintains a Set of subscribers, but we simply store them as
// raw Sets to reduce memory overhead.
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()

// The number of effects currently being tracked recursively.
let effectTrackDepth = 0 // effect被递归地追踪的数量

export let trackOpBit = 1 // 追踪Op比特

/**
 * The bitwise track markers support at most 30 levels of recursion.
 * This value is chosen to enable modern JS engines to use a SMI on all platforms.
 * When recursion depth is greater, fall back to using a full cleanup.
 */
// full cleanup是什么？ SMI是什么？
const maxMarkerBits = 30
// V8引擎位2^32-2内的运算性能比这个范围之外的更好

export type EffectScheduler = (...args: any[]) => any

export type DebuggerEvent = {
  effect: ReactiveEffect
} & DebuggerEventExtraInfo

export type DebuggerEventExtraInfo = {
  target: object
  type: TrackOpTypes | TriggerOpTypes
  key: any
  newValue?: any
  oldValue?: any
  oldTarget?: Map<any, any> | Set<any>
}

export let activeEffect: ReactiveEffect | undefined // activeEffect 保存当前激活的effect。在effect函数调用时，会被设置成一个effect。

export const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')
export const MAP_KEY_ITERATE_KEY = Symbol(__DEV__ ? 'Map key iterate' : '')

// 副作用函数
export class ReactiveEffect<T = any> {
  active = true // 激活状态
  deps: Dep[] = []  // 依赖数组
  parent: ReactiveEffect | undefined = undefined // 父?

  /**
   * Can be attached after creation
   * @internal
   */
  computed?: ComputedRefImpl<T> // 被计算
  /**
   * @internal
   */
  allowRecurse?: boolean // 允许递归?
  /**
   * @internal
   */
  private deferStop?: boolean // 延迟停止

  onStop?: () => void // 停止?
  // dev only
  onTrack?: (event: DebuggerEvent) => void // 追踪?
  // dev only
  onTrigger?: (event: DebuggerEvent) => void // 触发?

  constructor(
    public fn: () => T, // 一个函数
    public scheduler: EffectScheduler | null = null, // effect计时器
    scope?: EffectScope // effect范围?
  ) {
    recordEffectScope(this, scope) // 记录effect范围?
  }

  run() {
    if (!this.active) { // 若非激活
      return this.fn() // 执行fn
    }
    let parent: ReactiveEffect | undefined = activeEffect
    let lastShouldTrack = shouldTrack
    while (parent) { // 顺着activeEffect向上查找祖宗, 直到找到自己
      if (parent === this) {
        return
      }
      parent = parent.parent
    }
    try {
      this.parent = activeEffect // 保存激活effect到parent
      activeEffect = this // 更新激活effect为当前实例对象
      shouldTrack = true // ?

      trackOpBit = 1 << ++effectTrackDepth

      if (effectTrackDepth <= maxMarkerBits) { // 若effects被递归追踪的数量 不大于 maxMarkerBits
        initDepMarkers(this) // 对deps中的元素的w属性做修改。所deps集合中存在值dep，则给他们w属性上做标记。意在表示他们是之前已经被track的。
      } else {
        cleanupEffect(this) // deps中的dep是一个set，set中删除当前effect 然后清空deps
      }
      return this.fn()
    } finally {
      if (effectTrackDepth <= maxMarkerBits) {
        finalizeDepMarkers(this) // 删除曾经被track，但是本次没有被track的effect。消除initDepMarkers对trackOpBit对n和w的修改。
      }

      trackOpBit = 1 << --effectTrackDepth

      activeEffect = this.parent
      shouldTrack = lastShouldTrack
      this.parent = undefined

      if (this.deferStop) {
        this.stop()
      }
    }
  }

  stop() {
    // stopped while running itself - defer the cleanup
    if (activeEffect === this) {
      this.deferStop = true
    } else if (this.active) {
      cleanupEffect(this)
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}

function cleanupEffect(effect: ReactiveEffect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}

export interface DebuggerOptions {
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}

export interface ReactiveEffectOptions extends DebuggerOptions {
  lazy?: boolean
  scheduler?: EffectScheduler
  scope?: EffectScope
  allowRecurse?: boolean
  onStop?: () => void
}

export interface ReactiveEffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
}

export function effect<T = any>(
  fn: () => T,
  options?: ReactiveEffectOptions
): ReactiveEffectRunner {
  if ((fn as ReactiveEffectRunner).effect) {
    fn = (fn as ReactiveEffectRunner).effect.fn
  }

  const _effect = new ReactiveEffect(fn)
  if (options) {
    extend(_effect, options)
    if (options.scope) recordEffectScope(_effect, options.scope)
  }
  if (!options || !options.lazy) {
    _effect.run()
  }
  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner
  runner.effect = _effect
  return runner
}

export function stop(runner: ReactiveEffectRunner) {
  runner.effect.stop()
}

export let shouldTrack = true
const trackStack: boolean[] = []

export function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

export function enableTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = true
}

export function resetTracking() {
  const last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}

// 收集依赖
// 因此每次执行 track 函数，就是把当前激活的副作用函数 activeEffect 作为依赖，然后收集到 target 相关的 depsMap 对应 key 下的依赖集合 dep 中
export function track(target: object, type: TrackOpTypes, key: unknown) {
  if (shouldTrack && activeEffect) {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
      depsMap.set(key, (dep = createDep()))
    }

    const eventInfo = __DEV__
      ? { effect: activeEffect, target, type, key }
      : undefined

    trackEffects(dep, eventInfo)
  }
}

export function trackEffects(
  dep: Dep,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  let shouldTrack = false
  if (effectTrackDepth <= maxMarkerBits) {
    if (!newTracked(dep)) {
      dep.n |= trackOpBit // set newly tracked
      shouldTrack = !wasTracked(dep)
    }
  } else {
    // Full cleanup mode.
    shouldTrack = !dep.has(activeEffect!)
  }

  if (shouldTrack) {
    // 收集当前激活的 effect 作为依赖
    // console.log(activeEffect, 'show activeEffect');
    
    dep.add(activeEffect!)
    // 当前激活的 effect 收集 dep 集合作为依赖
    activeEffect!.deps.push(dep)
    if (__DEV__ && activeEffect!.onTrack) {
      activeEffect!.onTrack({
        effect: activeEffect!,
        ...debuggerEventExtraInfo!
      })
    }
  }
}

// 派发通知
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // never been tracked
    return
  }

  let deps: (Dep | undefined)[] = []
  if (type === TriggerOpTypes.CLEAR) {
    // collection being cleared
    // trigger all effects for target
    deps = [...depsMap.values()]
  } else if (key === 'length' && isArray(target)) {
    const newLength = toNumber(newValue)
    depsMap.forEach((dep, key) => {
      if (key === 'length' || key >= newLength) {
        deps.push(dep)
      }
    })
  } else {
    // schedule runs for SET | ADD | DELETE
    if (key !== void 0) {
      deps.push(depsMap.get(key))
    }

    // also run for iteration key on ADD | DELETE | Map.SET
    switch (type) {
      case TriggerOpTypes.ADD:
        if (!isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY))
          if (isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
          }
        } else if (isIntegerKey(key)) {
          // new index added to array -> length changes
          deps.push(depsMap.get('length'))
        }
        break
      case TriggerOpTypes.DELETE:
        if (!isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY))
          if (isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
          }
        }
        break
      case TriggerOpTypes.SET:
        if (isMap(target)) {
          deps.push(depsMap.get(ITERATE_KEY))
        }
        break
    }
  }

  const eventInfo = __DEV__
    ? { target, type, key, newValue, oldValue, oldTarget }
    : undefined

  if (deps.length === 1) {
    if (deps[0]) {
      if (__DEV__) {
        triggerEffects(deps[0], eventInfo)
      } else {
        triggerEffects(deps[0])
      }
    }
  } else {
    const effects: ReactiveEffect[] = []
    for (const dep of deps) {
      if (dep) {
        effects.push(...dep)
      }
    }
    if (__DEV__) {
      triggerEffects(createDep(effects), eventInfo)
    } else {
      triggerEffects(createDep(effects))
    }
  }
}

export function triggerEffects(
  dep: Dep | ReactiveEffect[],
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  // spread into array for stabilization
  const effects = isArray(dep) ? dep : [...dep]
  for (const effect of effects) {
    if (effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo)
    }
  }
  for (const effect of effects) {
    if (!effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo)
    }
  }
}

function triggerEffect(
  effect: ReactiveEffect,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  if (effect !== activeEffect || effect.allowRecurse) {
    if (__DEV__ && effect.onTrigger) {
      effect.onTrigger(extend({ effect }, debuggerEventExtraInfo))
    }
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}


/**
 * Vue3数据双向绑定的原理
 * 
 * track收集依赖，收集激活的effect到targetMap中对应对象的某个属性的effect集合中。
 * trigger将targetMap中对应对象的某个属性的的effect集合全部执行。
 * effect函数，用传入的fn函数创建一个函数，将函数赋值给激活的effect。并且执行它。
 * 
 * reactive中，代理对象，setter，调用trigger。getter调用track。
 * 
 * 创建一个打印函数A，打印对象的某个属性attr。
 * 函数A传入effect函数。执行时，函数A被创建成函数effect A，保存到激活effect中且执行。
 * A的执行会访问属性attr，这被getter劫持，会调用track。track收集当前激活的effect，即函数effectA。
 * 
 * 当修改对象attr时，被setter劫持，调用trigger方法，会执行target对应对象的属性的effect集合中的effect函数。
 */