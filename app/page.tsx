'use client';

import { useState, useMemo } from 'react';
import { Camera, Upload, FileText, Database, Download, Search, Filter, ArrowUpDown, Copy, FileSpreadsheet } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface HistoryRow {
  id: string;
  scanTime: Date;
  raw: string;
  gtin14: string;
  gtin13: string;
  expiry: string;
  batch: string;
  serial: string;
  qty: string;
  productName: string;
  matchType: 'exact' | 'fuzzy' | 'none';
}

interface AppState {
  masterLoaded: boolean;
  masterCount: number;
  historyRows: HistoryRow[];
  searchQuery: string;
  filterExpired: boolean;
  filterExpiringSoon: boolean;
  filterMissingExpiry: boolean;
  sortBy: 'expiry' | 'scanTime';
  sortOrder: 'asc' | 'desc';
}

// ============================================================================
// STUB FUNCTIONS (to be implemented later)
// ============================================================================

const parseGs1 = (raw: string) => {
  console.log('parseGs1 stub called with:', raw);
  return {
    gtin14: '',
    gtin13: '',
    expiry: '',
    batch: '',
    serial: '',
    qty: ''
  };
};

const buildMasterIndex = (text: string) => {
  console.log('buildMasterIndex stub called');
  return { count: 0, index: {} };
};

const matchProduct = (parsed: any, index: any) => {
  console.log('matchProduct stub called');
  return { name: 'Unknown Product', matchType: 'none' };
};

const exportTSV = (rows: HistoryRow[]) => {
  console.log('exportTSV stub called with', rows.length, 'rows');
  const headers = ['Scan Time', 'Raw', 'GTIN14', 'GTIN13', 'Expiry', 'Batch', 'Serial', 'Qty', 'Product Name', 'Match Type'];
  const tsv = [
    headers.join('\t'),
    ...rows.map(r => [
      r.scanTime.toISOString(),
      r.raw,
      r.gtin14,
      r.gtin13,
      r.expiry,
      r.batch,
      r.serial,
      r.qty,
      r.productName,
      r.matchType
    ].join('\t'))
  ].join('\n');
  
  const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gs1-export-${Date.now()}.tsv`;
  a.click();
};

const exportCSV = (rows: HistoryRow[]) => {
  console.log('exportCSV stub called with', rows.length, 'rows');
  const headers = ['Scan Time', 'Raw', 'GTIN14', 'GTIN13', 'Expiry', 'Batch', 'Serial', 'Qty', 'Product Name', 'Match Type'];
  const csv = [
    headers.join(','),
    ...rows.map(r => [
      r.scanTime.toISOString(),
      `"${r.raw}"`,
      r.gtin14,
      r.gtin13,
      r.expiry,
      `"${r.batch}"`,
      `"${r.serial}"`,
      r.qty,
      `"${r.productName}"`,
      r.matchType
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gs1-export-${Date.now()}.csv`;
  a.click();
};

const copyLastRowTSV = (rows: HistoryRow[]) => {
  if (rows.length === 0) return;
  const last = rows[rows.length - 1];
  const tsv = [
    last.scanTime.toISOString(),
    last.raw,
    last.gtin14,
    last.gtin13,
    last.expiry,
    last.batch,
    last.serial,
    last.qty,
    last.productName,
    last.matchType
  ].join('\t');
  navigator.clipboard.writeText(tsv);
};

const backupJSON = (state: AppState) => {
  console.log('backupJSON stub called');
  const backup = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    historyRows: state.historyRows,
    masterCount: state.masterCount
  };
  
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gs1-backup-${Date.now()}.json`;
  a.click();
};

const restoreJSON = (json: string, setState: (state: Partial<AppState>) => void) => {
  console.log('restoreJSON stub called');
  try {
    const backup = JSON.parse(json);
    setState({
      historyRows: backup.historyRows.map((r: any) => ({
        ...r,
        scanTime: new Date(r.scanTime)
      })),
      masterCount: backup.masterCount || 0
    });
  } catch (e) {
    console.error('Failed to restore backup:', e);
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getExpiryStatus = (expiry: string): 'expired' | 'soon' | 'ok' | 'missing' => {
  if (!expiry) return 'missing';
  
  const expiryDate = new Date(expiry);
  const now = new Date();
  const diffDays = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'soon';
  return 'ok';
};

// ============================================================================
// DUMMY DATA
// ============================================================================

const DUMMY_HISTORY: HistoryRow[] = [
  {
    id: '1',
    scanTime: new Date('2024-03-15T10:30:00'),
    raw: '01034531200000112117251231102100001234567890',
    gtin14: '03453120000011',
    gtin13: '3453120000011',
    expiry: '2025-12-31',
    batch: 'LOT-2024-001',
    serial: '1234567890',
    qty: '21',
    productName: 'Aspirin 100mg Tablets',
    matchType: 'exact'
  },
  {
    id: '2',
    scanTime: new Date('2024-03-15T11:15:00'),
    raw: '01034531200000229117240430102100009876543210',
    gtin14: '03453120000029',
    gtin13: '3453120000029',
    expiry: '2024-04-30',
    batch: 'LOT-2024-002',
    serial: '9876543210',
    qty: '21',
    productName: 'Ibuprofen 200mg Tablets',
    matchType: 'exact'
  },
  {
    id: '3',
    scanTime: new Date('2024-03-15T14:20:00'),
    raw: '01034531200000336117240228102100001111111111',
    gtin14: '03453120000036',
    gtin13: '3453120000036',
    expiry: '2024-02-28',
    batch: 'LOT-2024-003',
    serial: '1111111111',
    qty: '21',
    productName: 'Paracetamol 500mg Tablets',
    matchType: 'fuzzy'
  },
  {
    id: '4',
    scanTime: new Date('2024-03-15T15:45:00'),
    raw: '01034531200000443102100002222222222',
    gtin14: '03453120000044',
    gtin13: '3453120000044',
    expiry: '',
    batch: 'LOT-2024-004',
    serial: '2222222222',
    qty: '21',
    productName: '',
    matchType: 'none'
  }
];

// ============================================================================
// COMPONENTS
// ============================================================================

const ExpiryBadge = ({ expiry }: { expiry: string }) => {
  const status = getExpiryStatus(expiry);
  
  const styles = {
    expired: 'bg-red-500/10 text-red-700 border-red-500/20',
    soon: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    ok: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    missing: 'bg-slate-500/10 text-slate-600 border-slate-500/20'
  };
  
  const labels = {
    expired: 'Expired',
    soon: 'Soon',
    ok: 'OK',
    missing: 'No Date'
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const MatchTypeBadge = ({ type }: { type: string }) => {
  const styles = {
    exact: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    fuzzy: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    none: 'bg-slate-500/10 text-slate-600 border-slate-500/20'
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded ${styles[type as keyof typeof styles] || styles.none}`}>
      {type}
    </span>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GS1Parser() {
  const [activeTab, setActiveTab] = useState<'scan' | 'bulk' | 'history' | 'master' | 'backup'>('scan');
  const [state, setState] = useState<AppState>({
    masterLoaded: false,
    masterCount: 0,
    historyRows: DUMMY_HISTORY,
    searchQuery: '',
    filterExpired: false,
    filterExpiringSoon: false,
    filterMissingExpiry: false,
    sortBy: 'scanTime',
    sortOrder: 'desc'
  });
  
  const [bulkText, setBulkText] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  
  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };
  
  // Filter and sort history
  const filteredHistory = useMemo(() => {
    let filtered = state.historyRows;
    
    // Apply search
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(row =>
        row.raw.toLowerCase().includes(query) ||
        row.gtin14.toLowerCase().includes(query) ||
        row.gtin13.toLowerCase().includes(query) ||
        row.batch.toLowerCase().includes(query) ||
        row.serial.toLowerCase().includes(query) ||
        row.productName.toLowerCase().includes(query)
      );
    }
    
    // Apply filters
    if (state.filterExpired) {
      filtered = filtered.filter(row => getExpiryStatus(row.expiry) === 'expired');
    }
    if (state.filterExpiringSoon) {
      filtered = filtered.filter(row => getExpiryStatus(row.expiry) === 'soon');
    }
    if (state.filterMissingExpiry) {
      filtered = filtered.filter(row => getExpiryStatus(row.expiry) === 'missing');
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (state.sortBy === 'scanTime') {
        const diff = a.scanTime.getTime() - b.scanTime.getTime();
        return state.sortOrder === 'asc' ? diff : -diff;
      } else {
        const aDate = a.expiry ? new Date(a.expiry).getTime() : 0;
        const bDate = b.expiry ? new Date(b.expiry).getTime() : 0;
        const diff = aDate - bDate;
        return state.sortOrder === 'asc' ? diff : -diff;
      }
    });
    
    return filtered;
  }, [state.historyRows, state.searchQuery, state.filterExpired, state.filterExpiringSoon, state.filterMissingExpiry, state.sortBy, state.sortOrder]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
                GS1 Parser
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                Offline barcode scanning and product tracking
              </p>
            </div>
            {state.masterLoaded && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {state.masterCount.toLocaleString()} products loaded
                </span>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Tab Navigation */}
      <div className="border-b border-slate-200 bg-white/60 backdrop-blur-sm sticky top-[73px] z-40">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1">
            {[
              { id: 'scan', label: 'Scan', icon: Camera },
              { id: 'bulk', label: 'Bulk Paste', icon: FileText },
              { id: 'history', label: 'History', icon: Database },
              { id: 'master', label: 'Master', icon: Upload },
              { id: 'backup', label: 'Backup/Restore', icon: Download }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative ${
                    isActive
                      ? 'text-blue-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      
      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Scan Tab */}
        {activeTab === 'scan' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Camera Scan</h2>
                <p className="text-sm text-slate-600 mt-1">Point camera at GS1 barcode to scan</p>
              </div>
              <div className="p-6">
                <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center mb-4">
                  {cameraActive ? (
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-white text-sm">Camera preview would appear here</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 text-sm">Camera inactive</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCameraActive(!cameraActive)}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      cameraActive
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {cameraActive ? 'Stop Camera' : 'Start Camera'}
                  </button>
                  <label className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-medium cursor-pointer text-center transition-all">
                    <input type="file" accept="image/*" className="hidden" />
                    Upload Image
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Bulk Paste Tab */}
        {activeTab === 'bulk' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Bulk Paste</h2>
              <p className="text-sm text-slate-600 mt-1">Paste multiple barcodes (one per line)</p>
            </div>
            <div className="p-6">
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Paste barcodes here, one per line..."
                className="w-full h-64 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
              />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    console.log('Processing bulk paste:', bulkText);
                    setBulkText('');
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
                >
                  Process Barcodes
                </button>
                <button
                  onClick={() => setBulkText('')}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-medium transition-all"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search barcodes, products, batches, serials..."
                    value={state.searchQuery}
                    onChange={(e) => updateState({ searchQuery: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              
              {/* Filter Chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => updateState({ filterExpired: !state.filterExpired })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    state.filterExpired
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5 inline mr-1.5" />
                  Only Expired
                </button>
                <button
                  onClick={() => updateState({ filterExpiringSoon: !state.filterExpiringSoon })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    state.filterExpiringSoon
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5 inline mr-1.5" />
                  Expiring Soon (≤30d)
                </button>
                <button
                  onClick={() => updateState({ filterMissingExpiry: !state.filterMissingExpiry })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    state.filterMissingExpiry
                      ? 'bg-slate-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5 inline mr-1.5" />
                  Missing Expiry
                </button>
              </div>
              
              {/* Sort and Export */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    updateState({
                      sortBy: 'expiry',
                      sortOrder: state.sortBy === 'expiry' && state.sortOrder === 'asc' ? 'desc' : 'asc'
                    });
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 inline mr-1.5" />
                  Sort by Expiry
                </button>
                <button
                  onClick={() => {
                    updateState({
                      sortBy: 'scanTime',
                      sortOrder: state.sortBy === 'scanTime' && state.sortOrder === 'asc' ? 'desc' : 'asc'
                    });
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 inline mr-1.5" />
                  Sort by Scan Time
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => exportTSV(filteredHistory)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 inline mr-1.5" />
                  Export TSV
                </button>
                <button
                  onClick={() => exportCSV(filteredHistory)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 inline mr-1.5" />
                  Export CSV
                </button>
                <button
                  onClick={() => copyLastRowTSV(state.historyRows)}
                  className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-all"
                >
                  <Copy className="w-3.5 h-3.5 inline mr-1.5" />
                  Copy Last Row
                </button>
              </div>
            </div>
            
            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Scan Time</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Raw</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">GTIN14</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">GTIN13</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Expiry</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Batch</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Serial</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Qty</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Product Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Match Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                          No records found
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map(row => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-900 font-mono text-xs">
                            {row.scanTime.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-mono text-xs max-w-[200px] truncate" title={row.raw}>
                            {row.raw}
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-mono text-xs">
                            {row.gtin14}
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-mono text-xs">
                            {row.gtin13}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-900 font-mono text-xs">{row.expiry || '-'}</span>
                              <ExpiryBadge expiry={row.expiry} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-mono text-xs">
                            {row.batch}
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-mono text-xs">
                            {row.serial}
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-mono text-xs">
                            {row.qty}
                          </td>
                          <td className="px-4 py-3 text-slate-900">
                            {row.productName || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <MatchTypeBadge type={row.matchType} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-600">
                Showing {filteredHistory.length} of {state.historyRows.length} records
              </div>
            </div>
          </div>
        )}
        
        {/* Master Tab */}
        {activeTab === 'master' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Master Product Database</h2>
              <p className="text-sm text-slate-600 mt-1">Upload CSV/TSV with GTIN and product names</p>
            </div>
            <div className="p-6 space-y-4">
              {state.masterLoaded && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-900">
                    <Database className="w-5 h-5" />
                    <span className="font-semibold">{state.masterCount.toLocaleString()} products loaded</span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-3">
                <label className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer text-center transition-all">
                  <input type="file" accept=".csv,.tsv,.txt" className="hidden" />
                  Replace Master
                </label>
                <label className="px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium cursor-pointer text-center transition-all">
                  <input type="file" accept=".csv,.tsv,.txt" className="hidden" />
                  Append to Master
                </label>
                <button className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all">
                  Clear Master
                </button>
              </div>
              
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">Preview</h3>
                <div className="text-sm text-slate-600">
                  No master data loaded. Upload a file to see preview.
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Backup/Restore Tab */}
        {activeTab === 'backup' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Backup & Restore</h2>
              <p className="text-sm text-slate-600 mt-1">Export or import all scan history</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Backup</h3>
                <p className="text-sm text-slate-600 mb-3">Download all scan history as JSON</p>
                <button
                  onClick={() => backupJSON(state)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  Download Backup
                </button>
              </div>
              
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-900 mb-2">Restore</h3>
                <p className="text-sm text-slate-600 mb-3">Upload a previous backup to restore data</p>
                <label className="inline-flex items-center px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium cursor-pointer transition-all">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Backup
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const json = ev.target?.result as string;
                          restoreJSON(json, updateState);
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Add custom fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        :root {
          --font-display: 'IBM Plex Sans', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }
        
        body {
          font-family: var(--font-display);
        }
      `}</style>
    </div>
  );
}
