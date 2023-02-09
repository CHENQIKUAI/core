console.log(1)
Promise.resolve(1).then(() => {
  console.log(3)
  Promise.resolve(1).then(() => {
    console.log(5)
  })
})
Promise.resolve(1).then(() => {
  console.log(4)
  Promise.resolve(1).then(() => {
    console.log(6)
  })
})
console.log(2)
