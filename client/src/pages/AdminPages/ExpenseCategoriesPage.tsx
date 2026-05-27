import { useState, useEffect } from 'react'
import { Pencil, Trash2, Tag, AlertCircle } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import Modal from '../../components/app/Modal'
import { expenseCategoriesApi } from '../../api/services'

interface ExpenseCategory {
  id: string
  name: string
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const formatCategoryId = (id: string) => {
  if (!id) return ''
  if (uuidRe.test(id)) return `CATEGORY-${id.slice(0, 8)}`
  return id
}

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  
  const [editOpen, setEditOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')
  
  const [error, setError] = useState<string | null>(null)

  const loadCategories = async () => {
    setLoading(true)
    try {
      const data = await expenseCategoriesApi.list()
      setCategories(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleAdd = async () => {
    if (!newCategoryName.trim()) {
      setError('Category name cannot be empty')
      return
    }

    try {
      const created = await expenseCategoriesApi.create({
        name: newCategoryName.trim(),
      })

      setCategories((prev) => [...prev, created])
      setNewCategoryName('')
      setAddOpen(false)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add category')
    }
  }

  const handleEdit = async () => {
    if (!selectedCategory) return

    if (!editCategoryName.trim()) {
      setError('Category name cannot be empty')
      return
    }

    try {
      const updated = await expenseCategoriesApi.update(selectedCategory.id, {
        name: editCategoryName.trim(),
      })

      setCategories((prev) =>
        prev.map((c) => (c.id === selectedCategory.id ? updated : c))
      )
      setEditOpen(false)
      setSelectedCategory(null)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update category')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this expense category?')) return

    try {
      await expenseCategoriesApi.remove(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
      setSelectedCategory(null)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete category')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 20 }}>
      <PageHeader title="Expense Categories" subtitle="Manage and configure operating expense categories" />

        {loading && (
          <div style={{ padding: '12px 16px', color: 'var(--gray-500)', fontSize: '.85rem' }}>
            Loading categories...
          </div>
        )}

        {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: 'var(--radius-md)',
            color: '#b91c1c',
            fontSize: '.85rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            {error}
          </span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            &times;
          </button>
        </div>
      )}

      <DataTable
        rows={categories}
        searchKeys={['name', 'id']}
        onAdd={() => {
          setNewCategoryName('')
          setError(null)
          setAddOpen(true)
        }}
        addLabel="Add category"
        columns={[
          {
            key: 'id',
            label: 'ID',
            render: (row) => (
              <span title={row.id} style={{ fontWeight: 600, color: 'var(--brand-700)', fontFamily: 'monospace' }}>
                {formatCategoryId(row.id)}
              </span>
            )
          },
          {
            key: 'name',
            label: 'Category Name',
            render: (row) => (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                <Tag size={13} style={{ color: 'var(--brand-500)' }} />
                {row.name}
              </span>
            )
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: '0.78rem' }}
                  onClick={() => {
                    setSelectedCategory(row)
                    setEditCategoryName(row.name)
                    setError(null)
                    setEditOpen(true)
                  }}
                  title="Edit category"
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    color: 'var(--error)',
                    borderColor: 'rgba(239, 68, 68, 0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)'
                    e.currentTarget.style.borderColor = 'var(--error)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'
                  }}
                  onClick={() => handleDelete(row.id)}
                  title="Delete category"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )
          }
        ]}
      />

      {/* ── Add Modal ── */}
      <Modal
        open={addOpen}
        title="Add Expense Category"
        onClose={() => {
          setAddOpen(false)
          setError(null)
        }}
        onSubmit={handleAdd}
        submitLabel="Add Category"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Category Name *</label>
            <input
              className={`form-input ${error ? 'error' : ''}`}
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value)
                if (error) setError(null)
              }}
              placeholder="e.g. Software Subscriptions"
              required
              autoFocus
            />
          </div>
        </div>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        open={editOpen}
        title={`Edit Expense Category — ${selectedCategory ? formatCategoryId(selectedCategory.id) : ''}`}
        onClose={() => {
          setEditOpen(false)
          setSelectedCategory(null)
          setError(null)
        }}
        onSubmit={handleEdit}
        submitLabel="Save Changes"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Category ID (Read Only)</label>
            <input
              className="form-input"
              value={selectedCategory ? formatCategoryId(selectedCategory.id) : ''}
              disabled
              style={{ backgroundColor: 'var(--surface-1)', color: 'var(--gray-500)', cursor: 'not-allowed' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Category Name *</label>
            <input
              className={`form-input ${error ? 'error' : ''}`}
              value={editCategoryName}
              onChange={(e) => {
                setEditCategoryName(e.target.value)
                if (error) setError(null)
              }}
              required
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
