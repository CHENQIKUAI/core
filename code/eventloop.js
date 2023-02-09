console.log('---1')
Promise.resolve(1).then(() => {
  console.log('---3')
  setTimeout(() => {
    console.log('+++2')
  })
  Promise.resolve(1).then(() => {
    console.log('---5')
    setTimeout(() => {
      console.log('+++3')
    })
  })
})
Promise.resolve(1).then(() => {
  console.log('---4')
  Promise.resolve(1).then(() => {
    console.log('---6')
  })
})
console.log('---2')

setTimeout(() => {
  console.log('+++1')
})
