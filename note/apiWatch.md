# 为什么 visible 被重新赋值了三次，但是 watch visible 只打印了一次？

```js
export default {
  data() {
    return {
      visible: false
    }
  },
  methods: {
    handleClick() {
      this.visible = true
      this.visible = false
      this.visible = true
    }
  },
  watch: {
    visible(v) {
      console.log('visible change', v)
    }
  }
}
```

负责 visible 更新时执行回调函数的 job 是唯一的。在组件所有声明周期内只生成一次。
这样子 在 visible 几次更新时，对应的 job 推入 任务队列 queue 中时，就知道 job 是否重复了，若重复，就不继续推入 queue 中。
最终只有唯一的一个 job 推入任务队列 queue 中。
那么执行时，也就执行一次。
