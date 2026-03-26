import React, { useState } from 'react';
import { getStatusColor, getStatusLabel } from '../constants/statuses';

export default function LeadCard({ lead, selected, onClick, selectMode, isChecked, onToggleCheck, showRemove, onRemove }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const color = getStatusColor(lead.status);
  const contactLine = lead.contact_name || '';
  const secondLine = lead.phone || lead.email || '';
  const contactCount = lead.contacts ? lead.contacts.length : 0;

  const handleClick = () => {
    if (selectMode) {
      onToggleCheck(lead.id);
    } else {
      onClick();
    }
  };

  return (
    <div
      className={`lead-card ${selected && !selectMode ? 'lead-card--selected' : ''} ${selectMode && isChecked ? 'lead-card--checked' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
    >
      <div className="lead-card__top">
        {selectMode && (
          <span className={`lead-card__checkbox ${isChecked ? 'lead-card__checkbox--checked' : ''}`}>
            {isChecked ? '\u2713' : ''}
          </span>
        )}
        <span className="lead-card__company">{lead.company || 'Ok\u00e4nt f\u00f6retag'}</span>
        <span className="lead-card__badge" style={{ backgroundColor: color }}>
          {getStatusLabel(lead.status)}
        </span>
        {showRemove && !selectMode && !confirmRemove && (
          <button
            className="lead-card__remove"
            title="Ta bort fr\u00e5n lista"
            onClick={(e) => { e.stopPropagation(); setConfirmRemove(true); }}
          >
            {'\u2715'}
          </button>
        )}
        {showRemove && !selectMode && confirmRemove && (
          <span className="lead-card__confirm" onClick={(e) => e.stopPropagation()}>
            <button
              className="lead-card__confirm-yes"
              onClick={(e) => { e.stopPropagation(); setConfirmRemove(false); onRemove(lead.id); }}
            >
              Ta bort
            </button>
            <button
              className="lead-card__confirm-no"
              onClick={(e) => { e.stopPropagation(); setConfirmRemove(false); }}
            >
              Avbryt
            </button>
          </span>
        )}
      </div>
      {selectMode && lead.industry && <div className="lead-card__industry">{lead.industry}</div>}
      {contactLine && <div className="lead-card__contact">{contactLine}{lead.title ? ` \u2022 ${lead.title}` : ''}</div>}
      {!selectMode && secondLine && <div className="lead-card__phone">{secondLine}</div>}
      {!selectMode && contactCount > 1 && <div className="lead-card__phone">+{contactCount - 1} kontakter till</div>}
      {!selectMode && lead.call_count > 0 && (
        <span className="lead-card__call-count" title={`${lead.call_count} samtal`}>
          {lead.call_count}
        </span>
      )}
    </div>
  );
}
