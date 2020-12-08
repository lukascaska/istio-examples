const express = require('express')
const cors = require('cors')
const app = express()
const port = 3000
app.use(cors())

app.get('/', (req, res) => {
  res.send('Server is reachable and v2')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})