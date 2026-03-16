type Product = {
  product_id: number
  product_name: string
  unit_price: number | null
}

type ProductsResponse = {
  data: Product[]
  total: number
  page: number
  limit: number
}

const API = '/api/products'

let currentPage = 1
const pageSize = 10
let totalProducts = 0

async function getProducts(page: number, limit: number): Promise<ProductsResponse> {
  const res = await fetch(`${API}?page=${page}&limit=${limit}`)
  const json = await res.json()
  return json as ProductsResponse
}


function renderTable(products: Product[]) {
  const tbody = document.querySelector<HTMLTableSectionElement>('#products-table tbody')!
  tbody.innerHTML = products.map(p => `
    <tr>
      <td>${p.product_id}</td>
      <td>${p.product_name}</td>
      <td>${p.unit_price ?? ''}</td>
      <td class="actions">
        <button onclick="editProduct(${p.product_id})">Edita</button>
        <button onclick="deleteProduct(${p.product_id})">Elimina</button>
      </td>
    </tr>
  `).join('')
}

function updatePaginationUI() {
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize))
  
  const prevBtn = document.getElementById('btn-prev') as HTMLButtonElement
  const nextBtn = document.getElementById('btn-next') as HTMLButtonElement
  const pageInfo = document.getElementById('page-info')
  
  if (prevBtn) prevBtn.disabled = currentPage === 1
  if (nextBtn) nextBtn.disabled = currentPage === totalPages
  if (pageInfo) pageInfo.textContent = `Página ${currentPage} de ${totalPages}`
}

async function loadProducts() {
  const result = await getProducts(currentPage, pageSize)
  totalProducts = result.total

  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize))
  if (currentPage > totalPages) {
    currentPage = totalPages
    const fallback = await getProducts(currentPage, pageSize)
    totalProducts = fallback.total
    renderTable(fallback.data)
    updatePaginationUI()
    return
  }

  renderTable(result.data)
  updatePaginationUI()
}

document.getElementById('btn-prev')?.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--
    loadProducts()
  }
})
document.getElementById('btn-next')?.addEventListener('click', () => {
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize))
  if (currentPage < totalPages) {
    currentPage++
    loadProducts()
  }
})



;(window as any).deleteProduct = async (id: number) => {
  if (!confirm(`Eliminar producte #${id}?`)) return
  const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error en eliminar el producte' }))
    alert(err.error || 'Error en eliminar el producte')
    return
  }
  loadProducts()
}

;(window as any).editProduct = async (id: number) => {
  const res = await fetch(`${API}/${id}`)
  const p: Product = await res.json()
  const form = document.getElementById('update-form') as HTMLFormElement
  ;(form.elements.namedItem('id') as HTMLInputElement).value = String(p.product_id)
  ;(form.elements.namedItem('nom') as HTMLInputElement).value = p.product_name
  ;(form.elements.namedItem('preu') as HTMLInputElement).value = String(p.unit_price ?? '')
  form.style.display = ''
  form.scrollIntoView({ behavior: 'smooth' })
}

document.getElementById('create-form')!.addEventListener('submit', async (e) => {
  e.preventDefault()
  const form = e.target as HTMLFormElement
  const nom = (form.elements.namedItem('nom') as HTMLInputElement).value
  const preu = (form.elements.namedItem('preu') as HTMLInputElement).value
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_name: nom, unit_price: Number(preu) })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error en crear el producte' }))
    alert(err.error || 'Error en crear el producte')
    return
  }
  form.reset()
  loadProducts()
})

document.getElementById('update-form')!.addEventListener('submit', async (e) => {
  e.preventDefault()
  const form = e.target as HTMLFormElement
  const id = (form.elements.namedItem('id') as HTMLInputElement).value
  const nom = (form.elements.namedItem('nom') as HTMLInputElement).value
  const preu = (form.elements.namedItem('preu') as HTMLInputElement).value
  await fetch(`${API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_name: nom, unit_price: Number(preu) })
  })
  ;(document.getElementById('update-form') as HTMLFormElement).style.display = 'none'
  loadProducts()
})

document.getElementById('cancel-update')!.addEventListener('click', () => {
  ;(document.getElementById('update-form') as HTMLFormElement).style.display = 'none'
})

loadProducts()  