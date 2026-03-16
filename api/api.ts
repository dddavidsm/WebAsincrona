import 'express-async-errors'
import cors from 'cors'
import express, { ErrorRequestHandler } from 'express'
import db from './engine/database'

type Product = {
  product_id?: number
  product_name: string
  supplier_id?: number
  category_id?: number
  quantity_per_unit?: string
  unit_price?: number
  units_in_stock?: number
  units_on_order?: number
  reorder_level?: number
  discontinued?: boolean
}

const app = express()
app.use(cors())
app.use(express.json())

const port = process.env.PORT || 3000

const router = express.Router()

router.get('/products', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 10
  const search = (req.query.search as string) || ''
  const offset = (page - 1) * limit

  const q = db.query('products') as any
  const countQ = search
    ? q.clone().whereILike('product_name', `%${search}%`).count('product_id as count')
    : q.clone().count('product_id as count')
  const rowsQ = search
    ? q.clone().whereILike('product_name', `%${search}%`).select('*').orderBy('product_id').limit(limit).offset(offset)
    : q.clone().select('*').orderBy('product_id').limit(limit).offset(offset)
  const [{ count }] = await countQ
  const rows = await rowsQ

  res.json({ data: rows, total: Number(count), page, limit })
})

router.get('/products/:id', async (req, res) => {
  const result = await db.query('products').where('product_id', req.params.id).first()
  if (!result) return res.status(404).json({ error: 'No trobat' })
  res.json(result)
})

router.post('/products', async (req, res) => {
  const data: Product = req.body
  const [inserted] = await (db.query('products').insert(data) as any).returning('*')
  res.status(201).json(inserted)
})

router.put('/products/:id', async (req, res) => {
  const id = req.params.id
  const data = req.body
  const updated = await (db.query('products').where('product_id', id).update(data) as any).returning('*')
  res.json(updated)
})

router.delete('/products/:id', async (req, res) => {
  const id = req.params.id
  const deletedCount = await (db.query('products').where('product_id', id) as any).del()
  if (!deletedCount) return res.status(404).json({ error: 'No trobat' })
  res.status(204).send()
})

app.use('/api', router)

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.log(err)
  res.status(err.statusCode || 500).json(err.message)
}

app.use(errorHandler)

db.start().then(() => {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
  })
})

