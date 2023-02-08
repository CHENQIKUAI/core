场景 1：

```vue
<template>
  <div
    v-for="(n, index) in ['a', 'b', 'c']"
    :key="index"
    @click="deleteCurItem"
  >
    {{ n }}
  </div>
</template>
```

针对上述场景，若点击 b，删除了第二个元素。
旧 vnode 数组

<div key="1">a</div>
<div key="2">b</div>
<div key="3">c</div>
就变成了新 vnode 数组
<div key="1">a</div>
<div key="2">c</div>
根据 patchKeyedChildren，从头往后遍历，若是 SameVNodeType，那么 patch 这俩 vnode。
旧 <div key="2">b</div> 和 新 vnode <div key="2">c</div> 由于 key 都是 2，type 都是 div，所以是 SameVNodeType。于是会 patch 这俩 vnode。
根据 patchKeyedChildren，旧 vnode 比新 vnode 多出 <div key="3">c</div>，会卸载它。
若采用index作为key，此场景将进行的操作是patch俩vnode，和卸载vnode。
为什么 Vue 中不要用 index 作为 key？
因为若使用id（唯一表示符）作为key，更新时对性能的消耗更小。

场景 2：

```vue
<template>
  <div v-for="(n, index) in ['a', 'b', 'c']" :key="n" @click="deleteCurItem">
    {{ n }}
  </div>
</template>
```

针对上述场景，若点击 b，删除了第二个元素。
旧 vnode 数组

<div key="a">a</div>
<div key="b">b</div>
<div key="c">c</div>
就变成了新 vnode 数组
<div key="a">a</div>
<div key="c">c</div>

根据 patchKeyedChildren，从前往后遍历和从后往前遍历完成后，会发现 vnode 数组中间有变化。最终发现 key 为 b 的 vnode，消失了，于是只卸载 key 为 b 的 vnode。

场景 1 比场景 2 消耗的性能更大。

场景 3：

```vue
<template>
  <div
    v-for="(n, index) in ['a', 'b', 'c']"
    :key="index"
    @click="deleteCurItem"
  >
    <Test />
  </div>
</template>
```


# patch element
dynamicChildren
