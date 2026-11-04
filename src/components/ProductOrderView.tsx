import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProductOrderRow } from '../types/fms';
import { productOrderColumns } from '../data/sampleOrders';
import {
  Sparkles,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Filter,
  Layers,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Calendar,
  Crosshair,
  RefreshCw,
  FileSpreadsheet,
  Flame,
  Columns,
  Edit3,
  Search,
  ArrowUp,
  ArrowDown,
  EyeOff
} from 'lucide-react';

export const DELHI_IMPORTRANGE_FORMULA = '=IMPORTRANGE("1ciwoXm38UcdjVe8n2LB51H66NLyel1Q1FERMb42AfGY","Delhi!A:Z")';

const PO_VISIBLE_COLS_STORAGE_KEY = 'ginza_fms_po_visible_cols_v1';

// Helper: Convert 0-based index (0..27) to Excel column letter (A..Z, AA, AB)
export function getPoSheetColLetter(idx: number): string {
  if (idx < 26) return String.fromCharCode(65 + idx);
  return 'A' + String.fromCharCode(65 + (idx - 26));
}

interface ProductOrderViewProps {
  orders: ProductOrderRow[];
  searchTerm?: string;
  setSearchTerm?: (val: string) => void;
  isFullWidth: boolean;
  freezeColumns?: number;
  freezeRows?: number;
  autoFitColumns?: boolean;
  isSyncingImportRange?: boolean;
  onSyncImportRange?: () => void;
  onGenerateOrderNo: (orderId: string, customNo?: string) => void;
  onGenerateAllPending?: () => void;
  onDeleteRow?: (orderId: string) => void;
  onClearAllRows?: () => void;
  onOpenImportModal?: () => void;
  onOpenFirebaseModal?: () => void;
  onUpdateRow?: (orderId: string, field: keyof ProductOrderRow, value: any) => void;
  onNavigateToAutomation: () => void;
  onAddNewRow: (row: ProductOrderRow) => void;
}

export const MONTH_OPTIONS = [
  { value: 'ALL', label: 'All Months' },
  { value: '1', label: '01 - January' },
  { value: '2', label: '02 - February' },
  { value: '3', label: '03 - March' },
  { value: '4', label: '04 - April' },
  { value: '5', label: '05 - May' },
  { value: '6', label: '06 - June' },
  { value: '7', label: '07 - July' },
  { value: '8', label: '08 - August' },
  { value: '9', label: '09 - September' },
  { value: '10', label: '10 - October' },
  { value: '11', label: '11 - November' },
  { value: '12', label: '12 - December' }
];

/**
 * Helper to parse day, month (1-12), and year from orderDate or timestamp strings
 * Supports DD/MM/YYYY, D/M/YYYY, YYYY-MM-DD, MM/DD/YYYY
 */
export function parseOrderDateParts(dateStr?: string, fallbackTimestamp?: string): { day: number; month: number; year: number; isoDate: string } | null {
  const raw = (dateStr && dateStr.trim() !== '' ? dateStr : fallbackTimestamp || '').trim();
  if (!raw) return null;

  // Take date part before comma or space
  const datePart = raw.split(/[,\s]+/)[0].trim();

  // Check YYYY-MM-DD
  const isoMatch = datePart.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        day,
        month,
        year,
        isoDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      };
    }
  }

  // Check DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = datePart.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);
    if (year < 100) year += 2000;

    let day = p1;
    let month = p2;
    // If p2 > 12 and p1 <= 12, it's MM/DD/YYYY
    if (p2 > 12 && p1 <= 12) {
      month = p1;
      day = p2;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        day,
        month,
        year,
        isoDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      };
    }
  }

  return null;
}

/**
 * Detects if a value is a date or timestamp string (e.g. "2/11/2026, 3:03:18 pm", "9/22/2026 10:37:28", "29/01/2026")
 * so date/time values never display inside an Order No column.
 */
export function isDateOrTimestampStr(val?: string): boolean {
  const s = (val || '').trim();
  if (!s) return false;
  // Contains a time format like 10:37:28 or 3:03:18 pm
  if (/\b\d{1,2}:\d{2}(:\d{2})?(\s*[ap]\.?m\.?)?\b/i.test(s)) {
    return true;
  }
  // Pure numeric date like DD/MM/YYYY, M/D/YYYY, YYYY-MM-DD (no letters at all)
  if (/^\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4}$/.test(s)) {
    return true;
  }
  return false;
}

export const DEFAULT_BRANCH_HEAD_NAME = 'Vinay Chhajer';
export const DEFAULT_BRANCH_HEAD_EMAIL = 'vinay.chhajer@ginzalimited.com';

export const ProductOrderView: React.FC<ProductOrderViewProps> = ({
  orders,
  searchTerm,
  isFullWidth,
  freezeColumns = 2,
  freezeRows = 1,
  autoFitColumns = true,
  isSyncingImportRange = false,
  onSyncImportRange,
  onGenerateOrderNo,
  onClearAllRows,
  onOpenFirebaseModal,
  onNavigateToAutomation,
  onAddNewRow
}) => {
  const [filterPendingOnly] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [filterYesterdayTodayOnly, setFilterYesterdayTodayOnly] = useState(false);

  const [inputOrderNos, setInputOrderNos] = useState<Record<string, string>>({});
  const [editingRowOrderId, setEditingRowOrderId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [showPoColManager, setShowPoColManager] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

  // Column Filter & Sort State for all 28 columns in Product Order Tab
  const [poColFilters, setPoColFilters] = useState<Record<string, string[]>>({});
  const [poSortConfig, setPoSortConfig] = useState<{ colId: string; direction: 'asc' | 'desc' } | null>(null);
  const [activePoFilterCol, setActivePoFilterCol] = useState<string | null>(null);
  const [poFilterSearch, setPoFilterSearch] = useState<string>('');

  // Column Visibility State for Product Order Tab (28 Columns: A to AB)
  const [visiblePoCols, setVisiblePoCols] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(PO_VISIBLE_COLS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged: Record<string, boolean> = {};
        productOrderColumns.forEach(c => {
          merged[c.id] = parsed[c.id] ?? true;
        });
        return merged;
      }
    } catch (e) {}
    const initial: Record<string, boolean> = {};
    productOrderColumns.forEach(c => {
      initial[c.id] = true;
    });
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(PO_VISIBLE_COLS_STORAGE_KEY, JSON.stringify(visiblePoCols));
    } catch (e) {}
  }, [visiblePoCols]);

  const visiblePoColsCount = useMemo(
    () => productOrderColumns.filter(c => visiblePoCols[c.id] !== false).length,
    [visiblePoCols]
  );

  // Fast Virtual Pagination (Default 100 rows in view with option to view All Total Orders)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(100);

  // Refs for row scrolling and Order No input cursor focusing
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const orderInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Available Years dynamically extracted from orders + current years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>(['2025', '2026']);
    orders.forEach(r => {
      const parsed = parseOrderDateParts(r.orderDate, r.timestamp);
      if (parsed && parsed.year >= 2020 && parsed.year <= 2035) {
        yearsSet.add(String(parsed.year));
      }
    });
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [orders]);

  // Strictly Current Date Today & Yesterday ISO dates (YYYY-MM-DD)
  const currentYesterdayTodayIsoSet = useMemo(() => {
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    const yesterdayIso = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
    return new Set<string>([todayIso, yesterdayIso]);
  }, []);

  // Helper: Check if a row is strictly from Current Date (Today or Yesterday) AND has Order No BLANK
  const isYesterdayTodayBlankOrder = (row: ProductOrderRow): boolean => {
    const cleanOrdNo = row.orderNo && !isDateOrTimestampStr(row.orderNo) ? row.orderNo.trim() : '';
    if (cleanOrdNo !== '') return false; // Order No must be blank!
    const parsed = parseOrderDateParts(row.orderDate, row.timestamp);
    if (!parsed) return false;
    return currentYesterdayTodayIsoSet.has(parsed.isoDate);
  };

  // Count of rows that match Current Yesterday / Today with Blank Order No
  const yesterdayTodayBlankCount = useMemo(() => {
    return orders.filter(isYesterdayTodayBlankOrder).length;
  }, [orders, currentYesterdayTodayIsoSet]);

  // Helper: Get display value for any of the 28 columns in Product Order
  const getPoColCellValue = (row: ProductOrderRow, colId: string): string => {
    switch (colId) {
      case 'referenceNo':
        return row.referenceNo && !isDateOrTimestampStr(row.referenceNo) ? row.referenceNo.trim() : '—';
      case 'timestamp':
        return (row.timestamp || '—').trim();
      case 'customerPO':
        return (row.customerPO || 'N/A').trim();
      case 'customerName':
        return (row.customerName || '—').trim();
      case 'customerEmail':
        return (row.customerEmail || '—').trim();
      case 'orderDate':
        return (row.orderDate || '—').trim();
      case 'unit':
        return (row.unit || '—').trim();
      case 'itemName':
        return (row.itemName || '—').trim();
      case 'color':
        return (row.color || '—').trim();
      case 'width':
        return (row.width || '—').trim();
      case 'unitOfItem':
        return (row.unitOfItem || '—').trim();
      case 'qty':
        return String(row.qty ?? 0);
      case 'rate':
        return `₹${row.rate ?? 0}`;
      case 'discount':
        return `${row.discount ?? 0}%`;
      case 'deliveryDate':
        return (row.deliveryDate || '—').trim();
      case 'remark':
        return (row.remark || '—').trim();
      case 'customerNumber':
        return (row.customerNumber || '—').trim();
      case 'billingAddress':
        return (row.billingAddress || '—').trim();
      case 'deliveryAddress':
        return (row.deliveryAddress || '—').trim();
      case 'transporterName':
        return (row.transporterName || '—').trim();
      case 'salesPerson':
        return (row.salesPerson || '—').trim();
      case 'accountStatus':
        return (row.accountStatus || '—').trim();
      case 'branch':
        return row.branch && !isDateOrTimestampStr(row.branch) ? row.branch.trim() : 'Delhi';
      case 'approvalStatus':
        return (row.approvalStatus || '—').trim();
      case 'branchHeadName':
        return row.branchHeadName &&
          row.branchHeadName.trim() !== '' &&
          row.branchHeadName.trim() !== '—' &&
          !isDateOrTimestampStr(row.branchHeadName)
          ? row.branchHeadName.trim()
          : DEFAULT_BRANCH_HEAD_NAME;
      case 'branchHeadEmail':
        return row.branchHeadEmail &&
          row.branchHeadEmail.trim() !== '' &&
          row.branchHeadEmail.trim() !== '—' &&
          !isDateOrTimestampStr(row.branchHeadEmail)
          ? row.branchHeadEmail.trim()
          : DEFAULT_BRANCH_HEAD_EMAIL;
      case 'orderNo':
        return row.orderNo && !isDateOrTimestampStr(row.orderNo) && row.orderNo.trim() !== ''
          ? row.orderNo.trim()
          : '(Blank O.N)';
      case 'orderNoTimestamp':
        return row.orderNoTimestamp && row.orderNoTimestamp.trim() !== ''
          ? row.orderNoTimestamp.trim()
          : '—';
      default:
        return '—';
    }
  };

  // Get unique values for any of the 28 columns
  const getUniquePoColumnValues = (colId: string): string[] => {
    const set = new Set<string>();
    orders.forEach(r => {
      const val = getPoColCellValue(r, colId);
      if (val !== '') set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  };

  const togglePoColFilterValue = (colId: string, val: string, allValuesForCol?: string[]) => {
    setPoColFilters(prev => {
      const current = prev[colId];
      if (!current) {
        const baseList = allValuesForCol || getUniquePoColumnValues(colId);
        return { ...prev, [colId]: baseList.filter(v => v !== val) };
      }
      if (current.includes(val)) {
        return { ...prev, [colId]: current.filter(v => v !== val) };
      } else {
        const next = [...current, val];
        const baseList = allValuesForCol || getUniquePoColumnValues(colId);
        if (next.length >= baseList.length) {
          const copy = { ...prev };
          delete copy[colId];
          return copy;
        }
        return { ...prev, [colId]: next };
      }
    });
    setCurrentPage(1);
  };

  // Filtered rows based on Month, Year, Yesterday/Today (Blank O.N only), Pending O.N, 28-Col Filters, and Search
  const filteredRows = useMemo(() => {
    const activeColFilterEntries = Object.entries(poColFilters).filter(([, vals]) => vals && vals.length > 0);

    const list = orders.filter(row => {
      const cleanOrdNo = row.orderNo && !isDateOrTimestampStr(row.orderNo) ? row.orderNo.trim() : '';

      if (filterPendingOnly && cleanOrdNo !== '') {
        return false;
      }

      if (filterYesterdayTodayOnly) {
        // Strictly ONLY rows whose date is Current Today or Yesterday AND Order No is blank
        if (!isYesterdayTodayBlankOrder(row)) {
          return false;
        }
      }

      if (selectedMonth !== 'ALL' || selectedYear !== 'ALL') {
        const parsed = parseOrderDateParts(row.orderDate, row.timestamp);
        if (selectedMonth !== 'ALL') {
          if (!parsed || String(parsed.month) !== selectedMonth) return false;
        }
        if (selectedYear !== 'ALL') {
          if (!parsed || String(parsed.year) !== selectedYear) return false;
        }
      }

      // 28-Column Filters
      for (const [colId, selectedVals] of activeColFilterEntries) {
        const cellVal = getPoColCellValue(row, colId);
        if (!selectedVals.includes(cellVal)) {
          return false;
        }
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const cleanRef = row.referenceNo && !isDateOrTimestampStr(row.referenceNo) ? row.referenceNo : '';
        const matchRef = cleanRef.toLowerCase().includes(q);
        const matchPO = (row.customerPO || '').toLowerCase().includes(q);
        const matchCust = (row.customerName || '').toLowerCase().includes(q);
        const matchItem = (row.itemName || '').toLowerCase().includes(q);
        const matchOrderNo = cleanOrdNo.toLowerCase().includes(q);
        const matchSales = (row.salesPerson || '').toLowerCase().includes(q);
        const matchTrans = (row.transporterName || '').toLowerCase().includes(q);
        if (!matchRef && !matchPO && !matchCust && !matchItem && !matchOrderNo && !matchSales && !matchTrans) {
          return false;
        }
      }
      return true;
    });

    if (poSortConfig) {
      const { colId, direction } = poSortConfig;
      const isNum = ['qty', 'rate', 'discount'].includes(colId);
      list.sort((a, b) => {
        if (isNum) {
          const numA = parseFloat(getPoColCellValue(a, colId).replace(/[₹%,\s]/g, '')) || 0;
          const numB = parseFloat(getPoColCellValue(b, colId).replace(/[₹%,\s]/g, '')) || 0;
          return direction === 'asc' ? numA - numB : numB - numA;
        }
        const valA = getPoColCellValue(a, colId).toLowerCase();
        const valB = getPoColCellValue(b, colId).toLowerCase();
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [orders, filterPendingOnly, selectedMonth, selectedYear, filterYesterdayTodayOnly, currentYesterdayTodayIsoSet, searchTerm, poColFilters, poSortConfig]);

  // Safe pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / (pageSize || 30)));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    if (pageSize === 0) return filteredRows; // All
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safeCurrentPage, pageSize]);

  /**
   * Toggle "New Orders" ON / OFF:
   * - Click 1 (Active): Filters to Current Date Yesterday/Today with blank Order No, highlights rows, and focuses cursor on Order No input.
   * - Click 2 (Deactive): Turns off the filter and removes all row highlights.
   */
  const handleToggleYesterdayTodayNewOrders = () => {
    if (filterYesterdayTodayOnly) {
      // Deactivate filter & remove highlight
      setFilterYesterdayTodayOnly(false);
      setHighlightedOrderId(null);
      setCurrentPage(1);
      return;
    }

    // Activate filter & highlight matching rows
    setSelectedMonth('ALL');
    setSelectedYear('ALL');
    setFilterYesterdayTodayOnly(true);
    setCurrentPage(1);

    const matchingRows = orders.filter(isYesterdayTodayBlankOrder);
    if (matchingRows.length > 0) {
      const firstTarget = matchingRows[0];
      setHighlightedOrderId(firstTarget.orderId);

      setTimeout(() => {
        const rowEl = rowRefs.current[firstTarget.orderId];
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        const inputEl = orderInputRefs.current[firstTarget.orderId];
        if (inputEl) {
          inputEl.focus();
          inputEl.select();
        }
      }, 90);
    } else {
      setHighlightedOrderId(null);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-1.5">
      {/* PRODUCT ORDER FILTER & ACTION TOOLBAR: Month/Year Filter + New Orders + Columns (Hide/Show) + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 bg-slate-100/90 border border-slate-200 rounded-lg text-xs">
        {/* Left Side: Month & Year Filter + Yesterday/Today Quick Jump */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Filter */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-600">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              {MONTH_OPTIONS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-600">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Years</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Reset Month/Year or Column Filter if active */}
          {(selectedMonth !== 'ALL' || selectedYear !== 'ALL' || filterYesterdayTodayOnly || Object.keys(poColFilters).length > 0) && (
            <button
              type="button"
              onClick={() => {
                setSelectedMonth('ALL');
                setSelectedYear('ALL');
                setFilterYesterdayTodayOnly(false);
                setPoColFilters({});
                setHighlightedOrderId(null);
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters {Object.keys(poColFilters).length > 0 ? `(${Object.keys(poColFilters).length})` : ''}</span>
            </button>
          )}

          {/* NEW ORDERS BUTTON -> Toggles Active / Deactive for Current Date Yesterday / Today with Blank Order No ONLY */}
          <button
            type="button"
            onClick={handleToggleYesterdayTodayNewOrders}
            className={`px-3 py-1 font-extrabold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
              filterYesterdayTodayOnly
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-slate-900 ring-2 ring-amber-500 shadow-md'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 border-amber-400'
            }`}
            title={
              filterYesterdayTodayOnly
                ? 'Click to Deactivate New Orders filter and remove highlight'
                : 'Click to Activate: Show & highlight ONLY Yesterday / Today orders with blank Order No'
            }
          >
            <Crosshair className="w-3.5 h-3.5 text-slate-950" />
            <span>New Orders</span>
            <span className="px-1.5 py-0.2 bg-slate-950 text-amber-300 rounded-full font-mono text-[10px]">
              {yesterdayTodayBlankCount}
            </span>
          </button>
        </div>

        {/* Right Side: Action Controls */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {/* Columns (Hide / Show) Button for Product Order Tab */}
          <button
            type="button"
            onClick={() => setShowPoColManager(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Hide / Show Specific Columns in Product Order Tab"
          >
            <Columns className="w-3.5 h-3.5 text-blue-600" />
            <span>Columns ({visiblePoColsCount}/28)</span>
          </button>

          {/* Sync Google Sheet AA (Order No) & AB (Timestamp) */}
          {onSyncImportRange && (
            <button
              type="button"
              disabled={isSyncingImportRange}
              onClick={onSyncImportRange}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Sync Live Data & Col AA (Order No) / Col AB (Timestamp) with Google Sheet (15jjr5tjxaWRPiv_nh6L9EZyFHNFZyQ3PQ6Jd89cV4k0)"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncingImportRange ? 'animate-spin' : ''}`} />
              <span>{isSyncingImportRange ? 'Syncing Sheet...' : 'Sync Sheet (AA/AB)'}</span>
            </button>
          )}

          {/* 0. Clear All Rows */}
          {onClearAllRows && (
            <button
              onClick={() => setShowClearConfirmModal(true)}
              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-300 font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
              title="Delete all data from Product Order sheet to re-upload freshly"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear All ({orders.length})</span>
            </button>
          )}

          {/* 0.2 Firebase Cloud Sync */}
          {onOpenFirebaseModal && (
            <button
              onClick={onOpenFirebaseModal}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
              title="Sync & Upload Data to Firebase Realtime Database"
            >
              <Flame className="w-3.5 h-3.5 fill-white" />
              <span>Firebase</span>
            </button>
          )}

          {/* 1. Total Orders Badge */}
          <div
            className="px-2.5 py-1 rounded-lg border border-blue-300 bg-blue-50 text-blue-950 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
            title="Total Orders in Product Order (Synced with Google Sheet Product Order A:AB)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>Total Orders: {orders.length.toLocaleString()}</span>
          </div>

          {/* 2. Order Automation ➔ */}
          <button
            onClick={onNavigateToAutomation}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Switch to Order Automation tab"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Order Automation</span>
          </button>
        </div>
      </div>

      {/* Main Single Row Flat Table Grid */}
      <div className={`overflow-x-auto overflow-y-auto ${isFullWidth ? 'h-[calc(100vh-185px)] max-h-[85vh]' : 'h-[620px] max-h-[75vh]'} select-text relative fms-sheet-scroll border border-slate-300 rounded-lg shadow-inner bg-white`}>
        <table className={`${autoFitColumns ? 'w-max min-w-full table-auto' : 'w-full'} border-collapse text-xs text-left`}>
          {/* Header Row: 28 Columns with Freeze / Unfreeze & Hide/Show Support */}
          <thead className={`${freezeRows > 0 ? 'sticky top-0 z-30' : ''} select-none border-b-2 border-slate-900 font-mono text-[11px]`}>
            {/* Column Letter / Index Numbers Strip */}
            <tr className="bg-slate-900 text-slate-400 text-[10px]">
              <th
                className={`w-10 px-2 py-0.5 text-center bg-slate-950 text-slate-400 border-r border-slate-800 ${
                  freezeColumns >= 1 ? 'sticky left-0 z-40' : ''
                }`}
              >
                #
              </th>
              {productOrderColumns.map((col, idx) => {
                if (visiblePoCols[col.id] === false) return null;
                const colLetter = getPoSheetColLetter(idx);
                let tint = 'bg-slate-900 text-slate-300 border-r border-slate-800';
                if (idx < 6) tint = 'bg-sky-950 text-sky-300 border-r border-sky-900';
                else if (idx >= 6 && idx < 15) tint = 'bg-amber-950 text-amber-300 border-r border-amber-800 font-bold';
                else if (idx >= 15 && idx < 26) tint = 'bg-indigo-950 text-indigo-300 border-r border-indigo-900';
                else tint = 'bg-emerald-950 text-emerald-300 border-r border-emerald-900 font-bold';

                let stickyHead = '';
                if (idx === 0 && freezeColumns >= 2) {
                  stickyHead = 'sticky left-[40px] z-40 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.3)]';
                } else if (idx === 2 && freezeColumns >= 3) {
                  stickyHead = 'sticky left-[150px] z-40 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.3)]';
                }

                return (
                  <th key={col.id} className={`px-2 py-0.5 text-center font-mono whitespace-nowrap ${tint} ${stickyHead}`}>
                    {colLetter} ({idx + 1})
                  </th>
                );
              })}
            </tr>

            {/* Column Names Strip */}
            <tr className="border-t border-slate-700">
              <th
                className={`w-10 px-1.5 py-0.5 text-center bg-slate-900 text-slate-100 border-r border-slate-800 font-bold ${
                  freezeColumns >= 1 ? 'sticky left-0 z-40' : ''
                }`}
              >
                #
              </th>
              {productOrderColumns.map((col, idx) => {
                if (visiblePoCols[col.id] === false) return null;
                let bgHead = 'bg-slate-800 text-slate-100 border-r border-slate-700 font-bold';
                if (idx < 6) bgHead = 'bg-sky-900 text-sky-100 border-r border-sky-800 font-bold';
                else if (idx >= 6 && idx < 15) bgHead = 'bg-amber-800 text-amber-100 border-r border-amber-700 font-extrabold shadow-sm';
                else if (idx >= 15 && idx < 26) bgHead = 'bg-indigo-900 text-indigo-100 border-r border-indigo-800 font-bold';
                else bgHead = 'bg-emerald-900 text-emerald-100 border-r border-emerald-800 font-bold';

                let stickyHead = '';
                if (idx === 0 && freezeColumns >= 2) {
                  stickyHead = 'sticky left-[40px] z-40 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.3)]';
                } else if (idx === 2 && freezeColumns >= 3) {
                  stickyHead = 'sticky left-[150px] z-40 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.3)]';
                }

                const isColFiltered = Boolean(poColFilters[col.id] && poColFilters[col.id].length > 0);
                return (
                  <th
                    key={col.id}
                    style={autoFitColumns ? undefined : { minWidth: col.minWidth || '110px' }}
                    className={`px-2 py-0.5 whitespace-nowrap leading-tight ${bgHead} ${stickyHead}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold">{col.label}</span>
                      <div className="flex items-center gap-1">
                        {col.id === 'orderNo' && (
                          <span className="text-[9px] px-1 bg-amber-400 text-slate-950 rounded font-extrabold">
                            AA (27)
                          </span>
                        )}
                        {col.id === 'orderNoTimestamp' && (
                          <span className="text-[9px] px-1 bg-emerald-300 text-slate-950 rounded font-extrabold">
                            AB (28)
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setActivePoFilterCol(activePoFilterCol === col.id ? null : col.id);
                            setPoFilterSearch('');
                          }}
                          className={`p-0.5 rounded hover:bg-black/25 transition-colors cursor-pointer ${
                            isColFiltered ? 'text-rose-300 bg-rose-950 font-extrabold' : 'text-white/70 hover:text-white'
                          }`}
                          title={`Filter, Sort or Hide ${col.label}`}
                        >
                          <Filter className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body: 100% Single Row-Wise (No Merge Logic) */}
          <tbody className="font-sans">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={visiblePoColsCount + 1} className="text-center py-12 text-slate-500 bg-white">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No orders match the filter or search criteria in Product Order.</p>
                  <p className="text-xs text-slate-400 mt-1">Try resetting the Month/Year filter or click Sync Sheet (AA/AB).</p>
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, index) => {
                const cleanRefNo =
                  row.referenceNo && !isDateOrTimestampStr(row.referenceNo) ? row.referenceNo.trim() : '';
                const cleanOrderNo =
                  row.orderNo && !isDateOrTimestampStr(row.orderNo) ? row.orderNo.trim() : '';
                const hasOrderNo = Boolean(cleanOrderNo !== '');
                const isEditingThisRow = editingRowOrderId === row.orderId;
                const isHighlighted = filterYesterdayTodayOnly || highlightedOrderId === row.orderId;
                const rowBg = isHighlighted
                  ? 'bg-amber-100/90 ring-2 ring-amber-500'
                  : hasOrderNo
                  ? index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                  : 'bg-amber-50/40 hover:bg-amber-50/70';
                const rowIndex = (safeCurrentPage - 1) * (pageSize || 30) + index + 1;

                const cleanBranchHeadName =
                  row.branchHeadName &&
                  row.branchHeadName.trim() !== '' &&
                  row.branchHeadName.trim() !== '—' &&
                  row.branchHeadName.trim() !== '-' &&
                  !isDateOrTimestampStr(row.branchHeadName)
                    ? row.branchHeadName.trim()
                    : DEFAULT_BRANCH_HEAD_NAME;

                const cleanBranchHeadEmail =
                  row.branchHeadEmail &&
                  row.branchHeadEmail.trim() !== '' &&
                  row.branchHeadEmail.trim() !== '—' &&
                  row.branchHeadEmail.trim() !== '-' &&
                  !isDateOrTimestampStr(row.branchHeadEmail)
                    ? row.branchHeadEmail.trim()
                    : DEFAULT_BRANCH_HEAD_EMAIL;

                const cleanBranch =
                  row.branch && !isDateOrTimestampStr(row.branch) ? row.branch.trim() : 'Delhi';

                // Exact 1:1 print of Col AB (28) Timestamp from Google Sheet Product Order tab (no fallback to Col 2 timestamp)
                const displayOrderNoTimestamp =
                  row.orderNoTimestamp && row.orderNoTimestamp.trim() !== ''
                    ? row.orderNoTimestamp.trim()
                    : '—';

                const isClosedInAutomation = row.statusAN === 'Closed' || row.sheetSource === 'closed';

                return (
                  <tr
                    key={row.orderId}
                    ref={(el) => {
                      rowRefs.current[row.orderId] = el;
                    }}
                    className={`border-b border-slate-200 transition-colors hover:bg-sky-50/40 leading-tight ${rowBg}`}
                  >
                    {/* # Index Column */}
                    <td
                      className={`w-10 px-1.5 py-0.5 text-center font-mono font-bold text-slate-400 bg-slate-50/95 border-r border-slate-200 text-[10px] leading-tight ${
                        freezeColumns >= 1 ? 'sticky left-0 z-20' : ''
                      }`}
                    >
                      {rowIndex}
                    </td>

                    {/* Col 1 (A): Order No (Reference / GNZ - Never shows date/time format) */}
                    {visiblePoCols['referenceNo'] !== false && (
                      <td
                        className={`px-1.5 py-0.5 border-r border-slate-200 font-mono font-bold text-blue-900 whitespace-nowrap text-[11px] leading-tight ${
                          freezeColumns >= 2 ? 'sticky left-[40px] z-20 bg-white shadow-[2px_0_4px_-1px_rgba(0,0,0,0.12)]' : ''
                        }`}
                      >
                        {cleanRefNo ? (
                          <div className="flex items-center gap-1">
                            <span>{cleanRefNo}</span>
                            <button
                              onClick={() => handleCopyText(cleanRefNo, row.orderId)}
                              className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-slate-400 hover:text-slate-700 p-0 cursor-pointer"
                              title="Copy Reference"
                            >
                              {copiedId === row.orderId ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono">—</span>
                        )}
                      </td>
                    )}

                    {/* Col 2 (B): Timestamp */}
                    {visiblePoCols['timestamp'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 text-slate-600 font-mono whitespace-nowrap text-[10px] leading-tight">
                        {row.timestamp}
                      </td>
                    )}

                    {/* Col 3 (C): Customer PO */}
                    {visiblePoCols['customerPO'] !== false && (
                      <td
                        className={`px-1.5 py-0.5 border-r border-slate-200 font-semibold text-slate-800 whitespace-nowrap text-[11px] leading-tight ${
                          freezeColumns >= 3 ? 'sticky left-[150px] z-20 bg-white shadow-[2px_0_4px_-1px_rgba(0,0,0,0.12)]' : ''
                        }`}
                      >
                        <span className={row.customerPO === 'N/A' ? 'text-slate-400 italic' : 'text-slate-900 font-bold'}>
                          {row.customerPO}
                        </span>
                      </td>
                    )}

                    {/* Col 4 (D): Customer Name */}
                    {visiblePoCols['customerName'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 font-medium text-slate-900 whitespace-nowrap text-[11px] leading-tight">
                        {row.customerName}
                      </td>
                    )}

                    {/* Col 5 (E): Customer Email */}
                    {visiblePoCols['customerEmail'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 text-slate-600 text-[10px] whitespace-nowrap leading-tight">
                        {row.customerEmail || '—'}
                      </td>
                    )}

                    {/* Col 6 (F): Order Date */}
                    {visiblePoCols['orderDate'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 text-slate-700 whitespace-nowrap text-[10px] leading-tight">
                        {row.orderDate}
                      </td>
                    )}

                    {/* Col 7 (G): Unit (Category) */}
                    {visiblePoCols['unit'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 font-medium text-purple-900 whitespace-nowrap text-[10px] leading-tight">
                        <span className="px-1 py-0 rounded bg-purple-50 text-purple-800 border border-purple-200 text-[9px] font-semibold">
                          {row.unit}
                        </span>
                      </td>
                    )}

                    {/* Col 8 (H): Item Name */}
                    {visiblePoCols['itemName'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap text-[11px] leading-tight">
                        {row.itemName}
                      </td>
                    )}

                    {/* Col 9 (I): Color */}
                    {visiblePoCols['color'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 text-slate-700 whitespace-nowrap text-[11px] leading-tight">
                        {row.color}
                      </td>
                    )}

                    {/* Col 10 (J): Width */}
                    {visiblePoCols['width'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 text-slate-700 whitespace-nowrap text-[11px] leading-tight">
                        {row.width}
                      </td>
                    )}

                    {/* Col 11 (K): Unit (of item) */}
                    {visiblePoCols['unitOfItem'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 font-mono text-slate-600 text-center text-[10px] whitespace-nowrap leading-tight">
                        {row.unitOfItem}
                      </td>
                    )}

                    {/* Col 12 (L): Qty */}
                    {visiblePoCols['qty'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 font-mono font-bold text-slate-900 text-right text-[11px] leading-tight">
                        {Number(row.qty).toLocaleString()}
                      </td>
                    )}

                    {/* Col 13 (M): Rate */}
                    {visiblePoCols['rate'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 font-mono text-slate-700 text-right text-[11px] leading-tight">
                        ₹{row.rate}
                      </td>
                    )}

                    {/* Col 14 (N): Discount */}
                    {visiblePoCols['discount'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 font-mono text-slate-600 text-center text-[11px] leading-tight">
                        {row.discount}%
                      </td>
                    )}

                    {/* Col 15 (O): Delivery Date */}
                    {visiblePoCols['deliveryDate'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 text-slate-700 whitespace-nowrap text-[10px] leading-tight">
                        {row.deliveryDate}
                      </td>
                    )}

                    {/* Col 16 (P): Remark */}
                    {visiblePoCols['remark'] !== false && (
                      <td
                        className={`px-1.5 py-0.5 border-r border-slate-200 text-slate-600 text-[10px] leading-tight ${
                          autoFitColumns ? 'whitespace-nowrap' : 'max-w-[200px] truncate'
                        }`}
                        title={row.remark}
                      >
                        {row.remark || '—'}
                      </td>
                    )}

                    {/* Col 17 (Q): Customer Number */}
                    {visiblePoCols['customerNumber'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 font-mono text-slate-700 whitespace-nowrap text-[10px] leading-tight">
                        {row.customerNumber || '—'}
                      </td>
                    )}

                    {/* Col 18 (R): Billing Address */}
                    {visiblePoCols['billingAddress'] !== false && (
                      <td
                        className={`px-1.5 py-0.5 border-r border-slate-200 text-slate-600 text-[10px] leading-tight ${
                          autoFitColumns ? 'whitespace-nowrap' : 'max-w-[220px] truncate'
                        }`}
                        title={row.billingAddress}
                      >
                        {row.billingAddress || '—'}
                      </td>
                    )}

                    {/* Col 19 (S): Delivery Address */}
                    {visiblePoCols['deliveryAddress'] !== false && (
                      <td
                        className={`px-1.5 py-0.5 border-r border-slate-200 text-slate-600 text-[10px] leading-tight ${
                          autoFitColumns ? 'whitespace-nowrap' : 'max-w-[220px] truncate'
                        }`}
                        title={row.deliveryAddress}
                      >
                        {row.deliveryAddress || '—'}
                      </td>
                    )}

                    {/* Col 20 (T): Transporter Name */}
                    {visiblePoCols['transporterName'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 text-slate-800 whitespace-nowrap text-[10px] leading-tight">
                        {row.transporterName || '—'}
                      </td>
                    )}

                    {/* Col 21 (U): Sales Person Name */}
                    {visiblePoCols['salesPerson'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 text-slate-800 font-medium whitespace-nowrap text-[10px] leading-tight">
                        {row.salesPerson || '—'}
                      </td>
                    )}

                    {/* Col 22 (V): Account Status */}
                    {visiblePoCols['accountStatus'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 text-slate-700 whitespace-nowrap text-[10px] leading-tight">
                        {row.accountStatus || '—'}
                      </td>
                    )}

                    {/* Col 23 (W): Branch */}
                    {visiblePoCols['branch'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 font-medium text-slate-800 whitespace-nowrap text-[10px] leading-tight">
                        {cleanBranch}
                      </td>
                    )}

                    {/* Col 24 (X): Approval Status */}
                    {visiblePoCols['approvalStatus'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 whitespace-nowrap text-[10px] text-center leading-tight">
                        {row.approvalStatus ? (
                          <span className="px-1 py-0 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[9px]">
                            {row.approvalStatus}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    )}

                    {/* Col 25 (Y): Branch Head Name (Default: Vinay Chhajer when blank) */}
                    {visiblePoCols['branchHeadName'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 text-slate-800 font-medium whitespace-nowrap text-[10px] leading-tight">
                        {cleanBranchHeadName}
                      </td>
                    )}

                    {/* Col 26 (Z): Branch Head Email (Default: vinay.chhajer@ginzalimited.com when blank) */}
                    {visiblePoCols['branchHeadEmail'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-200 text-slate-600 text-[10px] whitespace-nowrap leading-tight">
                        {cleanBranchHeadEmail}
                      </td>
                    )}

                    {/* Col 27 (AA): ORDER NO (O.N GENERATE) - 2-WAY SYNCED WITH GOOGLE SHEET COL AA */}
                    {visiblePoCols['orderNo'] !== false && (
                      <td className="px-1.5 py-0.5 border-r border-slate-300 bg-emerald-50/30 whitespace-nowrap leading-tight">
                        {hasOrderNo && !isEditingThisRow ? (
                          <div className="flex items-center gap-1">
                            <span
                              onClick={() => {
                                setInputOrderNos(prev => ({ ...prev, [row.orderId]: cleanOrderNo }));
                                setEditingRowOrderId(row.orderId);
                              }}
                              className="font-mono font-bold text-slate-900 px-1.5 py-0 rounded bg-white border border-slate-300 hover:border-emerald-500 shadow-2xs text-[10px] cursor-pointer flex items-center gap-1"
                              title="Click to edit Order No (Syncs with Google Sheet Col AA & Order Automation)"
                            >
                              <span>{cleanOrderNo}</span>
                              <Edit3 className="w-2.5 h-2.5 text-slate-400" />
                            </span>
                            <span
                              onClick={onNavigateToAutomation}
                              className={`inline-flex items-center gap-0.5 text-[9px] font-bold rounded px-1 py-0 cursor-pointer border ${
                                isClosedInAutomation
                                  ? 'text-indigo-800 bg-indigo-100 border-indigo-300 hover:bg-indigo-200'
                                  : 'text-emerald-800 bg-emerald-100 border-emerald-300 hover:bg-emerald-200'
                              }`}
                              title="Click to view in Order Automation"
                            >
                              <CheckCircle2 className={`w-2.5 h-2.5 ${isClosedInAutomation ? 'text-indigo-600' : 'text-emerald-600'}`} />
                              <span>{isClosedInAutomation ? 'Closed' : 'Active'}</span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              ref={(el) => {
                                orderInputRefs.current[row.orderId] = el;
                              }}
                              type="text"
                              placeholder="e.g. FSO/04599/11/26"
                              value={inputOrderNos[row.orderId] ?? cleanOrderNo}
                              onChange={(e) => setInputOrderNos({ ...inputOrderNos, [row.orderId]: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  onGenerateOrderNo(row.orderId, inputOrderNos[row.orderId]);
                                  setEditingRowOrderId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingRowOrderId(null);
                                }
                              }}
                              className={`w-32 px-1 py-0 h-5 text-[10px] bg-white border rounded font-mono font-semibold focus:outline-none focus:ring-1 ${
                                isHighlighted
                                  ? 'border-amber-600 ring-1 ring-amber-400 bg-amber-50'
                                  : 'border-amber-300 focus:ring-amber-500'
                              }`}
                            />
                            <button
                              onClick={() => {
                                onGenerateOrderNo(row.orderId, inputOrderNos[row.orderId]);
                                setEditingRowOrderId(null);
                              }}
                              className="px-1.5 py-0 h-5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded text-[10px] shadow-2xs flex items-center gap-0.5 transition-colors cursor-pointer"
                              title="Save Order No (Col AA) & Timestamp (Col AB) to Sheet & Order Automation"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{isEditingThisRow ? 'Save' : 'Gen O.N'}</span>
                            </button>
                            {isEditingThisRow && (
                              <button
                                type="button"
                                onClick={() => setEditingRowOrderId(null)}
                                className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}

                    {/* Col 28 (AB): Timestamp ( O.N Generate ) - 1:1 from Google Sheet Col AB */}
                    {visiblePoCols['orderNoTimestamp'] !== false && (
                      <td className="px-1.5 py-0.5 text-slate-700 font-mono whitespace-nowrap text-[10px] bg-emerald-50/10 leading-tight">
                        {displayOrderNoTimestamp}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Compact Pagination Strip */}
      <div className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded flex flex-wrap items-center justify-between gap-2 text-[10px] select-none">
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <span className="inline-flex items-center gap-1 px-1.5 py-0 rounded bg-blue-100 text-blue-900 border border-blue-200 font-bold">
            <span>Total:</span>
            <strong className="font-mono">{orders.length.toLocaleString()}</strong>
          </span>
          <span>
            Rows <strong className="text-slate-900 font-mono font-bold">{filteredRows.length === 0 ? 0 : (safeCurrentPage - 1) * (pageSize || filteredRows.length) + 1}</strong>–<strong className="text-slate-900 font-mono font-bold">{Math.min(safeCurrentPage * (pageSize || filteredRows.length), filteredRows.length)}</strong> of{' '}
            <strong className="text-slate-900 font-mono font-bold">{filteredRows.length.toLocaleString()}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Page Size Selector */}
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-1 py-0 bg-white border border-slate-300 rounded text-[10px] font-semibold text-slate-800 focus:outline-none cursor-pointer h-5"
            >
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1,000</option>
              <option value={0}>All ({filteredRows.length.toLocaleString()})</option>
            </select>
          </div>

          {/* 1st Page / < Prev / Page Number Input / Next > / Last Page Controls */}
          {pageSize > 0 && (
            <div className="flex items-center gap-1">
              {/* 1st Page Direct Jump Button */}
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="px-1.5 py-0 h-5 rounded border border-slate-300 bg-white hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-0.5 text-[10px] font-bold text-slate-700 cursor-pointer"
                title="Jump directly to 1st Page"
              >
                <span>|&laquo; 1st Page</span>
              </button>

              {/* < Prev Button */}
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-1.5 py-0 h-5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-0.5 text-[10px] font-semibold text-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Prev</span>
              </button>

              {/* Direct Page Number Input + Total Pages */}
              <div className="flex items-center gap-1 px-1.5 h-5 bg-white border border-slate-300 rounded text-[10px] font-semibold text-slate-700">
                <span>Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={safeCurrentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setCurrentPage(Math.min(totalPages, Math.max(1, val)));
                    }
                  }}
                  className="w-11 px-1 py-0 h-4 text-center font-mono font-bold text-blue-900 bg-blue-50/70 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-[10px]"
                  title={`Type page number (1 to ${totalPages}) to jump directly`}
                />
                <span className="text-slate-500 font-mono">of {totalPages}</span>
              </div>

              {/* Next > Button */}
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-1.5 py-0 h-5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-0.5 text-[10px] font-semibold text-slate-700 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3 h-3" />
              </button>

              {/* Last Page Direct Jump Button */}
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-1.5 py-0 h-5 rounded border border-slate-300 bg-white hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-0.5 text-[10px] font-bold text-slate-700 cursor-pointer"
                title={`Jump directly to Last Page (${totalPages})`}
              >
                <span>Last Page &raquo;|</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* COLUMN HEADER FILTER POPOVER FOR PRODUCT ORDER TAB (All 28 Columns) */}
      {activePoFilterCol && (() => {
        const colObj = productOrderColumns.find(c => c.id === activePoFilterCol);
        const colIdx = productOrderColumns.findIndex(c => c.id === activePoFilterCol);
        const colLetter = colIdx >= 0 ? getPoSheetColLetter(colIdx) : '';
        const allUniqueVals = getUniquePoColumnValues(activePoFilterCol);
        const searchedVals = poFilterSearch.trim()
          ? allUniqueVals.filter(v => v.toLowerCase().includes(poFilterSearch.trim().toLowerCase()))
          : allUniqueVals;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/25"
            onClick={() => {
              setActivePoFilterCol(null);
              setPoFilterSearch('');
            }}
          >
            <div
              className="bg-white rounded-xl shadow-2xl border border-slate-300 p-4 w-80 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                  {colObj?.label} ({colLetter} / {colIdx + 1})
                </span>
                <button
                  onClick={() => {
                    setActivePoFilterCol(null);
                    setPoFilterSearch('');
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sorting options */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPoSortConfig({ colId: activePoFilterCol, direction: 'asc' });
                    setActivePoFilterCol(null);
                    setPoFilterSearch('');
                  }}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowUp className="w-3 h-3 text-blue-600" />
                  <span>Sort A → Z</span>
                </button>
                <button
                  onClick={() => {
                    setPoSortConfig({ colId: activePoFilterCol, direction: 'desc' });
                    setActivePoFilterCol(null);
                    setPoFilterSearch('');
                  }}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowDown className="w-3 h-3 text-blue-600" />
                  <span>Sort Z → A</span>
                </button>
              </div>

              {/* Hide this Column */}
              <button
                onClick={() => {
                  setVisiblePoCols(prev => ({ ...prev, [activePoFilterCol]: false }));
                  setActivePoFilterCol(null);
                  setPoFilterSearch('');
                }}
                className="w-full py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-semibold flex items-center justify-center gap-1.5 border border-rose-200 cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide this Column ({colLetter})</span>
              </button>

              {/* Search & Values List */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Values in Column ({searchedVals.length}):
                  </span>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        setPoColFilters(prev => {
                          const copy = { ...prev };
                          delete copy[activePoFilterCol];
                          return copy;
                        });
                        setCurrentPage(1);
                      }}
                      className="text-blue-700 hover:underline font-bold cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPoColFilters(prev => ({ ...prev, [activePoFilterCol]: ['__NONE__'] }));
                        setCurrentPage(1);
                      }}
                      className="text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Search ${colObj?.label} values...`}
                    value={poFilterSearch}
                    onChange={(e) => setPoFilterSearch(e.target.value)}
                    className="w-full pl-6 pr-6 py-1 text-[11px] bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {poFilterSearch && (
                    <button
                      type="button"
                      onClick={() => setPoFilterSearch('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded border border-slate-200">
                  {searchedVals.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic text-center py-3">
                      No matching values found in this column.
                    </p>
                  ) : (
                    <>
                      {searchedVals.slice(0, 150).map(val => {
                        const isChecked = !poColFilters[activePoFilterCol] || poColFilters[activePoFilterCol].includes(val);
                        return (
                          <label key={val} className="flex items-center gap-2 py-0.5 px-1 hover:bg-white rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePoColFilterValue(activePoFilterCol, val, allUniqueVals)}
                              className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="truncate text-slate-800" title={val}>{val}</span>
                          </label>
                        );
                      })}
                      {searchedVals.length > 150 && (
                        <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-center font-medium mt-1">
                          Showing top 150 of {searchedVals.length.toLocaleString()} values — type in Search box above to filter specific values!
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => {
                    setPoColFilters(prev => {
                      const copy = { ...prev };
                      delete copy[activePoFilterCol];
                      return copy;
                    });
                    setActivePoFilterCol(null);
                    setPoFilterSearch('');
                  }}
                  className="text-slate-500 hover:text-slate-800 text-[11px] underline cursor-pointer"
                >
                  Reset Filter
                </button>
                <button
                  onClick={() => {
                    if (poFilterSearch.trim() && !poColFilters[activePoFilterCol]) {
                      setPoColFilters(prev => ({ ...prev, [activePoFilterCol]: searchedVals }));
                      setCurrentPage(1);
                    }
                    setActivePoFilterCol(null);
                    setPoFilterSearch('');
                  }}
                  className="px-3.5 py-1 bg-blue-700 text-white rounded font-bold hover:bg-blue-800 cursor-pointer"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: PRODUCT ORDER COLUMN VISIBILITY MANAGER (HIDE / SHOW 28 COLUMNS) */}
      {showPoColManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Columns className="w-4 h-4 text-blue-400" />
                  Customize Product Order Columns (Hide / Show)
                </h3>
                <p className="text-[11px] text-slate-300">
                  Select which columns (1/A to 28/AB) appear in the Product Order tab
                </p>
              </div>
              <button onClick={() => setShowPoColManager(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto text-xs">
              {/* Quick toggle presets */}
              <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const all: Record<string, boolean> = {};
                    productOrderColumns.forEach(c => {
                      all[c.id] = true;
                    });
                    setVisiblePoCols(all);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700 cursor-pointer"
                >
                  Show All 28
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const focused: Record<string, boolean> = {};
                    const hideSet = new Set(['customerEmail', 'billingAddress', 'deliveryAddress', 'branchHeadName', 'branchHeadEmail']);
                    productOrderColumns.forEach(c => {
                      focused[c.id] = !hideSet.has(c.id);
                    });
                    setVisiblePoCols(focused);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700 cursor-pointer"
                >
                  Hide Addresses &amp; Emails (23)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const compact: Record<string, boolean> = {};
                    const keepSet = new Set([
                      'referenceNo',
                      'customerPO',
                      'customerName',
                      'orderDate',
                      'unit',
                      'itemName',
                      'color',
                      'width',
                      'qty',
                      'rate',
                      'salesPerson',
                      'orderNo',
                      'orderNoTimestamp'
                    ]);
                    productOrderColumns.forEach(c => {
                      compact[c.id] = keepSet.has(c.id);
                    });
                    setVisiblePoCols(compact);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700 cursor-pointer"
                >
                  Compact Order Entry (13)
                </button>
              </div>

              {/* Grid of all 28 columns */}
              <div className="grid grid-cols-2 gap-1.5">
                {productOrderColumns.map((col, idx) => {
                  const colLetter = getPoSheetColLetter(idx);
                  const isChecked = visiblePoCols[col.id] !== false;
                  return (
                    <label
                      key={col.id}
                      className={`flex items-center gap-2 p-1.5 rounded border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-blue-50/60 border-blue-200 text-slate-900'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => setVisiblePoCols(prev => ({ ...prev, [col.id]: e.target.checked }))}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-mono font-bold text-[10px] w-11 text-blue-800 shrink-0">
                        {colLetter} ({idx + 1})
                      </span>
                      <span className="truncate text-xs">{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {visiblePoColsCount} of 28 columns visible
              </span>
              <button
                type="button"
                onClick={() => setShowPoColManager(false)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CLEAR ALL ROWS CONFIRMATION */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-gradient-to-r from-rose-900 to-red-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-300" />
                <h3 className="font-bold text-sm">Clear All Product Order Data?</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">
                Are you sure you want to completely delete all <span className="text-rose-600 font-bold">{orders.length.toLocaleString()}</span> rows from Product Order?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] space-y-1">
                <p className="font-semibold text-rose-900">• Tamam purane sample ya duplicate rows delete ho jayenge (0 rows bachengi).</p>
                <p>• Iske baad aap Sync Sheet (AA/AB) se fresh data load kar sakte hain.</p>
              </div>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllRows) onClearAllRows();
                  setShowClearConfirmModal(false);
                }}
                className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete All {orders.length.toLocaleString()} Rows</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW ROW TO PRODUCT ORDER (Appends at Bottom) */}
      {showAddModal && (
        <NewProductOrderRowModal
          onClose={() => setShowAddModal(false)}
          onSubmit={(newRow) => {
            onAddNewRow(newRow);
            setShowAddModal(false);
            // Automatically jump to bottom page & focus the newly added row
            setTimeout(() => {
              const newTotal = filteredRows.length + 1;
              const lastPage = pageSize > 0 ? Math.max(1, Math.ceil(newTotal / pageSize)) : 1;
              setCurrentPage(lastPage);
              setHighlightedOrderId(newRow.orderId);
              setTimeout(() => {
                const rowEl = rowRefs.current[newRow.orderId];
                if (rowEl) rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const inputEl = orderInputRefs.current[newRow.orderId];
                if (inputEl) inputEl.focus();
              }, 80);
            }, 50);
          }}
        />
      )}
    </div>
  );
};

// Modal for adding a new row into Product Order
interface NewProductOrderRowModalProps {
  onClose: () => void;
  onSubmit: (row: ProductOrderRow) => void;
}

const NewProductOrderRowModal: React.FC<NewProductOrderRowModalProps> = ({ onClose, onSubmit }) => {
  const [referenceNo] = useState(`GNZ-${Math.floor(100000 + Math.random() * 900000)}`);
  const [customerPO, setCustomerPO] = useState(`52${Math.floor(80 + Math.random() * 20)}`);
  const [customerName, setCustomerName] = useState('Shree Ganesh Textiles (Delhi)');
  const [customerEmail, setCustomerEmail] = useState('ganesh.textiles@gmail.com');
  const [orderDate, setOrderDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [unit, setUnit] = useState('WARP(UDHANA)');
  const [itemName, setItemName] = useState('L-4014/NS/56-I');
  const [color, setColor] = useState('White');
  const [width, setWidth] = useState('56"');
  const [unitOfItem, setUnitOfItem] = useState('MTR');
  const [qty, setQty] = useState('500');
  const [rate, setRate] = useState('180');
  const [discount, setDiscount] = useState('10');
  const [deliveryDate, setDeliveryDate] = useState('20/02/2026');
  const [remark, setRemark] = useState('Confirm delivery with sales head');
  const [customerNumber, setCustomerNumber] = useState('9810123456');
  const [billingAddress, setBillingAddress] = useState('Chandni Chowk, Delhi');
  const [deliveryAddress, setDeliveryAddress] = useState('Chandni Chowk, Delhi');
  const [transporterName, setTransporterName] = useState('Atc express');
  const [salesPerson, setSalesPerson] = useState('Lalit Maroo');
  const [accountStatus, setAccountStatus] = useState('Nil');
  const [branch, setBranch] = useState('Delhi');
  const [approvalStatus, setApprovalStatus] = useState('APPROVED');
  const [branchHeadName, setBranchHeadName] = useState('Vinay Chhajer');
  const [branchHeadEmail, setBranchHeadEmail] = useState('vinay.chhajer@ginzalimited.com');
  const [orderNo, setOrderNo] = useState('');
  const [generateNow, setGenerateNow] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nowStr = new Date().toLocaleString('en-IN');
    const finalOrderNo = generateNow ? `DLFSO2526-0${Math.floor(1750 + Math.random() * 50)}` : orderNo;

    const newRow: ProductOrderRow = {
      orderId: `ORD-${Date.now()}`,
      referenceNo,
      timestamp: nowStr,
      customerPO,
      customerName,
      customerEmail,
      orderDate,
      unit,
      itemName,
      color,
      width,
      unitOfItem,
      qty: Number(qty) || 0,
      rate: Number(rate) || 0,
      discount: Number(discount) || 0,
      deliveryDate,
      remark,
      customerNumber,
      billingAddress,
      deliveryAddress,
      transporterName,
      salesPerson,
      accountStatus,
      branch,
      approvalStatus,
      branchHeadName,
      branchHeadEmail,
      orderNo: finalOrderNo,
      orderNoTimestamp: finalOrderNo ? nowStr : '',
      statusAN: 'Open'
    };

    onSubmit(newRow);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" />
              Add New Order Row at Bottom (Product Order Sheet)
            </h3>
            <p className="text-xs text-slate-300">
              New incoming order appends at the bottom of the sheet (matching IMPORTRANGE behavior).
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Section 1: Customer & PO */}
          <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-200 space-y-3">
            <span className="font-bold text-sky-950 block uppercase text-[11px] tracking-wider">
              1. Customer &amp; Order Header (Cols 1–6)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Order No (Reference)</label>
                <input
                  type="text"
                  disabled
                  value={referenceNo}
                  className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-blue-900 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Customer PO (Col 3)</label>
                <input
                  type="text"
                  required
                  value={customerPO}
                  onChange={(e) => setCustomerPO(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Customer Name (Col 4)</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Customer Email (Col 5)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Customer Number (Col 17)</label>
                <input
                  type="text"
                  value={customerNumber}
                  onChange={(e) => setCustomerNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Order Date (Col 6)</label>
                <input
                  type="text"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Product & Item Specs */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 block uppercase text-[11px] tracking-wider">
              2. Product &amp; Specifications (Cols 7–15)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Unit / Category (Col 7)</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                >
                  <option value="WARP(UDHANA)">WARP(UDHANA)</option>
                  <option value="ELASTIC">ELASTIC</option>
                  <option value="CKU">CKU</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Item Name (Col 8)</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Color (Col 9)</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Width (Col 10)</label>
                <input
                  type="text"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Unit of Item (Col 11)</label>
                <input
                  type="text"
                  value={unitOfItem}
                  onChange={(e) => setUnitOfItem(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Qty (Col 12)</label>
                <input
                  type="number"
                  required
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Rate (₹) (Col 13)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Discount % (Col 14)</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Delivery Date (Col 15)</label>
                <input
                  type="text"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Logistics & Approval */}
          <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-200 space-y-3">
            <span className="font-bold text-indigo-950 block uppercase text-[11px] tracking-wider">
              3. Logistics, Branch &amp; Approval (Cols 16–26)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Transporter Name (Col 20)</label>
                <input
                  type="text"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Sales Person (Col 21)</label>
                <input
                  type="text"
                  value={salesPerson}
                  onChange={(e) => setSalesPerson(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Branch (Col 23)</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Billing &amp; Delivery Address (Cols 18 &amp; 19)</label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => {
                    setBillingAddress(e.target.value);
                    setDeliveryAddress(e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Remark (Col 16)</label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Order No Generation Trigger (Col 27 & 28) */}
          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-300 space-y-3">
            <span className="font-bold text-emerald-950 block uppercase text-[11px] tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              4. Order Number Generation (Col 27 &amp; 28 Trigger)
            </span>
            <p className="text-[11px] text-emerald-900">
              When an Order Number is present, this order will automatically flow into the <strong>Product Automation (Active Orders)</strong> tab with default status <strong>Open</strong> in Column AN!
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-900">
                <input
                  type="checkbox"
                  checked={generateNow}
                  onChange={(e) => setGenerateNow(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Auto-generate Order Number immediately (e.g. DLFSO2526-0XXXX)</span>
              </label>

              {!generateNow && (
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Or enter custom Order No (e.g. TDN/03595/25-26) or leave blank"
                    value={orderNo}
                    onChange={(e) => setOrderNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded font-mono text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-sm"
            >
              Add to Bottom of Product Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
