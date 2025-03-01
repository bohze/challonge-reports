const express = require('express')
require('dotenv').config()
const app = express()

const port = process.env.PORT || 3000
const test1 = process.env.TEST1 || 'test321'

app.get('/', (req, res) => {
  res.send('Hello World!' + test1)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
