import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getListing, generatePhoto, uploadPhotos, deletePhoto, updateListing, getBusinesses, photoUrl } from '../api';
import { ArrowLeft, Sparkles, Upload, Trash2, RefreshCw, Pencil, X, Save } from 'lucide-react';

export default function ListingDetail() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [genPrompt, setGenPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [businesses, setBusinesses] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const PROP_TYPES = ['Office', 'Retail', 'Industrial', 'Warehouse', 'Mixed Use', 'Restaurant', 'Medical', 'Land', 'Other'];

  const load = () => getListing(id).then(d => { setListing(d); setLoading(false); });
  useEffect(() => { load(); getBusinesses().then(setBusinesses); }, [id]);

  const generate = async () => {
    setGenerating(true); setGenError('');
    try { await generatePhoto(id, genPrompt); await load(); }
    catch (e) { setGenError(e.response?.data?.error || 'Generation failed. Try again.'); }
    finally { setGenerating(false); }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    await uploadPhotos(id, files);
    await load();
    e.target.value = '';
  };

  const removePhoto = async (photoId) => {
    if (!confirm('Delete this photo?')) return;
    await deletePhoto(photoId);
    load();
  };

  const startEdit = () => {
    setEditForm({
      property_address: listing.property_address,
      city: listing.city,
      state: listing.state || '',
      zip: listing.zip || '',
      property_type: listing.property_type || '',
      square_feet: listing.square_feet || '',
      asking_price: listing.asking_price || '',
      description: listing.description || '',
      listed_date: listing.listed_date,
      status: listing.status,
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    await updateListing(id, editForm);
    await load();
    setEditing(false);
    setSaving(false);
  };

  if (loading) return <div className="loading">Loading listing...</div>;
  if (!listing) return <div className="empty">Listing not found.</div>;

  const dom = listing.days_on_market;
  const domClass = dom >= 60 ? 'old' : dom >= 30 ? 'stale' : 'fresh';
  const defaultPrompt = `Commercial real estate exterior photo of ${listing.property_type || 'commercial building'} at ${listing.property_address}, ${listing.city}, professional real estate photography, sunny day, wide angle`;

  return (
    <div>
      <div className="page-header">
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <Link to="/listings" className="btn btn-ghost btn-sm"><ArrowLeft size={14}/> Back</Link>
          <div>
            <div className="page-title">{listing.property_address}</div>
            <div className="page-sub">{listing.city}{listing.state ? `, ${listing.state}` : ''} {listing.zip} · {listing.business_name}</div>
          </div>
        </div>
        <div style={{display:'flex', gap:8}}>
          {!editing && <button className="btn btn-ghost" onClick={startEdit}><Pencil size={14}/> Edit</button>}
          {editing && (
            <>
              <button className="btn btn-secondary" onClick={() => setEditing(false)}><X size={14}/> Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving}><Save size={14}/> {saving ? 'Saving...' : 'Save'}</button>
            </>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-info">
          <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20}}>
            <div className={`dom-badge ${domClass}`}>{dom} days on market</div>
            <span className={`badge ${listing.status === 'sold' ? 'badge-sold' : dom >= 30 ? 'badge-stale' : 'badge-active'}`}>{listing.status}</span>
          </div>

          {!editing ? (
            <div>
              <div className="info-row"><span className="info-label">Property Type</span><span>{listing.property_type || '—'}</span></div>
              <div className="info-row"><span className="info-label">Square Feet</span><span>{listing.square_feet ? Number(listing.square_feet).toLocaleString() : '—'}</span></div>
              <div className="info-row"><span className="info-label">Asking Price</span><span>{listing.asking_price ? `$${Number(listing.asking_price).toLocaleString()}` : '—'}</span></div>
              <div className="info-row"><span className="info-label">Listed Date</span><span>{new Date(listing.listed_date).toLocaleDateString()}</span></div>
              <div className="info-row"><span className="info-label">Business</span><span>{listing.business_name}</span></div>
              {listing.description && (
                <div style={{marginTop:12, fontSize:14, color:'#374151', lineHeight:1.6}}>
                  <strong>Description</strong>
                  <p style={{marginTop:6}}>{listing.description}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="form-grid">
              <div className="form-group">
                <label>Property Address</label>
                <input value={editForm.property_address} onChange={e => setEditForm({...editForm, property_address: e.target.value})} />
              </div>
              <div className="form-group">
                <label>City</label>
                <input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} />
              </div>
              <div className="form-group">
                <label>State</label>
                <input value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Zip</label>
                <input value={editForm.zip} onChange={e => setEditForm({...editForm, zip: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Property Type</label>
                <select value={editForm.property_type} onChange={e => setEditForm({...editForm, property_type: e.target.value})}>
                  <option value="">Select...</option>
                  {PROP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Square Feet</label>
                <input type="number" value={editForm.square_feet} onChange={e => setEditForm({...editForm, square_feet: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Asking Price</label>
                <input type="number" value={editForm.asking_price} onChange={e => setEditForm({...editForm, asking_price: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Listed Date</label>
                <input type="date" value={editForm.listed_date} onChange={e => setEditForm({...editForm, listed_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="sold">Sold</option>
                </select>
              </div>
              <div className="form-group span-2">
                <label>Description</label>
                <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
              </div>
            </div>
          )}
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          {/* AI Generate Panel */}
          <div className="generate-panel">
            <div style={{fontWeight:700, color:'var(--accent)', display:'flex', alignItems:'center', gap:6}}>
              <Sparkles size={16}/> AI Photo Generator
            </div>
            <p style={{fontSize:12, color:'#6b7280', margin:'6px 0 0'}}>Powered by Pollinations.ai (free, no key needed)</p>
            <textarea
              style={{marginTop:10, marginBottom:8, fontSize:13}}
              rows={3}
              value={genPrompt}
              onChange={e => setGenPrompt(e.target.value)}
              placeholder={defaultPrompt}
            />
            {genError && <div className="alert alert-error" style={{marginBottom:8}}>{genError}</div>}
            <button className="btn btn-primary" style={{width:'100%'}} onClick={generate} disabled={generating}>
              {generating ? <><RefreshCw size={14} className="spin"/> Generating...</> : <><Sparkles size={14}/> Generate Photo</>}
            </button>
          </div>

          {/* Upload Panel */}
          <div style={{background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:10, padding:20}}>
            <div style={{fontWeight:700, marginBottom:10, display:'flex', alignItems:'center', gap:6}}>
              <Upload size={16}/> Upload Photos
            </div>
            <input type="file" ref={fileRef} multiple accept="image/*" style={{display:'none'}} onChange={handleUpload} />
            <button className="btn btn-secondary" style={{width:'100%'}} onClick={() => fileRef.current.click()}>
              <Upload size={14}/> Choose Photos
            </button>
            <p style={{fontSize:11, color:'#9ca3af', marginTop:8, textAlign:'center'}}>JPG, PNG, WebP up to 10MB each</p>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <div className="card">
        <div className="card-header">
          <span>Photos ({listing.photos?.length || 0})</span>
        </div>
        <div style={{padding:20}}>
          {!listing.photos?.length ? (
            <div className="empty" style={{padding:32}}>No photos yet. Generate AI photos or upload your own above.</div>
          ) : (
            <div className="photo-grid">
              {listing.photos.map(p => (
                <div key={p.id} className="photo-card">
                  <img src={photoUrl(p.filename)} alt={p.caption || 'listing photo'} loading="lazy" />
                  <div className="photo-overlay">
                    <button className="btn btn-sm btn-danger" onClick={() => removePhoto(p.id)}><Trash2 size={13}/></button>
                  </div>
                  <span className={`photo-source badge ${p.source === 'ai-generated' ? 'badge-ai' : 'badge-sold'}`}>
                    {p.source === 'ai-generated' ? 'AI' : 'Upload'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
