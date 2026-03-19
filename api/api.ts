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
  discontinued?: boolean | number
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

  const q = (db.query('products') as any).where('discontinued', 0)
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

  if (!data.product_id) {
    const maxRow = await db.query('products').max('product_id as maxId').first() as { maxId?: number | string | null }
    const currentMax = Number(maxRow?.maxId ?? 0)
    data.product_id = currentMax + 1
  }

  const discontinuedValue = data.discontinued === undefined
    ? 0
    : Number(Boolean(data.discontinued))

  const dataToInsert = {
    product_id: data.product_id,
    product_name: data.product_name,
    supplier_id: data.supplier_id ?? 1,
    category_id: data.category_id ?? 1,
    quantity_per_unit: data.quantity_per_unit ?? '',
    unit_price: data.unit_price ?? 0,
    units_in_stock: data.units_in_stock ?? 0,
    units_on_order: data.units_on_order ?? 0,
    reorder_level: data.reorder_level ?? 0,
    discontinued: discontinuedValue
  }

  const [inserted] = await (db.query('products').insert(dataToInsert) as any).returning('*')
  res.status(201).json(inserted)
})

router.put('/products/:id', async (req, res) => {
  const id = req.params.id
  const data = req.body
  const updated = await (db.query('products').where('product_id', id).update(data) as any).returning('*')
  res.json(updated)
})

router.delete('/products/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)

    const updatedCount = await db.query('products').where('product_id', id).update({ discontinued: 1 })
    
    if (!updatedCount) return res.status(404).json({ error: 'No trobat' })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

app.use('/api', router)

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const pgCode = err?.code as string | undefined

  if (pgCode === '23503') {
    return res.status(409).json({ error: 'No es pot eliminar: el producte està referenciat en altres taules.' })
  }

  if (pgCode === '23502' || pgCode === '22P02') {
    return res.status(400).json({ error: 'Dades de producte no vàlides.' })
  }

  console.log(err)
  res.status(err.statusCode || 500).json({ error: err.message || 'Error intern del servidor' })
}

app.use(errorHandler)

db.start().then(() => {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
  })
})

