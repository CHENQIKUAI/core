const $data = {}
const data = new Proxy($data, {
  set(target, p, newValue) {
    const oldValue = $data[p]
    $data[p] = newValue
    trigger(p, newValue, oldValue)
  }
})

const deps = []

function trigger(p, newValue, oldValue) {
  deps.forEach(i => i())
}
const RECURSION_LIMIT = 100 // 递归限制？
let queue = []
let flushIndex = 0
let isFlusing = false
let isFlushPending = false

const queueJob = job => {
  if (
    !queue.length ||
    !queue.includes(job, job.allowRecurse ? flushIndex + 1 : flushIndex)
  ) {
    queue.push(job)
  }
  if (!isFlusing && !isFlushPending) {
    isFlusing = true
    Promise.resolve(1).then(flushJobs)
    isFlusing = false
  }
}

const flushJobs = () => {
  const seen = new Map()
  isFlushPending = true
  for (flushIndex = 0; flushIndex < queue.length; ++flushIndex) {
    queue[flushIndex]()
    if (checkRescusiveUpdates(seen, queue[flushIndex])) {
      console.error('Maximum recursive updates exceeded')
      break
    }
  }
  queue = []
  flushIndex = 0
  console.log('in flushJobs finally')
  isFlushPending = false
}

function watch(source, cb) {
  cb.allowRecurse = true
  const scheduler = () => queueJob(cb)
  deps.push(() => {
    scheduler()
  })
}

watch(data.visible, () => {
  console.log(queue.length)
  data.visible = !data.visible
})

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

data.visible = !data.visible
