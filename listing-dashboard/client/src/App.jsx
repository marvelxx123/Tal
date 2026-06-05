import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Businesses from './pages/Businesses';
import Listings from './pages/Listings';
import ListingDetail from './pages/ListingDetail';
import ActivityLog from './pages/ActivityLog';
import Settings from './pages/Settings';
import { Building2, LayoutDashboard, Users, ClipboardList, Settings2 } from 'lucide-react';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <nav className="sidebar">
          <div className="sidebar-logo">
            <Building2 size={28} />
            <span>CRE Listings</span>
          </div>
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/businesses" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Users size={18} /> Businesses
          </NavLink>
          <NavLink to="/listings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Building2 size={18} /> Listings
          </NavLink>
          <NavLink to="/activity" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <ClipboardList size={18} /> Activity Log
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} style={{marginTop:'auto'}}>
            <Settings2 size={18} /> Settings
          </NavLink>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/businesses" element={<Businesses />} />
            <Route path="/listings" element={<Listings />} />
            <Route path="/listings/:id" element={<ListingDetail />} />
            <Route path="/activity" element={<ActivityLog />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
