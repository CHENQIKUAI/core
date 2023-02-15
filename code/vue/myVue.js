/* eslint-disable no-restricted-globals */
const { watch } = require('./apiWatch')
const { computed } = require('./computed')
const { reactive } = require('./reactive')
module.exports = {
  watch,
  computed,
  reactive
}
