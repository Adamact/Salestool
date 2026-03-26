import React, { useState } from 'react';

export default function FloatingScript({ manuscript, onClose }) {
  const [collapsed, setCollapsed] = useState({});

  const scripts = (manuscript || []).filter((s) => s.section_type !== 'objection');
  const objections = (manuscript || []).filter((s) => s.section_type === 'objection');

  const toggle = (id) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="floating-script">
      <div className="floating-script__header">
        <span className="floating-script__title">Manus</span>
        <button className="floating-script__close" onClick={onClose}>&times;</button>
      </div>
      <div className="floating-script__body">
        {scripts.length > 0 && (
          <div className="floating-script__section">
            {scripts.map((s) => (
              <div key={s.id} className="floating-script__item">
                <div className="floating-script__item-title" onClick={() => toggle(s.id)}>
                  {s.title}
                  <span className="floating-script__chevron">{collapsed[s.id] ? '\u25BC' : '\u25B2'}</span>
                </div>
                {!collapsed[s.id] && (
                  <div className="floating-script__item-content">{s.content}</div>
                )}
              </div>
            ))}
          </div>
        )}
        {objections.length > 0 && (
          <div className="floating-script__section">
            <div className="floating-script__section-title">Invändningar</div>
            {objections.map((s) => (
              <div key={s.id} className="floating-script__item">
                <div className="floating-script__item-title" onClick={() => toggle(s.id)}>
                  {s.title}
                  <span className="floating-script__chevron">{collapsed[s.id] ? '\u25BC' : '\u25B2'}</span>
                </div>
                {!collapsed[s.id] && (
                  <div className="floating-script__item-content">{s.content}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
