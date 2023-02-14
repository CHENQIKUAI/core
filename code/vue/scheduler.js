const RECURSION_LIMIT = 100 // 递归限制？
let queue = []
let flushIndex = 0
let isFlusing = false
let isFlushPending = false

const queueJob = job => {
  if (
    !queue.length ||
    !queue.includes(
      job,
      isFlusing && job.allowRecurse ? flushIndex + 1 : flushIndex
    )
  ) {
    queue.push(job)
  }
  // console.log({ isFlusing, isFlushPending }, 'in queueJob')
  if (!isFlusing && !isFlushPending) {
    isFlushPending = true
    Promise.resolve(1).then(() => {
      if (!isFlusing) flushJobs()
    })
  }
}

const flushJobs = () => {
  if (isFlusing) return
  isFlushPending = true
  isFlusing = true
  const seen = new Map()
  // console.log({ isFlusing, isFlushPending }, 'in flushJobs')
  for (flushIndex = 0; flushIndex < queue.length; ++flushIndex) {
    queue[flushIndex]()
    if (checkRescusiveUpdates(seen, queue[flushIndex])) {
      console.error('Maximum recursive updates exceeded')
      break
    }
  }
  // console.log('in flushJobs finally')
  queue = []
  flushIndex = 0
  isFlusing = false
}

// function watch(source, cb) {
//   cb.allowRecurse = true
//   const scheduler = () => queueJob(cb)
//   deps.push(() => {
//     scheduler()
//   })
// }

function checkRescusiveUpdates(seen = new Map(), fn) {
  if (seen.has(fn)) {
    const count = seen.get(fn)
    seen.set(fn, count + 1)
    if (count + 1 > RECURSION_LIMIT) {
      return true
    }
  } else {
    seen.set(fn, 1)
  }
}

// eslint-disable-next-line no-restricted-globals
module.exports = {
  queueJob
}
