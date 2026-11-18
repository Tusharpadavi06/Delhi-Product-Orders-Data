import React, { useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  Download,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  RotateCcw,
  Plus,
  Trash2,
  History
} from 'lucide-react';
import {
  TnaDateHistoryEntry,
  TnaManualEntry,
  TnaRowItem,
  parseTnaDateParts,
  toHtmlDateInputValue,
  toTnaStorageDate
} from '../utils/tnaUtils';

export type TnaDateFieldKey =
  | 'labdipCommittedDate'
  | 'labdipActualDate'
  | 'labdipRejectionDate'
  | 'labdipApprovalDate'
  | 'fobCommittedDate'
  | 'fobActualDate'
  | 'fobRejectionDate'
  | 'fobApprovalDate'
  | 'actualDispatchDate'
  | 'committedBalanceDate'
  | 'actualBalanceDispatchDate';

interface TNAViewProps {
  tnaRows: TnaRowItem[];
  onUpdateField: (tnaKey: string, altKey: string, field: keyof TnaManualEntry, value: string) => void;
  onSaveDateWithHistory: (
    tnaKey: string,
    altKey: string,
    field: TnaDateFieldKey,
    newDate: string,
    remark?: string,
    fromCard?: boolean
  ) => void;
  onDeleteDateHistoryEntry: (
    tnaKey: string,
    altKey: string,
    field: TnaDateFieldKey,
    entryId: string
  ) => void;
  onSyncSheet: () => void;
  isSyncing: boolean;
  syncNotice: string | null;
  isFullWidth: boolean;
}

type TnaColKey =
  | 'orderDate'
  | 'orderNo'
  | 'customerName'
  | 'itemName'
  | 'color'
  | 'width'
  | 'unit'
  | 'qty'
  | 'unitOfItem'
  | 'deliveryDate'
  | 'orderStatus'
  | 'labdipCommittedDate'
  | 'labdipActualDate'
  | 'labdipRejectionDate'
  | 'labdipApprovalDate'
  | 'labdipDelayDays'
  | 'fobCommittedDate'
  | 'fobActualDate'
  | 'fobRejectionDate'
  | 'fobApprovalDate'
  | 'fobDelayDays'
  | 'actualDispatchDate'
  | 'totalDispatchedQty'
  | 'pendingQty'
  | 'committedBalanceDate'
  | 'actualBalanceDispatchDate'
  | 'balanceDispatchQty'
  | 'orderRemarks'
  | 'balanceDelayDays';

interface TnaColDef {
  key: TnaColKey;
  label: string;
  width: number;
  group: 'order' | 'labdip' | 'fob' | 'dispatch' | 'balance';
  isNumeric?: boolean;
}

const TNA_COLUMNS: TnaColDef[] = [
  { key: 'orderDate', label: 'Order Date', width: 74, group: 'order' },
  { key: 'orderNo', label: 'Order No', width: 92, group: 'order' },
  { key: 'customerName', label: 'Customer Name', width: 124, group: 'order' },
  { key: 'itemName', label: 'Item Name', width: 124, group: 'order' },
  { key: 'color', label: 'Color', width: 76, group: 'order' },
  { key: 'width', label: 'Width', width: 62, group: 'order' },
  { key: 'unit', label: 'Unit', width: 68, group: 'order' },
  { key: 'qty', label: 'Qty', width: 60, group: 'order', isNumeric: true },
  { key: 'unitOfItem', label: 'Unit Of Item', width: 62, group: 'order' },
  { key: 'deliveryDate', label: 'Delivery Date', width: 74, group: 'order' },
  { key: 'orderStatus', label: 'Order Status', width: 88, group: 'order' },
  // Step 1. Lapdip (L-P)
  { key: 'labdipCommittedDate', label: 'Commited Date', width: 104, group: 'labdip' },
  { key: 'labdipActualDate', label: 'Actual Date', width: 104, group: 'labdip' },
  { key: 'labdipRejectionDate', label: 'Rejection Date', width: 128, group: 'labdip' },
  { key: 'labdipApprovalDate', label: 'Approval Date', width: 104, group: 'labdip' },
  { key: 'labdipDelayDays', label: 'Delay Days', width: 54, group: 'labdip', isNumeric: true },
  // Step 2. FOB (Q-U)
  { key: 'fobCommittedDate', label: 'Commited Date', width: 104, group: 'fob' },
  { key: 'fobActualDate', label: 'Actual Date', width: 104, group: 'fob' },
  { key: 'fobRejectionDate', label: 'Rejection Date', width: 128, group: 'fob' },
  { key: 'fobApprovalDate', label: 'Approval Date', width: 104, group: 'fob' },
  { key: 'fobDelayDays', label: 'Delay Days', width: 54, group: 'fob', isNumeric: true },
  // Step 3. Dispatch (V-W)
  { key: 'actualDispatchDate', label: 'Actual Dispatch Date', width: 104, group: 'dispatch' },
  { key: 'totalDispatchedQty', label: 'Total Dispatched Qty', width: 64, group: 'dispatch', isNumeric: true },
  // Step 4. Balance fabric (X-AC)
  { key: 'pendingQty', label: 'Pending Qty', width: 58, group: 'balance', isNumeric: true },
  { key: 'committedBalanceDate', label: 'Commited balance date', width: 104, group: 'balance' },
  { key: 'actualBalanceDispatchDate', label: 'Actual balance dispatch Date', width: 104, group: 'balance' },
  { key: 'balanceDispatchQty', label: 'Dispatch qty', width: 58, group: 'balance', isNumeric: true },
  { key: 'orderRemarks', label: 'Order Remarks', width: 110, group: 'balance' },
  { key: 'balanceDelayDays', label: 'Delay Days', width: 54, group: 'balance', isNumeric: true }
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getTnaCellDisplayValue(row: TnaRowItem, colKey: TnaColKey): string {
  switch (colKey) {
    case 'orderDate': return row.orderDate || '';
    case 'orderNo': return row.orderNo || '';
    case 'customerName': return row.customerName || '';
    case 'itemName': return row.itemName || '';
    case 'color': return row.color || '';
    case 'width': return row.width || '';
    case 'unit': return row.unit || '';
    case 'qty': return String(row.qty ?? 0);
    case 'unitOfItem': return row.unitOfItem || '';
    case 'deliveryDate': return row.deliveryDate || '';
    case 'orderStatus': return row.orderStatus || '';
    case 'labdipDelayDays': return row.labdipDelayDays !== null ? String(row.labdipDelayDays) : '';
    case 'fobDelayDays': return row.fobDelayDays !== null ? String(row.fobDelayDays) : '';
    case 'balanceDelayDays': return row.balanceDelayDays !== null ? String(row.balanceDelayDays) : '';
    default: return String(row.manual[colKey as keyof TnaManualEntry] ?? '');
  }
}

const STEP_DATE_FIELDS: { key: TnaDateFieldKey; label: string }[] = [
  { key: 'labdipRejectionDate', label: 'Step 1 · Labdip Rejection Date' },
  { key: 'labdipCommittedDate', label: 'Step 1 · Labdip Commited Date' },
  { key: 'labdipActualDate', label: 'Step 1 · Labdip Actual Date' },
  { key: 'labdipApprovalDate', label: 'Step 1 · Labdip Approval Date' },
  { key: 'fobRejectionDate', label: 'Step 2 · FOB Rejection Date' },
  { key: 'fobCommittedDate', label: 'Step 2 · FOB Commited Date' },
  { key: 'fobActualDate', label: 'Step 2 · FOB Actual Date' },
  { key: 'fobApprovalDate', label: 'Step 2 · FOB Approval Date' },
  { key: 'actualDispatchDate', label: 'Step 3 · Actual Dispatch Date' },
  { key: 'committedBalanceDate', label: 'Step 4 · Commited Balance Date' },
  { key: 'actualBalanceDispatchDate', label: 'Step 4 · Actual Balance Dispatch Date' }
];

export const TNAView: React.FC<TNAViewProps> = ({
  tnaRows,
  onUpdateField,
  onSaveDateWithHistory,
  onDeleteDateHistoryEntry,
  onSyncSheet,
  isSyncing,
  syncNotice,
  isFullWidth
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
  const [sortConfig, setSortConfig] = useState<{ key: TnaColKey; direction: 'asc' | 'desc' } | null>(null);
  const [activeFilterCol, setActiveFilterCol] = useState<TnaColKey | null>(null);
  const [filterSearch, setFilterSearch] = useState('');

  // Date + Remark History Card modal state
  const [dateCardTarget, setDateCardTarget] = useState<{
    tnaKey: string;
    altKey: string;
    field: TnaDateFieldKey;
  } | null>(null);
  const [cardDateInput, setCardDateInput] = useState<string>('');
  const [cardRemarkInput, setCardRemarkInput] = useState<string>('');
  const [cardViewMode, setCardViewMode] = useState<'field' | 'all_steps'>('field');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const availableYears = useMemo(() => {
    const years = new Set<string>(['2025', '2026']);
    tnaRows.forEach(r => {
      const p = parseTnaDateParts(r.orderDate);
      if (p && p.year >= 2020 && p.year <= 2035) years.add(String(p.year));
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [tnaRows]);

  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: 0 };
    for (let m = 1; m <= 12; m++) counts[String(m)] = 0;
    tnaRows.forEach(r => {
      const p = parseTnaDateParts(r.orderDate);
      if (yearFilter !== 'ALL' && (!p || String(p.year) !== yearFilter)) return;
      counts.ALL++;
      if (p) counts[String(p.month)] = (counts[String(p.month)] || 0) + 1;
    });
    return counts;
  }, [tnaRows, yearFilter]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const activeFilterEntries = Object.entries(colFilters).filter(([, vals]) => vals && vals.length > 0);

    let list = tnaRows.filter(row => {
      if (monthFilter !== 'ALL' || yearFilter !== 'ALL') {
        const p = parseTnaDateParts(row.orderDate);
        if (monthFilter !== 'ALL' && (!p || String(p.month) !== monthFilter)) return false;
        if (yearFilter !== 'ALL' && (!p || String(p.year) !== yearFilter)) return false;
      }

      if (stageFilter !== 'ALL') {
        if (stageFilter === 'BLANK') {
          if (row.orderStatus !== '') return false;
        } else if (row.orderStatus !== stageFilter) {
          return false;
        }
      }

      if (q) {
        const hit =
          row.orderNo.toLowerCase().includes(q) ||
          row.customerName.toLowerCase().includes(q) ||
          row.itemName.toLowerCase().includes(q) ||
          row.color.toLowerCase().includes(q) ||
          row.unit.toLowerCase().includes(q) ||
          row.manual.orderRemarks.toLowerCase().includes(q);
        if (!hit) return false;
      }

      for (const [colKey, selectedVals] of activeFilterEntries) {
        const val = getTnaCellDisplayValue(row, colKey as TnaColKey) || '(Blank)';
        if (!selectedVals.includes(val)) return false;
      }

      return true;
    });

    if (sortConfig) {
      const colDef = TNA_COLUMNS.find(c => c.key === sortConfig.key);
      list = [...list].sort((a, b) => {
        const va = getTnaCellDisplayValue(a, sortConfig.key);
        const vb = getTnaCellDisplayValue(b, sortConfig.key);
        if (colDef?.isNumeric) {
          const na = parseFloat(va) || 0;
          const nb = parseFloat(vb) || 0;
          return sortConfig.direction === 'asc' ? na - nb : nb - na;
        }
        const cmp = va.localeCompare(vb, undefined, { numeric: true, sensitivity: 'base' });
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  }, [tnaRows, searchTerm, monthFilter, yearFilter, stageFilter, colFilters, sortConfig]);

  const totalPages = Math.max(1, pageSize === 0 ? 1 : Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    if (pageSize === 0) return filteredRows;
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  const getUniqueValuesForCol = (colKey: TnaColKey): string[] => {
    const set = new Set<string>();
    tnaRows.forEach(r => {
      const val = getTnaCellDisplayValue(r, colKey) || '(Blank)';
      set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    monthFilter !== 'ALL' ||
    yearFilter !== 'ALL' ||
    stageFilter !== 'ALL' ||
    sortConfig !== null ||
    Object.values(colFilters).some(v => v && v.length > 0);

  const handleClearFilters = () => {
    setSearchTerm('');
    setMonthFilter('ALL');
    setYearFilter('ALL');
    setStageFilter('ALL');
    setColFilters({});
    setSortConfig(null);
    setPage(1);
  };

  const handleExportCsv = () => {
    const headers = TNA_COLUMNS.map(c => c.label);
    const escapeCsv = (v: string | number) => {
      const s = String(v ?? '');
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [
      headers.map(escapeCsv).join(','),
      ...filteredRows.map(row =>
        TNA_COLUMNS.map(col => escapeCsv(getTnaCellDisplayValue(row, col.key))).join(',')
      )
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TNA_Open_Orders_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDateChange = (
    row: TnaRowItem,
    field: TnaDateFieldKey,
    htmlVal: string
  ) => {
    const formatted = htmlVal ? toTnaStorageDate(htmlVal) : '';
    onSaveDateWithHistory(row.tnaKey, row.altKey, field, formatted);
  };

  const openDateRemarkCard = (row: TnaRowItem, field: TnaDateFieldKey) => {
    const currentFieldVal = String(row.manual[field] ?? '');
    setDateCardTarget({ tnaKey: row.tnaKey, altKey: row.altKey, field });
    setCardDateInput(toHtmlDateInputValue(currentFieldVal) || new Date().toISOString().slice(0, 10));
    setCardRemarkInput('');
    setCardViewMode('field');
  };

  const activeCardRow = useMemo(() => {
    if (!dateCardTarget) return null;
    return tnaRows.find(r => r.tnaKey === dateCardTarget.tnaKey) || null;
  }, [dateCardTarget, tnaRows]);

  const getHistoryForField = (m: TnaManualEntry, field: TnaDateFieldKey): TnaDateHistoryEntry[] => {
    if (field === 'labdipRejectionDate') return m.labdipRejectionHistory || [];
    if (field === 'fobRejectionDate') return m.fobRejectionHistory || [];
    return m.stepDateHistory?.[field] || [];
  };

  const renderDelayBadge = (days: number | null) => {
    if (days === null) {
      return <span className="text-slate-300 text-[10px]">—</span>;
    }
    const cls =
      days > 0
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : days < 0
        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
        : 'bg-slate-100 text-slate-700 border-slate-300';
    return (
      <span className={`inline-block px-1 py-0 rounded border font-mono text-[10px] font-bold ${cls}`}>
        {days}
      </span>
    );
  };

  const renderStageBadge = (stage: TnaRowItem['orderStatus']) => {
    if (!stage) return <span className="text-slate-300 text-[10px]">—</span>;
    const styleMap: Record<string, string> = {
      'Balance Fabric': 'bg-purple-100 text-purple-900 border-purple-300',
      Dispatch: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      FOB: 'bg-amber-100 text-amber-900 border-amber-300',
      Labdip: 'bg-sky-100 text-sky-900 border-sky-300'
    };
    return (
      <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-bold truncate max-w-full ${styleMap[stage] || ''}`}>
        {stage}
      </span>
    );
  };

  const totalTableWidth = 34 + TNA_COLUMNS.reduce((acc, c) => acc + c.width, 0);

  return (
    <div className="space-y-2">
      {/* Compact Horizontal Toolbar (No A..AC letters, No Sheet Script & Link button, No Open Orders badge) */}
      <div className="px-2.5 pt-1.5 pb-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto select-none fms-toolbar-scroll whitespace-nowrap">
        <div className="flex items-center gap-2 shrink-0">
          {/* Search */}
          <div className="relative w-48 sm:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Order No, Customer, Item..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-7 pr-6 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setPage(1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-300 shadow-2xs shrink-0">
            <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-600">Month:</span>
            <select
              value={monthFilter}
              onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Months ({monthCounts.ALL || 0})</option>
              {MONTH_NAMES.map((mName, i) => (
                <option key={mName} value={String(i + 1)}>
                  {mName} ({monthCounts[String(i + 1)] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-300 shadow-2xs shrink-0">
            <span className="text-[11px] font-bold text-slate-600">Year:</span>
            <select
              value={yearFilter}
              onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Years</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Stage Filter */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-300 shadow-2xs shrink-0">
            <span className="text-[11px] font-bold text-slate-600">Stage:</span>
            <select
              value={stageFilter}
              onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Stages</option>
              <option value="Labdip">Labdip</option>
              <option value="FOB">FOB</option>
              <option value="Dispatch">Dispatch</option>
              <option value="Balance Fabric">Balance Fabric</option>
              <option value="BLANK">Pending / Blank</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-md cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {syncNotice && (
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              {syncNotice}
            </span>
          )}

          <button
            type="button"
            onClick={onSyncSheet}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-md shadow-2xs cursor-pointer"
            title="Sync centralized updates with Firebase & Target TNA Google Sheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync TNA Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-md shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main 29-Column TNA Table Grid (ONLY Heading Rows Freeze, Center-Aligned Headings, Left-Aligned Data) */}
      <div
        className={`overflow-x-auto overflow-y-auto ${
          isFullWidth ? 'h-[calc(100vh-215px)] min-h-[360px]' : 'h-[580px] max-h-[72vh]'
        } select-text relative fms-sheet-scroll border border-slate-300 rounded-lg shadow-inner bg-white`}
      >
        <table
          style={{ width: `${totalTableWidth}px` }}
          className="table-fixed border-collapse text-xs text-left"
        >
          <colgroup>
            <col style={{ width: '34px' }} />
            {TNA_COLUMNS.map(col => (
              <col key={col.key} style={{ width: `${col.width}px` }} />
            ))}
          </colgroup>

          {/* Compact 2-Row Sticky Heading (No Horizontal Column Freezing) */}
          <thead className="sticky top-0 z-30 select-none border-b-2 border-slate-800">
            {/* Row 1: Group Headers (Compact Height, Center Aligned) */}
            <tr className="text-[10px] font-extrabold leading-tight">
              <th
                colSpan={12}
                className="px-1 py-0.5 text-center bg-slate-900 text-slate-100 border-r border-b border-slate-700"
              >
                Order Details &amp; Status
              </th>
              <th
                colSpan={5}
                className="px-1 py-0.5 text-center bg-sky-900 text-sky-100 border-r border-b border-sky-700"
              >
                Step 1. Lapdip
              </th>
              <th
                colSpan={5}
                className="px-1 py-0.5 text-center bg-amber-900 text-amber-100 border-r border-b border-amber-700"
              >
                Step 2. FOB
              </th>
              <th
                colSpan={2}
                className="px-1 py-0.5 text-center bg-emerald-900 text-emerald-100 border-r border-b border-emerald-700"
              >
                Step 3. Dispatch
              </th>
              <th
                colSpan={6}
                className="px-1 py-0.5 text-center bg-purple-900 text-purple-100 border-b border-purple-700"
              >
                Step 4. Balance fabric ( If goods pending )
              </th>
            </tr>

            {/* Row 2: Column Names ONLY (No A..AC Letters, Compact Height, Center Aligned) */}
            <tr className="text-[10px] font-bold leading-tight bg-slate-800 text-white">
              <th className="px-1 py-0.5 text-center border-r border-slate-700 bg-slate-800">
                #
              </th>
              {TNA_COLUMNS.map(col => {
                const isFiltered = colFilters[col.key] && colFilters[col.key].length > 0;
                const isSorted = sortConfig && sortConfig.key === col.key;
                const bgByGroup =
                  col.group === 'labdip'
                    ? 'bg-sky-950 border-sky-800'
                    : col.group === 'fob'
                    ? 'bg-amber-950 border-amber-800'
                    : col.group === 'dispatch'
                    ? 'bg-emerald-950 border-emerald-800'
                    : col.group === 'balance'
                    ? 'bg-purple-950 border-purple-800'
                    : 'bg-slate-800 border-slate-700';

                return (
                  <th
                    key={col.key}
                    className={`px-1 py-0.5 text-center border-r ${bgByGroup} relative align-middle`}
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="whitespace-normal break-words leading-tight text-center">
                        {col.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFilterCol(activeFilterCol === col.key ? null : col.key);
                          setFilterSearch('');
                        }}
                        className={`p-0.5 rounded shrink-0 cursor-pointer ${
                          isFiltered || isSorted
                            ? 'text-amber-300 bg-slate-900/70'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title={`Filter / Sort ${col.label}`}
                      >
                        <Filter className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body: ALL Data Cells Left-Aligned */}
          <tbody className="font-sans text-[11px] divide-y divide-slate-200">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={30} className="py-12 text-center text-slate-500 bg-white">
                  No matching Open orders found in TNA.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => {
                const rowNum = (pageSize === 0 ? 0 : (safePage - 1) * pageSize) + idx + 1;
                const m = row.manual;
                const dateInputClass =
                  'w-full px-1 py-0.5 text-[10px] text-left bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800';
                const textInputClass =
                  'w-full px-1 py-0.5 text-[10px] text-left bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800';

                return (
                  <tr key={row.tnaKey} className="hover:bg-emerald-50/40 transition-colors bg-white">
                    <td className="px-1 py-0.5 text-left font-mono text-[10px] text-slate-500 border-r border-slate-200">
                      {rowNum}
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 text-slate-700 font-mono text-[10px] whitespace-nowrap">
                      {row.orderDate || '—'}
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 font-semibold text-blue-900 truncate" title={row.orderNo}>
                      {row.orderNo || '—'}
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 font-medium text-slate-900 truncate" title={row.customerName}>
                      {row.customerName || '—'}
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 text-slate-800 truncate" title={row.itemName}>
                      {row.itemName}
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 text-slate-700 truncate" title={row.color}>
                      {row.color || '—'}
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 text-slate-700 truncate" title={row.width}>
                      {row.width || '—'}
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 text-slate-700 truncate" title={row.unit}>
                      {row.unit || '—'}
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 font-mono font-semibold text-slate-800">
                      {row.qty}
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 text-slate-600 truncate">
                      {row.unitOfItem || '—'}
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 font-mono text-[10px] text-slate-700 whitespace-nowrap">
                      {row.deliveryDate || '—'}
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-300 bg-slate-50/70">
                      {renderStageBadge(row.orderStatus)}
                    </td>

                    {/* Step 1. Lapdip */}
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 bg-sky-50/20">
                      <input
                        type="date"
                        value={toHtmlDateInputValue(m.labdipCommittedDate)}
                        onChange={(e) => handleDateChange(row, 'labdipCommittedDate', e.target.value)}
                        className={dateInputClass}
                      />
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 bg-sky-50/20">
                      <input
                        type="date"
                        value={toHtmlDateInputValue(m.labdipActualDate)}
                        onChange={(e) => handleDateChange(row, 'labdipActualDate', e.target.value)}
                        className={dateInputClass}
                      />
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 bg-sky-50/20">
                      {(() => {
                        const labRejHist = m.labdipRejectionHistory || [];
                        const latestRejRemark = labRejHist.length > 0 ? labRejHist[labRejHist.length - 1].remark : '';
                        return (
                          <div className="flex items-center gap-0.5">
                            <input
                              type="date"
                              value={toHtmlDateInputValue(m.labdipRejectionDate)}
                              onChange={(e) => handleDateChange(row, 'labdipRejectionDate', e.target.value)}
                              className={`${dateInputClass} flex-1 min-w-0`}
                              title={
                                latestRejRemark
                                  ? `Remark: ${latestRejRemark} (${labRejHist.length} saved)`
                                  : 'Labdip Rejection Date'
                              }
                            />
                            <button
                              type="button"
                              onClick={() => openDateRemarkCard(row, 'labdipRejectionDate')}
                              className={`shrink-0 h-5 min-w-[20px] px-1 rounded border text-[10px] font-extrabold inline-flex items-center justify-center cursor-pointer transition-colors ${
                                labRejHist.length > 0
                                  ? 'bg-sky-600 text-white border-sky-700 hover:bg-sky-700'
                                  : 'bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200'
                              }`}
                              title="Add Rejection Date & Remark / View Old Dates"
                            >
                              {labRejHist.length > 0 ? `+${labRejHist.length}` : '+'}
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 bg-sky-50/20">
                      <input
                        type="date"
                        value={toHtmlDateInputValue(m.labdipApprovalDate)}
                        onChange={(e) => handleDateChange(row, 'labdipApprovalDate', e.target.value)}
                        className={dateInputClass}
                      />
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-300 bg-sky-50/40">
                      {renderDelayBadge(row.labdipDelayDays)}
                    </td>

                    {/* Step 2. FOB */}
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 bg-amber-50/20">
                      <input
                        type="date"
                        value={toHtmlDateInputValue(m.fobCommittedDate)}
                        onChange={(e) => handleDateChange(row, 'fobCommittedDate', e.target.value)}
                        className={dateInputClass}
                      />
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 bg-amber-50/20">
                      <input
                        type="date"
                        value={toHtmlDateInputValue(m.fobActualDate)}
                        onChange={(e) => handleDateChange(row, 'fobActualDate', e.target.value)}
                        className={dateInputClass}
                      />
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 bg-amber-50/20">
                      {(() => {
                        const fobRejHist = m.fobRejectionHistory || [];
                        const latestFobRemark = fobRejHist.length > 0 ? fobRejHist[fobRejHist.length - 1].remark : '';
                        return (
                          <div className="flex items-center gap-0.5">
                            <input
                              type="date"
                              value={toHtmlDateInputValue(m.fobRejectionDate)}
                              onChange={(e) => handleDateChange(row, 'fobRejectionDate', e.target.value)}
                              className={`${dateInputClass} flex-1 min-w-0`}
                              title={
                                latestFobRemark
                                  ? `Remark: ${latestFobRemark} (${fobRejHist.length} saved)`
                                  : 'FOB Rejection Date'
                              }
                            />
                            <button
                              type="button"
                              onClick={() => openDateRemarkCard(row, 'fobRejectionDate')}
                              className={`shrink-0 h-5 min-w-[20px] px-1 rounded border text-[10px] font-extrabold inline-flex items-center justify-center cursor-pointer transition-colors ${
                                fobRejHist.length > 0
                                  ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700'
                                  : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                              }`}
                              title="Add FOB Rejection Date & Remark / View Old Dates"
                            >
                              {fobRejHist.length > 0 ? `+${fobRejHist.length}` : '+'}
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 bg-amber-50/20">
                      <input
                        type="date"
                        value={toHtmlDateInputValue(m.fobApprovalDate)}
                        onChange={(e) => handleDateChange(row, 'fobApprovalDate', e.target.value)}
                        className={dateInputClass}
                      />
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-300 bg-amber-50/40">
                      {renderDelayBadge(row.fobDelayDays)}
                    </td>

                    {/* Step 3. Dispatch */}
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 bg-emerald-50/20">
                      <input
                        type="date"
                        value={toHtmlDateInputValue(m.actualDispatchDate)}
                        onChange={(e) => handleDateChange(row, 'actualDispatchDate', e.target.value)}
                        className={dateInputClass}
                      />
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-300 bg-emerald-50/20">
                      <input
                        type="text"
                        value={m.totalDispatchedQty}
                        onChange={(e) => onUpdateField(row.tnaKey, row.altKey, 'totalDispatchedQty', e.target.value)}
                        placeholder="0"
                        className={textInputClass}
                      />
                    </td>

                    {/* Step 4. Balance Fabric */}
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 bg-purple-50/20">
                      <input
                        type="text"
                        value={m.pendingQty}
                        onChange={(e) => onUpdateField(row.tnaKey, row.altKey, 'pendingQty', e.target.value)}
                        placeholder="0"
                        className={textInputClass}
                      />
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 bg-purple-50/20">
                      <input
                        type="date"
                        value={toHtmlDateInputValue(m.committedBalanceDate)}
                        onChange={(e) => handleDateChange(row, 'committedBalanceDate', e.target.value)}
                        className={dateInputClass}
                      />
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 bg-purple-50/20">
                      <input
                        type="date"
                        value={toHtmlDateInputValue(m.actualBalanceDispatchDate)}
                        onChange={(e) => handleDateChange(row, 'actualBalanceDispatchDate', e.target.value)}
                        className={dateInputClass}
                      />
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 bg-purple-50/20">
                      <input
                        type="text"
                        value={m.balanceDispatchQty}
                        onChange={(e) => onUpdateField(row.tnaKey, row.altKey, 'balanceDispatchQty', e.target.value)}
                        placeholder="0"
                        className={textInputClass}
                      />
                    </td>
                    <td className="px-1 py-0.5 text-left border-r border-slate-200 bg-purple-50/20">
                      <input
                        type="text"
                        value={m.orderRemarks}
                        onChange={(e) => onUpdateField(row.tnaKey, row.altKey, 'orderRemarks', e.target.value)}
                        placeholder="Remarks..."
                        className={textInputClass}
                      />
                    </td>
                    <td className="px-1 py-0.5 text-left bg-purple-50/40">
                      {renderDelayBadge(row.balanceDelayDays)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Column Filter / Sort Popover Modal (No A..AC letters) */}
      {activeFilterCol && (
        <div className="fixed inset-0 z-50 bg-black/25 flex items-center justify-center p-4" onClick={() => setActiveFilterCol(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-72 p-3 text-xs space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900">
                {TNA_COLUMNS.find(c => c.key === activeFilterCol)?.label}
              </span>
              <button
                type="button"
                onClick={() => setActiveFilterCol(null)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => { setSortConfig({ key: activeFilterCol, direction: 'asc' }); setActiveFilterCol(null); }}
                className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer"
              >
                <ArrowUpDown className="w-3 h-3" /> Sort A→Z
              </button>
              <button
                type="button"
                onClick={() => { setSortConfig({ key: activeFilterCol, direction: 'desc' }); setActiveFilterCol(null); }}
                className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer"
              >
                <ArrowUpDown className="w-3 h-3" /> Sort Z→A
              </button>
            </div>

            <input
              type="text"
              placeholder="Search values..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded p-1 space-y-0.5">
              {getUniqueValuesForCol(activeFilterCol)
                .filter(v => v.toLowerCase().includes(filterSearch.toLowerCase()))
                .slice(0, 200)
                .map(val => {
                  const selected = colFilters[activeFilterCol] || [];
                  const checked = selected.includes(val);
                  return (
                    <label
                      key={val}
                      className="flex items-center gap-1.5 px-1.5 py-1 hover:bg-slate-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? selected.filter(x => x !== val)
                            : [...selected, val];
                          setColFilters(prev => ({ ...prev, [activeFilterCol]: next }));
                          setPage(1);
                        }}
                        className="rounded border-slate-300 text-emerald-600"
                      />
                      <span className="truncate text-slate-800">{val}</span>
                    </label>
                  );
                })}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setColFilters(prev => ({ ...prev, [activeFilterCol]: [] }));
                  setPage(1);
                }}
                className="text-rose-600 font-semibold hover:underline cursor-pointer"
              >
                Clear Filter
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterCol(null)}
                className="px-3 py-1 bg-emerald-700 text-white font-bold rounded hover:bg-emerald-800 cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date + Remark Card Modal (for Rejection Dates & All Step 1-4 Date History) */}
      {dateCardTarget && activeCardRow && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setDateCardTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Card Header */}
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="font-bold text-sm truncate">
                    Date &amp; Remark Card
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate mt-0.5">
                  {activeCardRow.orderNo || 'Order'} · {activeCardRow.customerName} · {activeCardRow.itemName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDateCardTarget(null)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Step Field Selector & View Switch */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <select
                  value={dateCardTarget.field}
                  onChange={(e) => {
                    const nextField = e.target.value as TnaDateFieldKey;
                    setDateCardTarget({ ...dateCardTarget, field: nextField });
                    const curVal = String(activeCardRow.manual[nextField] ?? '');
                    setCardDateInput(toHtmlDateInputValue(curVal) || new Date().toISOString().slice(0, 10));
                    setCardViewMode('field');
                  }}
                  className="flex-1 min-w-[200px] px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                >
                  {STEP_DATE_FIELDS.map(f => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>

                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCardViewMode('field')}
                    className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                      cardViewMode === 'field' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Selected Step
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardViewMode('all_steps')}
                    className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                      cardViewMode === 'all_steps' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    All Steps 1–4 Log
                  </button>
                </div>
              </div>

              {/* Add New Date + Remark Form (Saves old date in card & updates upper cell to new date) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!cardDateInput) return;
                  const formatted = toTnaStorageDate(cardDateInput);
                  onSaveDateWithHistory(
                    activeCardRow.tnaKey,
                    activeCardRow.altKey,
                    dateCardTarget.field,
                    formatted,
                    cardRemarkInput.trim(),
                    true
                  );
                  setCardRemarkInput('');
                }}
                className="p-3 rounded-xl bg-sky-50/70 border border-sky-200 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-950 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5 text-sky-700" />
                    Add New Date &amp; Remark
                  </span>
                  <span className="text-[10px] text-sky-800 font-medium">
                    Current cell shows: <strong>{String(activeCardRow.manual[dateCardTarget.field] || 'Blank')}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">New Date</label>
                    <input
                      type="date"
                      required
                      value={cardDateInput}
                      onChange={(e) => setCardDateInput(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Remark</label>
                    <input
                      type="text"
                      value={cardRemarkInput}
                      onChange={(e) => setCardRemarkInput(e.target.value)}
                      placeholder="Enter rejection / date remark..."
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500">
                    Upper table cell me sirf latest date dikhegi; purani date card me save rahegi.
                  </span>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg shadow-2xs cursor-pointer shrink-0"
                  >
                    Save Date &amp; Remark
                  </button>
                </div>
              </form>

              {/* Saved Dates & Remarks History List */}
              {cardViewMode === 'field' ? (
                <div className="space-y-2">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>
                      Saved History ({getHistoryForField(activeCardRow.manual, dateCardTarget.field).length})
                    </span>
                  </div>
                  {(() => {
                    const list = getHistoryForField(activeCardRow.manual, dateCardTarget.field);
                    if (list.length === 0) {
                      return (
                        <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                          Abhi tak koi old date / remark save nahi hai. Upar se naya Date aur Remark add karein.
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {[...list].reverse().map((entry, revIdx) => {
                          const isCurrent = revIdx === 0 && entry.date === String(activeCardRow.manual[dateCardTarget.field] || '');
                          return (
                            <div
                              key={entry.id}
                              className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 ${
                                isCurrent
                                  ? 'bg-emerald-50/70 border-emerald-300'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-300">
                                    {entry.date}
                                  </span>
                                  {isCurrent ? (
                                    <span className="text-[10px] px-1.5 py-0 rounded bg-emerald-600 text-white font-bold">
                                      Current (Shown)
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0 rounded bg-slate-200 text-slate-700 font-semibold">
                                      Old Date #{list.length - revIdx}
                                    </span>
                                  )}
                                </div>
                                {entry.remark ? (
                                  <p className="text-slate-700 break-words pt-0.5">{entry.remark}</p>
                                ) : (
                                  <p className="text-slate-400 italic pt-0.5">No remark added</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  onDeleteDateHistoryEntry(
                                    activeCardRow.tnaKey,
                                    activeCardRow.altKey,
                                    dateCardTarget.field,
                                    entry.id
                                  )
                                }
                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer shrink-0"
                                title="Delete this history entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 block">
                    All Step 1 → Step 4 Date Updates
                  </span>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {STEP_DATE_FIELDS.map(sf => {
                      const entries = getHistoryForField(activeCardRow.manual, sf.key);
                      const curVal = String(activeCardRow.manual[sf.key] ?? '');
                      if (!curVal && entries.length === 0) return null;
                      return (
                        <div key={sf.key} className="p-2 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{sf.label}</span>
                            <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Current: {curVal || '—'}
                            </span>
                          </div>
                          {entries.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {entries.map((en, i) => (
                                <span
                                  key={en.id}
                                  className="text-[10px] bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-700"
                                  title={en.remark || 'Old date'}
                                >
                                  #{i + 1}: <strong>{en.date}</strong>{en.remark ? ` — ${en.remark}` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compact Pagination Footer */}
      <div className="px-2.5 py-1 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong>{paginatedRows.length.toLocaleString()}</strong> of{' '}
            <strong>{filteredRows.length.toLocaleString()}</strong> Open TNA rows
          </span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs font-semibold cursor-pointer"
          >
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={250}>250 / page</option>
            <option value={0}>Show All</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-2 py-0.5 bg-white border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-100 cursor-pointer flex items-center"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-mono text-[11px] font-bold">
            Page {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="px-2 py-0.5 bg-white border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-100 cursor-pointer flex items-center"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
