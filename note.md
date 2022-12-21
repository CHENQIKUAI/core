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


### patchKeyedChildren

1.  sync from start
    从头往后遍历，若是 SameVNodeType，那么 patch 这俩节点。
    若不是,则退出遍历。
    (a b) c
    (a b) d e

2.  sync from end
    从后往前遍历，若是 SameVNodeType，那么 patch 这俩节点。
    若不是，则退出遍历。
    a (b c)
    d e (b c)

3.  common sequence + mount
    若遍历的位置超出旧 children，但是在新 children 范围内。
    这说明新 children 比就节点多了一些节点。
    需要挂载这些多出来的节点。
    (a b)
    (a b) c
    i = 2, e1 = 1, e2 = 2
    (a b)
    c (a b)
    i = 0, e1 = -1, e2 = 0

4.  common sequence + unmount
    若遍历的位置在旧 children 范围内，但是超出新 children。
    这说明新 children 比旧 children 少了一些节点。
    需要卸载这些多出来的节点。
    (a b) c
    (a b)
    i = 2, e1 = 2, e2 = 1
    a (b c)
    (b c)
    i = 0, e1 = 0, e2 = -1

5.  unknown sequence
    若非上述的集中情况，那么就不是节点边缘发生了改变，而是节点中间有变化。
    \[i ... e1 + 1\]: a b [c d e] f g
    \[i ... e2 + 1\]: a b [e d c h] f g
    i = 2, e1 = 4, e2 = 5

5.1 build key:index map for newChildren
将新 children 的 key 和 index 关系保存到 keyToNewIndexMap 中。

5.2 loop through old children left to be patched and try to patch
matching nodes & remove nodes that are no longer present
遍历旧 children，移除在新 children 中不再出现的节点。
判断该节点是否出现？
若有 key，则看是否有 key 匹配；
若无 key，则看是否 isSameVNodeType。
若在新 children 中再次出现，
则 patch 之。

5.3 move and mount
generate longest stable subsequence only when nodes have moved
找到相对顺序不变的最大的子序列。
移动非这个子序列中的元素，到正确的位置。
