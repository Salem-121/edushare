// ============================================================================
// admin/Dashboard.jsx
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the entire ADMIN area. An admin can manage Users, Modules,
// and Filières (study tracks). The file is organized as several sub-page
// components (DashboardHome, UsersPage, ModulesPage, FilieresPage) plus a ROOT
// component at the bottom that decides which sub-page to show based on the tab.
//
// The three management pages all follow the SAME pattern (it's "CRUD" =
// Create / Read / Update / Delete): load a list, show a table/cards, and open a
// modal form to add or edit, with a confirm dialog before deleting.
// ============================================================================

import { useState } from 'react'
import { Sidebar, Topbar } from '../../components/layout/Layout'   // the page frame
import { useAuth } from '../../context/AuthContext'                // current admin user
import { useFetch } from '../../hooks/useFetch'                    // data-loading hook
import { useHashPage } from '../../hooks/useHashPage'              // remembers the active tab in the URL
import { usersAPI, modulesAPI, filieresAPI } from '../../services/api'
import ConfirmDialog from '../../components/common/ConfirmDialog'  // "are you sure?" popup

// ─── DASHBOARD HOME ──────────────────────────────────
// The landing tab: a row of stat cards + quick lists of users and modules.
function DashboardHome({ users, modules, setPage, setUserRoleFilter }) {
  // Count how many users fall into each role.
  const students = users?.filter(u => u.role === 'STUDENT').length || 0
  const teachers = users?.filter(u => u.role === 'TEACHER').length || 0
  const admins   = users?.filter(u => u.role === 'ADMIN').length || 0
  // Add up the lesson counts across all modules. (reduce = run a total.)
  const lessons  = (modules || []).reduce((sum, m) => sum + (m._count?.lessons || 0), 0)

  // Jump to the Users page pre-filtered to a role.
  const goUsers = (role) => { setUserRoleFilter(role); setPage('admin-users') }

  const stats = [
    { icon: 'ti-users',     val: students,             label: 'Students', onClick: () => goUsers('student') },
    { icon: 'ti-school',    val: teachers,             label: 'Teachers', onClick: () => goUsers('teacher') },
    { icon: 'ti-shield',    val: admins,               label: 'Admins',   onClick: () => goUsers('admin') },
    { icon: 'ti-books',     val: modules?.length || 0, label: 'Modules',  onClick: () => setPage('admin-modules') },
    { icon: 'ti-file-text', val: lessons,              label: 'Lessons',  onClick: () => setPage('admin-modules') },
  ]

  return (
    <div className="content">
      <div className="page-header">
        <div className="page-title"><em>Admin</em> Dashboard</div>
        <div className="page-sub">Platform overview at a glance.</div>
      </div>
      <div className="stats-grid">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            className="stat-card-btn"
            onClick={s.onClick}
            aria-label={`${s.label}: ${s.val}. Open ${s.label}.`}
          >
            <div className="stat-card">
              <div className="stat-icon"><i className={`ti ${s.icon}`} aria-hidden="true" /></div>
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-hint">Open <i className="ti ti-arrow-right" aria-hidden="true" style={{ fontSize: 11 }} /></div>
            </div>
          </button>
        ))}
      </div>
      <div className="two-col">
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>All Users</div>
          {users?.slice(0, 6).map((u, i) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: i < 5 ? '1px solid var(--border)' : 'none', marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: 'var(--surface)', flexShrink: 0, letterSpacing: '0.04em' }}>
                {u.firstName?.[0]}{u.lastName?.[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 500 }}>{u.firstName} {u.lastName}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{u.email}</div>
              </div>
              <span className={`badge ${u.role === 'ADMIN' ? 'badge-danger' : u.role === 'TEACHER' ? 'badge-gold' : 'badge-neutral'}`}>{u.role.toLowerCase()}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Modules</div>
          {modules?.map((m) => (
            <div key={m.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{m.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{m._count?.lessons || 0} lessons</span>
              </div>
              <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(((m._count?.lessons || 0) / 50) * 100, 100)}%`, background: 'linear-gradient(90deg,var(--gold),var(--gold2))', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── USERS PAGE ──────────────────────────────────────
// roleFilter is lifted to the root so the dashboard stat cards can deep-link
// here pre-filtered to a role.
function UsersPage({ roleFilter, setRoleFilter }) {
  // --- STATE & DATA --------------------------------------------------------
  const { data: users, loading, refetch } = useFetch(() => usersAPI.getAll())  // the user list (+ reload fn)
  const { data: filieres } = useFetch(() => filieresAPI.getAll())              // options for the filière dropdown
  const [search, setSearch] = useState('')                  // text typed in the search box
  const [modal, setModal] = useState(null)                  // null=closed, 'create'=new, or a user=editing
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'STUDENT', password: '', filiereId: '' })  // modal form fields
  const [saving, setSaving] = useState(false)               // true while the save request runs
  const [error, setError] = useState('')                    // error message inside the modal
  const [confirmDel, setConfirmDel] = useState(null)        // the user pending deletion (for the confirm dialog)
  const [toast, setToast] = useState(null)                  // little bottom popup message
  // Show a toast for 3 seconds then auto-hide it.
  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // Apply the search box + role dropdown to narrow the list shown in the table.
  const filtered = (users || []).filter(u => {
    const q = search.toLowerCase()
    const matchSearch = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q)
    const matchRole = roleFilter === 'all' || u.role === roleFilter.toUpperCase()
    return matchSearch && matchRole
  })

  // Open the modal blank (create) or pre-filled with a user's data (edit).
  const openCreate = () => { setForm({ firstName: '', lastName: '', email: '', role: 'STUDENT', password: 'changeme123', filiereId: '' }); setError(''); setModal('create') }
  const openEdit = (u) => { setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, password: '', filiereId: u.filiereId || '' }); setError(''); setModal(u) }

  // save: send the form to the server — create a new user OR update the edited one.
  const save = async () => {
    setSaving(true); setError('')
    try {
      const payload = { ...form, filiereId: form.filiereId || null }  // empty filière -> null
      if (modal === 'create') await usersAPI.create(payload)
      else await usersAPI.update(modal.id, payload)
      setModal(null); refetch()                              // close modal + reload the list
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  // doDelete: actually delete the user once the confirm dialog is accepted.
  const doDelete = async () => {
    const u = confirmDel
    if (!u) return
    try {
      await usersAPI.delete(u.id); refetch()
      showToast('User deleted')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', false)
    } finally { setConfirmDel(null) }
  }

  return (
    <div className="content">
      <div className="page-header">
        <div className="page-title">User Management</div>
        <div className="page-sub">Manage all platform users</div>
      </div>
      {/* Toolbar: search box, role filter, and the "Create user" button. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="search-bar">
          <i className="ti ti-search" aria-hidden="true" />
          <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="field-input" style={{ width: 'auto', minWidth: 160 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
          <option value="admin">Admins</option>
        </select>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openCreate}>
          <i className="ti ti-plus" aria-hidden="true" />Create user
        </button>
      </div>
      {/* The user table (a spinner shows while loading). */}
      {loading ? <div className="spinner spinner-lg" /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: 'var(--surface)', flexShrink: 0, letterSpacing: '0.04em' }}>
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{u.firstName} {u.lastName}</span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td><span className={`badge ${u.role === 'ADMIN' ? 'badge-danger' : u.role === 'TEACHER' ? 'badge-gold' : 'badge-neutral'}`}>{u.role.toLowerCase()}</span></td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-neutral btn-sm" onClick={() => openEdit(u)}><i className="ti ti-edit" aria-hidden="true" />Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(u)} aria-label="Delete user"><i className="ti ti-trash" aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* The create/edit form popup, only shown when `modal` is set. */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(null)} aria-label="Close"><i className="ti ti-x" aria-hidden="true" /></button>
            <div className="modal-title">{modal === 'create' ? 'Create User' : 'Edit User'}</div>
            <div className="modal-sub">{modal === 'create' ? 'Add a new platform user' : 'Update user information'}</div>
            {error && <div className="alert-error"><i className="ti ti-alert-triangle" aria-hidden="true" /><span>{error}</span></div>}
            <div className="two-col">
              <div className="field"><label className="field-label">First Name</label>
                <input className="field-input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
              <div className="field"><label className="field-label">Last Name</label>
                <input className="field-input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
            </div>
            <div className="field"><label className="field-label">Email</label>
              <input className="field-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            {modal === 'create' && (
              <div className="field"><label className="field-label">Password</label>
                <input className="field-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
            )}
            <div className="field"><label className="field-label">Role</label>
              <select className="field-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="STUDENT">Student</option><option value="TEACHER">Teacher</option><option value="ADMIN">Admin</option>
              </select></div>
            {form.role !== 'ADMIN' && (
              <div className="field"><label className="field-label">Filière</label>
                <select
                  className="field-input"
                  value={form.filiereId}
                  onChange={e => setForm(f => ({ ...f, filiereId: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {(filieres || []).filter(f => f.active).map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <><span className="spinner" style={{ marginRight: 6 }} />Saving…</> : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete this user?"
        message={confirmDel ? `${confirmDel.firstName} ${confirmDel.lastName} will lose all access.` : ''}
        confirmText="Delete"
        danger
        onCancel={() => setConfirmDel(null)}
        onConfirm={doDelete}
      />

      {toast && <div className={`toast ${toast.ok ? 'toast-ok' : 'toast-err'}`} role="status"><i className={`ti ${toast.ok ? 'ti-check' : 'ti-alert-triangle'}`} aria-hidden="true" /><span>{toast.msg}</span></div>}
    </div>
  )
}

// ─── MODULES PAGE ────────────────────────────────────
// Same create/edit/delete pattern as UsersPage, but for academic modules.
// Adds a `toggle` to activate/deactivate a module without deleting it.
function ModulesPage() {
  const { data: modules, loading, refetch } = useFetch(() => modulesAPI.getAll())
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const [toast, setToast] = useState(null)
  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const openCreate = () => { setForm({ name: '', code: '', description: '' }); setError(''); setModal('create') }
  const openEdit = (m) => { setForm({ name: m.name, code: m.code, description: m.description || '' }); setError(''); setModal(m) }

  const save = async () => {
    setSaving(true); setError('')
    try {
      if (modal === 'create') await modulesAPI.create(form)
      else await modulesAPI.update(modal.id, form)
      setModal(null); refetch()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  // toggle: flip a module between active and inactive (active: !m.active).
  const toggle = async (m) => {
    try {
      await modulesAPI.update(m.id, { active: !m.active }); refetch()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update', false)
    }
  }

  const doDelete = async () => {
    const m = confirmDel
    if (!m) return
    try {
      await modulesAPI.delete(m.id); refetch()
      showToast('Module deleted')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', false)
    } finally { setConfirmDel(null) }
  }

  return (
    <div className="content">
      <div className="page-header">
        <div className="page-title">Module Management</div>
        <div className="page-sub">Organize lessons into academic modules</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button className="btn btn-primary" onClick={openCreate}>
          <i className="ti ti-plus" aria-hidden="true" />New module
        </button>
      </div>
      {loading ? <div className="spinner spinner-lg" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(modules || []).map(m => (
            <div key={m.id} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--gold)', flexShrink: 0 }}>
                <i className="ti ti-book-2" aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: m.active ? 'var(--text)' : 'var(--text3)' }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>{m.code} · {m._count?.lessons || 0} lessons</div>
              </div>
              <span className={`badge ${m.active ? 'badge-success' : 'badge-gray'}`}>{m.active ? 'Active' : 'Inactive'}</span>
              <div className="row-actions">
                <button className="btn btn-neutral btn-sm" onClick={() => openEdit(m)} aria-label="Edit module"><i className="ti ti-edit" aria-hidden="true" /></button>
                <button className="btn btn-neutral btn-sm" onClick={() => toggle(m)}>{m.active ? 'Deactivate' : 'Activate'}</button>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(m)} aria-label="Delete module"><i className="ti ti-trash" aria-hidden="true" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(null)} aria-label="Close"><i className="ti ti-x" aria-hidden="true" /></button>
            <div className="modal-title">{modal === 'create' ? 'New Module' : 'Edit Module'}</div>
            <div className="modal-sub">Modules group lessons by subject area</div>
            {error && <div className="alert-error"><i className="ti ti-alert-triangle" aria-hidden="true" /><span>{error}</span></div>}
            <div className="field"><label className="field-label">Module Name</label>
              <input className="field-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Advanced Physics" /></div>
            <div className="field"><label className="field-label">Code</label>
              <input className="field-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. PHYS301" /></div>
            <div className="field"><label className="field-label">Description</label>
              <input className="field-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" /></div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete this module?"
        message={confirmDel ? `"${confirmDel.name}" and all its lessons will be permanently removed.` : ''}
        confirmText="Delete"
        danger
        onCancel={() => setConfirmDel(null)}
        onConfirm={doDelete}
      />

      {toast && <div className={`toast ${toast.ok ? 'toast-ok' : 'toast-err'}`} role="status"><i className={`ti ${toast.ok ? 'ti-check' : 'ti-alert-triangle'}`} aria-hidden="true" /><span>{toast.msg}</span></div>}
    </div>
  )
}

// ─── FILIERES PAGE ───────────────────────────────────
// Identical pattern to ModulesPage, but for filières (fields of study).
function FilieresPage() {
  const { data: filieres, loading, refetch } = useFetch(() => filieresAPI.getAll())
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const [toast, setToast] = useState(null)
  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const openCreate = () => { setForm({ name: '', code: '', description: '' }); setError(''); setModal('create') }
  const openEdit = (f) => { setForm({ name: f.name, code: f.code, description: f.description || '' }); setError(''); setModal(f) }

  const save = async () => {
    setSaving(true); setError('')
    try {
      if (modal === 'create') await filieresAPI.create(form)
      else await filieresAPI.update(modal.id, form)
      setModal(null); refetch()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const toggle = async (f) => {
    try {
      await filieresAPI.update(f.id, { active: !f.active }); refetch()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update', false)
    }
  }

  const doDelete = async () => {
    const f = confirmDel
    if (!f) return
    try {
      await filieresAPI.delete(f.id); refetch()
      showToast('Filière deleted')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', false)
    } finally { setConfirmDel(null) }
  }

  return (
    <div className="content">
      <div className="page-header">
        <div className="page-title">Filière Management</div>
        <div className="page-sub">Fields of study that group students and quizzes</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button className="btn btn-primary" onClick={openCreate}>
          <i className="ti ti-plus" aria-hidden="true" />New filière
        </button>
      </div>
      {loading ? <div className="spinner spinner-lg" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(filieres || []).map(f => (
            <div key={f.id} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--gold)', flexShrink: 0 }}>
                <i className="ti ti-school" aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: f.active ? 'var(--text)' : 'var(--text3)' }}>{f.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>{f.code} · {f._count?.users || 0} users · {f._count?.quizzes || 0} quizzes</div>
              </div>
              <span className={`badge ${f.active ? 'badge-success' : 'badge-gray'}`}>{f.active ? 'Active' : 'Inactive'}</span>
              <div className="row-actions">
                <button className="btn btn-neutral btn-sm" onClick={() => openEdit(f)} aria-label="Edit filière"><i className="ti ti-edit" aria-hidden="true" /></button>
                <button className="btn btn-neutral btn-sm" onClick={() => toggle(f)}>{f.active ? 'Deactivate' : 'Activate'}</button>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(f)} aria-label="Delete filière"><i className="ti ti-trash" aria-hidden="true" /></button>
              </div>
            </div>
          ))}
          {(!filieres || filieres.length === 0) && (
            <div className="empty-state">
              <i className="ti ti-school empty-icon" aria-hidden="true" />
              <div className="empty-text">No filières yet. Create one so students can pick it at registration.</div>
            </div>
          )}
        </div>
      )}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(null)} aria-label="Close"><i className="ti ti-x" aria-hidden="true" /></button>
            <div className="modal-title">{modal === 'create' ? 'New Filière' : 'Edit Filière'}</div>
            <div className="modal-sub">Filières group students by field of study</div>
            {error && <div className="alert-error"><i className="ti ti-alert-triangle" aria-hidden="true" /><span>{error}</span></div>}
            <div className="field"><label className="field-label">Name</label>
              <input className="field-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Computer Science" /></div>
            <div className="field"><label className="field-label">Code</label>
              <input className="field-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. CS" /></div>
            <div className="field"><label className="field-label">Description</label>
              <input className="field-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" /></div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete this filière?"
        message={confirmDel ? `"${confirmDel.name}" will be removed. Users and quizzes linked to it will lose the association.` : ''}
        confirmText="Delete"
        danger
        onCancel={() => setConfirmDel(null)}
        onConfirm={doDelete}
      />

      {toast && <div className={`toast ${toast.ok ? 'toast-ok' : 'toast-err'}`} role="status"><i className={`ti ${toast.ok ? 'ti-check' : 'ti-alert-triangle'}`} aria-hidden="true" /><span>{toast.msg}</span></div>}
    </div>
  )
}

// ─── ROOT ────────────────────────────────────────────
// The top-level component React mounts for the admin area. It wires up the
// sidebar + topbar frame and picks which sub-page to show based on the tab.

// Maps each tab id to the title shown in the top bar.
const PAGE_TITLES = { 'admin-dash': 'Dashboard', 'admin-users': 'User Management', 'admin-modules': 'Modules', 'admin-filieres': 'Filières' }

export default function AdminDashboard() {
  const { user } = useAuth()
  const [page, setPage] = useHashPage('admin-dash')          // which tab is active (saved in the URL)
  const [sidebarOpen, setSidebarOpen] = useState(false)      // mobile sidebar drawer open/closed
  const [userRoleFilter, setUserRoleFilter] = useState('all')// shared so stat cards can deep-link into Users
  const { data: users } = useFetch(() => usersAPI.getAll())  // loaded once for the home dashboard
  const { data: modules } = useFetch(() => modulesAPI.getAll())

  // Choose the sub-page component for the current tab.
  const renderPage = () => {
    if (page === 'admin-users')    return <UsersPage roleFilter={userRoleFilter} setRoleFilter={setUserRoleFilter} />
    if (page === 'admin-modules')  return <ModulesPage />
    if (page === 'admin-filieres') return <FilieresPage />
    return <DashboardHome users={users} modules={modules} setPage={setPage} setUserRoleFilter={setUserRoleFilter} />
  }

  // The shared layout: sidebar on the left, topbar + active page on the right.
  return (
    <div className="layout">
      <Sidebar role={user?.role} page={page} setPage={setPage} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main">
        <Topbar title={PAGE_TITLES[page] || 'Dashboard'} onMenuToggle={() => setSidebarOpen(v => !v)} />
        {renderPage()}
      </div>
    </div>
  )
}
