import React, { useState, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import SlidePanel from './SlidePanel';

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
      if (fileRef.current) fileRef.current.value = '';
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
    <SlidePanel open={true} onClose={onClose} title="Importera leads" width={440}>
      <div className="px-6 py-6">
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
            dragging
              ? 'border-accent bg-accent-subtle'
              : 'border-slate-200 hover:border-slate-300'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {uploading ? (
            <p className="text-sm text-slate-500">Laddar upp...</p>
          ) : (
            <>
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto text-slate-300 mb-3"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-sm text-slate-600">
                Dra och släpp en fil här, eller klicka för att välja
              </p>
              <span className="text-xs text-slate-400 mt-1 block">
                .xlsx, .xls eller .csv
              </span>
            </>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
        {result && (
          <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600">
            {result.imported ?? result.count ?? 0} leads importerade!
          </p>
        )}
      </div>

      <div className="mt-auto px-6 py-4 border-t border-slate-100 flex justify-end">
        <button
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 transition-colors"
          onClick={onClose}
        >
          Stäng
        </button>
      </div>
    </SlidePanel>
  );
}
