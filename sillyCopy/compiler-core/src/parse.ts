const template = `
<!-- <el-button size="small" type="primary" @click="doAdd">新增任务</el-button> -->
<el-popover placement="bottom" trigger="click">
  <template>
    <div v-for="item in 10" :key="item">
      <el-button
        style="width:100%;padding: 8px;"
        size="mini"
        type="text"
        @click="doClick('调优',1 ,'combine',item)"
      >
        {{item}}
        <span v-if="item ===1 ">（最低）</span>
        <span v-if="item ===10 ">（最高）</span>
      </el-button>
    </div>
  </template>
  <el-button style="margin-right:10px;padding-top: 8px;" slot="reference" size="small">
    批量调优
    <i class="el-icon-arrow-down"></i>
  </el-button>
</el-popover>

`
console.log(
  parseTemplate({
    value: template
  })
)
function advanceSpace(content: { value: string }) {
  const match = content.value.match(/^[\n\f\r ]*/)
  if (match) {
    content.value = content.value.slice(match[0].length)
  }
  return content
}
export default function parseTemplate(
  content: { value: string },
  parent = false
) {
  const nodeList: iNode[] = []
  content = advanceSpace(content)
  let tagStartCount = 0
  let debugCount = 0

  while (content.value.length !== 0) {
    // console.log(content.value, 'show content');
    debugCount++
    if (debugCount === 1000) {
      break
    }

    // 处理注释
    {
      const match = content.value.match(/<!--(.*?)-->/)
      if (match) {
        nodeList.push({
          tag: '',
          value: match[1]
        })

        content.value = content.value.slice(match[0].length)
        advanceSpace(content)
      }
    }

    //   处理{{}}
    {
      const match = content.value.match(/^{{/)
      if (match) {
        const match2 = content.value.match(/^({{[^\} \f\r\n]*?}})/)
        if (!match2) throw new Error('}} not found')
        content.value = content.value.slice(match2[0].length)
        nodeList.push({
          tag: '',
          value: match2[0]
        })
      }
      content = advanceSpace(content)
    }

    //   处理标签结尾
    {
      const match = content.value.match(/^<\/[a-zA-Z][a-zA-Z0-9-]*>/)
      if (match) {
        content.value = content.value.slice(match[0].length)
        content = advanceSpace(content)
        tagStartCount--
        if (tagStartCount < 0) {
          if (!parent) throw new Error('标签缺失')
          else return nodeList
        }
      }
    }

    // 处理纯文本
    {
      const match = content.value.match(/^([^<>]+)/)
      if (match) {
        nodeList.push({
          tag: '',
          value: match[0]
        })
        content.value = content.value.slice(match[0].length)
      }
    }

    //   处理标签头
    {
      const node = {} as iNode
      {
        // 元素头
        const match = content.value.match(/^<([a-zA-Z][^ \f\n\r>]*)/)
        if (match) {
          tagStartCount++
          node.tag = match[1]
          content.value = content.value.slice(match[0].length)
          // 元素属性解析
          parseAttributes(content, node)
          nodeList.push(node)
        }
      }
      {
        const match = content.value.match(/^[^>\/]*?(>|\/>)/)
        if (match) {
          content.value = content.value.slice(match[0].length)
          if (match[1] === '/>') {
            tagStartCount--
          } else {
            const childList = parseTemplate(content, true)
            node.children = childList
            content = advanceSpace(content)
            tagStartCount--
          }
        }
      }
    }
  }

  return nodeList
}

function parseAttributes(content: { value: string }, node: iNode) {
  let debugCount = 0
  // 解析指令
  // 解析绑定
  // 解析监听
  content = advanceSpace(content)
  let match: any
  while (
    (match = content.value.match(
      /^(?:v-([a-zA-Z]+))?(?:(:|@|#)([a-zA-Z]+))?((?:\.[a-z-A-Z]+)+)?([a-zA-Z-]+)?(?:=('|"))?(?!>)/
    ))
  ) {
    // console.log(match)
    const attr = {} as iProp
    const directiveName = match[1]
    const symbol = match[2]
    const name = match[3]
    const modifiers = match[4] as string | undefined
    const nativeAttrName = match[5]
    const quote = match[6]

    if (symbol === '@' || ['on'].includes(directiveName)) {
      attr.type = 'on'
    } else if (directiveName === 'bind' || symbol === ':') {
      attr.type = 'bind'
    }
    attr.name = name
    if (['if', 'for', 'else', 'else-if', 'model'].includes(directiveName)) {
      attr.type = 'v'
      attr.name = directiveName
    }
    if (modifiers) {
      const group = modifiers.match(/\.[^\.]+/g)
      attr.modifiers = group?.map(i => i.slice(1))
    }
    if (nativeAttrName) {
      attr.name = nativeAttrName
      attr.type = 'nativeAttr'
    }

    content.value = content.value.slice(match[0].length)

    if (quote) {
      const match2 = content.value.match(new RegExp(`^([^${quote}]+)${quote}`))
      if (match2) {
        const value = match2[1]
        attr.value = value
        content.value = content.value.slice(match2[0].length)
      } else {
        throw new Error('属性不正确')
      }
    }
    node.props = [...(node.props || []), attr]
    advanceSpace(content)

    debugCount++
    if (debugCount > 1000) {
      break
    }
  }
}

interface iNode {
  tag: string
  children?: iNode[]
  value?: string
  props?: iProp[]
}

interface iProp {
  type: 'bind' | 'on' | 'v' | 'nativeAttr'
  name: string
  value: string
  modifiers?: string[]
}
