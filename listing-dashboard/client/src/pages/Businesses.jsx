import { useEffect, useState } from 'react';
import { getBusinesses, createBusiness, updateBusiness, deleteBusiness } from '../api';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

const EMPTY = { business_name: '', contact_name: '', contact_email: '', contact_phone: '', notes: '' };

export default function Businesses() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | business obj
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = () => getBusinesses().then(d => { setList(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY); setModal('add'); setError(''); };
  const openEdit = (b) => { setForm({ ...b }); setModal(b); setError(''); };
  const closeModal = () => setModal(null);

  const save = async () => {
    if (!form.business_name.trim()) { setError('Business name is required.'); return; }
    setSaving(true); setError('');
    try {
      if (modal === 'add') await createBusiness(form);
      else await updateBusiness(modal.id, form);
      await load();
      closeModal();
    } catch (e) {
      setError(e.response?.data?.error || 'Save failed.');
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this business and all its listings?')) return;
    await deleteBusiness(id);
    load();
  };

  const filtered = list.filter(b =>
    b.business_name.toLowerCase().includes(search.toLowerCase()) ||
    (b.contact_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Businesses / Customers</div>
          <div className="page-sub">{list.length} total customers logged</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/> Add Business</button>
      </div>

      <div className="filters-bar">
        <input placeholder="Search businesses..." value={search} onChange={e => setSearch(e.target.value)} style={{maxWidth:260}} />
      </div>

      <div className="card">
        {loading ? <div className="loading">Loading...</div> : filtered.length === 0 ? (
          <div className="empty">No businesses yet. Add your first customer above.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Business Name</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Listings</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id}>
                  <td><strong>{b.business_name}</strong></td>
                  <td>{b.contact_name || '—'}</td>
                  <td>{b.contact_email ? <a href={`mailto:${b.contact_email}`}>{b.contact_email}</a> : '—'}</td>
                  <td>{b.contact_phone || '—'}</td>
                  <td><span className="badge badge-active">{b.listing_count}</span></td>
                  <td style={{fontSize:12, color:'#6b7280'}}>{new Date(b.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{display:'flex', gap:6}}>
                      <button className="btn btn-sm btn-ghost" onClick={() => openEdit(b)}><Pencil size={13}/></button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(b.id)}><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              {modal === 'add' ? 'Add Business' : 'Edit Business'}
              <button className="btn btn-sm btn-ghost" onClick={closeModal}><X size={16}/></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-grid">
                <div className="form-group span-2">
                  <label>Business Name *</label>
                  <input value={form.business_name} onChange={e => setForm({...form, business_name: e.target.value})} placeholder="ABC Commercial Properties" />
                </div>
                <div className="form-group">
                  <label>Contact Name</label>
                  <input value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} placeholder="John Smith" />
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} placeholder="(555) 000-0000" />
                </div>
                <div className="form-group span-2">
                  <label>Email</label>
                  <input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} placeholder="john@example.com" />
                </div>
                <div className="form-group span-2">
                  <label>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Internal notes about this customer..." />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
