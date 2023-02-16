/* eslint-disable no-restricted-globals */

const env = {
  my: './myVue.js',
  vue: '../../packages/vue/dist/vue.cjs'
}

const { watch, reactive, computed, ref } = require(env.my)

const data = reactive({ count: 1 })

const multiply10 = computed(() => {
  return data.count * 10
})

// watch(
//   () => data.count,
//   newV => {
//     console.log(newV, 'watch data.count')
//   }
// )

watch(
  () => multiply10.value,
  (newV, oldV) => {
    console.log(newV, 'watch multiply10---')
  }
)

// watch(
//   () => multiply10.value,
//   (newV, oldV) => {
//     console.log(newV, 'watch multiply10+++')
//   }
// )

data.count = 11222
data.count = 22
data.count = 3

// data.count = 1

/**
 * 要注册的回调函数都是放在activeEffect里，供需要的使用
 */

/**
 * 响应式数据帮助一个数据的属性在被修改时，能够回调事先所指定的函数。
 * 如何成为一个响应式数据？
 * 访问我时，把事先指定的函数收集起来，将它和我及我的属性关联起来。
 * 修改我的属性时，找到我的属性关联的函数并执行。
 *
 * 访问和修改可以通过Proxy代理来处理。get和set分别劫持访问和修改属性。
 * 函数的收集和关联可以通过，一个weakMap对象，存储key为响应式对象，存储value为一个“key为响应式对象属性名称，value为函数集合的Map对象”来处理。
 */
