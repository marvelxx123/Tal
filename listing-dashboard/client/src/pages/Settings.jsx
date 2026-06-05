import { useEffect, useState } from 'react';
import { Settings2, Mail, RefreshCw, Check, ChevronRight, ExternalLink } from 'lucide-react';
import axios from 'axios';

const api = (path, opts) => axios({ url: `http://localhost:3001/api${path}`, ...opts }).then(r => r.data);

export default function Settings() {
  const [form, setForm] = useState({
    your_name: '', your_phone: '',
    gmail_user: '', gmail_app_password: '',
    scan_interval_hours: '6', email_signature: '',
  });
  const [saved, setSaved] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [imports, setImports] = useState([]);

  useEffect(() => {
    api('/settings').then(s => setForm(f => ({ ...f, ...s })));
    api('/email/imports').then(setImports);
  }, []);

  const save = async () => {
    await api('/settings', { method: 'POST', data: form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const scanNow = async () => {
    setScanning(true); setScanResult(null); setScanError('');
    try {
      const r = await api('/email/scan', { method: 'POST' });
      setScanResult(r);
      api('/email/imports').then(setImports);
    } catch (e) {
      setScanError(e.response?.data?.error || 'Scan failed.');
    } finally { setScanning(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Gmail connection, auto-scan, and your profile</div>
        </div>
        <button className="btn btn-primary" onClick={save}>
          {saved ? <><Check size={14}/> Saved!</> : 'Save Settings'}
        </button>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20}}>

        {/* Your Info */}
        <div className="card">
          <div className="card-header"><Settings2 size={16}/> Your Info</div>
          <div style={{padding:20}}>
            <p style={{fontSize:13, color:'#6b7280', marginBottom:16}}>Used in outreach emails so listings agents know who you are.</p>
            <div className="form-grid">
              <div className="form-group span-2">
                <label>Your Name</label>
                <input value={form.your_name} onChange={e => setForm({...form, your_name: e.target.value})} placeholder="John Smith" />
              </div>
              <div className="form-group span-2">
                <label>Your Phone</label>
                <input value={form.your_phone} onChange={e => setForm({...form, your_phone: e.target.value})} placeholder="(555) 000-0000" />
              </div>
              <div className="form-group span-2">
                <label>Email Signature (optional)</label>
                <textarea rows={3} value={form.email_signature} onChange={e => setForm({...form, email_signature: e.target.value})}
                  placeholder={'Best,\nJohn Smith\nCommercial Real Estate Photography\n(555) 000-0000'} />
              </div>
            </div>
          </div>
        </div>

        {/* Gmail Connection */}
        <div className="card">
          <div className="card-header"><Mail size={16}/> Gmail Auto-Import</div>
          <div style={{padding:20}}>
            <p style={{fontSize:13, color:'#6b7280', marginBottom:12}}>
              Connect your Gmail so the app automatically reads LoopNet/Crexi alert emails and imports new listings. Requires a <strong>Gmail App Password</strong>.
            </p>

            <div style={{background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:12, marginBottom:16, fontSize:13}}>
              <strong>One-time Gmail setup:</strong>
              <ol style={{margin:'8px 0 0 0', paddingLeft:18, lineHeight:2}}>
                <li>Go to <strong>myaccount.google.com → Security</strong></li>
                <li>Enable <strong>2-Step Verification</strong> (if not already on)</li>
                <li>Search for <strong>"App passwords"</strong></li>
                <li>Create one → select "Mail" → copy the 16-character password</li>
                <li>Paste it below</li>
              </ol>
            </div>

            <div className="form-grid">
              <div className="form-group span-2">
                <label>Gmail Address</label>
                <input type="email" value={form.gmail_user} onChange={e => setForm({...form, gmail_user: e.target.value})} placeholder="you@gmail.com" />
              </div>
              <div className="form-group span-2">
                <label>Gmail App Password</label>
                <input type="password" value={form.gmail_app_password} onChange={e => setForm({...form, gmail_app_password: e.target.value})} placeholder="xxxx xxxx xxxx xxxx" />
              </div>
              <div className="form-group span-2">
                <label>Auto-scan every (hours)</label>
                <select value={form.scan_interval_hours} onChange={e => setForm({...form, scan_interval_hours: e.target.value})}>
                  <option value="1">Every hour</option>
                  <option value="3">Every 3 hours</option>
                  <option value="6">Every 6 hours</option>
                  <option value="12">Every 12 hours</option>
                  <option value="24">Once a day</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual scan + LoopNet setup guide */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-header">
          <span><Mail size={16} style={{display:'inline', marginRight:6}}/>Email Scan</span>
          <button className="btn btn-primary" onClick={scanNow} disabled={scanning}>
            {scanning ? <><RefreshCw size={14} className="spin"/> Scanning inbox...</> : 'Scan Inbox Now'}
          </button>
        </div>
        <div style={{padding:20}}>
          {scanError && <div className="alert alert-error" style={{marginBottom:12}}>{scanError}</div>}
          {scanResult && (
            <div className="alert alert-success" style={{marginBottom:12}}>
              Scan complete — checked {scanResult.scanned} emails, imported <strong>{scanResult.new_listings} new listings</strong>.
              {scanResult.errors?.length > 0 && <div style={{marginTop:4, fontSize:12}}>Warnings: {scanResult.errors.join(', ')}</div>}
            </div>
          )}

          {/* LoopNet setup guide */}
          <div style={{background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:8, padding:16, marginBottom:20}}>
            <div style={{fontWeight:700, color:'var(--accent)', marginBottom:10, fontSize:14}}>
              Set up LoopNet email alerts (one time)
            </div>
            <div style={{fontSize:13, color:'#374151', lineHeight:2}}>
              <div style={{display:'flex', alignItems:'flex-start', gap:8, marginBottom:6}}>
                <ChevronRight size={14} style={{color:'var(--accent)', marginTop:3, flexShrink:0}}/>
                <span>Go to <strong>LoopNet.com</strong> → search for commercial listings in your target city</span>
              </div>
              <div style={{display:'flex', alignItems:'flex-start', gap:8, marginBottom:6}}>
                <ChevronRight size={14} style={{color:'var(--accent)', marginTop:3, flexShrink:0}}/>
                <span>Filter by: <strong>For Sale → 30+ Days on Market → Commercial</strong></span>
              </div>
              <div style={{display:'flex', alignItems:'flex-start', gap:8, marginBottom:6}}>
                <ChevronRight size={14} style={{color:'var(--accent)', marginTop:3, flexShrink:0}}/>
                <span>Click <strong>"Save Search"</strong> → enable <strong>email alerts</strong> → set frequency to Daily</span>
              </div>
              <div style={{display:'flex', alignItems:'flex-start', gap:8, marginBottom:6}}>
                <ChevronRight size={14} style={{color:'var(--accent)', marginTop:3, flexShrink:0}}/>
                <span>Make sure alerts go to your Gmail address above</span>
              </div>
              <div style={{display:'flex', alignItems:'flex-start', gap:8}}>
                <ChevronRight size={14} style={{color:'var(--accent)', marginTop:3, flexShrink:0}}/>
                <span>That's it — new stale listings appear in your dashboard automatically every day</span>
              </div>
            </div>
            <a href="https://www.loopnet.com" target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{marginTop:12, display:'inline-flex'}}>
              <ExternalLink size={13}/> Open LoopNet
            </a>
          </div>

          {/* Import history */}
          {imports.length > 0 && (
            <div>
              <div style={{fontWeight:600, fontSize:13, marginBottom:10, color:'var(--text-h)'}}>Recent email scans</div>
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Listings Found</th>
                    <th>Imported</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map(i => (
                    <tr key={i.id}>
                      <td style={{fontSize:13, maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{i.subject || '(no subject)'}</td>
                      <td><span className="badge badge-active">{i.listings_found}</span></td>
                      <td><span className={`badge ${i.listings_created > 0 ? 'badge-active' : 'badge-sold'}`}>{i.listings_created} new</span></td>
                      <td style={{fontSize:12, color:'#6b7280'}}>{new Date(i.imported_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
