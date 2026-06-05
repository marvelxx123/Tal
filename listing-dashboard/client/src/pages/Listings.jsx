import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getListings, getBusinesses, createListing, deleteListing } from '../api';
import { Plus, X, Camera, Trash2, Link2 } from 'lucide-react';
import UrlImport from '../components/UrlImport';

const PROP_TYPES = ['Office', 'Retail', 'Industrial', 'Warehouse', 'Mixed Use', 'Restaurant', 'Medical', 'Land', 'Other'];
const EMPTY = { business_id: '', property_address: '', city: '', state: '', zip: '', property_type: '', square_feet: '', asking_price: '', description: '', listed_date: new Date().toISOString().slice(0, 10), status: 'active' };

export default function Listings() {
  const [listings, setListings] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);

  const load = () => Promise.all([getListings(), getBusinesses()]).then(([l, b]) => {
    setListings(l); setBusinesses(b); setLoading(false);
  });

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.business_id || !form.property_address || !form.city || !form.listed_date) {
      setError('Business, address, city, and listed date are required.'); return;
    }
    setSaving(true); setError('');
    try {
      await createListing(form);
      await load();
      setModal(false);
    } catch (e) { setError(e.response?.data?.error || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this listing?')) return;
    await deleteListing(id); load();
  };

  const filtered = listings.filter(l => {
    if (filter === 'stale' && !(l.days_on_market >= 30 && l.status === 'active')) return false;
    if (filter === 'active' && l.status !== 'active') return false;
    if (filter === 'sold' && l.status !== 'sold') return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.property_address.toLowerCase().includes(q) && !l.city.toLowerCase().includes(q) && !(l.business_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const domClass = (dom) => dom >= 60 ? 'badge-stale' : dom >= 30 ? 'badge-stale' : 'badge-active';

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Listings</div>
          <div className="page-sub">{listings.length} total listings</div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn btn-primary" style={{background:'#7c3aed'}} onClick={() => setShowImport(v => !v)}>
            <Link2 size={15}/> {showImport ? 'Hide' : 'Import from URL'}
          </button>
          <button className="btn btn-primary" onClick={() => { setForm({...EMPTY, listed_date: new Date().toISOString().slice(0,10)}); setModal(true); setError(''); }}>
            <Plus size={15}/> Add Manually
          </button>
        </div>
      </div>

      {showImport && (
        <div style={{marginBottom:24}}>
          <UrlImport onComplete={() => { setShowImport(false); load(); }} />
        </div>
      )}

      <div className="filters-bar">
        <input placeholder="Search address, city, business..." value={search} onChange={e => setSearch(e.target.value)} style={{maxWidth:280}} />
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Listings</option>
          <option value="stale">30+ Days (Needs Attention)</option>
          <option value="active">Active</option>
          <option value="sold">Sold / Closed</option>
        </select>
      </div>

      <div className="card">
        {loading ? <div className="loading">Loading...</div> : filtered.length === 0 ? (
          <div className="empty">No listings match. Add a listing or adjust filters.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Business</th>
                <th>Type</th>
                <th>Sq Ft</th>
                <th>Asking Price</th>
                <th>Listed</th>
                <th>Days</th>
                <th>Status</th>
                <th>Photos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.property_address}</strong><br/>
                    <span style={{color:'#6b7280', fontSize:12}}>{l.city}{l.state ? `, ${l.state}` : ''} {l.zip}</span>
                  </td>
                  <td style={{fontSize:13}}>{l.business_name}</td>
                  <td style={{fontSize:13}}>{l.property_type || '—'}</td>
                  <td style={{fontSize:13}}>{l.square_feet ? Number(l.square_feet).toLocaleString() : '—'}</td>
                  <td style={{fontSize:13}}>{l.asking_price ? `$${Number(l.asking_price).toLocaleString()}` : '—'}</td>
                  <td style={{fontSize:12, color:'#6b7280'}}>{new Date(l.listed_date).toLocaleDateString()}</td>
                  <td><span className={`badge ${domClass(l.days_on_market)}`}>{l.days_on_market}d</span></td>
                  <td>
                    <span className={`badge ${l.status === 'sold' ? 'badge-sold' : l.days_on_market >= 30 ? 'badge-stale' : 'badge-active'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td>
                    <span style={{display:'flex', alignItems:'center', gap:4, fontSize:13}}>
                      <Camera size={13} style={{color:'#6b7280'}}/> {l.photo_count}
                    </span>
                  </td>
                  <td>
                    <div style={{display:'flex', gap:6}}>
                      <Link to={`/listings/${l.id}`} className="btn btn-sm btn-secondary">Manage</Link>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(l.id)}><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              Add New Listing
              <button className="btn btn-sm btn-ghost" onClick={() => setModal(false)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-grid">
                <div className="form-group span-2">
                  <label>Business / Customer *</label>
                  <select value={form.business_id} onChange={e => setForm({...form, business_id: e.target.value})}>
                    <option value="">Select a business...</option>
                    {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
                  </select>
                </div>
                <div className="form-group span-2">
                  <label>Property Address *</label>
                  <input value={form.property_address} onChange={e => setForm({...form, property_address: e.target.value})} placeholder="123 Main St" />
                </div>
                <div className="form-group">
                  <label>City *</label>
                  <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Los Angeles" />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input value={form.state} onChange={e => setForm({...form, state: e.target.value})} placeholder="CA" />
                </div>
                <div className="form-group">
                  <label>Zip</label>
                  <input value={form.zip} onChange={e => setForm({...form, zip: e.target.value})} placeholder="90001" />
                </div>
                <div className="form-group">
                  <label>Property Type</label>
                  <select value={form.property_type} onChange={e => setForm({...form, property_type: e.target.value})}>
                    <option value="">Select type...</option>
                    {PROP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Square Feet</label>
                  <input type="number" value={form.square_feet} onChange={e => setForm({...form, square_feet: e.target.value})} placeholder="5000" />
                </div>
                <div className="form-group">
                  <label>Asking Price ($)</label>
                  <input type="number" value={form.asking_price} onChange={e => setForm({...form, asking_price: e.target.value})} placeholder="500000" />
                </div>
                <div className="form-group">
                  <label>Listed Date *</label>
                  <input type="date" value={form.listed_date} onChange={e => setForm({...form, listed_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>
                <div className="form-group span-2">
                  <label>Description</label>
                  <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Property description, features, notes..." />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Add Listing'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
