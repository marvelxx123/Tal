import { useEffect, useState } from 'react';
import { getActivity, logActivity, deleteActivity, getListings, getBusinesses } from '../api';
import { Plus, X, Trash2, Mail, Phone, MessageSquare, UserCheck, Calendar } from 'lucide-react';

const ACTION_TYPES = [
  'Email Sent — Free Sample',
  'Email Sent — Follow Up',
  'Email Sent — Proposal',
  'Phone Call',
  'Meeting Scheduled',
  'Meeting Completed',
  'Contract Sent',
  'Contract Signed',
  'Declined',
  'No Response',
  'Note',
];

const ACTION_ICONS = {
  'Email Sent — Free Sample': Mail,
  'Email Sent — Follow Up': Mail,
  'Email Sent — Proposal': Mail,
  'Phone Call': Phone,
  'Meeting Scheduled': Calendar,
  'Meeting Completed': UserCheck,
  'Contract Sent': MessageSquare,
  'Contract Signed': UserCheck,
  'Declined': X,
  'No Response': MessageSquare,
  'Note': MessageSquare,
};

const ACTION_COLORS = {
  'Email Sent — Free Sample': '#2563eb',
  'Email Sent — Follow Up': '#2563eb',
  'Email Sent — Proposal': '#7c3aed',
  'Phone Call': '#16a34a',
  'Meeting Scheduled': '#d97706',
  'Meeting Completed': '#16a34a',
  'Contract Sent': '#7c3aed',
  'Contract Signed': '#16a34a',
  'Declined': '#dc2626',
  'No Response': '#6b7280',
  'Note': '#6b7280',
};

const EMPTY = { listing_id: '', business_id: '', action_type: 'Email Sent — Free Sample', contact_name: '', contact_email: '', contact_phone: '', notes: '' };

export default function ActivityLog() {
  const [log, setLog] = useState([]);
  const [listings, setListings] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [filterBiz, setFilterBiz] = useState('');

  const load = () => getActivity().then(d => { setLog(d); setLoading(false); });
  useEffect(() => {
    Promise.all([load(), getListings().then(setListings), getBusinesses().then(setBusinesses)]);
  }, []);

  const save = async () => {
    if (!form.action_type) return;
    setSaving(true);
    await logActivity(form);
    await load();
    setModal(false);
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm('Delete this log entry?')) return;
    await deleteActivity(id); load();
  };

  const filtered = filterBiz ? log.filter(e => e.business_id === filterBiz || e.business_name?.toLowerCase().includes(filterBiz.toLowerCase())) : log;

  // When listing changes, auto-fill business_id
  const handleListingChange = (listing_id) => {
    const l = listings.find(x => x.id === listing_id);
    setForm(f => ({ ...f, listing_id, business_id: l?.business_id || f.business_id }));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Activity Log</div>
          <div className="page-sub">Track every email, call, and follow-up per listing</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal(true); }}>
          <Plus size={15}/> Log Activity
        </button>
      </div>

      <div className="filters-bar">
        <select value={filterBiz} onChange={e => setFilterBiz(e.target.value)} style={{minWidth:220}}>
          <option value="">All Businesses</option>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? <div className="loading">Loading...</div> : filtered.length === 0 ? (
          <div className="empty">No activity logged yet.</div>
        ) : (
          <div style={{padding:'8px 0'}}>
            {filtered.map((entry, i) => {
              const Icon = ACTION_ICONS[entry.action_type] || MessageSquare;
              const color = ACTION_COLORS[entry.action_type] || '#6b7280';
              return (
                <div key={entry.id} style={{display:'flex', gap:16, padding:'14px 20px', borderBottom: i < filtered.length-1 ? '1px solid var(--border)' : 'none'}}>
                  <div style={{width:36, height:36, borderRadius:'50%', background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2}}>
                    <Icon size={16} style={{color}} />
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
                      <span style={{fontWeight:600, fontSize:14, color:'var(--text-h)'}}>{entry.action_type}</span>
                      {entry.business_name && (
                        <span style={{fontSize:12, background:'#f3f4f6', color:'#374151', padding:'2px 8px', borderRadius:999}}>{entry.business_name}</span>
                      )}
                      {entry.property_address && (
                        <span style={{fontSize:12, color:'#6b7280'}}>{entry.property_address}, {entry.city}</span>
                      )}
                    </div>
                    {(entry.contact_name || entry.contact_email || entry.contact_phone) && (
                      <div style={{fontSize:13, color:'#6b7280', marginTop:3, display:'flex', gap:12, flexWrap:'wrap'}}>
                        {entry.contact_name && <span>👤 {entry.contact_name}</span>}
                        {entry.contact_email && <a href={`mailto:${entry.contact_email}`} style={{color:'var(--accent)'}}>{entry.contact_email}</a>}
                        {entry.contact_phone && <span>📞 {entry.contact_phone}</span>}
                      </div>
                    )}
                    {entry.notes && (
                      <div style={{fontSize:13, color:'#374151', marginTop:5, background:'#f8fafc', borderRadius:6, padding:'6px 10px', borderLeft:'3px solid var(--border)'}}>
                        {entry.notes}
                      </div>
                    )}
                    <div style={{fontSize:11, color:'#9ca3af', marginTop:5}}>
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-danger" style={{alignSelf:'flex-start'}} onClick={() => remove(entry.id)}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              Log Activity
              <button className="btn btn-sm btn-ghost" onClick={() => setModal(false)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group span-2">
                  <label>Action Type *</label>
                  <select value={form.action_type} onChange={e => setForm({...form, action_type: e.target.value})}>
                    {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group span-2">
                  <label>Listing (optional)</label>
                  <select value={form.listing_id} onChange={e => handleListingChange(e.target.value)}>
                    <option value="">No specific listing</option>
                    {listings.map(l => <option key={l.id} value={l.id}>{l.property_address}, {l.city} — {l.business_name}</option>)}
                  </select>
                </div>
                <div className="form-group span-2">
                  <label>Business</label>
                  <select value={form.business_id} onChange={e => setForm({...form, business_id: e.target.value})}>
                    <option value="">Select business...</option>
                    {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Contact Name</label>
                  <input value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} placeholder="Person you contacted" />
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} placeholder="(555) 000-0000" />
                </div>
                <div className="form-group span-2">
                  <label>Contact Email</label>
                  <input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} placeholder="agent@example.com" />
                </div>
                <div className="form-group span-2">
                  <label>Notes</label>
                  <textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="What did you send? What was the outcome? Any follow-up needed?" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Log It'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
