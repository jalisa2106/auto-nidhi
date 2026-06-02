import { useCallback, useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Wallet, X, Search, Plus,
  FileText, Banknote, Calendar,
  Hash, AlignLeft, User, Tag, Pencil, Trash2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye,
  FileSpreadsheet, FileDown
} from 'lucide-react'
import Modal from '../../components/app/Modal'
import { expenseCategoriesApi, expensesApi, filesApi } from '../../api/services'
import { SelectiveExportModal } from '../../components/app/SelectiveExportModal'
import { exportDetailPDFsAsZip } from '../../utils/zipExportUtils'


interface Expense {
  id: string
  amount: number
  expense_date: string
  remarks: string
  created_at: string
  expense_category_name: string
  file_number: string
  created_by_name: string
}

interface ExpenseCategory {
  id: string
  name: string
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const formatExpenseId = (id: string) => {
  if (!id) return ''
  if (uuidRe.test(id)) return `EXPENSE-${id.slice(0, 8)}`
  return id
}

const emptyForm = (defaultCategory = ''): Omit<Expense, 'id' | 'created_at'> => ({
  amount: 0,
  expense_date: '',
  remarks: '',
  expense_category_name: defaultCategory,
  file_number: '',
  created_by_name: '',
})

const fmt = (n: number) =>
  '₹' + (n >= 100000 ? (n / 100000).toFixed(1) + 'L' : n.toLocaleString('en-IN'))

const categoryColor = (name: string): { bg: string; color: string } => {
  const palette = [
    { bg: '#eff6ff', color: '#1d4ed8' }, { bg: '#fef3c7', color: '#92400e' },
    { bg: '#dcfce7', color: '#15803d' }, { bg: '#fce7f3', color: '#9d174d' },
    { bg: '#ede9fe', color: '#6d28d9' }, { bg: '#f0fdf4', color: '#166534' },
    { bg: '#fff7ed', color: '#9a3412' },
  ]
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return palette[h % palette.length]
}

const decodeCurrentUserId = (): string | null => {
  const token = localStorage.getItem('access_token')
  if (!token) return null

  try {
    const payload = token.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(normalized))
    return typeof decoded.sub === 'string' ? decoded.sub : null
  } catch {
    return null
  }
}

function Pagination({
  total, page, pageSize, onPage, onPageSize,
}: {
  total: number; page: number; pageSize: number
  onPage: (p: number) => void; onPageSize: (s: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total)
  const end = Math.min(page * pageSize, total)
  const pages: (number | '...')[] = []

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className="pagination-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="pagination-info">Showing {start}-{end} of {total} records</span>
        <select className="page-size-select" value={pageSize} onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1) }}>
          {[5, 10, 20].map((s) => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
      <div className="pagination-controls">
        <button className="page-btn" onClick={() => onPage(1)} disabled={page === 1} title="First"><ChevronsLeft size={14} /></button>
        <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1} title="Prev"><ChevronLeft size={14} /></button>
        {pages.map((p, i) => p === '...' ? (
          <span key={`d${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)', fontSize: '.84rem' }}>...</span>
        ) : (
          <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => onPage(p as number)}>{p}</button>
        ))}
        <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Next"><ChevronRight size={14} /></button>
        <button className="page-btn" onClick={() => onPage(totalPages)} disabled={page === totalPages} title="Last"><ChevronsRight size={14} /></button>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
      <div style={{ color: 'var(--brand-500)', marginTop: 1, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '.72rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
        <div style={{ fontSize: '.9rem', color: 'var(--gray-800)', fontWeight: 500, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

export default function ExpensesPage() {
  const role = localStorage.getItem('user_role') || 'guest'
  const isAdmin = role === 'admin'

  const [categoriesList, setCategoriesList] = useState<ExpenseCategory[]>([])
  const [rows, setRows] = useState<Expense[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Expense | null>(null)
  const [filterCategory, setFilterCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [fileOptions, setFileOptions] = useState<Array<{ id: string; file_number: string; customer?: string; full_name?: string }>>([])

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportMode, setExportMode] = useState<'pdf' | 'excel'>('pdf')
  const [form, setForm] = useState<Omit<Expense, 'id' | 'created_at'>>(() => emptyForm(''))

  const closeView = useCallback(() => {
    setViewOpen(false)
    setSelected(null)
  }, [])

  const categoryNames = categoriesList.map(c => c.name)
  const categories = ['All', ...categoryNames]

  useEffect(() => {
    let active = true

    const loadData = async () => {
      setLoading(true)
      setError('')

      try {
        const [expenses, filesResponse, categoryResponse] = await Promise.all([
          expensesApi.list(),
          filesApi.list(1, 1000),
          expenseCategoriesApi.list(),
        ])

        if (!active) return

        setCategoriesList(categoryResponse)
        setRows(expenses.map(expense => ({
          ...expense,
          remarks: expense.remarks ?? '',
        })))
        setFileOptions(Array.isArray(filesResponse?.data) ? filesResponse.data : [])
        setCurrentUserId(decodeCurrentUserId())
        setForm(prev => ({
          ...prev,
          expense_category_name: prev.expense_category_name || categoryResponse[0]?.name || '',
        }))
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load expenses')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeView()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [closeView])

  const filtered = rows.filter(e => {
    const q = search.toLowerCase()
    const matchSearch =
      e.id.toLowerCase().includes(q) ||
      e.expense_category_name.toLowerCase().includes(q) ||
      e.created_by_name.toLowerCase().includes(q) ||
      e.file_number.toLowerCase().includes(q) ||
      e.remarks.toLowerCase().includes(q)
    const matchCat = filterCategory === 'All' || e.expense_category_name === filterCategory
    return matchSearch && matchCat
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const exportExcel = (itemsToExport?: any[]) => {
    const list = itemsToExport || filtered
    const data = list.map((e) => ({
      ID: formatExpenseId(e.id),
      Category: e.expense_category_name,
      Amount: e.amount,
      Date: e.expense_date,
      'File Linked': e.file_number || '—',
      'Recorded By': e.created_by_name,
      Remarks: e.remarks || '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses')
    XLSX.writeFile(wb, `expenses_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const exportPDF = (itemsToExport?: any[]) => {
    const doc = new jsPDF({ orientation: 'portrait' })
    const today = new Date().toLocaleDateString('en-IN')

    doc.setFontSize(16)
    doc.text('Expenses Report', 14, 15)
    doc.setFontSize(10)
    doc.setTextColor(120)
    const list = itemsToExport || filtered
    doc.text(`Generated on: ${today} | Total records: ${list.length}`, 14, 22)
    doc.setTextColor(0)

    autoTable(doc, {
      startY: 28,
      head: [
        ['Expense ID', 'Category', 'Amount', 'Date', 'File Linked', 'Recorded By'],
      ],
      body: list.map((e) => [
        formatExpenseId(e.id),
        e.expense_category_name,
        '₹' + e.amount.toLocaleString('en-IN'),
        e.expense_date,
        e.file_number || '—',
        e.created_by_name,
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [248, 248, 255] },
    })

    doc.save(`expenses_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const resolveFileId = (fileNumber: string): string | null => {
    const match = fileOptions.find(item => item.file_number === fileNumber)
    return match?.id ?? null
  }

  const resolveCategoryId = (categoryName: string): string | null => {
    const match = categoriesList.find(item => item.name === categoryName)
    return match?.id ?? null
  }

  const handleAdd = async () => {
    if (!currentUserId) {
      alert('Please log in again to add an expense.')
      return
    }

    const categoryId = resolveCategoryId(form.expense_category_name)
    if (!categoryId) {
      alert('Please select a valid category.')
      return
    }

    try {
      await expensesApi.create({
        amount: form.amount,
        expense_date: form.expense_date,
        remarks: form.remarks || null,
        expense_category_id: categoryId,
        file_id: resolveFileId(form.file_number),
        created_by: currentUserId,
      })

      const expenses = await expensesApi.list()
      setRows(expenses.map(expense => ({
        ...expense,
        remarks: expense.remarks ?? '',
      })))

      setAddOpen(false)
      setForm(emptyForm(categoriesList[0]?.name || ''))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add expense')
    }
  }

  const openEdit = (expense: Expense) => {
    const { id: _id, created_at: _ca, ...rest } = expense
    setForm(rest)
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!selected) return

    const payload: {
      amount?: number
      expense_date?: string
      remarks?: string
      expense_category_id?: string
      file_id?: string | null
    } = {}

    if (form.amount !== selected.amount) payload.amount = form.amount
    if (form.expense_date !== selected.expense_date) payload.expense_date = form.expense_date
    if (form.remarks !== selected.remarks) payload.remarks = form.remarks || ''
    if (form.expense_category_name !== selected.expense_category_name) {
      const categoryId = resolveCategoryId(form.expense_category_name)
      if (!categoryId) {
        alert('Please select a valid category.')
        return
      }
      payload.expense_category_id = categoryId
    }

    const selectedFileId = resolveFileId(form.file_number)
    if (form.file_number !== selected.file_number) {
      payload.file_id = selectedFileId
    }

    if (Object.keys(payload).length === 0) {
      setEditOpen(false)
      return
    }

    try {
      await expensesApi.update(selected.id, payload)
      setRows(prev => prev.map(row => row.id === selected.id
        ? { ...row, ...payload, expense_category_name: form.expense_category_name, expense_date: payload.expense_date ?? row.expense_date, remarks: payload.remarks ?? row.remarks, file_number: form.file_number }
        : row,
      ))
      setSelected(prev => prev
        ? { ...prev, ...payload, expense_category_name: form.expense_category_name, expense_date: payload.expense_date ?? prev.expense_date, remarks: payload.remarks ?? prev.remarks, file_number: form.file_number }
        : prev,
      )
      setEditOpen(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update expense')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await expensesApi.delete(id)
      setRows(prev => prev.filter(e => e.id !== id))
      if (selected?.id === id) closeView()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete expense')
    }
  }

  const f = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: key === 'amount' ? Number(e.target.value) : e.target.value }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 20 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-md)', padding: '12px 16px', boxShadow: 'var(--shadow-sm)' }}>
        <span style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--gray-500)', marginRight: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>Category</span>
        {categories.map(cat => {
          const isActive = filterCategory === cat
          const cc = categoryColor(cat)
          return (
            <button key={cat} id={`expense-filter-${cat.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => { setFilterCategory(cat); setPage(1) }}
              style={{ padding: '5px 13px', borderRadius: 'var(--radius-full)', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s', border: isActive ? '1.5px solid transparent' : '1.5px solid var(--gray-200)', background: isActive ? (cat === 'All' ? 'var(--brand-600)' : cc.bg) : '#fff', color: isActive ? (cat === 'All' ? '#fff' : cc.color) : 'var(--gray-600)' }}>
              {cat}
            </button>
          )
        })}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', color: '#b91c1c', fontSize: '.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: '1.2rem' }}>x</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, minHeight: 0, flex: 1 }}>
        <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--gray-100)', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--gray-900)' }}>
              All Expenses
              <span style={{ marginLeft: 8, fontSize: '.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>{filtered.length} records</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input id="expense-search" placeholder="Search by ID, category, staff..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                  style={{ padding: '8px 12px 8px 32px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '.85rem', outline: 'none', fontFamily: 'inherit', width: 220 }}
                  onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--gray-200)')} />
              </div>
              <button
                id="expense-export-excel-btn"
                onClick={() => { setExportMode('excel'); setExportModalOpen(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--gray-200)', background: '#fff', color: 'var(--gray-700)', fontSize: '.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                onMouseEnter={e => {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.background = 'var(--surface-1)'
                  b.style.borderColor = 'var(--gray-300)'
                }}
                onMouseLeave={e => {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.background = '#fff'
                  b.style.borderColor = 'var(--gray-200)'
                }}>
                <FileSpreadsheet size={14} />
                Export Excel
              </button>
              <button
                id="expense-export-pdf-btn"
                onClick={() => { setExportMode('pdf'); setExportModalOpen(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--gray-200)', background: '#fff', color: 'var(--gray-700)', fontSize: '.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                onMouseEnter={e => {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.background = 'var(--surface-1)'
                  b.style.borderColor = 'var(--gray-300)'
                }}
                onMouseLeave={e => {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.background = '#fff'
                  b.style.borderColor = 'var(--gray-200)'
                }}>
                <FileDown size={14} />
                Export PDF
              </button>
              {isAdmin && (
                <button id="expense-add-btn" disabled={categoriesList.length === 0 || loading} onClick={() => { setForm(emptyForm(categoriesList[0]?.name || '')); setAddOpen(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: categoriesList.length === 0 || loading ? 'var(--gray-300)' : 'var(--brand-600)', color: '#fff', fontSize: '.85rem', fontWeight: 600, cursor: categoriesList.length === 0 || loading ? 'not-allowed' : 'pointer', border: 'none', transition: 'background .15s' }}
                  onMouseEnter={e => { if (!(categoriesList.length === 0 || loading)) ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-700)') }}
                  onMouseLeave={e => { if (!(categoriesList.length === 0 || loading)) ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-600)') }}>
                  <Plus size={15} /> Add Expense
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div style={{ padding: '14px 18px', color: 'var(--gray-500)', fontSize: '.85rem' }}>Loading expenses...</div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
              <thead style={{ position: 'sticky', top: 0 }}>
                <tr>
                  {['Expense ID', 'Category', 'Amount', 'Date', 'File Linked', 'Recorded By', 'Action'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--gray-500)', background: 'var(--surface-1)', borderBottom: '1px solid var(--gray-100)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No expenses match your search.</td></tr>
                ) : pageRows.map(row => {
                  const cc = categoryColor(row.expense_category_name)
                  return (
                    <tr key={row.id} id={`expense-row-${row.id}`}
                      style={{ cursor: 'default', background: 'transparent', borderLeft: '3px solid transparent', transition: 'background .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}>
                      <td title={row.id} style={{ padding: '12px 14px', color: 'var(--brand-700)', fontWeight: 600, fontSize: '.82rem', fontFamily: 'monospace' }}>{formatExpenseId(row.id)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '.75rem', fontWeight: 600, background: cc.bg, color: cc.color }}>
                          <Tag size={10} />{row.expense_category_name}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--gray-900)' }}>{fmt(row.amount)}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--gray-600)' }}>{row.expense_date}</td>
                      <td style={{ padding: '12px 14px' }}>
                        {row.file_number
                          ? <span style={{ color: 'var(--brand-600)', fontWeight: 600 }}>{row.file_number}</span>
                          : <span style={{ color: 'var(--gray-300)', fontSize: '.8rem' }}>-</span>}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--gray-700)' }}>{row.created_by_name}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <button className="btn btn-outline btn-sm" style={{ padding: '5px 12px', fontSize: '.78rem' }} onClick={() => { setSelected(row); setViewOpen(true) }} title="View details"><Eye size={13} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination total={filtered.length} page={safePage} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        </div>
      </div>

      {viewOpen && selected && (
        <div className="modal-backdrop" onClick={closeView}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Expense - {formatExpenseId(selected.id)}</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeView}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0 20px', borderBottom: '1px solid var(--gray-100)', marginBottom: 16 }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: categoryColor(selected.expense_category_name).bg, color: categoryColor(selected.expense_category_name).color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Wallet size={22} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--gray-900)', textAlign: 'center' }}>{selected.expense_category_name}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--gray-400)', marginTop: 2 }}>Recorded by {selected.created_by_name}</div>
                <div style={{ marginTop: 12, padding: '8px 20px', background: 'var(--brand-50)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '.7rem', color: 'var(--brand-600)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Amount Spent</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-700)' }}>{fmt(selected.amount)}</div>
                </div>
                
                {/* Hide Edit and Delete for Non-Admins */}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button id={`expense-edit-${selected.id}`} onClick={() => { openEdit(selected); setViewOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--brand-200)', background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-100)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-50)')}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button id={`expense-delete-${selected.id}`} onClick={() => { handleDelete(selected.id); closeView() }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid #fee2e2', background: '#fff5f5', color: '#b91c1c', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#fee2e2')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#fff5f5')}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <DetailRow icon={<Hash size={14} />} label="Expense ID" value={formatExpenseId(selected.id)} />
                <DetailRow icon={<Tag size={14} />} label="Category" value={selected.expense_category_name} />
                <DetailRow icon={<Banknote size={14} />} label="Amount" value={`₹${selected.amount.toLocaleString('en-IN')}`} />
                <DetailRow icon={<Calendar size={14} />} label="Expense Date" value={selected.expense_date} />
                <DetailRow icon={<FileText size={14} />} label="Linked File" value={selected.file_number || '-'} />
                <DetailRow icon={<User size={14} />} label="Recorded By" value={selected.created_by_name} />
                <DetailRow icon={<Calendar size={14} />} label="Recorded At" value={new Date(selected.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} />
                <DetailRow icon={<AlignLeft size={14} />} label="Remarks" value={selected.remarks || ''} />
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={addOpen} title="Add Expense" onClose={() => setAddOpen(false)} onSubmit={handleAdd} submitLabel="Add Expense">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Category *">
              <select className="form-select" style={{ width: '100%' }} value={form.expense_category_name} onChange={f('expense_category_name')}>
                {categoriesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Amount (₹) *"><input className="form-input" type="number" value={form.amount || ''} onChange={f('amount')} placeholder="0" required /></FormField>
            <FormField label="Expense Date *"><input className="form-input" type="date" value={form.expense_date} onChange={f('expense_date')} required /></FormField>
            <FormField label="Linked File (optional)">
              <select className="form-input" style={{ width: '100%' }} value={form.file_number}
                onChange={e => setForm(prev => ({ ...prev, file_number: e.target.value }))}>
                <option value="">None / Select file...</option>
                {fileOptions.map(file => (
                  <option key={file.id} value={file.file_number}>{file.file_number} - {file.customer || file.full_name || '-'}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Recorded By"><input className="form-input" value="Current logged-in user" disabled style={{ backgroundColor: 'var(--surface-1)', color: 'var(--gray-500)' }} /></FormField>
          </div>
          <FormField label="Remarks"><textarea className="form-input" rows={2} value={form.remarks} onChange={f('remarks')} style={{ resize: 'vertical' }} /></FormField>
        </div>
      </Modal>

      <Modal open={editOpen} title={`Edit Expense - ${selected ? formatExpenseId(selected.id) : ''}`} onClose={() => setEditOpen(false)} onSubmit={handleEdit} submitLabel="Save Changes">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Category">
              <select className="form-select" style={{ width: '100%' }} value={form.expense_category_name} onChange={f('expense_category_name')}>
                {categoriesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Amount (₹)"><input className="form-input" type="number" value={form.amount || ''} onChange={f('amount')} /></FormField>
            <FormField label="Expense Date"><input className="form-input" type="date" value={form.expense_date} onChange={f('expense_date')} /></FormField>
            <FormField label="Linked File">
              <select className="form-input" style={{ width: '100%' }} value={form.file_number}
                onChange={e => setForm(prev => ({ ...prev, file_number: e.target.value }))}>
                <option value="">None / Select file...</option>
                {fileOptions.map(file => (
                  <option key={file.id} value={file.file_number}>{file.file_number} - {file.customer || file.full_name || '-'}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Recorded By"><input className="form-input" value={form.created_by_name} disabled style={{ backgroundColor: 'var(--surface-1)', color: 'var(--gray-500)' }} /></FormField>
          </div>
          <FormField label="Remarks"><textarea className="form-input" rows={2} value={form.remarks} onChange={f('remarks')} style={{ resize: 'vertical' }} /></FormField>
        </div>
      </Modal>

      <SelectiveExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Select Expenses to Export"
        rows={filtered}
        getRecordName={(r) => `${r.expense_category_name} (Amount: ₹${r.amount.toLocaleString('en-IN')})`}
        getRecordIdentifier={(r) => formatExpenseId(r.id)}
        mode={exportMode}
        onExportExcel={exportExcel}
        onExportTable={exportPDF}
        onExportZip={async (selected) => {
          await exportDetailPDFsAsZip(
            `expense_details_${new Date().toISOString().slice(0, 10)}`,
            selected,
            (r) => [
              { label: 'Expense ID', value: formatExpenseId(r.id) },
              { label: 'Category', value: r.expense_category_name },
              { label: 'Amount', value: '₹' + Number(r.amount || 0).toLocaleString('en-IN') },
              { label: 'Expense Date', value: r.expense_date || '—' },
              { label: 'Linked File Number', value: r.file_number || '—' },
              { label: 'Recorded By', value: r.created_by_name || '—' },
              { label: 'Created At Timestamp', value: r.created_at || '—' },
              { label: 'Remarks', value: r.remarks || '—' }
            ],
            (r) => `expense_${formatExpenseId(r.id)}_${r.expense_category_name}`,
            'Expense Voucher',
            'Voucher'
          )
        }}
      />
    </div>
  )
}