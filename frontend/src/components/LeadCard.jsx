import React, { useState, memo } from 'react';
import clsx from 'clsx';
import { getStatusColor, getStatusLabel } from '../constants/statuses';

const LeadCard = memo(function LeadCard({ lead, selected, onClick, selectMode, isChecked, onToggleCheck, showRemove, onRemove }) {
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
      className={clsx(
        'relative cursor-pointer rounded-lg pl-7 pr-4 py-3.5 transition-all duration-150 border-l-[3px]',
        selected && !selectMode
          ? 'bg-white/10 shadow-[inset_0_0_8px_rgba(255,255,255,0.05)]'
          : 'hover:bg-white/5',
        selectMode && isChecked && 'bg-white/10',
        !selected && !isChecked && 'bg-transparent'
      )}
      style={{ borderLeftColor: selected && !selectMode ? '#fff' : color, paddingLeft: '4px' }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
    >
      {/* Top row: checkbox, company, badge, call count, remove */}
      <div className="flex items-center gap-2.5">
        {selectMode && (
          <span
            className={clsx(
              'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-sm border text-[10px] leading-none transition-colors',
              isChecked
                ? 'border-blue-400 bg-blue-500 text-white'
                : 'border-white/30 bg-transparent'
            )}
          >
            {isChecked ? '\u2713' : ''}
          </span>
        )}

        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
          {lead.company || 'Ok\u00e4nt f\u00f6retag'}
        </span>

        {!selectMode && lead.call_count > 0 && (
          <span
            className="flex-shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-700 px-1.5 text-[10px] font-medium leading-none text-slate-300"
            title={`${lead.call_count} samtal`}
          >
            {lead.call_count}
          </span>
        )}

        <span
          className="flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none text-white whitespace-nowrap"
          style={{ backgroundColor: color }}
        >
          {getStatusLabel(lead.status)}
        </span>

        {showRemove && !selectMode && !confirmRemove && (
          <button
            className="flex-shrink-0 text-xs text-slate-500 transition-colors hover:text-red-400"
            title="Ta bort fr\u00e5n lista"
            onClick={(e) => { e.stopPropagation(); setConfirmRemove(true); }}
          >
            {'\u2715'}
          </button>
        )}

        {showRemove && !selectMode && confirmRemove && (
          <span className="flex flex-shrink-0 gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              className="rounded bg-red-600 px-2 py-1 text-[11px] text-white transition-colors hover:bg-red-500"
              onClick={(e) => { e.stopPropagation(); setConfirmRemove(false); onRemove(lead.id); }}
            >
              Ta bort
            </button>
            <button
              className="rounded bg-slate-700 px-2 py-1 text-[11px] text-slate-300 transition-colors hover:bg-slate-600"
              onClick={(e) => { e.stopPropagation(); setConfirmRemove(false); }}
            >
              Avbryt
            </button>
          </span>
        )}
      </div>

      {/* Industry (select mode only) */}
      {selectMode && lead.industry && (
        <div className="mt-1 truncate text-xs text-slate-500">{lead.industry}</div>
      )}

      {/* Contact name + title */}
      {contactLine && (
        <div className="mt-2 truncate text-[13px] text-slate-400">
          {contactLine}{lead.title ? ` \u2022 ${lead.title}` : ''}
        </div>
      )}

      {/* Phone / email */}
      {!selectMode && secondLine && (
        <div className="mt-1 truncate text-[13px] text-slate-500">{secondLine}</div>
      )}

      {/* Additional contacts */}
      {!selectMode && contactCount > 1 && (
        <div className="mt-1 text-xs text-slate-500">+{contactCount - 1} kontakter till</div>
      )}

    </div>
  );
});

export default LeadCard;
