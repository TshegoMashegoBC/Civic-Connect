import express from 'express'
import {
  getAllRequests,
    getRequests,
  createRequest,
  updateRequest,
  deleteRequest,
} from '../controllers/requestControllers.js'
const router = express.Router()

router.get('/', getAllRequests)
router.get('/:id', getRequests)
router.post('/posts', createRequest)
router.put('/posts/:id', updateRequest)
router.delete('/posts/:id', deleteRequest)

export default router