import { useEffect, useState } from 'react'
import { message } from 'antd'
import {
  Plus, X, Pencil, PowerOff, Power,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  RotateCcw, Eye, EyeOff,
} from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import { usersSettingsApi, rolesApi } from '../../api/services'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SystemUser {
  id: string
  first_name: string
  last_name: string | null
  email: string
  phone_number: string | null
  role_id: string | null
  role_name: string | null
  is_active: boolean
  last_login: string | null
  created_at: string | null
}

interface Role {
  id: string
  role_name: string
  description: string | null
}

const EMPTY_CREATE = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  phone_number: '',
  role_id: '',
  is_active: true,
}

const EMPTY_EDIT = {
  first_name: '',
  last_name: '',
  phone_number: '',
  role_id: '',
  is_active: true,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeLabel(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function RoleBadge({ name }: { name: string | null }) {
  const colors: Record<string, { bg: string; color: string }> = {
    admin: { bg: '#fef3c7', color: '#92400e' },
    manager: { bg: '#eff6ff', color: '#1d4ed8' },
    staff: { bg: '#f0fdf4', color: '#15803d' },
    agent: { bg: '#fdf4ff', color: '#7e22ce' },
  }
  const key = (name || '').toLowerCase()
  const style = colors[key] || { bg: 'var(--gray-100)', color: 'var(--gray-600)' }
  return (
    <span style={{
      ...style, padding: '3px 10px', borderRadius: 99,
      fontSize: '.74rem', fontWeight: 700, textTransform: 'capitalize',
    }}>
      {name || 'No Role'}
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return active
    ? <span style={{ background: '#f0fdf4', color: '#15803d', padding: '3px 10px', borderRadius: 99, fontSize: '.74rem', fontWeight: 700 }}>● Active</span>
    : <span style={{ background: '#fef2f2', color: '#b91c1c', padding: '3px 10px', borderRadius: 99, fontSize: '.74rem', fontWeight: 700 }}>○ Inactive</span>
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ total, page, pageSize, onPage, onPageSize }: {
  total: number; page: number; pageSize: number
  onPage: (p: number) => void; onPageSize: (s: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return (
    <div className="pagination-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="pagination-info">Showing {start}–{end} of {total} records</span>
        <select className="page-size-select" value={pageSize} onChange={e => { onPageSize(Number(e.target.value)); onPage(1) }}>
          {[10, 20, 50].map(s => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
      <div className="pagination-controls">
        <button className="page-btn" onClick={() => onPage(1)} disabled={page === 1}><ChevronsLeft size={14} /></button>
        <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1}><ChevronLeft size={14} /></button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | '...')[]>((acc, p, i, arr) => {
            if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
            acc.push(p)
            return acc
          }, [])
          .map((p, i) => p === '...'
            ? <span key={`d${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)', fontSize: '.84rem' }}>…</span>
            : <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => onPage(p as number)}>{p}</button>
          )
        }
        <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages}><ChevronRight size={14} /></button>
        <button className="page-btn" onClick={() => onPage(totalPages)} disabled={page === totalPages}><ChevronsRight size={14} /></button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [rows, setRows] = useState<SystemUser[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [roles, setRoles] = useState<Role[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE })
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [savingCreate, setSavingCreate] = useState(false)

  // Edit modal
  const [editUser, setEditUser] = useState<SystemUser | null>(null)
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  // Toggle loading
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  async function loadUsers() {
    try {
      const res = await usersSettingsApi.list(page, pageSize, search)
      setRows(res.data || [])
      setTotalRows(res.total || 0)
    } catch {
      message.error('Failed to load users')
    }
  }

  async function loadRoles() {
    try {
      const data = await rolesApi.list()
      setRoles(data || [])
    } catch {
      message.error('Failed to load roles')
    }
  }

  useEffect(() => { loadRoles() }, [])
  useEffect(() => { loadUsers() }, [page, pageSize, search])

  // ── Create form ───────────────────────────────────────────────────────────

  function setCreateField(key: keyof typeof EMPTY_CREATE, value: any) {
    setCreateForm(prev => ({ ...prev, [key]: value }))
    if (createErrors[key]) setCreateErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  function validateCreate() {
    const e: Record<string, string> = {}
    if (!createForm.first_name.trim()) e.first_name = 'First name is required'
    if (!createForm.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) e.email = 'Invalid email address'
    if (!createForm.password) e.password = 'Password is required'
    else if (createForm.password.length < 6) e.password = 'Password must be at least 6 characters'
    if (createForm.phone_number && !/^\d{10,15}$/.test(createForm.phone_number.replace(/\D/g, '')))
      e.phone_number = 'Enter a valid 10–15 digit phone number'
    setCreateErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleCreate() {
    if (!validateCreate()) return
    setSavingCreate(true)
    try {
      await usersSettingsApi.create({
        first_name: createForm.first_name.trim(),
        last_name: createForm.last_name.trim() || null,
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        phone_number: createForm.phone_number.trim() || null,
        role_id: createForm.role_id || null,
        is_active: createForm.is_active,
      })
      message.success('User created successfully')
      setShowCreate(false)
      setCreateForm({ ...EMPTY_CREATE })
      setCreateErrors({})
      loadUsers()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (typeof detail === 'string') message.error(detail)
      else message.error('Failed to create user')
    } finally {
      setSavingCreate(false)
    }
  }

  // ── Edit form ─────────────────────────────────────────────────────────────

  function openEdit(u: SystemUser) {
    setEditUser(u)
    setEditForm({
      first_name: u.first_name,
      last_name: u.last_name || '',
      phone_number: u.phone_number || '',
      role_id: u.role_id || '',
      is_active: u.is_active,
    })
    setEditErrors({})
  }

  function setEditField(key: keyof typeof EMPTY_EDIT, value: any) {
    setEditForm(prev => ({ ...prev, [key]: value }))
    if (editErrors[key]) setEditErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  function validateEdit() {
    const e: Record<string, string> = {}
    if (!editForm.first_name.trim()) e.first_name = 'First name is required'
    if (editForm.phone_number && !/^\d{10,15}$/.test(editForm.phone_number.replace(/\D/g, '')))
      e.phone_number = 'Enter a valid 10–15 digit phone number'
    setEditErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleEdit() {
    if (!editUser || !validateEdit()) return
    setSavingEdit(true)
    try {
      await usersSettingsApi.update(editUser.id, {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim() || null,
        phone_number: editForm.phone_number.trim() || null,
        role_id: editForm.role_id || null,
        is_active: editForm.is_active,
      })
      message.success('User updated successfully')
      setEditUser(null)
      loadUsers()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (typeof detail === 'string') message.error(detail)
      else message.error('Failed to update user')
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  async function handleToggleActive(u: SystemUser) {
    setTogglingId(u.id)
    try {
      await usersSettingsApi.toggleActive(u.id)
      message.success(`User ${u.is_active ? 'deactivated' : 'activated'}`)
      loadUsers()
    } catch {
      message.error('Failed to update user status')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Manage system users, roles, and access permissions"
      />

      {/* ── Filter bar ── */}
      <div className="pay-filter-row">
        <div className="pay-filter-group grow">
          <span className="pay-filter-label">Search</span>
          <input
            id="users-search"
            className="pay-filter-input"
            placeholder="Name, email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        {search && (
          <button className="pay-filter-reset" onClick={() => { setSearch(''); setPage(1) }}>
            <RotateCcw size={13} style={{ marginRight: 4 }} />Reset
          </button>
        )}
        <button
          id="users-invite-btn"
          className="btn btn-primary btn-sm"
          style={{ alignSelf: 'flex-end' }}
          onClick={() => { setShowCreate(true); setCreateErrors({}); setCreateForm({ ...EMPTY_CREATE }) }}
        >
          <Plus size={14} /> Invite User
        </button>
      </div>

      {/* ── Table ── */}
      <div className="data-card">
        {rows.length === 0 ? (
          <div className="data-empty">
            {search ? 'No users match your search.' : 'No users found. Click "Invite User" to add the first one.'}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u, i) => (
                    <tr key={u.id}>
                      <td style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>
                        {(page - 1) * pageSize + i + 1}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: '.86rem', flexShrink: 0,
                          }}>
                            {u.first_name[0]?.toUpperCase()}{u.last_name?.[0]?.toUpperCase() || ''}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: '.9rem' }}>
                              {u.first_name} {u.last_name || ''}
                            </div>
                            <div style={{ fontSize: '.74rem', color: 'var(--gray-400)' }}>
                              #{u.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '.84rem', color: 'var(--gray-600)' }}>{u.email}</td>
                      <td style={{ fontSize: '.84rem', color: 'var(--gray-500)' }}>{u.phone_number || '—'}</td>
                      <td><RoleBadge name={u.role_name} /></td>
                      <td><StatusBadge active={u.is_active} /></td>
                      <td style={{ fontSize: '.8rem', color: 'var(--gray-400)' }}>{timeLabel(u.last_login)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: '5px 10px' }}
                            title="Edit user"
                            onClick={() => openEdit(u)}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{
                              padding: '5px 10px',
                              background: u.is_active ? '#fef2f2' : '#f0fdf4',
                              color: u.is_active ? '#b91c1c' : '#15803d',
                              border: `1px solid ${u.is_active ? '#fca5a5' : '#86efac'}`,
                            }}
                            title={u.is_active ? 'Deactivate user' : 'Activate user'}
                            disabled={togglingId === u.id}
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.is_active ? <PowerOff size={13} /> : <Power size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              total={totalRows}
              page={page}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
            />
          </>
        )}
      </div>

      {/* ── Create User Modal ── */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Invite New User</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}><X size={16} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleCreate() }}>
              <div className="modal-body">
                <div className="modal-grid-2">
                  {/* Names */}
                  <div className="modal-section-label">Personal Information</div>

                  <div className="form-group">
                    <label className="form-label">First Name <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input
                      id="user-first-name"
                      className={`form-input${createErrors.first_name ? ' error' : ''}`}
                      placeholder="e.g. Raj"
                      value={createForm.first_name}
                      onChange={e => setCreateField('first_name', e.target.value)}
                    />
                    {createErrors.first_name && <span className="form-error">{createErrors.first_name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      id="user-last-name"
                      className="form-input"
                      placeholder="e.g. Sharma"
                      value={createForm.last_name}
                      onChange={e => setCreateField('last_name', e.target.value)}
                    />
                  </div>

                  {/* Email & Phone */}
                  <div className="modal-section-label">Contact & Access</div>

                  <div className="form-group modal-full">
                    <label className="form-label">Email Address <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input
                      id="user-email"
                      type="email"
                      className={`form-input${createErrors.email ? ' error' : ''}`}
                      placeholder="e.g. raj.sharma@autonidhi.com"
                      value={createForm.email}
                      onChange={e => setCreateField('email', e.target.value)}
                    />
                    {createErrors.email && <span className="form-error">{createErrors.email}</span>}
                  </div>

                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Password <span style={{ color: 'var(--error)' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="user-password"
                        type={showPassword ? 'text' : 'password'}
                        className={`form-input${createErrors.password ? ' error' : ''}`}
                        placeholder="Min. 6 characters"
                        value={createForm.password}
                        onChange={e => setCreateField('password', e.target.value)}
                        style={{ paddingRight: 40 }}
                      />
                      <button
                        type="button"
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}
                        onClick={() => setShowPassword(p => !p)}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {createErrors.password && <span className="form-error">{createErrors.password}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      id="user-phone"
                      className={`form-input${createErrors.phone_number ? ' error' : ''}`}
                      placeholder="e.g. 9876543210"
                      value={createForm.phone_number}
                      onChange={e => setCreateField('phone_number', e.target.value)}
                    />
                    {createErrors.phone_number && <span className="form-error">{createErrors.phone_number}</span>}
                  </div>

                  {/* Role & Status */}
                  <div className="modal-section-label">Role & Permissions</div>

                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select
                      id="user-role"
                      className="form-input"
                      value={createForm.role_id}
                      onChange={e => setCreateField('role_id', e.target.value)}
                    >
                      <option value="">— Select role —</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
                    </select>
                  </div>

                  <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                    <label className="form-label" style={{ userSelect: 'none', cursor: 'pointer' }}>
                      <input
                        id="user-active"
                        type="checkbox"
                        checked={createForm.is_active}
                        onChange={e => setCreateField('is_active', e.target.checked)}
                        style={{ marginRight: 8, accentColor: 'var(--brand-600)', width: 15, height: 15 }}
                      />
                      Active immediately
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" id="user-create-btn" className="btn btn-primary btn-sm" disabled={savingCreate}>
                  <Plus size={14} />
                  {savingCreate ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editUser && (
        <div className="modal-backdrop" onClick={() => setEditUser(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit User — {editUser.first_name} {editUser.last_name || ''}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditUser(null)}><X size={16} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleEdit() }}>
              <div className="modal-body">
                <div className="modal-grid-2">
                  <div className="modal-section-label">Personal Information</div>

                  <div className="form-group">
                    <label className="form-label">First Name <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input
                      id="edit-user-first-name"
                      className={`form-input${editErrors.first_name ? ' error' : ''}`}
                      value={editForm.first_name}
                      onChange={e => setEditField('first_name', e.target.value)}
                    />
                    {editErrors.first_name && <span className="form-error">{editErrors.first_name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      id="edit-user-last-name"
                      className="form-input"
                      value={editForm.last_name}
                      onChange={e => setEditField('last_name', e.target.value)}
                    />
                  </div>

                  <div className="modal-section-label">Contact & Role</div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      id="edit-user-phone"
                      className={`form-input${editErrors.phone_number ? ' error' : ''}`}
                      value={editForm.phone_number}
                      onChange={e => setEditField('phone_number', e.target.value)}
                      placeholder="10–15 digit number"
                    />
                    {editErrors.phone_number && <span className="form-error">{editErrors.phone_number}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select
                      id="edit-user-role"
                      className="form-input"
                      value={editForm.role_id}
                      onChange={e => setEditField('role_id', e.target.value)}
                    >
                      <option value="">— No role —</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
                    </select>
                  </div>

                  <div className="form-group modal-full" style={{ justifyContent: 'flex-end' }}>
                    <label className="form-label" style={{ userSelect: 'none', cursor: 'pointer' }}>
                      <input
                        id="edit-user-active"
                        type="checkbox"
                        checked={editForm.is_active}
                        onChange={e => setEditField('is_active', e.target.checked)}
                        style={{ marginRight: 8, accentColor: 'var(--brand-600)', width: 15, height: 15 }}
                      />
                      User is Active
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditUser(null)}>Cancel</button>
                <button type="submit" id="user-edit-save-btn" className="btn btn-primary btn-sm" disabled={savingEdit}>
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
