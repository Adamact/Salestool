import React, { useState, useRef } from 'react';
import { useApi } from '../hooks/useApi';

export default function ExcelImport({ onClose, onImported }) {
  const api = useApi();
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.importExcel(file);
      setResult(data);
      if (onImported) onImported();
    } catch (err) {
      setError(err.message || 'Import misslyckades');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Importera leads fr\u00e5n Excel</h3>
          <button className="modal__close" onClick={onClose}>{'\u00d7'}</button>
        </div>
        <div className="modal__body">
          <div
            className={`import-drop ${dragging ? 'import-drop--active' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {uploading ? (
              <p>Laddar upp...</p>
            ) : (
              <>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8, opacity: 0.5 }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p>Dra och sl{'\u00e4'}pp en fil h{'\u00e4'}r, eller klicka f{'\u00f6'}r att v{'\u00e4'}lja</p>
                <span className="import-drop__hint">.xlsx, .xls eller .csv</span>
              </>
            )}
          </div>
          {error && <p className="import-error">{error}</p>}
          {result && (
            <p className="import-success">
              {result.imported ?? result.count ?? 0} leads importerade!
            </p>
          )}
        </div>
        <div className="modal__footer">
          <button className="btn btn--secondary" onClick={onClose}>St{'\u00e4'}ng</button>
        </div>
      </div>
    </div>
  );
}
