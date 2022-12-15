## Vue 简要的运行流程

### 第一次渲染

- createApp(...).mount('#app')

  - createVNode(...) 创建 vnode

    1. baseParse 解析 template，生成 ast。
    2. transform 转换优化数据。
    3. generate 生成渲染函数。

  - render(...) 根据 vnode 创建元素并挂载到指定位置。绑定数据和视图的关系。
    - patch 组件到指定根元素。
      - mountComponent 挂载组件。
        - setupRenderEffect 设置渲染 effect，并挂载组件。
          - 创建 reactiveEffect。
          - 调用 componentUpdateFn。
            patch 标签或组件到指定位置。
            patch 过程中会访问到响应式数据的属性值，会收集上述 reactiveEffect 到 targetMap 中对应响应式数据所映射的 Map 的对应属性所映射的 Dep 中。

### 点击按钮，改变响应式对象属性值引发重新渲染

- 点击按钮 响应式对象属性值改变
  - setter 监听到属性值改变，调用 trigger 方法
    - 找到 targetMap 中对应对象的对应属性的对应 Dep，执行所有的 reactiveEffect。
