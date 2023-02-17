# bug 解决

- watch 怎么把新值和旧值传给回调函数
- 一个值被重复设置和很多遍，但是最后一遍时设置成最初的那个值，watch 应该要不回调。
- 无法 watch 一个 reactive data
- ref 的值，被 computed 后，再用 watch 监听时，无法正常回调(reactive 的值是正常的)

---
# 发现
- 第一个 watch 一个 computed 对象，第二个 watch 一个 reactive 对象，结果回调触发时，第二个回调比第一个回调先执行。不是 bug，vue 也是这样
