import { cloneArrayBuffer } from './cloneArrayBuffer'
import { cloneDataView } from './cloneDataView'
import { cloneDate } from './cloneDate'
import { cloneMap } from './cloneMap'
import { cloneRegExp } from './cloneRegexp'
import { cloneTypedArray } from './cloneTypedArray'

const TypedArrayMap: Record<string, Function> = {
  '[object Date]': cloneDate,
  '[object ArrayBuffer]': cloneArrayBuffer,
  '[object DataView]': cloneDataView,
  '[object Float32Array]': cloneTypedArray,
  '[object Float64Array]': cloneTypedArray,
  '[object Int8Array]': cloneTypedArray,
  '[object Int16Array]': cloneTypedArray,
  '[object Int32Array]': cloneTypedArray,
  '[object Uint8Array]': cloneTypedArray,
  '[object Uint8ClampedArray]': cloneTypedArray,
  '[object Uint16Array]': cloneTypedArray,
  '[object Uint32Array]': cloneTypedArray,
  '[object BigInt64Array]': cloneTypedArray,
  '[object BigUint64Array]': cloneTypedArray,
  '[object RegExp]': cloneRegExp,
  '[object Map]': cloneMap
}

/**
 * Deep copy function for TypeScript.
 * @param T Generic type of target/copied value.
 * @param target Target value to be copied.
 * @see Original source: ts-deepcopy https://github.com/ykdr2017/ts-deepcopy
 * @see Code pen https://codepen.io/erikvullings/pen/ejyBYg
 */
export function deepCopy<T>(
  target: T,
  hash: WeakMap<any, any> = new WeakMap()
): T {
  const tag = Object.prototype.toString.call(target)

  if (TypedArrayMap[tag]) {
    return TypedArrayMap[tag](target)
  }
  if (target === null) {
    return target
  }

  if (hash.has(target)) {
    return hash.get(target)
  }

  if (target instanceof Array) {
    const cp = [] as any[]
    hash.set(target, cp)
    ;(target as any[]).forEach((v: any) => {
      cp.push(v)
    })
    return cp.map((n: any) => deepCopy<any>(n), hash) as any
  }
  if (typeof target === 'object') {
    const cp = { ...(target as { [key: string]: any }) } as {
      [key: string]: any
    }
    hash.set(target, cp)
    Object.keys(cp).forEach(k => {
      cp[k] = deepCopy<any>(cp[k], hash)
    })
    return cp as T
  }
  return target
}
