import { useState } from 'react';
import { Link2, Sparkles, Mail, Copy, Check, X, RefreshCw, ArrowRight } from 'lucide-react';
import { createBusiness, getBusinesses, createListing, generatePhoto, logActivity, photoUrl } from '../api';
import axios from 'axios';

const PROP_TYPES = ['Office','Retail','Industrial','Warehouse','Mixed Use','Restaurant','Medical','Land','Other'];

const EMAIL_TEMPLATE = (address, city, state) => ({
  subject: `Free professional photo for your listing — ${address}, ${city}`,
  body: `Hi,

I came across your commercial listing at ${address}, ${city}${state ? ', ' + state : ''} and wanted to reach out.

I specialize in creating professional AI-generated listing photos for commercial properties that can help attract more buyers and close faster.

I've attached a complimentary sample photo for your property — completely free, no strings attached.

If you'd like a full set of photos or have other listings I can help with, feel free to reply and we can chat.

Best regards`,
});

const STEPS = ['paste', 'review', 'photo', 'email'];

export default function UrlImport({ onComplete }) {
  const [step, setStep] = useState('paste');
  const [url, setUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [form, setForm] = useState({});
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [photo, setPhoto] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [listingId, setListingId] = useState(null);
  const [bizId, setBizId] = useState(null);
  const [emailTemplate, setEmailTemplate] = useState(null);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  const parseUrl = async () => {
    if (!url.trim()) return;
    setParsing(true); setError('');
    try {
      const { data } = await axios.post('http://localhost:3001/api/parse-url', { url: url.trim() });
      setParsed(data);
      setForm({
        property_address: data.property_address || '',
        city: data.city || '',
        state: data.state || '',
        zip: '',
        property_type: 'Retail',
        square_feet: '',
        asking_price: '',
        listed_date: new Date(Date.now() - 35 * 86400000).toISOString().slice(0, 10),
        status: 'active',
        description: '',
        business_name: data.property_address ? `${data.property_address.split(' ').slice(-2).join(' ')} Property` : '',
        source_url: url.trim(),
      });
      setStep('review');
    } catch (e) {
      setError('Could not parse URL. Fill in the details manually below.');
      setParsed({ source: 'Manual', source_url: url.trim() });
      setForm({ property_address: '', city: '', state: '', zip: '', property_type: 'Retail', square_feet: '', asking_price: '', listed_date: new Date(Date.now() - 35 * 86400000).toISOString().slice(0,10), status: 'active', description: '', business_name: '', source_url: url.trim() });
      setStep('review');
    } finally { setParsing(false); }
  };

  const saveAndGenerate = async () => {
    if (!form.property_address || !form.city) { setError('Address and city are required.'); return; }
    setSaving(true); setError('');
    try {
      // Find or create business
      const businesses = await getBusinesses();
      let biz = businesses.find(b => b.business_name.toLowerCase() === form.business_name.toLowerCase());
      if (!biz) {
        biz = await createBusiness({
          business_name: form.business_name || `${form.property_address} Owner`,
          notes: `Imported from ${parsed?.source || 'URL'}: ${form.source_url}`,
        });
      }
      setBizId(biz.id);

      const listing = await createListing({
        business_id: biz.id,
        property_address: form.property_address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        property_type: form.property_type,
        square_feet: form.square_feet || null,
        asking_price: form.asking_price || null,
        description: `Source: ${parsed?.source || 'URL'} — ${form.source_url}`,
        listed_date: form.listed_date,
        status: 'active',
      });
      setListingId(listing.id);

      // Log the import
      await logActivity({
        listing_id: listing.id,
        business_id: biz.id,
        action_type: 'Note',
        notes: `Listing imported from ${parsed?.source || 'URL'}: ${form.source_url}`,
      });

      setStep('photo');
    } catch (e) {
      setError(e.response?.data?.error || 'Save failed.');
    } finally { setSaving(false); }
  };

  const generate = async () => {
    setGenerating(true); setGenError(''); setPhoto(null);
    const prompt = customPrompt ||
      `Professional commercial real estate exterior photo, ${form.property_type || 'commercial building'}, ${form.property_address} ${form.city} ${form.state}, sunny day, wide angle, high quality photography`;
    try {
      const p = await generatePhoto(listingId, prompt);
      setPhoto(p);
    } catch (e) {
      setGenError(e.response?.data?.error || 'Generation failed — try again.');
    } finally { setGenerating(false); }
  };

  const proceedToEmail = async () => {
    if (photo) {
      await logActivity({
        listing_id: listingId,
        business_id: bizId,
        action_type: 'Note',
        notes: `AI photo generated for outreach.`,
      });
    }
    const tmpl = EMAIL_TEMPLATE(form.property_address, form.city, form.state);
    setEmailTemplate(tmpl);
    setStep('email');
  };

  const copyText = async (text, key) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const sendViaMailto = async () => {
    const subject = encodeURIComponent(emailTemplate.subject);
    const body = encodeURIComponent(emailTemplate.body);
    window.open(`mailto:${contactEmail}?subject=${subject}&body=${body}`, '_blank');

    await logActivity({
      listing_id: listingId,
      business_id: bizId,
      action_type: 'Email Sent — Free Sample',
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      notes: `Free sample email sent. Photo generated and attached manually. Subject: ${emailTemplate.subject}`,
    });

    onComplete && onComplete();
  };

  const stepNum = STEPS.indexOf(step) + 1;

  return (
    <div style={{background:'var(--card-bg)', border:'2px solid var(--accent)', borderRadius:12, overflow:'hidden'}}>
      {/* Progress bar */}
      <div style={{background:'var(--accent-light)', padding:'10px 20px', display:'flex', alignItems:'center', gap:8}}>
        {['Paste URL','Review Details','Generate Photo','Send Email'].map((label, i) => (
          <div key={i} style={{display:'flex', alignItems:'center', gap:6}}>
            <div style={{
              width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:700,
              background: i < stepNum ? 'var(--accent)' : i === stepNum - 1 ? 'var(--accent)' : '#e2e8f0',
              color: i < stepNum - 1 ? '#fff' : i === stepNum - 1 ? '#fff' : '#94a3b8',
            }}>{i + 1}</div>
            <span style={{fontSize:12, fontWeight: i === stepNum - 1 ? 600 : 400, color: i === stepNum - 1 ? 'var(--accent)' : '#94a3b8'}}>{label}</span>
            {i < 3 && <ArrowRight size={12} style={{color:'#cbd5e1'}} />}
          </div>
        ))}
      </div>

      <div style={{padding:24}}>
        {error && <div className="alert alert-error" style={{marginBottom:16}}>{error}</div>}

        {/* STEP 1: Paste URL */}
        {step === 'paste' && (
          <div>
            <div style={{fontWeight:700, fontSize:16, marginBottom:6, display:'flex', alignItems:'center', gap:8}}>
              <Link2 size={18} style={{color:'var(--accent)'}} /> Paste a LoopNet or Crexi listing URL
            </div>
            <p style={{fontSize:13, color:'#6b7280', marginBottom:16}}>Find any commercial listing that's been sitting 30+ days and paste the URL here. The rest is automatic.</p>
            <div style={{display:'flex', gap:10}}>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && parseUrl()}
                placeholder="https://www.loopnet.com/Listing/..."
                style={{flex:1, fontSize:14}}
              />
              <button className="btn btn-primary" onClick={parseUrl} disabled={!url.trim() || parsing} style={{whiteSpace:'nowrap'}}>
                {parsing ? <><RefreshCw size={14} className="spin"/> Parsing...</> : <>Import <ArrowRight size={14}/></>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Review & confirm details */}
        {step === 'review' && (
          <div>
            <div style={{fontWeight:700, fontSize:16, marginBottom:4}}>Confirm listing details</div>
            <p style={{fontSize:13, color:'#6b7280', marginBottom:16}}>
              Parsed from <strong>{parsed?.source}</strong>. Fix anything that looks off.
            </p>
            <div className="form-grid">
              <div className="form-group span-2">
                <label>Business / Property Name</label>
                <input value={form.business_name} onChange={e => setForm({...form, business_name: e.target.value})} placeholder="Palmetto Walk Shopping Village" />
              </div>
              <div className="form-group span-2">
                <label>Property Address *</label>
                <input value={form.property_address} onChange={e => setForm({...form, property_address: e.target.value})} />
              </div>
              <div className="form-group">
                <label>City *</label>
                <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
              </div>
              <div className="form-group">
                <label>State</label>
                <input value={form.state} onChange={e => setForm({...form, state: e.target.value})} style={{textTransform:'uppercase'}} maxLength={2} />
              </div>
              <div className="form-group">
                <label>Property Type</label>
                <select value={form.property_type} onChange={e => setForm({...form, property_type: e.target.value})}>
                  {PROP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Listed Date (approx)</label>
                <input type="date" value={form.listed_date} onChange={e => setForm({...form, listed_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Asking Price ($)</label>
                <input type="number" value={form.asking_price} onChange={e => setForm({...form, asking_price: e.target.value})} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label>Sq Ft</label>
                <input type="number" value={form.square_feet} onChange={e => setForm({...form, square_feet: e.target.value})} placeholder="Optional" />
              </div>
            </div>
            <div style={{display:'flex', gap:10, marginTop:20, justifyContent:'flex-end'}}>
              <button className="btn btn-secondary" onClick={() => setStep('paste')}>← Back</button>
              <button className="btn btn-primary" onClick={saveAndGenerate} disabled={saving}>
                {saving ? 'Saving...' : <>Save & Generate Photo <ArrowRight size={14}/></>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Generate photo */}
        {step === 'photo' && (
          <div>
            <div style={{fontWeight:700, fontSize:16, marginBottom:4, display:'flex', alignItems:'center', gap:8}}>
              <Sparkles size={18} style={{color:'var(--accent)'}}/> Generate AI Photo
            </div>
            <p style={{fontSize:13, color:'#6b7280', marginBottom:16}}>
              This photo will be your free sample. You can regenerate as many times as you want until it looks right.
            </p>
            <div className="form-group" style={{marginBottom:12}}>
              <label>Photo prompt (optional — leave blank for auto)</label>
              <input
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder={`Commercial real estate exterior, ${form.property_type}, ${form.property_address} ${form.city}...`}
              />
            </div>
            <button className="btn btn-primary" onClick={generate} disabled={generating} style={{width:'100%', padding:'12px', fontSize:15, marginBottom:16}}>
              {generating ? <><RefreshCw size={16} className="spin"/> Generating... (takes ~10 seconds)</> : <><Sparkles size={16}/> {photo ? 'Regenerate Photo' : 'Generate Free Sample Photo'}</>}
            </button>
            {genError && <div className="alert alert-error">{genError}</div>}
            {photo && (
              <div>
                <img src={photoUrl(photo.filename)} alt="generated" style={{width:'100%', borderRadius:8, border:'1px solid var(--border)', marginBottom:12}} />
                <div style={{display:'flex', gap:8, fontSize:12, color:'#6b7280', marginBottom:16, alignItems:'center'}}>
                  <span className="badge badge-ai">AI Generated</span>
                  <span>Not happy with it? Hit Regenerate above for a different version.</span>
                </div>
              </div>
            )}
            <div style={{display:'flex', gap:10, justifyContent:'flex-end'}}>
              <button className="btn btn-secondary" onClick={proceedToEmail} disabled={generating}>
                {photo ? <>Next: Write Email <ArrowRight size={14}/></> : 'Skip photo & write email →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Email */}
        {step === 'email' && (
          <div>
            <div style={{fontWeight:700, fontSize:16, marginBottom:4, display:'flex', alignItems:'center', gap:8}}>
              <Mail size={18} style={{color:'var(--accent)'}}/> Send the Free Sample Email
            </div>
            <p style={{fontSize:13, color:'#6b7280', marginBottom:16}}>
              Fill in the contact info from the listing, then click "Open in Email" — your email app opens with everything pre-written. Attach the photo above and hit send.
            </p>

            <div className="form-grid" style={{marginBottom:16}}>
              <div className="form-group">
                <label>Contact Name (from listing)</label>
                <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Listing agent / owner name" />
              </div>
              <div className="form-group">
                <label>Contact Phone</label>
                <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="(555) 000-0000" />
              </div>
              <div className="form-group span-2">
                <label>Contact Email *</label>
                <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="agent@example.com" />
              </div>
            </div>

            {/* Email preview */}
            <div style={{background:'#f8fafc', border:'1px solid var(--border)', borderRadius:8, padding:16, marginBottom:16}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                <span style={{fontSize:12, fontWeight:600, color:'#6b7280', textTransform:'uppercase'}}>Email Preview</span>
                <button className="btn btn-sm btn-ghost" onClick={() => copyText(emailTemplate.subject + '\n\n' + emailTemplate.body, 'all')}>
                  {copied === 'all' ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Copy All</>}
                </button>
              </div>
              <div style={{marginBottom:8}}>
                <span style={{fontSize:12, color:'#6b7280'}}>Subject: </span>
                <span style={{fontSize:13, fontWeight:600}}>{emailTemplate.subject}</span>
              </div>
              <div style={{fontSize:13, color:'#374151', whiteSpace:'pre-wrap', lineHeight:1.7}}>{emailTemplate.body}</div>
            </div>

            {photo && (
              <div style={{background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:8, padding:12, marginBottom:16, display:'flex', gap:12, alignItems:'center'}}>
                <img src={photoUrl(photo.filename)} alt="" style={{width:64, height:48, objectFit:'cover', borderRadius:4}} />
                <div style={{fontSize:13}}>
                  <div style={{fontWeight:600, color:'var(--accent)'}}>Attach this photo to your email</div>
                  <div style={{color:'#6b7280', fontSize:12, marginTop:2}}>Right-click the image → Save As, then attach it to the email.</div>
                </div>
              </div>
            )}

            <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
              <button
                className="btn btn-primary"
                onClick={sendViaMailto}
                style={{flex:1, padding:'12px', fontSize:15}}
                disabled={!contactEmail}
              >
                <Mail size={16}/> Open in My Email App
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => copyText(emailTemplate.subject + '\n\n' + emailTemplate.body, 'body')}
                style={{whiteSpace:'nowrap'}}
              >
                {copied === 'body' ? <><Check size={14}/> Copied!</> : <><Copy size={14}/> Copy Email Text</>}
              </button>
            </div>
            <p style={{fontSize:11, color:'#9ca3af', marginTop:8, textAlign:'center'}}>
              "Open in My Email App" logs this outreach automatically in your Activity Log.
            </p>
          </div>
        )}
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
