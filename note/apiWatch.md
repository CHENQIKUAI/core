```js
export default {
  data() {
    return {
      visible: false
    }
  },
  methods: {
    handleClick() {
      this.visible = true // 代码1
      this.visible = false // 代码2
      this.visible = true // 代码3
    }
  },
  watch: {
    visible(v) {
      console.log('visible change', v)
    }
  }
}
```

# 为什么 响应式数据被重新赋值了三次，但是监听回调只执行了一次？

代码 1 执行后， visible 设置为 true。Vue 知道 visible 更改后，会将执行回调函数的 job 推入 queue。并且利用 Promise.then 的特性将 执行 queue 中的所有任务的任务 放入微任务队列中。
代码 2 执行后， visible 设置为 false。Vue 知道 visible 更改后，发现 负责 visible 更新时回调的 job 已经推入 queue，于是不再继续执行推入操作。
代码 3 执行后，visible 设置为 true。后面同上，不在继续执行推入操作。
handleClick 执行完毕。事件循环机制会去执行微任务队列的任务。然后 job 得到了执行，回调函数也得到了执行。
最终，job 因为只推入 1 次，所以只执行了一次，监听回调也只执行了一次。


https://juejin.cn/post/7198039436051054651

# unwatch 实现

清空 deps
