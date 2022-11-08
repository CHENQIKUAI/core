const template = `
<div @[eventName]="handleCLick">{{message}}</div>
<template v-if="true">33</template>
<div class="slkd laksjd \n lfksd">
    <div v-for="n in 9" :key="n">
        <span>{{n}}</span>
    </div>
    <div>123</div>
</div>
<input :value.sync="message" @change="message = $event" />
`

export default function parseTemplate(content: string = template) {
  const match = content.match(/^[\n\f\r ]*/)
  if(match) {
    
  }
}
