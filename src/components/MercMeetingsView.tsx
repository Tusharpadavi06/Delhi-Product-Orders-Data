import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  Download,
  Plus,
  X,
  Trash2,
  UserCheck,
  MessageSquarePlus,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Clock,
  Filter,
  Columns,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Copy,
  Check
} from 'lucide-react';
import {
  MercManualOrder,
  MercMeetingRow,
  MercRemarkEntry,
  formatMercDateToday,
  formatMercTimestampNow,
  parseTnaDateParts,
  toTnaStorageDate
} from '../utils/mercMeetingsUtils';

export type MercRemarkFieldKey = 'merchantRemark' | 'meetingUpdate';

interface MercMeetingsViewProps {
  rows: MercMeetingRow[];
  editorName: string;
  setEditorName: (name: string) => void;
  onAddRemarkHistoryEntry: (
    row: MercMeetingRow,
    field: MercRemarkFieldKey,
    payload: { text: string; date: string; editorName: string }
  ) => void;
  onUpdateInlineRemark: (
    row: MercMeetingRow,
    field: MercRemarkFieldKey,
    text: string,
    editorName: string
  ) => void;
  onDeleteRemarkHistoryEntry: (
    row: MercMeetingRow,
    field: MercRemarkFieldKey,
    entryId: string
  ) => void;
  onAddManualOrder: (
    order: Omit<MercManualOrder, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  onUpdateManualOrderField: (
    manualOrderId: string,
    updates: Partial<MercManualOrder>
  ) => void;
  onUpdateDispatchQty: (row: MercMeetingRow, nextDispatchQty: number) => void;
  onUpdateRowStatus: (row: MercMeetingRow, nextStatus: 'Open' | 'Closed') => void;
  onDeleteManualOrder: (manualOrderId: string, label: string) => void;
  onSyncCloud: () => void;
  isSyncing: boolean;
  syncNotice: string | null;
  thursdayUniqueCount: number;
  thursdayDuplicateSkippedCount: number;
  thursdaySheetNeedsAccess: boolean;
  isFullWidth: boolean;
}

type MercColKey =
  | 'unit'
  | 'orderDate'
  | 'orderNo'
  | 'customerName'
  | 'designNo'
  | 'color'
  | 'totalQty'
  | 'rate'
  | 'dispatchCommitted'
  | 'dispatchQty'
  | 'balanceQty'
  | 'merchantRemark'
  | 'meetingUpdate'
  | 'orderStatus';

type MercSortKey = MercColKey;

interface MercColDef {
  key: MercColKey;
  label: string;
  align?: 'left' | 'right';
  numeric?: boolean;
  thClass?: string;
}

const MERC_COL_VISIBILITY_STORAGE_KEY = 'ginza_fms_merc_col_visibility_v1';

const MERC_COLUMNS: MercColDef[] = [
  { key: 'unit', label: 'Unit', align: 'left', thClass: 'w-[86px] max-w-[92px]' },
  { key: 'orderDate', label: 'Date (E)', align: 'left', thClass: 'w-[76px]' },
  { key: 'orderNo', label: 'Order No (X)', align: 'left', thClass: 'w-[104px] max-w-[112px]' },
  { key: 'customerName', label: 'Customer (C)', align: 'left', thClass: 'min-w-[112px] max-w-[140px]' },
  { key: 'designNo', label: 'Design (G)', align: 'left', thClass: 'min-w-[84px] max-w-[108px]' },
  { key: 'color', label: 'Color (H)', align: 'left', thClass: 'w-[76px] max-w-[88px]' },
  { key: 'totalQty', label: 'Total (K)', align: 'right', numeric: true, thClass: 'w-[66px]' },
  { key: 'rate', label: 'Rate (L)', align: 'right', numeric: true, thClass: 'w-[54px]' },
  { key: 'dispatchCommitted', label: 'Commit (N)', align: 'left', thClass: 'w-[76px]' },
  { key: 'dispatchQty', label: 'Disp (Y)', align: 'right', numeric: true, thClass: 'w-[76px] bg-amber-50/80 text-amber-950' },
  { key: 'balanceQty', label: 'Bal (Z)', align: 'right', numeric: true, thClass: 'w-[68px] bg-emerald-50/70 text-emerald-950' },
  { key: 'merchantRemark', label: 'Merch Remark (+)', align: 'left', thClass: 'min-w-[138px] max-w-[170px] bg-amber-50/70 text-amber-950' },
  { key: 'meetingUpdate', label: 'Meeting Update (+)', align: 'left', thClass: 'min-w-[138px] max-w-[170px] bg-sky-50/70 text-sky-950' },
  { key: 'orderStatus', label: 'Status', align: 'left', thClass: 'w-[96px] min-w-[96px] sticky right-0 z-30 bg-slate-100 border-l border-slate-300 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]' }
];

const DEFAULT_VISIBLE_COLS: Record<MercColKey, boolean> = {
  unit: true,
  orderDate: true,
  orderNo: true,
  customerName: true,
  designNo: true,
  color: true,
  totalQty: true,
  rate: true,
  dispatchCommitted: true,
  dispatchQty: true,
  balanceQty: true,
  merchantRemark: true,
  meetingUpdate: true,
  orderStatus: true
};

function getMercColFilterValue(row: MercMeetingRow, colKey: MercColKey): string {
  switch (colKey) {
    case 'unit':
      return row.unit.trim() || '(Blank)';
    case 'orderDate':
      return row.orderDate.trim() || '(Blank)';
    case 'orderNo':
      return row.orderNo.trim() || '(Blank)';
    case 'customerName':
      return row.customerName.trim() || '(Blank)';
    case 'designNo':
      return row.designNo.trim() || '(Blank)';
    case 'color':
      return row.color.trim() || '(Blank)';
    case 'totalQty':
      return row.totalQtyText || String(row.totalQty ?? 0);
    case 'rate':
      return row.rateText || String(row.rate ?? 0);
    case 'dispatchCommitted':
      return row.dispatchCommitted.trim() || '(Blank)';
    case 'dispatchQty':
      return row.dispatchQtyText || String(row.dispatchQty ?? 0);
    case 'balanceQty':
      return row.balanceQtyText || String(row.balanceQty ?? 0);
    case 'merchantRemark':
      return row.merchantRemark.trim() || '(Blank)';
    case 'meetingUpdate':
      return row.meetingUpdate.trim() || '(Blank)';
    case 'orderStatus':
      if (row.source === 'manual') return `${row.orderStatus} (Manual)`;
      if (row.source === 'thursday_sheet') return `${row.orderStatus} (Thursday Sheet)`;
      return 'Open (Auto AN)';
    default:
      return '(Blank)';
  }
}

const THURSDAY_SYNC_APPS_SCRIPT = `/**
 * ==============================================================================
 * GINZA FMS - THURSDAY MEETING FOR CIRCULAR -> MERC MEETINGS LIVE SYNC (v2)
 * Paste inside Apps Script of Sheet: 1Wdu7PtyAEEnOY3R3OgvNM-Hnu9LnTnw1WKJQf06z-Qo
 * Run "syncThursdayMeetingToFirebase()" once (or add a 5-min time trigger).
 * Preserves exact Google Sheet text for Total Qnt, Rate, Dispatch Qnt, Balance Qnt.
 * ==============================================================================
 */
const MERC_THURSDAY_CFG = {
  SPREADSHEET_ID: "1Wdu7PtyAEEnOY3R3OgvNM-Hnu9LnTnw1WKJQf06z-Qo",
  TAB_NAMES: [
    "Thursday Meeting for circular.",
    "Thursday Meeting for Circular.",
    "Thursday Meeting for circular",
    "Thursday Meeting for Circular"
  ],
  DATABASE_URL: "https://delhi-product-order-default-rtdb.firebaseio.com",
  DATABASE_SECRET: "iIElINFgR124ssaG3QWjExz2lT72cRh5g502oP6J"
};

function readThursdayMeetingData_() {
  const ss = SpreadsheetApp.openById(MERC_THURSDAY_CFG.SPREADSHEET_ID);
  let sheet = null;
  for (let i = 0; i < MERC_THURSDAY_CFG.TAB_NAMES.length; i++) {
    sheet = ss.getSheetByName(MERC_THURSDAY_CFG.TAB_NAMES[i]);
    if (sheet) break;
  }
  if (!sheet) {
    const all = ss.getSheets();
    for (let i = 0; i < all.length; i++) {
      const n = all[i].getName().toLowerCase();
      if (n.indexOf("thursday") !== -1 && n.indexOf("circular") !== -1) {
        sheet = all[i];
        break;
      }
    }
  }
  if (!sheet) throw new Error('Tab "Thursday Meeting for circular." not found.');

  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), 13);
  if (lastRow < 2) return { rows: [], detectedHeaders: [], colMap: {} };

  const rng = sheet.getRange(1, 1, lastRow, lastCol);
  const display = rng.getDisplayValues();
  const rawVals = rng.getValues();
  const normH = (s) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  let hdrIdx = -1;
  const colMap = {};
  for (let r = 0; r < Math.min(6, display.length); r++) {
    const m = {};
    display[r].forEach(function(cell, idx) {
      const h = normH(cell);
      if (!h) return;
      if ((h.includes("order") && h.includes("date")) || h === "date") {
        if (m.orderDate === undefined) m.orderDate = idx;
      } else if (h.includes("order") && (h.includes("no") || h.includes("num"))) {
        if (m.orderNo === undefined) m.orderNo = idx;
      } else if (h.includes("customer") || h.includes("party")) {
        if (m.customerName === undefined) m.customerName = idx;
      } else if (h.includes("design") || h.includes("item")) {
        if (m.designNo === undefined) m.designNo = idx;
      } else if (h.includes("color") || h.includes("colour") || h.includes("shade")) {
        if (m.color === undefined) m.color = idx;
      } else if (
        (h.includes("total") && (h.includes("qnt") || h.includes("qty") || h.includes("quant") || h.includes("kg") || h.includes("mtr"))) ||
        (h.includes("order") && (h.includes("qnt") || h.includes("qty") || h.includes("quant"))) ||
        h === "total" || h === "qty" || h === "qnt" || h === "quantity"
      ) {
        if (m.totalQty === undefined) m.totalQty = idx;
      } else if (h === "rate" || h.startsWith("rate ") || h.includes("rate") || h.includes("price")) {
        if (m.rate === undefined) m.rate = idx;
      } else if (h.includes("commit") || h.includes("commited") || h.includes("delivery") || (h.includes("dispatch") && h.includes("date"))) {
        if (m.dispatchCommitted === undefined) m.dispatchCommitted = idx;
      } else if (
        (h.includes("dispatch") && !h.includes("commit") && !h.includes("commited") && !h.includes("date")) ||
        h.includes("dispatched")
      ) {
        if (m.dispatchQty === undefined) m.dispatchQty = idx;
      } else if (h.includes("balance") || h.includes("bal") || h.includes("pending qty") || h.includes("pending qnt")) {
        if (m.balanceQty === undefined) m.balanceQty = idx;
      } else if (h.includes("merchant") || h.includes("mechant") || h.includes("remark")) {
        if (m.merchantRemark === undefined) m.merchantRemark = idx;
      } else if (h.includes("meeting") || h.includes("update")) {
        if (m.meetingUpdate === undefined) m.meetingUpdate = idx;
      } else if (h.includes("status")) {
        if (m.orderStatus === undefined) m.orderStatus = idx;
      } else if (h === "unit" || h.startsWith("unit ")) {
        if (m.unit === undefined) m.unit = idx;
      }
    });
    if (Object.keys(m).length >= 4) { hdrIdx = r; Object.assign(colMap, m); break; }
  }

  const colorIdx = colMap.color !== undefined ? colMap.color : 4;
  const commitIdx = colMap.dispatchCommitted !== undefined ? colMap.dispatchCommitted : colorIdx + 3;
  const idxOf = (key, fb) => (colMap[key] !== undefined ? colMap[key] : fb);
  const getC = (row, idx) => String(row[idx] || "").trim();
  const toNum = (dispVal, rawVal) => {
    if (typeof rawVal === "number" && !isNaN(rawVal)) return rawVal;
    const cleaned = String(dispVal || "").replace(/,/g, "").trim();
    if (!cleaned) return 0;
    const match = cleaned.match(/-?\\d+(?:\\.\\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  };

  const rows = [];
  const startRow = hdrIdx >= 0 ? hdrIdx + 1 : 1;

  for (let r = startRow; r < display.length; r++) {
    const row = display[r];
    const rRaw = rawVals[r];
    const customerName = getC(row, idxOf("customerName", 2));
    const designNo = getC(row, idxOf("designNo", 3));
    const orderNo = getC(row, idxOf("orderNo", 1));
    if (!customerName && !designNo && !orderNo) continue;

    const totalIdx = idxOf("totalQty", colorIdx + 1);
    const rateIdx = idxOf("rate", colorIdx + 2);
    const dispIdx = idxOf("dispatchQty", commitIdx + 1);
    const balIdx = idxOf("balanceQty", commitIdx + 2);

    const totalQtyText = getC(row, totalIdx);
    const rateText = getC(row, rateIdx);
    const dispatchQtyText = getC(row, dispIdx);
    const balanceQtyText = getC(row, balIdx);

    const totalQty = toNum(totalQtyText, rRaw[totalIdx]);
    const rate = toNum(rateText, rRaw[rateIdx]);
    const dispatchQty = toNum(dispatchQtyText, rRaw[dispIdx]);
    const balanceQty = balanceQtyText !== ""
      ? toNum(balanceQtyText, rRaw[balIdx])
      : Number((totalQty - dispatchQty).toFixed(4));

    const rawStatus = getC(row, idxOf("orderStatus", commitIdx + 5)).toLowerCase();
    const unitVal = colMap.unit !== undefined ? getC(row, colMap.unit) : "";

    rows.push({
      rowIndex: r + 1,
      orderDate: getC(row, idxOf("orderDate", 0)),
      orderNo: orderNo,
      customerName: customerName,
      designNo: designNo,
      color: getC(row, colorIdx),
      totalQty: totalQty,
      totalQtyText: totalQtyText,
      rate: rate,
      rateText: rateText,
      dispatchCommitted: getC(row, commitIdx),
      dispatchQty: dispatchQty,
      dispatchQtyText: dispatchQtyText,
      balanceQty: balanceQty,
      balanceQtyText: balanceQtyText,
      merchantRemark: getC(row, idxOf("merchantRemark", commitIdx + 3)),
      meetingUpdate: getC(row, idxOf("meetingUpdate", commitIdx + 4)),
      orderStatus: (rawStatus === "closed" || rawStatus === "close") ? "Closed" : "Open",
      unit: unitVal || "CKU"
    });
  }
  return {
    rows: rows,
    detectedHeaders: hdrIdx >= 0 ? display[hdrIdx] : [],
    colMap: colMap
  };
}

function syncThursdayMeetingToFirebase() {
  const result = readThursdayMeetingData_();
  const url = MERC_THURSDAY_CFG.DATABASE_URL + "/merc_thursday_sheet_rows.json?auth=" + encodeURIComponent(MERC_THURSDAY_CFG.DATABASE_SECRET);
  UrlFetchApp.fetch(url, {
    method: "put",
    contentType: "application/json",
    payload: JSON.stringify({
      updated_at: new Date().toISOString(),
      count: result.rows.length,
      detectedHeaders: result.detectedHeaders,
      colMap: result.colMap,
      rows: result.rows
    }),
    muteHttpExceptions: true
  });
  Logger.log("Synced " + result.rows.length + " rows. Mapped columns: " + JSON.stringify(result.colMap));
}`;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function toInputDateVal(ddmmyyyy?: string): string {
  if (!ddmmyyyy || !ddmmyyyy.trim()) return '';
  const p = parseTnaDateParts(ddmmyyyy);
  if (!p) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function fromInputDateVal(isoOrRaw: string): string {
  if (!isoOrRaw) return '';
  return toTnaStorageDate(isoOrRaw) || isoOrRaw;
}

export const MercMeetingsView: React.FC<MercMeetingsViewProps> = ({
  rows,
  editorName,
  setEditorName,
  onAddRemarkHistoryEntry,
  onUpdateInlineRemark,
  onDeleteRemarkHistoryEntry,
  onAddManualOrder,
  onUpdateManualOrderField,
  onUpdateDispatchQty,
  onUpdateRowStatus,
  onDeleteManualOrder,
  onSyncCloud,
  isSyncing,
  syncNotice,
  thursdayUniqueCount,
  thursdayDuplicateSkippedCount,
  thursdaySheetNeedsAccess,
  isFullWidth
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Open' | 'Closed' | 'ALL'>('Open');
  const [unitFilter, setUnitFilter] = useState<'ALL' | 'CKU' | 'WARP'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'automation' | 'manual' | 'thursday_sheet'>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: MercSortKey; direction: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [showThursdaySyncModal, setShowThursdaySyncModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Per-column header filters (Google Sheets style)
  const [colFilters, setColFilters] = useState<Partial<Record<MercColKey, string[]>>>({});
  const [activeFilterMenu, setActiveFilterMenu] = useState<{
    colKey: MercColKey;
    top: number;
    left: number;
  } | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [draftSelectedVals, setDraftSelectedVals] = useState<Set<string> | null>(null);

  // Column visibility (hide / show columns, persisted in localStorage)
  const [visibleCols, setVisibleCols] = useState<Record<MercColKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem(MERC_COL_VISIBILITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_VISIBLE_COLS, ...parsed };
      }
    } catch (e) {}
    return { ...DEFAULT_VISIBLE_COLS };
  });
  const [showColManager, setShowColManager] = useState(false);

  // Local transient action notice (e.g. when manual order status changes Open <-> Closed)
  const [localActionNotice, setLocalActionNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(MERC_COL_VISIBILITY_STORAGE_KEY, JSON.stringify(visibleCols));
    } catch (e) {}
  }, [visibleCols]);

  useEffect(() => {
    if (!activeFilterMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveFilterMenu(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeFilterMenu]);

  // Inline cell editing drafts so typing feels instant
  const [inlineDrafts, setInlineDrafts] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // "+" Remark / Meeting Log Card Modal
  const [remarkCard, setRemarkCard] = useState<{
    mercKey: string;
    field: MercRemarkFieldKey;
  } | null>(null);
  const [cardTextInput, setCardTextInput] = useState('');
  const [cardDateInput, setCardDateInput] = useState(() => new Date().toISOString().slice(0, 10));
  const [cardEditorInput, setCardEditorInput] = useState('');

  // Add Manual Order Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [manOrderDate, setManOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manOrderNo, setManOrderNo] = useState('');
  const [manCustomerName, setManCustomerName] = useState('');
  const [manDesignNo, setManDesignNo] = useState('');
  const [manColor, setManColor] = useState('');
  const [manUnit, setManUnit] = useState('CKU');
  const [manCustomUnit, setManCustomUnit] = useState('');
  const [manTotalQty, setManTotalQty] = useState('');
  const [manRate, setManRate] = useState('');
  const [manDispatchCommitted, setManDispatchCommitted] = useState('');
  const [manDispatchQty, setManDispatchQty] = useState('0');
  const [manBalanceOverride, setManBalanceOverride] = useState<string | null>(null);
  const [manMerchantRemark, setManMerchantRemark] = useState('');
  const [manMeetingUpdate, setManMeetingUpdate] = useState('');
  const [manOrderStatus, setManOrderStatus] = useState<'Open' | 'Closed'>('Open');
  const [manFormError, setManFormError] = useState<string | null>(null);

  const openTotalCount = useMemo(
    () => rows.filter(r => r.orderStatus === 'Open').length,
    [rows]
  );
  const closedManualCount = useMemo(
    () => rows.filter(r => r.orderStatus === 'Closed').length,
    [rows]
  );

  const availableYears = useMemo(() => {
    const yrs = new Set<string>(['2025', '2026']);
    rows.forEach(r => {
      const p = parseTnaDateParts(r.orderDate);
      if (p && p.year >= 2020 && p.year <= 2035) yrs.add(String(p.year));
    });
    return Array.from(yrs).sort((a, b) => Number(b) - Number(a));
  }, [rows]);

  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: 0 };
    for (let m = 1; m <= 12; m++) counts[String(m)] = 0;
    rows.forEach(r => {
      if (statusFilter !== 'ALL' && r.orderStatus !== statusFilter) return;
      const p = parseTnaDateParts(r.orderDate);
      if (yearFilter !== 'ALL' && (!p || String(p.year) !== yearFilter)) return;
      counts.ALL++;
      if (p) counts[String(p.month)] = (counts[String(p.month)] || 0) + 1;
    });
    return counts;
  }, [rows, statusFilter, yearFilter]);

  const activeColFilterCount = useMemo(
    () => Object.values(colFilters).filter(vals => Array.isArray(vals) && vals.length > 0).length,
    [colFilters]
  );

  const visibleColCount = useMemo(
    () => MERC_COLUMNS.filter(c => visibleCols[c.key]).length,
    [visibleCols]
  );

  const baseFilteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return rows.filter(r => {
      if (statusFilter !== 'ALL' && r.orderStatus !== statusFilter) return false;
      if (sourceFilter !== 'ALL' && r.source !== sourceFilter) return false;

      if (unitFilter !== 'ALL') {
        const uNorm = r.unit.trim().toLowerCase().replace(/\s+/g, '');
        if (unitFilter === 'CKU' && uNorm !== 'cku') return false;
        if (unitFilter === 'WARP' && !(uNorm.includes('warp') && uNorm.includes('udhana'))) return false;
      }

      if (monthFilter !== 'ALL' || yearFilter !== 'ALL') {
        const p = parseTnaDateParts(r.orderDate);
        if (monthFilter !== 'ALL' && (!p || String(p.month) !== monthFilter)) return false;
        if (yearFilter !== 'ALL' && (!p || String(p.year) !== yearFilter)) return false;
      }

      if (q) {
        const hit =
          r.orderNo.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.designNo.toLowerCase().includes(q) ||
          r.color.toLowerCase().includes(q) ||
          r.unit.toLowerCase().includes(q) ||
          r.merchantRemark.toLowerCase().includes(q) ||
          r.meetingUpdate.toLowerCase().includes(q);
        if (!hit) return false;
      }

      return true;
    });
  }, [rows, searchTerm, statusFilter, unitFilter, sourceFilter, monthFilter, yearFilter]);

  const filteredRows = useMemo(() => {
    const activeEntries = Object.entries(colFilters).filter(
      ([, vals]) => Array.isArray(vals) && vals.length > 0
    ) as [MercColKey, string[]][];

    let list =
      activeEntries.length === 0
        ? baseFilteredRows
        : baseFilteredRows.filter(r =>
            activeEntries.every(([colKey, allowed]) =>
              allowed.includes(getMercColFilterValue(r, colKey))
            )
          );

    if (sortConfig) {
      const { key, direction } = sortConfig;
      const dir = direction === 'asc' ? 1 : -1;
      const numKeys: MercSortKey[] = ['totalQty', 'rate', 'dispatchQty', 'balanceQty'];
      list = [...list].sort((a, b) => {
        if (numKeys.includes(key)) {
          return ((Number(a[key]) || 0) - (Number(b[key]) || 0)) * dir;
        }
        return String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, {
          numeric: true,
          sensitivity: 'base'
        }) * dir;
      });
    }

    return list;
  }, [baseFilteredRows, colFilters, sortConfig]);

  // Unique values for the currently open column header filter popover (cascading from other active filters)
  const activeFilterOptions = useMemo(() => {
    if (!activeFilterMenu) return [];
    const targetCol = activeFilterMenu.colKey;
    const otherEntries = Object.entries(colFilters).filter(
      ([k, vals]) => k !== targetCol && Array.isArray(vals) && vals.length > 0
    ) as [MercColKey, string[]][];

    const pool =
      otherEntries.length === 0
        ? baseFilteredRows
        : baseFilteredRows.filter(r =>
            otherEntries.every(([k, allowed]) => allowed.includes(getMercColFilterValue(r, k)))
          );

    const counts = new Map<string, number>();
    pool.forEach(r => {
      const v = getMercColFilterValue(r, targetCol);
      counts.set(v, (counts.get(v) || 0) + 1);
    });

    const colDef = MERC_COLUMNS.find(c => c.key === targetCol);
    const items = Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
    items.sort((a, b) => {
      if (a.value === '(Blank)') return 1;
      if (b.value === '(Blank)') return -1;
      if (colDef?.numeric) return (Number(a.value) || 0) - (Number(b.value) || 0);
      return a.value.localeCompare(b.value, undefined, { numeric: true, sensitivity: 'base' });
    });
    return items;
  }, [activeFilterMenu, baseFilteredRows, colFilters]);

  const openColumnFilterPopover = (
    colKey: MercColKey,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();
    if (activeFilterMenu?.colKey === colKey) {
      setActiveFilterMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverW = 260;
    const left = Math.max(12, Math.min(rect.left - popoverW + rect.width + 24, window.innerWidth - popoverW - 12));
    const top = Math.min(rect.bottom + 4, window.innerHeight - 360);
    setActiveFilterMenu({ colKey, top, left });
    setFilterSearch('');
    const existing = colFilters[colKey];
    setDraftSelectedVals(existing && existing.length > 0 ? new Set(existing) : null);
  };

  const applyActiveColumnFilter = () => {
    if (!activeFilterMenu) return;
    const colKey = activeFilterMenu.colKey;
    const allVals = activeFilterOptions.map(o => o.value);
    setColFilters(prev => {
      const next = { ...prev };
      if (draftSelectedVals === null || draftSelectedVals.size === allVals.length) {
        delete next[colKey];
      } else if (draftSelectedVals.size === 0) {
        next[colKey] = ['__MERC_NONE_MATCH__'];
      } else {
        next[colKey] = Array.from(draftSelectedVals);
      }
      return next;
    });
    setPage(1);
    setActiveFilterMenu(null);
  };

  const clearSingleColumnFilter = (colKey: MercColKey) => {
    setColFilters(prev => {
      const next = { ...prev };
      delete next[colKey];
      return next;
    });
    setPage(1);
    setActiveFilterMenu(null);
  };

  const triggerLocalNotice = (msg: string) => {
    setLocalActionNotice(msg);
    setTimeout(() => {
      setLocalActionNotice(prev => (prev === msg ? null : prev));
    }, 3500);
  };

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    if (pageSize === 0) return filteredRows;
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  const activeCardRow = useMemo(() => {
    if (!remarkCard) return null;
    return rows.find(r => r.mercKey === remarkCard.mercKey) || null;
  }, [rows, remarkCard]);

  const openRemarkCardModal = (row: MercMeetingRow, field: MercRemarkFieldKey) => {
    setRemarkCard({ mercKey: row.mercKey, field });
    setCardTextInput('');
    setCardDateInput(new Date().toISOString().slice(0, 10));
    setCardEditorInput(editorName.trim() || '');
  };

  const handleSaveCardNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCardRow || !remarkCard) return;
    const cleanText = cardTextInput.trim();
    if (!cleanText) return;
    const chosenEditor = cardEditorInput.trim() || editorName.trim() || 'User';
    if (cardEditorInput.trim() && cardEditorInput.trim() !== editorName.trim()) {
      setEditorName(cardEditorInput.trim());
    }
    onAddRemarkHistoryEntry(activeCardRow, remarkCard.field, {
      text: cleanText,
      date: fromInputDateVal(cardDateInput) || formatMercDateToday(),
      editorName: chosenEditor
    });
    setCardTextInput('');
  };

  const handleSubmitManualOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manCustomerName.trim() || !manDesignNo.trim()) {
      setManFormError('Customer Name and Design No are required.');
      return;
    }
    const totalNum = Number(manTotalQty) || 0;
    const dispNum = Number(manDispatchQty) || 0;
    const balNum =
      manBalanceOverride !== null && manBalanceOverride.trim() !== ''
        ? Number(manBalanceOverride) || 0
        : Number((totalNum - dispNum).toFixed(4));
    const finalUnit = manUnit === '__OTHER__' ? (manCustomUnit.trim() || 'CKU') : manUnit;
    const nowTs = formatMercTimestampNow();
    const todayDate = formatMercDateToday();
    const cleanEd = editorName.trim() || 'User';

    const merchHist: MercRemarkEntry[] = manMerchantRemark.trim()
      ? [
          {
            id: `mhist_${Date.now()}_m`,
            text: manMerchantRemark.trim(),
            date: todayDate,
            timestamp: nowTs,
            editorName: cleanEd,
            createdAt: new Date().toISOString()
          }
        ]
      : [];

    const meetHist: MercRemarkEntry[] = manMeetingUpdate.trim()
      ? [
          {
            id: `mhist_${Date.now()}_u`,
            text: manMeetingUpdate.trim(),
            date: todayDate,
            timestamp: nowTs,
            editorName: cleanEd,
            createdAt: new Date().toISOString()
          }
        ]
      : [];

    onAddManualOrder({
      orderDate: fromInputDateVal(manOrderDate) || todayDate,
      orderNo: manOrderNo.trim(),
      customerName: manCustomerName.trim(),
      designNo: manDesignNo.trim(),
      color: manColor.trim(),
      totalQty: totalNum,
      rate: Number(manRate) || 0,
      dispatchCommitted: fromInputDateVal(manDispatchCommitted) || manDispatchCommitted.trim(),
      dispatchQty: dispNum,
      balanceQty: balNum,
      unit: finalUnit,
      merchantRemark: manMerchantRemark.trim(),
      meetingUpdate: manMeetingUpdate.trim(),
      merchantRemarkHistory: merchHist,
      meetingUpdateHistory: meetHist,
      orderStatus: manOrderStatus,
      createdBy: cleanEd
    });

    const savedStatus = manOrderStatus;
    setShowAddModal(false);
    setManFormError(null);
    setManOrderNo('');
    setManCustomerName('');
    setManDesignNo('');
    setManColor('');
    setManTotalQty('');
    setManRate('');
    setManDispatchCommitted('');
    setManDispatchQty('0');
    setManBalanceOverride(null);
    setManMerchantRemark('');
    setManMeetingUpdate('');
    setManOrderStatus('Open');
    setPage(1);
    if (savedStatus === 'Open' && statusFilter === 'Closed') {
      setStatusFilter('Open');
    } else if (savedStatus === 'Closed' && statusFilter === 'Open') {
      setStatusFilter('Closed');
    }
    triggerLocalNotice(
      savedStatus === 'Closed'
        ? 'Manual order added as Closed.'
        : 'Manual order added at the top of the table.'
    );
  };

  const handleDownloadCsv = () => {
    const headers = [
      'Source',
      'Unit',
      'Order Date',
      'Order Number',
      'Customer Name',
      'Design No',
      'Color',
      'Total Qnt',
      'Rate',
      'Dispatch Commited',
      'Dispatch Qnt',
      'Balance Qnt',
      'Merchant Remark (Latest)',
      'Merchant Remark History',
      'Meeting Update (Latest)',
      'Meeting Update History',
      'Order Status'
    ];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const formatHist = (hist: MercRemarkEntry[]) =>
      hist
        .map(h => `[${h.date} ${h.timestamp} - ${h.editorName}]: ${h.text}`)
        .join(' | ');

    const lines = [
      headers.map(esc).join(','),
      ...filteredRows.map(r =>
        [
          r.source === 'manual'
            ? 'Manual Entry'
            : r.source === 'thursday_sheet'
            ? 'Thursday Meeting Sheet (Unique)'
            : 'Order Automation',
          r.unit,
          r.orderDate,
          r.orderNo,
          r.customerName,
          r.designNo,
          r.color,
          r.totalQtyText || r.totalQty,
          r.rateText || r.rate,
          r.dispatchCommitted,
          r.dispatchQtyText || r.dispatchQty,
          r.balanceQtyText || r.balanceQty,
          r.merchantRemark,
          formatHist(r.merchantRemarkHistory),
          r.meetingUpdate,
          formatHist(r.meetingUpdateHistory),
          r.orderStatus
        ]
          .map(esc)
          .join(',')
      )
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Merc_Meetings_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: MercSortKey) => {
    setSortConfig(prev => {
      if (prev && prev.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('Open');
    setUnitFilter('ALL');
    setSourceFilter('ALL');
    setMonthFilter('ALL');
    setYearFilter('ALL');
    setColFilters({});
    setSortConfig(null);
    setPage(1);
  };

  const draftBalancePreview =
    manBalanceOverride !== null
      ? manBalanceOverride
      : String(Number(((Number(manTotalQty) || 0) - (Number(manDispatchQty) || 0)).toFixed(4)));

  return (
    <div className="flex flex-col bg-white text-slate-900">
      {/* Toolbar */}
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto fms-toolbar-scroll whitespace-nowrap select-none">
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Editor Name */}
          <div
            className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-slate-300 shadow-2xs"
            title="This Editor Name will be saved with every Remark and Meeting Update"
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-600">Editor:</span>
            <input
              type="text"
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
              placeholder="Your Name..."
              className="w-28 text-xs font-semibold text-slate-900 bg-amber-50/60 border border-amber-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Search */}
          <div className="relative w-52 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search Order, Customer, Design, Color..."
              className="w-full pl-7 pr-6 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setPage(1);
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Status Segmented Filter */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-md border border-slate-300 shrink-0">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('Open');
                setPage(1);
              }}
              className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'Open' ? 'bg-white text-amber-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Open ({openTotalCount.toLocaleString()})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('Closed');
                setPage(1);
              }}
              className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'Closed' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Closed Manual ({closedManualCount.toLocaleString()})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setPage(1);
              }}
              className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({rows.length.toLocaleString()})
            </button>
          </div>

          {/* Unit Filter (CKU & WARP(UDHANA)) */}
          <div className="flex items-center bg-white border border-slate-300 rounded-md px-2 py-1 gap-1 shadow-2xs shrink-0">
            <span className="text-[11px] font-semibold text-slate-600">Unit:</span>
            <select
              value={unitFilter}
              onChange={(e) => {
                setUnitFilter(e.target.value as 'ALL' | 'CKU' | 'WARP');
                setPage(1);
              }}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ALL">CKU + Warp(Udhana)</option>
              <option value="CKU">CKU Only</option>
              <option value="WARP">WARP(UDHANA) Only</option>
            </select>
          </div>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value as 'ALL' | 'automation' | 'manual' | 'thursday_sheet');
              setPage(1);
            }}
            className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md px-2 py-1 focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="ALL">All Sources</option>
            <option value="automation">Auto (Order Automation)</option>
            <option value="thursday_sheet">Thursday Sheet (Unique · {thursdayUniqueCount})</option>
            <option value="manual">Manual Orders Only</option>
          </select>

          {/* Month & Year Filter */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-300 shadow-2xs shrink-0">
            <Calendar className="w-3 h-3 text-amber-700 shrink-0" />
            <select
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Months ({monthCounts.ALL})</option>
              {MONTH_NAMES.map((mName, idx) => (
                <option key={mName} value={String(idx + 1)}>
                  {mName} ({monthCounts[String(idx + 1)] || 0})
                </option>
              ))}
            </select>
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold text-slate-800 bg-transparent border-l border-slate-200 pl-1.5 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Years</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {(searchTerm || statusFilter !== 'Open' || unitFilter !== 'ALL' || sourceFilter !== 'ALL' || monthFilter !== 'ALL' || yearFilter !== 'ALL' || sortConfig || activeColFilterCount > 0) && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset{activeColFilterCount > 0 ? ` (${activeColFilterCount} Col)` : ''}</span>
            </button>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowColManager(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              visibleColCount < MERC_COLUMNS.length
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
            }`}
            title="Hide or show table columns"
          >
            <Columns className="w-3.5 h-3.5 text-amber-700" />
            <span>Columns ({visibleColCount}/{MERC_COLUMNS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-md shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Manual Order</span>
          </button>

          <button
            type="button"
            onClick={onSyncCloud}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-700" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Minimal Sub-header: Thursday Sheet Legend + Script Button + Row Count */}
      <div className="px-3 py-1 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span
              className="inline-block w-3 h-3 rounded-xs bg-[#FEFCE8] border border-amber-300 shrink-0"
              aria-hidden="true"
            />
            <span>
              Thursday Sheet Unique: <strong className="font-mono tabular-nums text-slate-900">{thursdayUniqueCount}</strong>
              {thursdayDuplicateSkippedCount > 0 && (
                <span className="text-slate-500"> ({thursdayDuplicateSkippedCount} duplicates removed)</span>
              )}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setShowThursdaySyncModal(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-[#FEFCE8] text-amber-900 border border-amber-300 rounded hover:bg-amber-100 cursor-pointer"
            title="View or copy updated Apps Script for Thursday Meeting for circular."
          >
            <FileSpreadsheet className="w-3 h-3 text-amber-700" />
            <span>{thursdaySheetNeedsAccess && thursdayUniqueCount === 0 ? 'Connect Thursday Sheet' : 'Thursday Sheet Script'}</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          {(localActionNotice || syncNotice) && (
            <span className="font-semibold text-amber-800">{localActionNotice || syncNotice}</span>
          )}
          <span className="font-mono tabular-nums text-slate-700">
            Showing {paginatedRows.length.toLocaleString()} of {filteredRows.length.toLocaleString()} rows
          </span>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div
        className="overflow-auto border-b border-slate-300 bg-white"
        style={{ maxHeight: isFullWidth ? 'calc(100vh - 220px)' : '62vh' }}
      >
        <table className="w-full border-collapse text-[10.5px] leading-tight">
          <thead className="sticky top-0 z-20 bg-slate-100 text-slate-800 border-b-2 border-slate-300">
            <tr>
              <th className="px-1 py-1.5 text-center font-bold border-r border-slate-300 w-7">#</th>
              {MERC_COLUMNS.map((col) => {
                if (!visibleCols[col.key]) return null;
                const isFiltered = Array.isArray(colFilters[col.key]) && colFilters[col.key]!.length > 0;
                const isSorted = sortConfig?.key === col.key;
                return (
                  <th
                    key={col.key}
                    className={`px-1.5 py-1 font-bold border-r border-slate-300 whitespace-nowrap select-none ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    } ${col.thClass || ''}`}
                  >
                    <div
                      className={`flex items-center gap-1 ${
                        col.align === 'right' ? 'justify-end' : 'justify-between'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-0.5 hover:text-amber-800 cursor-pointer"
                        title={`Sort by ${col.label}`}
                      >
                        <span>{col.label}</span>
                        {isSorted ? (
                          sortConfig!.direction === 'asc' ? (
                            <ArrowUp className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                          ) : (
                            <ArrowDown className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => openColumnFilterPopover(col.key, e)}
                        className={`p-0.5 rounded transition-colors cursor-pointer shrink-0 ${
                          isFiltered
                            ? 'bg-amber-700 text-white hover:bg-amber-800'
                            : activeFilterMenu?.colKey === col.key
                            ? 'bg-slate-300 text-slate-900'
                            : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                        title={isFiltered ? `Filtered (${colFilters[col.key]!.length}) — Click to edit` : `Filter ${col.label}`}
                        aria-label={`Filter ${col.label}`}
                      >
                        <Filter className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColCount + 1} className="py-12 text-center text-slate-500">
                  <div className="space-y-2 max-w-md mx-auto">
                    <p className="text-sm font-semibold text-slate-800">No matching Merc Meeting records found</p>
                    <p className="text-xs text-slate-500">
                      Orders from Order Automation with Col AN = Open and Unit = CKU or WARP(UDHANA) appear here automatically, or you can add a manual order.
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        className="px-3 py-1.5 text-xs font-bold bg-amber-700 text-white rounded-md hover:bg-amber-800 cursor-pointer"
                      >
                        + Add Manual Order
                      </button>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-800 rounded-md hover:bg-slate-200 cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => {
                const globalIndex = pageSize === 0 ? idx + 1 : (safePage - 1) * pageSize + idx + 1;
                const merchDraftKey = `${row.mercKey}__merch`;
                const meetDraftKey = `${row.mercKey}__meet`;
                const dispDraftKey = `${row.mercKey}__disp`;
                const merchVal = inlineDrafts[merchDraftKey] ?? row.merchantRemark;
                const meetVal = inlineDrafts[meetDraftKey] ?? row.meetingUpdate;
                const hasDispDraft = dispDraftKey in inlineDrafts;
                const dispInputVal = hasDispDraft
                  ? inlineDrafts[dispDraftKey]
                  : row.dispatchQty === 0
                  ? ''
                  : String(row.dispatchQty);
                const liveDispNum = hasDispDraft
                  ? inlineDrafts[dispDraftKey].trim() === ''
                    ? 0
                    : Number(inlineDrafts[dispDraftKey]) || 0
                  : row.dispatchQty;
                const liveBalanceNum = hasDispDraft
                  ? Number((row.totalQty - liveDispNum).toFixed(4))
                  : row.balanceQty;
                const qtyUnitMatch = (row.totalQtyText || '').match(/[a-zA-Z]+$/);
                const balUnitSuffix = qtyUnitMatch ? ` ${qtyUnitMatch[0]}` : '';
                const liveBalanceDisplay = hasDispDraft
                  ? `${liveBalanceNum.toLocaleString()}${balUnitSuffix}`
                  : row.balanceQtyText || row.balanceQty.toLocaleString();

                const latestMerch =
                  row.merchantRemarkHistory.length > 0
                    ? row.merchantRemarkHistory[row.merchantRemarkHistory.length - 1]
                    : null;
                const latestMeet =
                  row.meetingUpdateHistory.length > 0
                    ? row.meetingUpdateHistory[row.meetingUpdateHistory.length - 1]
                    : null;

                const isThursdayUnique = row.source === 'thursday_sheet';

                return (
                  <tr
                    key={row.mercKey}
                    className={`transition-colors ${
                      isThursdayUnique
                        ? 'bg-[#FEFCE8] hover:bg-[#FEF9C3]/80'
                        : row.source === 'manual'
                        ? 'bg-amber-50/20 hover:bg-amber-50/40'
                        : 'bg-white hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="px-1 py-1 text-center font-mono tabular-nums text-slate-500 border-r border-slate-200 w-7">
                      {globalIndex}
                    </td>

                    {visibleCols.unit && (
                      <td
                        className="px-1.5 py-1 border-r border-slate-200 whitespace-nowrap text-slate-700 max-w-[92px] truncate"
                        title={`${row.unit || '—'} · ${isThursdayUnique ? 'Thursday Sheet' : row.source === 'manual' ? 'Manual' : 'Auto'}`}
                      >
                        <span className="font-semibold text-slate-900">{row.unit || '—'}</span>
                        <span aria-hidden="true" className="mx-0.5 text-slate-400">·</span>
                        <span
                          className={
                            isThursdayUnique
                              ? 'text-amber-800 font-semibold'
                              : row.source === 'manual'
                              ? 'text-amber-700 font-semibold'
                              : 'text-slate-500'
                          }
                        >
                          {isThursdayUnique ? 'Sheet' : row.source === 'manual' ? 'Man' : 'Auto'}
                        </span>
                      </td>
                    )}

                    {visibleCols.orderDate && (
                      <td className="px-1.5 py-1 border-r border-slate-200 whitespace-nowrap font-mono tabular-nums text-slate-700 max-w-[78px] truncate" title={row.orderDate}>
                        {row.orderDate || '—'}
                      </td>
                    )}

                    {visibleCols.orderNo && (
                      <td className="px-1.5 py-1 border-r border-slate-200 whitespace-nowrap font-mono font-semibold text-slate-900 max-w-[112px] truncate" title={row.orderNo}>
                        {row.orderNo || '—'}
                      </td>
                    )}

                    {visibleCols.customerName && (
                      <td className="px-1.5 py-1 border-r border-slate-200 font-medium text-slate-900 max-w-[140px] truncate" title={row.customerName}>
                        {row.customerName || '—'}
                      </td>
                    )}

                    {visibleCols.designNo && (
                      <td className="px-1.5 py-1 border-r border-slate-200 text-slate-800 max-w-[108px] truncate" title={row.designNo}>
                        {row.designNo || '—'}
                      </td>
                    )}

                    {visibleCols.color && (
                      <td className="px-1.5 py-1 border-r border-slate-200 whitespace-nowrap text-slate-700 max-w-[88px] truncate" title={row.color}>
                        {row.color || '—'}
                      </td>
                    )}

                    {visibleCols.totalQty && (
                      <td className="px-1.5 py-1 border-r border-slate-200 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {row.totalQtyText || row.totalQty.toLocaleString()}
                      </td>
                    )}

                    {visibleCols.rate && (
                      <td className="px-1.5 py-1 border-r border-slate-200 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {row.rateText || row.rate.toLocaleString()}
                      </td>
                    )}

                    {visibleCols.dispatchCommitted && (
                      <td className="px-1.5 py-1 border-r border-slate-200 whitespace-nowrap font-mono tabular-nums text-slate-700 max-w-[78px] truncate" title={row.dispatchCommitted}>
                        {row.dispatchCommitted || '—'}
                      </td>
                    )}

                    {visibleCols.dispatchQty && (
                      <td
                        className={`px-1 py-0.5 border-r border-slate-200 text-right font-mono tabular-nums whitespace-nowrap ${
                          isThursdayUnique ? 'bg-[#FEFCE8]' : 'bg-amber-50/35'
                        }`}
                      >
                        <input
                          type="number"
                          step="any"
                          value={dispInputVal}
                          placeholder="0"
                          aria-label="Edit Dispatch Qty"
                          title={
                            row.dispatchQtyText
                              ? `Sheet value: ${row.dispatchQtyText} — Edit to auto-update Balance Qty (K - Y)`
                              : 'Edit Dispatch Qty (Y) — auto-updates Balance Qty (Z = K - Y)'
                          }
                          onChange={(e) => {
                            const nextStr = e.target.value;
                            setInlineDrafts(prev => ({ ...prev, [dispDraftKey]: nextStr }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            } else if (e.key === 'Escape') {
                              setInlineDrafts(prev => {
                                const copy = { ...prev };
                                delete copy[dispDraftKey];
                                return copy;
                              });
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          onBlur={() => {
                            if (!(dispDraftKey in inlineDrafts)) return;
                            const rawStr = inlineDrafts[dispDraftKey].trim();
                            const nextNum = rawStr === '' ? 0 : Number(rawStr);
                            setInlineDrafts(prev => {
                              const copy = { ...prev };
                              delete copy[dispDraftKey];
                              return copy;
                            });
                            if (Number.isFinite(nextNum) && nextNum !== row.dispatchQty) {
                              onUpdateDispatchQty(row, nextNum);
                            }
                          }}
                          className="w-16 px-1 py-0.5 text-right font-mono text-[10.5px] font-bold text-amber-950 bg-white border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </td>
                    )}

                    {visibleCols.balanceQty && (
                      <td
                        className={`px-1.5 py-1 border-r border-slate-200 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                          liveBalanceNum > 0 ? 'text-rose-700' : 'text-emerald-700'
                        } ${isThursdayUnique ? 'bg-[#FEFCE8]' : 'bg-emerald-50/25'}`}
                        title={`Balance Qty (Z) = Total Qty (${row.totalQty}) - Dispatch Qty (${liveDispNum})`}
                      >
                        {liveBalanceDisplay}
                      </td>
                    )}

                    {/* Merchant Remark + "+" Log Card Button */}
                    {visibleCols.merchantRemark && (
                      <td
                        className={`px-1 py-0.5 border-r border-slate-200 ${
                          isThursdayUnique ? 'bg-[#FEFCE8]' : 'bg-amber-50/25'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={merchVal}
                            onChange={(e) =>
                              setInlineDrafts(prev => ({ ...prev, [merchDraftKey]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            onBlur={() => {
                              const nextText = (inlineDrafts[merchDraftKey] ?? row.merchantRemark).trim();
                              if (nextText !== row.merchantRemark.trim()) {
                                onUpdateInlineRemark(
                                  row,
                                  'merchantRemark',
                                  nextText,
                                  editorName.trim() || 'User'
                                );
                              }
                              setInlineDrafts(prev => {
                                const copy = { ...prev };
                                delete copy[merchDraftKey];
                                return copy;
                              });
                            }}
                            placeholder="Remark..."
                            title={
                              latestMerch
                                ? `Last by ${latestMerch.editorName} (${latestMerch.timestamp}) — Click + for all ${row.merchantRemarkHistory.length} notes`
                                : 'Type remark or click + to add with Editor Name & Timestamp'
                            }
                            className="flex-1 min-w-[96px] max-w-[138px] px-1 py-0.5 text-[10.5px] bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => openRemarkCardModal(row, 'merchantRemark')}
                            className={`shrink-0 h-5 min-w-[20px] px-1 rounded border text-[9.5px] font-bold inline-flex items-center justify-center cursor-pointer transition-colors ${
                              row.merchantRemarkHistory.length > 0
                                ? 'bg-amber-700 text-white border-amber-800 hover:bg-amber-800'
                                : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                            }`}
                            title="Add Merchant Remark & View Timestamp + Editor Log"
                          >
                            {row.merchantRemarkHistory.length > 0
                              ? `+${row.merchantRemarkHistory.length}`
                              : '+'}
                          </button>
                        </div>
                        {latestMerch && (
                          <div className="text-[8.5px] text-slate-500 truncate mt-0.5 font-mono tabular-nums max-w-[155px]">
                            {latestMerch.editorName} · {latestMerch.timestamp}
                          </div>
                        )}
                      </td>
                    )}

                    {/* Meeting Update + "+" Log Card Button */}
                    {visibleCols.meetingUpdate && (
                      <td
                        className={`px-1 py-0.5 border-r border-slate-200 ${
                          isThursdayUnique ? 'bg-[#FEFCE8]' : 'bg-sky-50/25'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={meetVal}
                            onChange={(e) =>
                              setInlineDrafts(prev => ({ ...prev, [meetDraftKey]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            onBlur={() => {
                              const nextText = (inlineDrafts[meetDraftKey] ?? row.meetingUpdate).trim();
                              if (nextText !== row.meetingUpdate.trim()) {
                                onUpdateInlineRemark(
                                  row,
                                  'meetingUpdate',
                                  nextText,
                                  editorName.trim() || 'User'
                                );
                              }
                              setInlineDrafts(prev => {
                                const copy = { ...prev };
                                delete copy[meetDraftKey];
                                return copy;
                              });
                            }}
                            placeholder="Update..."
                            title={
                              latestMeet
                                ? `Last by ${latestMeet.editorName} (${latestMeet.timestamp}) — Click + for all ${row.meetingUpdateHistory.length} updates`
                                : 'Type update or click + to add with Editor Name & Timestamp'
                            }
                            className="flex-1 min-w-[96px] max-w-[138px] px-1 py-0.5 text-[10.5px] bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => openRemarkCardModal(row, 'meetingUpdate')}
                            className={`shrink-0 h-5 min-w-[20px] px-1 rounded border text-[9.5px] font-bold inline-flex items-center justify-center cursor-pointer transition-colors ${
                              row.meetingUpdateHistory.length > 0
                                ? 'bg-sky-700 text-white border-sky-800 hover:bg-sky-800'
                                : 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200'
                            }`}
                            title="Add Meeting Update & View Timestamp + Editor Log"
                          >
                            {row.meetingUpdateHistory.length > 0
                              ? `+${row.meetingUpdateHistory.length}`
                              : '+'}
                          </button>
                        </div>
                        {latestMeet && (
                          <div className="text-[8.5px] text-slate-500 truncate mt-0.5 font-mono tabular-nums max-w-[155px]">
                            {latestMeet.editorName} · {latestMeet.timestamp}
                          </div>
                        )}
                      </td>
                    )}

                    {/* Order Status (Pinned right for instant Open / Closed manual toggle) */}
                    {visibleCols.orderStatus && (
                      <td
                        className={`px-1.5 py-1 whitespace-nowrap sticky right-0 z-10 border-l border-slate-300 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)] ${
                          isThursdayUnique
                            ? 'bg-[#FEFCE8]'
                            : row.source === 'manual'
                            ? 'bg-amber-50'
                            : 'bg-white'
                        }`}
                      >
                        {row.source === 'manual' && row.manualOrderId ? (
                          <div className="flex items-center gap-1">
                            <select
                              aria-label="Manual Order Status"
                              value={row.orderStatus}
                              onChange={(e) => {
                                const nextStatus = e.target.value as 'Open' | 'Closed';
                                onUpdateManualOrderField(row.manualOrderId!, {
                                  orderStatus: nextStatus
                                });
                                triggerLocalNotice(
                                  nextStatus === 'Closed'
                                    ? 'Manual order marked Closed — view or reopen under "Closed Manual".'
                                    : 'Manual order reopened to "Open".'
                                );
                              }}
                              className={`px-1.5 py-0.5 text-[10.5px] font-bold rounded border focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer ${
                                row.orderStatus === 'Closed'
                                  ? 'bg-slate-200 text-slate-800 border-slate-400'
                                  : 'bg-emerald-50 text-emerald-900 border-emerald-400'
                              }`}
                            >
                              <option value="Open">Open</option>
                              <option value="Closed">Closed</option>
                            </select>
                            {confirmDeleteId === row.manualOrderId ? (
                              <div className="inline-flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteManualOrder(
                                      row.manualOrderId!,
                                      `${row.customerName} - ${row.designNo}`
                                    );
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-1 py-0.5 text-[9.5px] font-bold bg-rose-600 text-white rounded hover:bg-rose-700 cursor-pointer"
                                >
                                  Del
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-1 py-0.5 text-[9.5px] font-semibold bg-slate-200 text-slate-700 rounded hover:bg-slate-300 cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(row.manualOrderId!)}
                                className="p-0.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Delete manual entry"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : isThursdayUnique ? (
                          <div className="flex items-center gap-1">
                            <select
                              aria-label="Thursday Sheet Order Status"
                              value={row.orderStatus}
                              onChange={(e) => {
                                const nextStatus = e.target.value as 'Open' | 'Closed';
                                onUpdateRowStatus(row, nextStatus);
                                triggerLocalNotice(
                                  nextStatus === 'Closed'
                                    ? 'Thursday Sheet row marked Closed — view or reopen under "Closed Manual".'
                                    : 'Thursday Sheet row reopened to "Open".'
                                );
                              }}
                              className={`px-1.5 py-0.5 text-[10.5px] font-bold rounded border focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer ${
                                row.orderStatus === 'Closed'
                                  ? 'bg-slate-200 text-slate-800 border-slate-400'
                                  : 'bg-white text-amber-950 border-amber-400'
                              }`}
                            >
                              <option value="Open">Open</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </div>
                        ) : (
                          <div
                            className="text-[10.5px]"
                            title="This row will be removed automatically when Col AN is marked Closed in Order Automation"
                          >
                            <span className="font-bold text-emerald-700">Open</span>
                            <span aria-hidden="true" className="mx-0.5 text-slate-400">·</span>
                            <span className="text-slate-500 text-[9.5px]">Auto</span>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-3 py-2 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-semibold cursor-pointer"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
            <option value={0}>All ({filteredRows.length})</option>
          </select>
        </div>

        {pageSize > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 inline-flex items-center gap-0.5 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="px-2 font-mono tabular-nums font-semibold">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 inline-flex items-center gap-0.5 cursor-pointer"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* MODAL 1: "+" Multi-User Remark & Meeting Log Card */}
      {remarkCard && activeCardRow && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setRemarkCard(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <MessageSquarePlus className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Remark &amp; Meeting History Card</span>
                </div>
                <p className="text-[11px] text-slate-300 truncate mt-0.5">
                  {activeCardRow.orderNo || 'No Order No'} · {activeCardRow.customerName} · {activeCardRow.designNo} ({activeCardRow.color})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRemarkCard(null)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Switch between Merchant Remark & Meeting Update */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRemarkCard({ ...remarkCard, field: 'merchantRemark' })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    remarkCard.field === 'merchantRemark'
                      ? 'bg-white text-amber-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Merchant Remark ({activeCardRow.merchantRemarkHistory.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRemarkCard({ ...remarkCard, field: 'meetingUpdate' })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    remarkCard.field === 'meetingUpdate'
                      ? 'bg-white text-sky-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Meeting Update ({activeCardRow.meetingUpdateHistory.length})
                </button>
              </div>

              {/* Add New Entry Form */}
              <form onSubmit={handleSaveCardNote} className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Editor Name *
                    </label>
                    <input
                      type="text"
                      value={cardEditorInput}
                      onChange={(e) => setCardEditorInput(e.target.value)}
                      placeholder="e.g. Tushar / Vinay / Lalit"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={cardDateInput}
                      onChange={(e) => setCardDateInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      {remarkCard.field === 'merchantRemark' ? 'New Merchant Remark' : 'New Meeting Update'}
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono tabular-nums inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatMercTimestampNow()}
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={cardTextInput}
                    onChange={(e) => setCardTextInput(e.target.value)}
                    placeholder={
                      remarkCard.field === 'merchantRemark'
                        ? 'Merchant remark ...'
                        : 'Meeting update / discussion notes...'
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white rounded-md cursor-pointer"
                  >
                    + Save Entry with Timestamp
                  </button>
                </div>
              </form>

              {/* Saved History Log */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Saved History (Newest First)
                </h4>
                {(() => {
                  const list =
                    remarkCard.field === 'merchantRemark'
                      ? activeCardRow.merchantRemarkHistory
                      : activeCardRow.meetingUpdateHistory;
                  if (list.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-300 rounded-lg">
                        Write Remark.
                      </p>
                    );
                  }
                  return (
                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg bg-white">
                      {[...list].reverse().map((entry, idx) => (
                        <div key={entry.id} className="p-2.5 flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                              <span className="font-bold text-slate-900">{entry.editorName}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">{entry.date}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums text-slate-500">{entry.timestamp}</span>
                              {idx === 0 && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-emerald-700 font-semibold">Current</span>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-slate-900 whitespace-pre-wrap break-words">
                              {entry.text}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onDeleteRemarkHistoryEntry(activeCardRow, remarkCard.field, entry.id)
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer shrink-0"
                            title="Delete this entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Manual Order in Merc Meetings */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden text-xs my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Add Manual Order in Merc Meetings</h3>
                <p className="text-[11px] text-slate-300">
                  Manually add and manage status for orders not listed in Order Automation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitManualOrder} className="p-5 space-y-3.5">
              {manFormError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-md font-medium">
                  {manFormError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Order Date (E)</label>
                  <input
                    type="date"
                    value={manOrderDate}
                    onChange={(e) => setManOrderDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Order Number (X)</label>
                  <input
                    type="text"
                    value={manOrderNo}
                    onChange={(e) => setManOrderNo(e.target.value)}
                    placeholder="e.g. DLFSO2526-01800"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit (F)</label>
                  <select
                    value={manUnit}
                    onChange={(e) => setManUnit(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="CKU">CKU</option>
                    <option value="WARP(UDHANA)">WARP(UDHANA)</option>
                    <option value="__OTHER__">Other Unit...</option>
                  </select>
                </div>
              </div>

              {manUnit === '__OTHER__' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custom Unit Name</label>
                  <input
                    type="text"
                    value={manCustomUnit}
                    onChange={(e) => setManCustomUnit(e.target.value)}
                    placeholder="Enter Unit name"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer Name (C) *</label>
                  <input
                    type="text"
                    value={manCustomerName}
                    onChange={(e) => setManCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Design No (G) *</label>
                  <input
                    type="text"
                    value={manDesignNo}
                    onChange={(e) => setManDesignNo(e.target.value)}
                    placeholder="Design / Item Name"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Color (H)</label>
                  <input
                    type="text"
                    value={manColor}
                    onChange={(e) => setManColor(e.target.value)}
                    placeholder="Color"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Qnt (K)</label>
                  <input
                    type="number"
                    step="any"
                    value={manTotalQty}
                    onChange={(e) => setManTotalQty(e.target.value)}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rate (L)</label>
                  <input
                    type="number"
                    step="any"
                    value={manRate}
                    onChange={(e) => setManRate(e.target.value)}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dispatch Commited (N)</label>
                  <input
                    type="date"
                    value={toInputDateVal(manDispatchCommitted)}
                    onChange={(e) => setManDispatchCommitted(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dispatch Qnt (Y)</label>
                  <input
                    type="number"
                    step="any"
                    value={manDispatchQty}
                    onChange={(e) => setManDispatchQty(e.target.value)}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Balance Qnt (Z)</label>
                  <input
                    type="number"
                    step="any"
                    value={draftBalancePreview}
                    onChange={(e) => setManBalanceOverride(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Order Status</label>
                  <select
                    value={manOrderStatus}
                    onChange={(e) => setManOrderStatus(e.target.value as 'Open' | 'Closed')}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-bold"
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Merchant Remark</label>
                  <input
                    type="text"
                    value={manMerchantRemark}
                    onChange={(e) => setManMerchantRemark(e.target.value)}
                    placeholder="Initial merchant remark..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Meeting Update</label>
                  <input
                    type="text"
                    value={manMeetingUpdate}
                    onChange={(e) => setManMeetingUpdate(e.target.value)}
                    placeholder="Initial meeting update..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Editor: <strong className="text-slate-800">{editorName.trim() || 'User'}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 font-bold bg-amber-700 hover:bg-amber-800 text-white rounded-md cursor-pointer"
                  >
                    Save Manual Order
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* POPOVER: Column Header Filter (Google Sheets Style) */}
      {activeFilterMenu && (() => {
        const colDef = MERC_COLUMNS.find(c => c.key === activeFilterMenu.colKey);
        const searchLower = filterSearch.trim().toLowerCase();
        const visibleOpts = searchLower
          ? activeFilterOptions.filter(o => o.value.toLowerCase().includes(searchLower))
          : activeFilterOptions;
        const allValuesSet = new Set(activeFilterOptions.map(o => o.value));
        const effectiveSelected = draftSelectedVals ?? allValuesSet;

        return (
          <div
            className="fixed inset-0 z-50"
            onClick={() => setActiveFilterMenu(null)}
          >
            <div
              className="fixed w-[260px] bg-white rounded-lg shadow-xl border border-slate-300 text-xs overflow-hidden"
              style={{ top: activeFilterMenu.top, left: activeFilterMenu.left }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-3 py-2 bg-slate-900 text-white flex items-center justify-between">
                <span className="font-bold truncate">{colDef?.label}</span>
                <button
                  type="button"
                  onClick={() => setActiveFilterMenu(null)}
                  className="p-0.5 text-slate-400 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sort Actions */}
              <div className="p-2 border-b border-slate-200 grid grid-cols-2 gap-1.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => {
                    setSortConfig({ key: activeFilterMenu.colKey, direction: 'asc' });
                    setActiveFilterMenu(null);
                  }}
                  className={`px-2 py-1 text-[11px] font-semibold rounded border inline-flex items-center justify-center gap-1 cursor-pointer ${
                    sortConfig?.key === activeFilterMenu.colKey && sortConfig.direction === 'asc'
                      ? 'bg-amber-700 text-white border-amber-800'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <ArrowUp className="w-3 h-3" />
                  <span>{colDef?.numeric ? 'Low → High' : 'Sort A → Z'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortConfig({ key: activeFilterMenu.colKey, direction: 'desc' });
                    setActiveFilterMenu(null);
                  }}
                  className={`px-2 py-1 text-[11px] font-semibold rounded border inline-flex items-center justify-center gap-1 cursor-pointer ${
                    sortConfig?.key === activeFilterMenu.colKey && sortConfig.direction === 'desc'
                      ? 'bg-amber-700 text-white border-amber-800'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <ArrowDown className="w-3 h-3" />
                  <span>{colDef?.numeric ? 'High → Low' : 'Sort Z → A'}</span>
                </button>
              </div>

              {/* Value Search + Select All / Clear */}
              <div className="p-2 space-y-2">
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Search values..."
                    className="w-full pl-6 pr-2 py-1 text-[11px] bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(effectiveSelected);
                        visibleOpts.forEach(o => next.add(o.value));
                        setDraftSelectedVals(next);
                      }}
                      className="font-semibold text-amber-800 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(effectiveSelected);
                        visibleOpts.forEach(o => next.delete(o.value));
                        setDraftSelectedVals(next);
                      }}
                      className="font-semibold text-slate-600 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <span className="font-mono tabular-nums text-[10px] text-slate-500">
                    {effectiveSelected.size}/{activeFilterOptions.length}
                  </span>
                </div>

                {/* Checkbox List */}
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded divide-y divide-slate-100">
                  {visibleOpts.length === 0 ? (
                    <div className="p-3 text-center text-[11px] text-slate-400">
                      No matching values
                    </div>
                  ) : (
                    visibleOpts.map((opt) => {
                      const checked = effectiveSelected.has(opt.value);
                      return (
                        <label
                          key={opt.value}
                          className="px-2 py-1.5 flex items-center justify-between gap-2 hover:bg-amber-50/50 cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = new Set(effectiveSelected);
                                if (checked) next.delete(opt.value);
                                else next.add(opt.value);
                                setDraftSelectedVals(next);
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-amber-700 focus:ring-amber-500 shrink-0 cursor-pointer"
                            />
                            <span className="truncate text-[11px] text-slate-800" title={opt.value}>
                              {opt.value}
                            </span>
                          </div>
                          <span className="font-mono tabular-nums text-[10px] text-slate-400 shrink-0">
                            {opt.count}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-2.5 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => clearSingleColumnFilter(activeFilterMenu.colKey)}
                  className="text-[11px] font-semibold text-rose-700 hover:underline cursor-pointer"
                >
                  Clear Filter
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveFilterMenu(null)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyActiveColumnFilter}
                    className="px-3 py-1 text-[11px] font-bold bg-amber-700 hover:bg-amber-800 text-white rounded cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 3: Column Visibility Manager (Hide / Show Columns) */}
      {showColManager && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setShowColManager(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Columns className="w-4 h-4 text-amber-400" />
                <span>Hide / Show Columns</span>
              </div>
              <button
                type="button"
                onClick={() => setShowColManager(false)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600">
                  {visibleColCount} of {MERC_COLUMNS.length} columns visible
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibleCols({ ...DEFAULT_VISIBLE_COLS })}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 rounded hover:bg-amber-100 cursor-pointer"
                  >
                    Show All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-80 overflow-y-auto pr-0.5">
                {MERC_COLUMNS.map((col) => {
                  const isVisible = !!visibleCols[col.key];
                  const isOnlyOneLeft = isVisible && visibleColCount <= 1;
                  return (
                    <label
                      key={col.key}
                      className={`px-2.5 py-2 rounded-md border flex items-center justify-between gap-2 transition-colors ${
                        isOnlyOneLeft ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        isVisible
                          ? 'bg-amber-50/50 border-amber-200 text-slate-900'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          disabled={isOnlyOneLeft}
                          onChange={() => {
                            if (isOnlyOneLeft) return;
                            setVisibleCols(prev => ({
                              ...prev,
                              [col.key]: !prev[col.key]
                            }));
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-amber-700 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className="font-semibold truncate text-[11px]">{col.label}</span>
                      </div>
                      {isVisible ? (
                        <Eye className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </label>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowColManager(false)}
                  className="px-4 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-md cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Connect Private Google Sheet ("Thursday Meeting for circular.") */}
      {showThursdaySyncModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowThursdaySyncModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden text-xs my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">Connect "Thursday Meeting for circular." Sheet Tab</h3>
                  <p className="text-[11px] text-slate-300">
                    Sheet ID: 1Wdu7PtyAEEnOY3R3OgvNM-Hnu9LnTnw1WKJQf06z-Qo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowThursdaySyncModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
              <p className="text-slate-700 leading-relaxed">
                Google Sheet <span className="font-mono font-semibold text-slate-900">1Wdu7PtyAEEnOY3R3OgvNM-Hnu9LnTnw1WKJQf06z-Qo</span> is currently private (requires access). Use either option below to load unique rows from <strong>"Thursday Meeting for circular."</strong> in silent yellow while skipping all duplicates:
              </p>

              <div className="p-3.5 rounded-lg border border-amber-200 bg-[#FEFCE8] space-y-1.5">
                <div className="font-bold text-slate-900">Option 1 (Fastest — No Script Required)</div>
                <p className="text-slate-700">
                  Open the Google Sheet → Click <strong>Share</strong> → Change General access to <strong>Anyone with the link (Viewer)</strong> → Click <strong>Sync Cloud</strong> here.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900">
                    Option 2 (Keep Sheet Private via Apps Script)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(THURSDAY_SYNC_APPS_SCRIPT).catch(() => {});
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2500);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded cursor-pointer"
                  >
                    {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedScript ? 'Copied!' : 'Copy Apps Script'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-600">
                  In the same Google Sheet, open <strong>Extensions → Apps Script</strong>, add a new script file (e.g. <span className="font-mono">ThursdaySync.gs</span>), paste this code, save, and run <strong>syncThursdayMeetingToFirebase</strong> (plus add a 5-min trigger if you want auto-updates). Then click <strong>Sync Cloud</strong>.
                </p>
                <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg text-[10px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                  {THURSDAY_SYNC_APPS_SCRIPT}
                </pre>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowThursdaySyncModal(false);
                    onSyncCloud();
                  }}
                  className="px-3.5 py-1.5 font-bold bg-amber-700 hover:bg-amber-800 text-white rounded-md cursor-pointer"
                >
                  Sync Cloud Now
                </button>
                <button
                  type="button"
                  onClick={() => setShowThursdaySyncModal(false)}
                  className="px-3.5 py-1.5 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
