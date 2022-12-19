## 简单代码例子

```js
const { createApp, defineComponent, computed, watch, ref, reactive, effect } =
  Vue
const app = createApp({
  components: [],
  template: `
<div ref="testRef">
  <div
    key="i"
    v-for="(item111, index222, haha333) in list"
    @click="list.push({id: list.length, name: 'll'})"
  >
    <div>first</div>
    <li>second</li>
    <span>third</span>
    <span>third</span>
    {{m2}}
  </div>
  <button @click="show = !show">switch message</button>
  <div v-if="show">3333 {{message}}</div>
</div>
`,
  mounted() {
    console.log('mounted')
  },
  beforeDestroy() {
    console.log('beforeDestroy')
  },
  data() {
    return {
      message: 'Hello Vue!',
      eventName: 'click',
      list: [
        { id: 1, name: 'nzz' },
        { id: 2, name: 'ryy' },
        { id: 3, name: 'lhc' }
      ],
      show: false
    }
  },
  methods: {
    handleCLick() {
      console.log('handleCLick')
    }
  },
  computed: {
    m2() {
      return this.message + '33'
    }
  }
}).mount('#app')
```

## 上述 例子 简要的运行流程

### 第一次渲染

- createApp(...).mount('#app')

  1.  createVNode(...) 创建 vnode

      - guardReactiveProps 若 props 是响应式对象，则拷贝其数据再操作
      - normalizeClass normalizeStyle 对 class 和 style 的对象和数组模式进行处理
      - 根据 type 创建 shapeFlag
      - normalizeChildren
        - shapeFlag 再处理

  2.  render(...) 根据 vnode 创建元素并挂载到指定位置。绑定数据和视图的关系。

      - patch vnode 到指定根元素（这里的 vnode 是组件 vnode）。
        - mountComponent 挂载组件。
          - setupComponent 执行时用 reactive 创建响应式数据
            - setupStatefulComponent 设置有状态的组件
              - finishComponentSetup 完成组件设置
                - compileToFunction 将模板解析成函数
                  - compile
                    1. baseParse 解析 template，生成 ast。
                    2. transform 转换优化数据。
                    3. generate 生成渲染函数 (是字符串形式)。
                  - 使用 new Function 将渲染函数字符串变成函数。
                - applyOptions
                  - reactive 创建响应式对象
          - setupRenderEffect 设置渲染 effect，并挂载组件。
            1. 创建 componentUpdateFn。用 componentUpdateFn 创建 reactiveEffect。
            2. 调用 reactiveEffect 的 run 方法。这会去执行 componentUpdateFn。
               componentUpdateFn 会 patch 标签或组件到指定位置。patch 之前以及之后会调用生命周期函数。
               patch 过程中会访问到响应式数据的属性值，会收集上述 reactiveEffect 到 targetMap 中对应响应式数据所映射的 Map 的对应属性所映射的 Dep 中。

### 点击按钮，改变响应式对象属性值引发重新渲染

- 点击按钮 响应式对象属性值改变
  - setter 监听到属性值改变，调用 trigger 方法
    - 找到 targetMap 中对应对象的对应属性的对应 Dep，执行所有的 reactiveEffect。
      - 执行时会调用 componentUpdateFn。
        componentUpdateFn 会 patch 组件。

## diff 算法

<!-- TODO: -->
