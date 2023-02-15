/* eslint-disable no-restricted-globals */

const env = {
  my: './myVue.js',
  vue: '../../packages/vue/dist/vue.cjs'
}

const { watch, reactive, computed } = require(env.my)

const data = reactive({
  visible: false,
  jj: 1
})

const jPlusOne = computed(() => {
  return data.jj + 1
})

watch(jPlusOne, () => {
  console.log(jPlusOne.value, 'in watch watchJPlusOne')
})

console.log(jPlusOne.value)
data.jj = 5
console.log(jPlusOne.value)
