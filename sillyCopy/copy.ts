function isObject(obj: any) {
  return (typeof obj === 'object' || typeof obj === 'function') && obj !== null
}

function clone<T>(source: T, hash?: WeakMap<any, any>): T
function clone<T>(source: any, hash = new WeakMap()): T {
  if (!isObject(source)) return source
  if (hash.has(source)) return hash.get(source)

  const target: any = Array.isArray(source) ? [] : {}
  hash.set(source, target)

  for (const key in source) {
    // for in 无序遍历 可枚举属性（包含继承过来的可枚举属性）。
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      // 只保留对象本身的可枚举属性
      if (isObject(source[key])) {
        target[key] = clone(source[key], hash)
      } else {
        target[key] = source[key]
      }
    }
  }
  return target as T
}

export default clone
