import { useEffect, useState, useCallback } from 'react'
import { message } from 'antd'
import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import Modal from '../../components/app/Modal'
import { insuranceTypesApi } from '../../api/services'

interface InsuranceType {
  id: string
  insurance_type_name: string
}

export default function InsuranceTypesPage() {
  const [rows, setRows]       = useState<InsuranceType[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)
  const [editRow, setEditRow] = useState<InsuranceType | null>(null)
  const [typeName, setTypeName] = useState('')
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await insuranceTypesApi.list()
      setRows(Array.isArray(res) ? res : res.data ?? [])
    } catch {
      message.error('Failed to load insurance types')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditRow(null)
    setTypeName('')
    setOpen(true)
  }

  const openEdit = (row: InsuranceType) => {
    setEditRow(row)
    setTypeName(row.insurance_type_name)
    setOpen(true)
  }

  const handleSubmit = async () => {
    if (!typeName.trim()) {
      message.warning('Insurance type name is required')
      return
    }
    setSaving(true)
    try {
      const payload = { insurance_type_name: typeName.trim() }
      if (editRow) {
        await insuranceTypesApi.update(editRow.id, payload)
        message.success('Insurance type updated')
      } else {
        await insuranceTypesApi.create(payload)
        message.success('Insurance type added')
      }
      setOpen(false)
      load()
    } catch {
      message.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: InsuranceType) => {
    try {
      await insuranceTypesApi.remove(row.id)
      message.success('Deleted')
      load()
    } catch {
      message.error('Failed to delete')
    }
  }

  return (
    <>
      <PageHeader
        title="Insurance Types"
        subtitle="Master list of all insurance coverage types"
      />

      <DataTable
        rows={rows}
        searchKeys={['insurance_type_name']}
        onAdd={openAdd}
        addLabel="Add Insurance Type"
        columns={[
          {
            key: 'insurance_type_name',
            label: 'Insurance Type Name',
            render: (r: InsuranceType) => (
              <span
                className="auth-link"
                style={{ cursor: 'pointer', fontWeight: 600 }}
                onClick={() => openEdit(r)}
              >
                {r.insurance_type_name}
              </span>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (r: InsuranceType) => (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>Edit</button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#ef4444' }}
                  onClick={() => {
                    if (window.confirm(`Delete "${r.insurance_type_name}"?`)) handleDelete(r)
                  }}
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]}
      />

      {loading && <div style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>Loading…</div>}

      {/* Add / Edit Modal */}
      <Modal
        open={open}
        title={editRow ? 'Edit Insurance Type' : 'Add Insurance Type'}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      >
        <div className="form-group">
          <label className="form-label">
            Insurance Type Name <span className="req">*</span>
          </label>
          <input
            className="form-input"
            placeholder="e.g. Comprehensive, Third Party, Zero Dep…"
            value={typeName}
            onChange={e => setTypeName(e.target.value)}
            required
          />
        </div>
        {saving && <p style={{ color: 'var(--gray-400)', fontSize: '.85rem', marginTop: 8 }}>Saving…</p>}
      </Modal>
    </>
  )
}
