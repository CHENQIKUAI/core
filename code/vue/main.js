/* eslint-disable no-restricted-globals */
const { watch } = require('./apiWatch')
const { reactive } = require('./reactive')

const data = reactive({
  visible: false,
  jj: 1
})

watch(data, () => {
  console.log(data.visible, data.jj)
})
