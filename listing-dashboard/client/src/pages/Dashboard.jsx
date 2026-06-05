import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats, getListings } from '../api';
import { AlertTriangle, Building2, Camera, Users } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [stale, setStale] = useState([]);

  useEffect(() => {
    getStats().then(setStats);
    getListings().then(all => setStale(all.filter(l => l.days_on_market >= 30 && l.status === 'active')));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Commercial Real Estate Listings Overview</div>
        </div>
        <Link to="/listings" className="btn btn-primary">
          <Building2 size={15} /> View All Listings
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label"><Users size={12} style={{display:'inline', marginRight:4}}/>Businesses</div>
          <div className="stat-value">{stats?.total_businesses ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Building2 size={12} style={{display:'inline', marginRight:4}}/>Active Listings</div>
          <div className="stat-value">{stats?.total_active ?? '—'}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label"><AlertTriangle size={12} style={{display:'inline', marginRight:4}}/>30+ Days on Market</div>
          <div className="stat-value">{stats?.stale_30_plus ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Camera size={12} style={{display:'inline', marginRight:4}}/>Total Photos</div>
          <div className="stat-value">{stats?.total_photos ?? '—'}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span>Listings Needing Attention (30+ Days)</span>
          <Link to="/listings?filter=stale" className="btn btn-sm btn-ghost">View all</Link>
        </div>
        {stale.length === 0 ? (
          <div className="empty">No stale listings right now.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Business</th>
                <th>Type</th>
                <th>Asking Price</th>
                <th>Days on Market</th>
                <th>Photos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stale.map(l => (
                <tr key={l.id}>
                  <td><strong>{l.property_address}</strong><br/><span style={{color:'#6b7280',fontSize:12}}>{l.city}{l.state ? `, ${l.state}` : ''}</span></td>
                  <td>{l.business_name}</td>
                  <td>{l.property_type || '—'}</td>
                  <td>{l.asking_price ? `$${Number(l.asking_price).toLocaleString()}` : '—'}</td>
                  <td>
                    <span className={`badge ${l.days_on_market >= 60 ? 'badge-stale' : 'badge-stale'}`}>
                      {l.days_on_market} days
                    </span>
                  </td>
                  <td>{l.photo_count}</td>
                  <td>
                    <Link to={`/listings/${l.id}`} className="btn btn-sm btn-secondary">Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
