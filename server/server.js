import express from 'express'
import cors from 'cors'
import testRoutes from './routes/testRoutes.js'
const app = express()

app.use(cors())
app.use(express.json())
app.use('/api/requests', testRoutes)

app.listen(3000, () => {
  console.log('Server is running on port 3000')
})
