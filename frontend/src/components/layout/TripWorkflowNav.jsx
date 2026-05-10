/*
 * TripWorkflowNav — one clear strip for Overview / Itinerary / Budget / Packing / Notes.
 */

import { NavLink, useParams } from 'react-router-dom';
import { LayoutGrid, Map, DollarSign, Luggage, FileText } from 'lucide-react';

function TabLink({ to, end, icon: Icon, label }) {
  return (
    <NavLink to={to} end={!!end} className={({ isActive }) => `trip-tab ${isActive ? 'trip-tab--active' : ''}`}>
      <Icon size={17} aria-hidden />
      <span>{label}</span>
    </NavLink>
  );
}

export default function TripWorkflowNav() {
  const { id } = useParams();
  if (!id) return null;

  return (
    <nav className="trip-workflow-nav" aria-label="Trip planner sections">
      <div className="trip-workflow-nav__inner">
        <TabLink to={`/trips/${id}`} end icon={LayoutGrid} label="Overview" />
        <TabLink to={`/trips/${id}/itinerary`} icon={Map} label="Itinerary" />
        <TabLink to={`/trips/${id}/budget`} icon={DollarSign} label="Budget" />
        <TabLink to={`/trips/${id}/packing`} icon={Luggage} label="Packing" />
        <TabLink to={`/trips/${id}/notes`} icon={FileText} label="Notes" />
      </div>
    </nav>
  );
}
