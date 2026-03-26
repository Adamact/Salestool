import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from './hooks/useApi';
import StatsBar from './components/StatsBar';
import Sidebar from './components/Sidebar';
import FocusPanel from './components/FocusPanel';
import LogCallModal from './components/LogCallModal';
import ExcelImport from './components/ExcelImport';
import ListManager from './components/ListManager';
import CalendarView from './components/CalendarView';
import AddLeadModal from './components/AddLeadModal';
import FloatingScript from './components/FloatingScript';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const api = useApi();
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [manuscript, setManuscript] = useState([]);
  const [activeTab, setActiveTab] = useState('contacts');
  const [showLogCall, setShowLogCall] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showListManager, setShowListManager] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showFloatingScript, setShowFloatingScript] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [statsKey, setStatsKey] = useState(0);
  const [powerDialMode, setPowerDialMode] = useState(false);
  const leadsRef = useRef(leads);
  leadsRef.current = leads;

  // Lists state
  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [listLeadIds, setListLeadIds] = useState(null);

  // Load leads
  const loadLeads = useCallback(() => {
    api.getLeads().then((data) => {
      const list = Array.isArray(data) ? data : data?.leads || [];
      setLeads(list);
    }).catch((err) => console.error('Failed to load leads:', err));
  }, [api]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Load manuscript
  const loadManuscript = useCallback(() => {
    api.getManuscript().then((data) => {
      setManuscript(Array.isArray(data) ? data : []);
    }).catch((err) => console.error('Failed to load manuscript:', err));
  }, [api]);

  useEffect(() => {
    loadManuscript();
  }, [loadManuscript]);

  // Load lists
  const loadLists = useCallback(() => {
    api.getLists().then((data) => {
      setLists(Array.isArray(data) ? data : []);
    }).catch((err) => console.error('Failed to load lists:', err));
  }, [api]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  // Load leads for active list
  useEffect(() => {
    if (!activeListId) {
      setListLeadIds(null);
      return;
    }
    api.getListLeads(activeListId).then((data) => {
      const ids = new Set((data || []).map((l) => l.id));
      setListLeadIds(ids);
    }).catch(() => setListLeadIds(null));
  }, [api, activeListId]);

  // Load selected lead details
  useEffect(() => {
    if (!selectedLeadId) {
      setSelectedLead(null);
      return;
    }
    api.getLead(selectedLeadId)
      .then(setSelectedLead)
      .catch(() => setSelectedLead(null));
  }, [api, selectedLeadId]);

  const handleSelectLead = useCallback((id) => {
    setSelectedLeadId(id);
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const handleLogCall = useCallback(() => {
    setShowLogCall(true);
  }, []);

  const handleSaveCall = useCallback(async (outcome, notes, extra = {}) => {
    if (!selectedLeadId) return;
    try {
      await api.logCall(selectedLeadId, outcome, notes, extra);
      const updatedLead = await api.getLead(selectedLeadId);
      setSelectedLead(updatedLead);
      loadLeads();
      setStatsKey((k) => k + 1);
      setShowLogCall(false);
      // Auto-advance to next lead
      const currentLeads = leadsRef.current;
      const currentIndex = currentLeads.findIndex((l) => l.id === selectedLeadId);
      if (currentIndex >= 0 && currentIndex < currentLeads.length - 1) {
        setSelectedLeadId(currentLeads[currentIndex + 1].id);
      }
    } catch (err) {
      console.error('Failed to log call:', err);
    }
  }, [api, selectedLeadId, loadLeads, powerDialMode]);

  const handleLeadRefresh = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const updatedLead = await api.getLead(selectedLeadId);
      setSelectedLead(updatedLead);
    } catch (err) {
      console.error('Failed to refresh lead:', err);
    }
  }, [api, selectedLeadId]);

  const handleStatusChange = useCallback(async (newStatus) => {
    if (!selectedLeadId) return;
    try {
      await api.updateLead(selectedLeadId, { status: newStatus });
      const updatedLead = await api.getLead(selectedLeadId);
      setSelectedLead(updatedLead);
      loadLeads();
      setStatsKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  }, [api, selectedLeadId, loadLeads]);

  const handleListSelect = useCallback((listId) => {
    setActiveListId(listId);
    setShowListManager(false);
  }, []);

  const handleDeleteLead = useCallback(async (leadId) => {
    try {
      await api.deleteLead(leadId);
      if (selectedLeadId === leadId) {
        setSelectedLeadId(null);
        setSelectedLead(null);
      }
      loadLeads();
      setStatsKey((k) => k + 1);
      if (activeListId) {
        const data = await api.getListLeads(activeListId);
        const ids = new Set((data || []).map((l) => l.id));
        setListLeadIds(ids);
      }
      loadLists();
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  }, [api, selectedLeadId, activeListId, loadLeads, loadLists]);

  const handleRemoveFromList = useCallback(async (leadId) => {
    if (!activeListId) return;
    try {
      await api.removeFromList(activeListId, leadId);
      // Refresh list lead ids
      const data = await api.getListLeads(activeListId);
      const ids = new Set((data || []).map((l) => l.id));
      setListLeadIds(ids);
      loadLists();
    } catch (err) {
      console.error('Failed to remove lead from list:', err);
    }
  }, [api, activeListId, loadLists]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      const currentLeads = leadsRef.current;

      if (e.key === 'Enter' && selectedLeadId) {
        e.preventDefault();
        setShowLogCall(true);
      }

      // N = jump to smart next lead
      if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        api.getNextLead(activeListId).then((lead) => {
          if (lead && lead.id) {
            setSelectedLeadId(lead.id);
          }
        }).catch(() => {});
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = currentLeads.findIndex((l) => l.id === selectedLeadId);
        if (e.key === 'ArrowDown') {
          const nextIndex = currentIndex < currentLeads.length - 1 ? currentIndex + 1 : 0;
          setSelectedLeadId(currentLeads[nextIndex]?.id);
        } else {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentLeads.length - 1;
          setSelectedLeadId(currentLeads[prevIndex]?.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLeadId, api, activeListId]);

  return (
    <div className="app">
      <StatsBar
        key={statsKey}
        onOpenCalendar={() => setShowCalendar(true)}
        powerDialMode={powerDialMode}
        onTogglePowerDial={() => setPowerDialMode((p) => !p)}
        onOpenAnalytics={() => setShowAnalytics(true)}
        onToggleScript={() => setShowFloatingScript((p) => !p)}
        showFloatingScript={showFloatingScript}
      />
      <div className="app__body">
        <ErrorBoundary>
          <Sidebar
            leads={leads}
            selectedLeadId={selectedLeadId}
            onSelectLead={handleSelectLead}
            onImportClick={() => setShowImport(true)}
            onAddLeadClick={() => setShowAddLead(true)}
            lists={lists}
            activeListId={activeListId}
            onListSelect={handleListSelect}
            onListManagerOpen={() => setShowListManager(true)}
            listLeadIds={listLeadIds}
            onListsChange={loadLists}
            onRemoveFromList={handleRemoveFromList}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <FocusPanel
            lead={selectedLead}
            manuscript={manuscript}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onLogCall={handleLogCall}
            onStatusChange={handleStatusChange}
            onLeadRefresh={handleLeadRefresh}
            onManuscriptChange={loadManuscript}
            onDeleteLead={handleDeleteLead}
          />
        </ErrorBoundary>
      </div>

      {showLogCall && (
        <LogCallModal
          lead={selectedLead}
          onSave={handleSaveCall}
          onClose={() => setShowLogCall(false)}
        />
      )}

      {showImport && (
        <ExcelImport
          onClose={() => setShowImport(false)}
          onImported={() => { loadLeads(); setStatsKey((k) => k + 1); }}
        />
      )}

      {showCalendar && (
        <CalendarView onClose={() => setShowCalendar(false)} />
      )}

      {showAddLead && (
        <AddLeadModal
          onClose={() => setShowAddLead(false)}
          onCreated={() => { loadLeads(); setStatsKey((k) => k + 1); }}
        />
      )}

      {showListManager && (
        <ListManager
          lists={lists}
          onClose={() => setShowListManager(false)}
          onSelectList={handleListSelect}
          onListsChange={loadLists}
        />
      )}

      {showFloatingScript && (
        <FloatingScript
          manuscript={manuscript}
          onClose={() => setShowFloatingScript(false)}
        />
      )}

      {showAnalytics && (
        <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}
    </div>
  );
}
