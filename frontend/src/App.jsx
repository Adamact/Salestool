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
import FlameAnimation from './components/FlameAnimation';
import CommandPalette from './components/CommandPalette';
import SettingsPanel from './components/SettingsPanel';
import { useToast } from './components/Toast';
import { useSettings } from './hooks/useSettings';

export default function App() {
  const api = useApi();
  const { showToast } = useToast();
  const { settings, updateSetting, resetSettings } = useSettings();
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [manuscript, setManuscript] = useState([]);
  const [manuscriptGroups, setManuscriptGroups] = useState([]);
  const [activeManuscriptId, setActiveManuscriptId] = useState(null);
  const [activeTab, setActiveTab] = useState(settings.defaultTab);
  const [showLogCall, setShowLogCall] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showListManager, setShowListManager] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showFloatingScript, setShowFloatingScript] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [statsKey, setStatsKey] = useState(0);
  const [powerDialMode, setPowerDialMode] = useState(false);
  const [showFlame, setShowFlame] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const leadsRef = useRef(leads);
  leadsRef.current = leads;
  const selectedLeadIdRef = useRef(selectedLeadId);
  selectedLeadIdRef.current = selectedLeadId;

  // Lists state
  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [listLeadIds, setListLeadIds] = useState(null);

  // Load leads
  const loadLeads = useCallback(() => {
    api.getLeads().then((data) => {
      const list = Array.isArray(data) ? data : data?.leads || [];
      setLeads(list);
    }).catch((err) => { console.error('Failed to load leads:', err); showToast('Kunde inte ladda leads', 'error'); });
  }, [api, showToast]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Load manuscript groups
  const loadManuscriptGroups = useCallback(() => {
    api.getManuscriptGroups().then((data) => {
      const groups = Array.isArray(data) ? data : [];
      setManuscriptGroups(groups);
      const active = groups.find((g) => g.is_active);
      if (active) setActiveManuscriptId(active.id);
      else if (groups.length > 0) setActiveManuscriptId(groups[0].id);
    }).catch((err) => { console.error('Failed to load manuscript groups:', err); showToast('Kunde inte ladda manus', 'error'); });
  }, [api, showToast]);

  // Load manuscript sections for active group
  const loadManuscript = useCallback(() => {
    api.getManuscript(activeManuscriptId).then((data) => {
      setManuscript(Array.isArray(data) ? data : []);
    }).catch((err) => { console.error('Failed to load manuscript:', err); showToast('Kunde inte ladda manussektioner', 'error'); });
  }, [api, activeManuscriptId, showToast]);

  useEffect(() => {
    loadManuscriptGroups();
  }, [loadManuscriptGroups]);

  useEffect(() => {
    if (activeManuscriptId) loadManuscript();
  }, [activeManuscriptId, loadManuscript]);

  // Load lists
  const loadLists = useCallback(() => {
    api.getLists().then((data) => {
      const updated = Array.isArray(data) ? data : [];
      setLists(updated);
      // Clear active list if it was deleted
      setActiveListId((prev) => {
        if (prev && !updated.some((l) => l.id === prev)) return null;
        return prev;
      });
    }).catch((err) => { console.error('Failed to load lists:', err); showToast('Kunde inte ladda listor', 'error'); });
  }, [api, showToast]);

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
      loadLeads();
      setStatsKey((k) => k + 1);
      setShowLogCall(false);
      showToast('Samtal loggat', 'success');
      if (outcome === 'booked_meeting' && settings.celebrationAnimation) {
        setShowFlame(true);
      }
      // Auto-advance to next lead
      if (powerDialMode) {
        // Power Dial: use smart next-lead API (respects active list + priority rules)
        try {
          const nextLead = await api.getNextLead(activeListId);
          if (nextLead && nextLead.id !== selectedLeadId) {
            setSelectedLeadId(nextLead.id); // useEffect handles getLead
          } else {
            // No next lead or same lead — refresh current since status changed
            const updatedLead = await api.getLead(selectedLeadId);
            setSelectedLead(updatedLead);
          }
        } catch {
          // No more leads available — refresh current
          const updatedLead = await api.getLead(selectedLeadId);
          setSelectedLead(updatedLead);
        }
      } else {
        // Normal mode: advance to next lead in the sidebar list
        const currentLeads = leadsRef.current;
        const currentIndex = currentLeads.findIndex((l) => l.id === selectedLeadId);
        if (currentIndex >= 0 && currentIndex < currentLeads.length - 1) {
          setSelectedLeadId(currentLeads[currentIndex + 1].id); // useEffect handles getLead
        } else {
          // Last lead or not found — refresh current since status changed
          const updatedLead = await api.getLead(selectedLeadId);
          setSelectedLead(updatedLead);
        }
      }
    } catch (err) {
      console.error('Failed to log call:', err); showToast('Kunde inte logga samtal', 'error');
    }
  }, [api, selectedLeadId, activeListId, loadLeads, powerDialMode, showToast]);

  const handleLeadRefresh = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const updatedLead = await api.getLead(selectedLeadId);
      setSelectedLead(updatedLead);
    } catch (err) {
      console.error('Failed to refresh lead:', err); showToast('Kunde inte uppdatera lead', 'error');
    }
  }, [api, selectedLeadId, showToast]);

  const handleStatusChange = useCallback(async (newStatus) => {
    if (!selectedLeadId) return;
    try {
      await api.updateLead(selectedLeadId, { status: newStatus });
      const updatedLead = await api.getLead(selectedLeadId);
      setSelectedLead(updatedLead);
      loadLeads();
      setStatsKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to update status:', err); showToast('Kunde inte uppdatera status', 'error');
    }
  }, [api, selectedLeadId, loadLeads, showToast]);

  const handleListSelect = useCallback((listId) => {
    setActiveListId(listId);
    setShowListManager(false);
  }, []);

  const handleDeleteLead = useCallback(async (leadId) => {
    try {
      await api.deleteLead(leadId);
      showToast('Lead borttagen', 'success');
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
      console.error('Failed to delete lead:', err); showToast('Kunde inte radera lead', 'error');
    }
  }, [api, selectedLeadId, activeListId, loadLeads, loadLists, showToast]);

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
      console.error('Failed to remove lead from list:', err); showToast('Kunde inte ta bort lead från lista', 'error');
    }
  }, [api, activeListId, loadLists, showToast]);

  // Ctrl+K command palette
  useEffect(() => {
    const handleCtrlK = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', handleCtrlK);
    return () => window.removeEventListener('keydown', handleCtrlK);
  }, []);

  const handleCommandAction = useCallback((actionId, payload) => {
    switch (actionId) {
      case 'select-lead': setSelectedLeadId(payload); break;
      case 'log-call': if (selectedLeadId) setShowLogCall(true); break;
      case 'next-lead':
        api.getNextLead(activeListId).then((lead) => {
          if (lead && lead.id) setSelectedLeadId(lead.id);
        }).catch((err) => console.error('Failed to get next lead:', err));
        break;
      case 'add-lead': setShowAddLead(true); break;
      case 'import': setShowImport(true); break;
      case 'lists': setShowListManager(true); break;
      case 'calendar': setShowCalendar(true); break;
      case 'analytics': setShowAnalytics(true); break;
      case 'toggle-script': setShowFloatingScript((p) => !p); break;
      case 'power-dial': setPowerDialMode((p) => !p); break;
      case 'settings': setShowSettings(true); break;
    }
  }, [api, selectedLeadId, activeListId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      const currentLeads = leadsRef.current;
      const currentSelectedId = selectedLeadIdRef.current;

      if (e.key === 'Enter' && currentSelectedId) {
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
        }).catch((err) => console.error('Failed to get next lead:', err));
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = currentLeads.findIndex((l) => l.id === currentSelectedId);
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
  }, [api, activeListId]);

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary font-['Inter',system-ui,sans-serif]">
      <StatsBar
        key={statsKey}
        onOpenCalendar={() => setShowCalendar(true)}
        powerDialMode={powerDialMode}
        onTogglePowerDial={() => setPowerDialMode((p) => !p)}
        onOpenAnalytics={() => setShowAnalytics(true)}
        onToggleScript={() => setShowFloatingScript((p) => !p)}
        showFloatingScript={showFloatingScript}
        onOpenSettings={() => setShowSettings(true)}
      />
      <div className="flex flex-1 overflow-hidden">
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
            manuscriptGroups={manuscriptGroups}
            activeManuscriptId={activeManuscriptId}
            onManuscriptGroupChange={loadManuscriptGroups}
            onActiveManuscriptChange={setActiveManuscriptId}
          />
        </ErrorBoundary>
      </div>

      {showLogCall && (
        <ErrorBoundary>
          <LogCallModal
            lead={selectedLead}
            onSave={handleSaveCall}
            onClose={() => setShowLogCall(false)}
          />
        </ErrorBoundary>
      )}

      {showFlame && <FlameAnimation onComplete={() => setShowFlame(false)} />}

      {showImport && (
        <ErrorBoundary>
          <ExcelImport
            onClose={() => setShowImport(false)}
            onImported={() => { loadLeads(); setStatsKey((k) => k + 1); showToast('Import klar', 'success'); }}
          />
        </ErrorBoundary>
      )}

      {showCalendar && (
        <ErrorBoundary>
          <CalendarView onClose={() => setShowCalendar(false)} />
        </ErrorBoundary>
      )}

      {showAddLead && (
        <ErrorBoundary>
          <AddLeadModal
            onClose={() => setShowAddLead(false)}
            onCreated={() => { loadLeads(); setStatsKey((k) => k + 1); }}
          />
        </ErrorBoundary>
      )}

      {showListManager && (
        <ErrorBoundary>
          <ListManager
            lists={lists}
            onClose={() => setShowListManager(false)}
            onSelectList={handleListSelect}
            onListsChange={loadLists}
          />
        </ErrorBoundary>
      )}

      {showFloatingScript && (
        <ErrorBoundary>
          <FloatingScript
            manuscript={manuscript}
            onClose={() => setShowFloatingScript(false)}
            manuscriptGroups={manuscriptGroups}
            activeManuscriptId={activeManuscriptId}
            onActiveManuscriptChange={setActiveManuscriptId}
          />
        </ErrorBoundary>
      )}

      {showAnalytics && (
        <ErrorBoundary>
          <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
        </ErrorBoundary>
      )}

      <SettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSetting={updateSetting}
        onReset={resetSettings}
      />

      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        leads={leads}
        onAction={handleCommandAction}
      />
    </div>
  );
}
