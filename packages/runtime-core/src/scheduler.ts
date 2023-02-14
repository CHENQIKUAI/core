import { ErrorCodes, callWithErrorHandling } from './errorHandling'
import { isArray, NOOP } from '@vue/shared'
import { ComponentInternalInstance, getComponentName } from './component'
import { warn } from './warning'

export interface SchedulerJob extends Function {
  id?: number
  pre?: boolean
  active?: boolean
  computed?: boolean
  /**
   * Indicates whether the effect is allowed to recursively trigger itself
   * when managed by the scheduler.
   * 表示当被scheduler管理时, effect是否被允许去触发自己
   *
   * By default, a job cannot trigger itself because some built-in method calls,
   * job不能触发自己，因为一些内置方法调用。
   *
   * e.g. Array.prototype.push actually performs reads as well (#1740) which
   * can lead to confusing infinite loops.
   * 例如，Array.prototype.push实际上也指定读取, 这会导致令人困惑的无线循环.
   *
   * The allowed cases are component update functions and watch callbacks.
   * 被允许的cases是组件更新和watch回调.
   *
   * Component update functions may update child component props, which in turn
   * trigger flush: "pre" watch callbacks that mutates state that the parent
   * relies on (#1801). Watch callbacks doesn't track its dependencies so if it
   * triggers itself again, it's likely intentional and it is the user's
   * responsibility to perform recursive state mutation that eventually
   * stabilizes (#1727).
   * 组件更新方法, 可能更新子组件props, 依次触发刷新: pre watch 回调 更改parent依赖的状态.
   * watch 回调, 不追踪它的依赖, 所以如果它再次触发了自己, 这更可能是故意的, 并且它是用户的责任去让state的改变最终稳定下来.
   */
  allowRecurse?: boolean
  /**
   * Attached by renderer.ts when setting up a component's render effect
   * Used to obtain component information when reporting max recursive updates.
   * dev only.
   * 当设置组件的render effect
   * 当报告最大递归更新时用来包含组件信息.
   * 只在开发环境
   */
  ownerInstance?: ComponentInternalInstance
}

export type SchedulerJobs = SchedulerJob | SchedulerJob[]

let isFlushing = false // 刷新
let isFlushPending = false // 刷新待定

const queue: SchedulerJob[] = [] // 队列
let flushIndex = 0 // 刷新索引

// cbs是callbacks
const pendingPostFlushCbs: SchedulerJob[] = [] // 当设置watch effect的flush为post的时候就会调用queuePostFlushCb函数，将副作用函数push至pendingPostFlushCbs
let activePostFlushCbs: SchedulerJob[] | null = null //
let postFlushIndex = 0

const resolvedPromise = /*#__PURE__*/ Promise.resolve() as Promise<any>
let currentFlushPromise: Promise<void> | null = null

const RECURSION_LIMIT = 100 // 递归限制？
type CountMap = Map<SchedulerJob, number> // SchedulerJob计数

export function nextTick<T = void>(
  this: T,
  fn?: (this: T) => void
): Promise<void> {
  const p = currentFlushPromise || resolvedPromise
  // 等待promise的状态变成fullfilled时，执行fn（如果有的话）,没有的话, 就返回promise
  return fn ? p.then(this ? fn.bind(this) : fn) : p
}

// #2768
// Use binary-search to find a suitable position in the queue,
// so that the queue maintains the increasing order of job's id,
// which can prevent the job from being skipped and also can avoid repeated patching.
// 用二分法在队列中查找合适的位置
// 队列包含任务递增的id
// 这可防止任务被略过, 也可防止重复patching
function findInsertionIndex(id: number) {
  // the start index should be `flushIndex + 1`
  let start = flushIndex + 1
  let end = queue.length

  while (start < end) {
    const middle = (start + end) >>> 1
    const middleJobId = getId(queue[middle])
    middleJobId < id ? (start = middle + 1) : (end = middle)
  }

  return start
}

// 添加job，且queueFlush(在下一次进入微任务时执行queue中的任务)
export function queueJob(job: SchedulerJob) {
  // console.log('queueJob called')
  // the dedupe search uses the startIndex argument of Array.includes()
  // by default the search index includes the current job that is being run
  // so it cannot recursively trigger itself again.
  // if the job is a watch() callback, the search will start with a +1 index to
  // allow it recursively trigger itself - it is the user's responsibility to
  // ensure it doesn't end up in an infinite loop.
  // 去重搜索用了Array.includes()的第一个参数
  // 搜索索引包含当前正在运行的任务
  // 所以，它无法回调自己。
  // 如果这个任务是watch()的回调，这个搜索，会从a+1的位置去允许它触发自己。
  // 这就需要开发者去保证它不会造成无线循环了.

  // 如果queue为空，或者queue中对应位置以后不存在job
  if (
    !queue.length ||
    !queue.includes(
      job,
      isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex
    )
  ) {
    // 大致是去查队列,如果没有job,就添加进去.
    if (job.id == null) {
      queue.push(job)
    } else {
      queue.splice(findInsertionIndex(job.id), 0, job)
    }
    queueFlush()
  }
}

// 队列刷新 将flushJobs放入微任务队列
function queueFlush() {
  // console.log('queueFlush called')

  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs) // flushJobs进入微任务
  }
}

// 若job在队列中，且在flushIndex之后，那么移除它
export function invalidateJob(job: SchedulerJob) {
  const i = queue.indexOf(job)
  if (i > flushIndex) {
    queue.splice(i, 1)
  }
}

// 把cb推进pendingPostFlushCbs去，然后刷新
export function queuePostFlushCb(cb: SchedulerJobs) {
  if (!isArray(cb)) {
    if (
      !activePostFlushCbs ||
      !activePostFlushCbs.includes(
        cb,
        cb.allowRecurse ? postFlushIndex + 1 : postFlushIndex
      )
    ) {
      pendingPostFlushCbs.push(cb)
    }
  } else {
    // if cb is an array, it is a component lifecycle hook which can only be
    // triggered by a job, which is already deduped in the main queue, so
    // we can skip duplicate check here to improve perf
    pendingPostFlushCbs.push(...cb)
  }
  queueFlush()
}

// 指定queue中的cb，执行过的会清除
export function flushPreFlushCbs(
  seen?: CountMap,
  // if currently flushing, skip the current job itself
  i = isFlushing ? flushIndex + 1 : 0
) {
  if (__DEV__) {
    seen = seen || new Map()
  }
  for (; i < queue.length; i++) {
    const cb = queue[i]
    if (cb && cb.pre) {
      if (__DEV__ && checkRecursiveUpdates(seen!, cb)) {
        continue
      }
      queue.splice(i, 1)
      i--
      cb()
    }
  }
}

// 把pendingPostFlushCbs中的函数们都执行了
// 执行过程：先去重，再推到activePostFlushCbs，清空原来的，执行activePostFlushCbs中的，清空activePostFlushCbs中的.
export function flushPostFlushCbs(seen?: CountMap) {
  if (pendingPostFlushCbs.length) {
    // 如果pendingPostFlushCbs数组不是空
    const deduped = [...new Set(pendingPostFlushCbs)] // 去重
    pendingPostFlushCbs.length = 0 // 清空

    // #1947 already has active queue, nested flushPostFlushCbs call
    if (activePostFlushCbs) {
      // 如果 activePostFlushCbs不是falsy, 应该是在什么地方被设置成数组了
      activePostFlushCbs.push(...deduped) // 然后把去重的postFlushCbs推进去
      return
    }

    activePostFlushCbs = deduped
    if (__DEV__) {
      seen = seen || new Map()
    }

    activePostFlushCbs.sort((a, b) => getId(a) - getId(b))

    for (
      postFlushIndex = 0;
      postFlushIndex < activePostFlushCbs.length;
      postFlushIndex++
    ) {
      if (
        __DEV__ &&
        checkRecursiveUpdates(seen!, activePostFlushCbs[postFlushIndex])
      ) {
        continue
      }
      activePostFlushCbs[postFlushIndex]() // 依次执行activePostFlushCbs中的函数
    }
    activePostFlushCbs = null // 执行完后, activePostFlushCbs设置成null
    postFlushIndex = 0
  }
}

// 获取任务id 无id的返回无限大
const getId = (job: SchedulerJob): number =>
  job.id == null ? Infinity : job.id

// 比较器按照 id从小到大排序
const comparator = (a: SchedulerJob, b: SchedulerJob): number => {
  const diff = getId(a) - getId(b)
  if (diff === 0) {
    if (a.pre && !b.pre) return -1 // QUESTION:pre是啥?
    if (b.pre && !a.pre) return 1
  }
  return diff
}

// 刷新任务：清空queue，执行pendingPostFlushCbs中的函数
// 执行队列中的任务
function flushJobs(seen?: CountMap) {
  // console.log('flushJobs called')

  isFlushPending = false
  isFlushing = true
  if (__DEV__) {
    seen = seen || new Map()
  }

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child so its render effect will have smaller
  //    priority number)
  // 2. If a component is unmounted during a parent component's update,
  //    its update can be skipped.
  // 在刷新之前,先给队列排序
  // 这保证了
  // 1. 组件是从父到子更新的. (因为父永远在子之前创建,所以它的render effect会有一个更小的优先级数)
  // 2. 如果一个组件在父的更新过程中,被卸载了.它的更新可以略过.
  queue.sort(comparator) // 将队列按照id从小到大排序

  // conditional usage of checkRecursiveUpdate must be determined out of
  // try ... catch block since Rollup by default de-optimizes treeshaking
  // inside try-catch. This can leave all warning code unshaked. Although
  // they would get eventually shaken by a minifier like terser, some minifiers
  // would fail to do that (e.g. https://github.com/evanw/esbuild/issues/1610)
  const check = __DEV__
    ? (job: SchedulerJob) => checkRecursiveUpdates(seen!, job)
    : NOOP

  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      // console.log(flushIndex, 'show flushIndex')

      // 遍历队列
      const job = queue[flushIndex] // 任务
      if (job && job.active !== false) {
        // 如果任务 是激活状态的
        if (__DEV__ && check(job)) {
          continue
        }
        // console.log(`running:`, job.id)
        callWithErrorHandling(job, null, ErrorCodes.SCHEDULER) // 报错
      }
    }
  } finally {
    // console.log('finally')

    flushIndex = 0
    queue.length = 0 // 将队列清空了？为啥

    // 等queue执行完毕后，再去执行 pendingPostFlushCbs 中的任务, 当pendingPostFlushCbs任务被执行时，DOM通过queue的执行被更新了
    // 负责DOM更新的job只会被推到queue中，这就导致了被推入pendingPostFlushCbs的任务在有DOM更新时，只会在DOM更新之后被执行。
    flushPostFlushCbs(seen) // 指定pending状态的postFlushCbs。

    isFlushing = false // 刷新状态改为false
    currentFlushPromise = null // 当前FlushPromise 设置成null
    // some postFlushCb queued jobs!
    // keep flushing until it drains.
    if (queue.length || pendingPostFlushCbs.length) {
      flushJobs(seen)
    }
  }
}

// 检查递归是否超出限制,若没有则更新次数
function checkRecursiveUpdates(seen: CountMap, fn: SchedulerJob) {
  if (!seen.has(fn)) {
    // 如果类型为Map的seen中没有为fn的key，则设置seen的一个key为fn，value为1。
    seen.set(fn, 1)
  } else {
    // 如果seen中已经存储了为fn的key。
    const count = seen.get(fn)! // 取对应的count

    // console.log(count, 'show count in checkRecursiveUpdates')

    if (count > RECURSION_LIMIT) {
      const instance = fn.ownerInstance
      const componentName = instance && getComponentName(instance.type)
      warn(
        `Maximum recursive updates exceeded${
          componentName ? ` in component <${componentName}>` : ``
        }. ` +
          `This means you have a reactive effect that is mutating its own ` +
          `dependencies and thus recursively triggering itself. Possible sources ` +
          `include component template, render function, updated hook or ` +
          `watcher source function.`
      )
      return true
    } else {
      seen.set(fn, count + 1)
    }
  }
}
