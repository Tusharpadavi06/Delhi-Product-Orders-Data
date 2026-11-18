import { GroupedOrder } from '../types/fms';

export const TNA_SPREADSHEET_ID = '1Wdu7PtyAEEnOY3R3OgvNM-Hnu9LnTnw1WKJQf06z-Qo';
export const TNA_TAB_NAME = 'T&A Order Master';
export const DEFAULT_TNA_WEBAPP_URL =
  'https://script.google.com/macros/s/AKfycbzjIT-AKwl9xx_4VZVE2dHuhuR8QTWfdlnBXaAVGxG0MLHCwB1B8IwXThFSVpbePY4-fA/exec';

export interface TnaDateHistoryEntry {
  id: string;
  date: string;       // DD/MM/YYYY
  remark: string;
  stepLabel?: string;
  createdAt: string;  // ISO timestamp
}

export interface TnaManualEntry {
  labdipCommittedDate: string;       // Col L
  labdipActualDate: string;          // Col M
  labdipRejectionDate: string;       // Col N
  labdipApprovalDate: string;        // Col O
  fobCommittedDate: string;          // Col Q
  fobActualDate: string;             // Col R
  fobRejectionDate: string;          // Col S
  fobApprovalDate: string;           // Col T
  actualDispatchDate: string;        // Col V
  totalDispatchedQty: string;        // Col W
  pendingQty: string;                // Col X
  committedBalanceDate: string;      // Col Y
  actualBalanceDispatchDate: string; // Col Z
  balanceDispatchQty: string;        // Col AA
  orderRemarks: string;              // Col AB
  labdipRejectionHistory?: TnaDateHistoryEntry[];
  fobRejectionHistory?: TnaDateHistoryEntry[];
  stepDateHistory?: Record<string, TnaDateHistoryEntry[]>;
  updatedAt?: string;
}

export type TnaStageStatus = 'Balance Fabric' | 'Dispatch' | 'FOB' | 'Labdip' | '';

export interface TnaRowItem {
  tnaKey: string;
  altKey: string;
  orderKey: string;
  orderDate: string;      // Col A <- Automation Col E
  orderNo: string;        // Col B <- Automation Col X
  customerName: string;   // Col C <- Automation Col C
  itemName: string;       // Col D <- Automation Col G
  color: string;          // Col E <- Automation Col H
  width: string;          // Col F <- Automation Col I
  unit: string;           // Col G <- Automation Col F
  qty: number;            // Col H <- Automation Col K
  unitOfItem: string;     // Col I <- Automation Col J
  deliveryDate: string;   // Col J <- Automation Col N
  orderStatus: TnaStageStatus; // Col K (=LET formula)
  manual: TnaManualEntry;
  labdipDelayDays: number | null;  // Col P (M - O)
  fobDelayDays: number | null;     // Col U (R - T)
  balanceDelayDays: number | null; // Col AC (Y - Z)
}

export function emptyTnaManual(): TnaManualEntry {
  return {
    labdipCommittedDate: '',
    labdipActualDate: '',
    labdipRejectionDate: '',
    labdipApprovalDate: '',
    fobCommittedDate: '',
    fobActualDate: '',
    fobRejectionDate: '',
    fobApprovalDate: '',
    actualDispatchDate: '',
    totalDispatchedQty: '',
    pendingQty: '',
    committedBalanceDate: '',
    actualBalanceDispatchDate: '',
    balanceDispatchQty: '',
    orderRemarks: '',
    labdipRejectionHistory: [],
    fobRejectionHistory: [],
    stepDateHistory: {},
    updatedAt: ''
  };
}

export function sanitizeTnaPart(val?: string | number): string {
  return String(val ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.#$/[\]\s]+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
}

/** Ensures any full TNA key is 100% valid as a Firebase RTDB object key (no '.', '#', '$', '/', '[', ']') */
export function toFirebaseSafeTnaKey(key: string): string {
  return String(key || 'tna_row')
    .replace(/[.#$/[\]]+/g, '_')
    .substring(0, 180);
}

function sanitizeTnaPartLegacy(val?: string | number): string {
  return String(val ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.#$/[\]\s]+/g, '_');
}

export function buildTnaAltKey(
  orderNo: string,
  customerName: string,
  itemName: string,
  color: string,
  width: string,
  qty: number | string
): string {
  return [
    sanitizeTnaPart(orderNo),
    sanitizeTnaPart(customerName),
    sanitizeTnaPart(itemName),
    sanitizeTnaPart(color),
    sanitizeTnaPart(width),
    String(Number(qty) || 0)
  ]
    .join('|')
    .substring(0, 170);
}

function buildTnaLegacyAltKey(
  orderNo: string,
  customerName: string,
  itemName: string,
  color: string,
  width: string,
  qty: number | string
): string {
  return [
    sanitizeTnaPartLegacy(orderNo),
    sanitizeTnaPartLegacy(customerName),
    sanitizeTnaPartLegacy(itemName),
    sanitizeTnaPartLegacy(color),
    sanitizeTnaPartLegacy(width),
    String(Number(qty) || 0)
  ]
    .join('|')
    .substring(0, 170);
}

function resolveTnaManualRecord(
  tnaRecordsMap: Record<string, TnaManualEntry>,
  tnaKey: string,
  altKey: string,
  occNum: number,
  orderNo: string,
  customerName: string,
  itemName: string,
  color: string,
  width: string,
  qty: number
): TnaManualEntry {
  const legacyAltKey = buildTnaLegacyAltKey(orderNo, customerName, itemName, color, width, qty);
  const legacyTnaKey = `${legacyAltKey}|_${occNum}`.substring(0, 180);
  const safeTnaKey = toFirebaseSafeTnaKey(tnaKey);
  const safeAltKey = toFirebaseSafeTnaKey(altKey);

  const rawCandidates = [
    tnaRecordsMap[tnaKey],
    tnaRecordsMap[altKey],
    safeTnaKey !== tnaKey ? tnaRecordsMap[safeTnaKey] : undefined,
    safeAltKey !== altKey ? tnaRecordsMap[safeAltKey] : undefined,
    legacyTnaKey !== tnaKey ? tnaRecordsMap[legacyTnaKey] : undefined,
    legacyAltKey !== altKey ? tnaRecordsMap[legacyAltKey] : undefined
  ];
  const seenRefs = new Set<TnaManualEntry>();
  const candidates: TnaManualEntry[] = [];
  rawCandidates.forEach(c => {
    if (c && typeof c === 'object' && !seenRefs.has(c)) {
      seenRefs.add(c);
      candidates.push(c);
    }
  });

  if (candidates.length === 0) return emptyTnaManual();
  if (candidates.length === 1) return normalizeTnaManual(candidates[0]);

  const sorted = [...candidates].sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  );
  const primary = normalizeTnaManual(sorted[0]);
  const secondary = normalizeTnaManual(sorted[1]);

  return {
    labdipCommittedDate: primary.labdipCommittedDate || secondary.labdipCommittedDate,
    labdipActualDate: primary.labdipActualDate || secondary.labdipActualDate,
    labdipRejectionDate: primary.labdipRejectionDate || secondary.labdipRejectionDate,
    labdipApprovalDate: primary.labdipApprovalDate || secondary.labdipApprovalDate,
    fobCommittedDate: primary.fobCommittedDate || secondary.fobCommittedDate,
    fobActualDate: primary.fobActualDate || secondary.fobActualDate,
    fobRejectionDate: primary.fobRejectionDate || secondary.fobRejectionDate,
    fobApprovalDate: primary.fobApprovalDate || secondary.fobApprovalDate,
    actualDispatchDate: primary.actualDispatchDate || secondary.actualDispatchDate,
    totalDispatchedQty: primary.totalDispatchedQty || secondary.totalDispatchedQty,
    pendingQty: primary.pendingQty || secondary.pendingQty,
    committedBalanceDate: primary.committedBalanceDate || secondary.committedBalanceDate,
    actualBalanceDispatchDate: primary.actualBalanceDispatchDate || secondary.actualBalanceDispatchDate,
    balanceDispatchQty: primary.balanceDispatchQty || secondary.balanceDispatchQty,
    orderRemarks: primary.orderRemarks || secondary.orderRemarks,
    labdipRejectionHistory:
      primary.labdipRejectionHistory && primary.labdipRejectionHistory.length > 0
        ? primary.labdipRejectionHistory
        : secondary.labdipRejectionHistory || [],
    fobRejectionHistory:
      primary.fobRejectionHistory && primary.fobRejectionHistory.length > 0
        ? primary.fobRejectionHistory
        : secondary.fobRejectionHistory || [],
    stepDateHistory:
      primary.stepDateHistory && Object.keys(primary.stepDateHistory).length > 0
        ? primary.stepDateHistory
        : secondary.stepDateHistory || {},
    updatedAt: primary.updatedAt || secondary.updatedAt || ''
  };
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

export function parseTnaDateParts(val?: string): { day: number; month: number; year: number } | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;

  // YYYY-MM-DD (or ISO)
  const iso = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (year >= 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { day, month, year };
    }
  }

  // DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { day, month, year };
    }
  }

  // DD-MMM-YYYY or DD MMM YYYY
  const dMonY = s.match(/^(\d{1,2})[\s\-\/]([a-zA-Z]+)[\s\-\/,]+(\d{2,4})/);
  if (dMonY) {
    const day = Number(dMonY[1]);
    const month = MONTH_MAP[dMonY[2].toLowerCase()];
    let year = Number(dMonY[3]);
    if (year < 100) year += 2000;
    if (month && day >= 1 && day <= 31) {
      return { day, month, year };
    }
  }

  return null;
}

export function parseTnaDateUtcMs(val?: string): number | null {
  const p = parseTnaDateParts(val);
  if (!p) return null;
  return Date.UTC(p.year, p.month - 1, p.day);
}

/** Converts any stored date string to YYYY-MM-DD for HTML <input type="date"> */
export function toHtmlDateInputValue(val?: string): string {
  const p = parseTnaDateParts(val);
  if (!p) return '';
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Converts HTML date input (YYYY-MM-DD) or raw date string to DD/MM/YYYY for consistent storage & Sheet formatting */
export function toTnaStorageDate(val?: string): string {
  if (!val) return '';
  const p = parseTnaDateParts(val);
  if (!p) return val.trim();
  return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${p.year}`;
}

/** Delay Days = startDate - endDate in days (e.g. M - O, R - T, Y - Z). Returns null if either is blank/invalid */
export function computeTnaDelayDays(firstDate?: string, secondDate?: string): number | null {
  const ms1 = parseTnaDateUtcMs(firstDate);
  const ms2 = parseTnaDateUtcMs(secondDate);
  if (ms1 === null || ms2 === null) return null;
  return Math.round((ms1 - ms2) / 86400000);
}

/**
 * Exact replica of Google Sheets =LET(...) formula for Column K (Order Status):
 * ok(c) => trimmed uppercase not in ["", "0", "-", "—", "N/A", "NA"]
 * Highest stage wins: Balance Fabric (X,Y,Z) > Dispatch (V,W) > FOB (Q,R,S,T) > Labdip (L,M,N,O) > ""
 */
export function isTnaCellPopulated(c?: string | number | null): boolean {
  const t = String(c ?? '').trim().toUpperCase();
  return t !== '' && t !== '0' && t !== '-' && t !== '—' && t !== 'N/A' && t !== 'NA';
}

export function computeTnaOrderStatus(m: TnaManualEntry): TnaStageStatus {
  // Stage Priority 1 (Highest): Balance Fabric -> Cols X (Pending Qty), Y (Committed Balance Date), Z (Actual Balance Dispatch Date)
  if (
    isTnaCellPopulated(m.pendingQty) ||
    isTnaCellPopulated(m.committedBalanceDate) ||
    isTnaCellPopulated(m.actualBalanceDispatchDate)
  ) {
    return 'Balance Fabric';
  }
  // Stage Priority 2: Dispatch -> Cols V (Actual Dispatch Date), W (Total Dispatched Qty)
  if (
    isTnaCellPopulated(m.actualDispatchDate) ||
    isTnaCellPopulated(m.totalDispatchedQty)
  ) {
    return 'Dispatch';
  }
  // Stage Priority 3: FOB -> Cols Q, R, S, T
  if (
    isTnaCellPopulated(m.fobCommittedDate) ||
    isTnaCellPopulated(m.fobActualDate) ||
    isTnaCellPopulated(m.fobRejectionDate) ||
    isTnaCellPopulated(m.fobApprovalDate)
  ) {
    return 'FOB';
  }
  // Stage Priority 4: Labdip -> Cols L, M, N, O
  if (
    isTnaCellPopulated(m.labdipCommittedDate) ||
    isTnaCellPopulated(m.labdipActualDate) ||
    isTnaCellPopulated(m.labdipRejectionDate) ||
    isTnaCellPopulated(m.labdipApprovalDate)
  ) {
    return 'Labdip';
  }
  return '';
}

function normalizeHistoryArray(arr: any): TnaDateHistoryEntry[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x) => x && typeof x === 'object' && String(x.date ?? '').trim() !== '')
    .map((x, idx) => ({
      id: String(x.id || `hist_${idx}_${Date.now()}`),
      date: toTnaStorageDate(String(x.date ?? '')) || String(x.date ?? '').trim(),
      remark: String(x.remark ?? ''),
      stepLabel: x.stepLabel ? String(x.stepLabel) : undefined,
      createdAt: String(x.createdAt || '')
    }));
}

export function normalizeTnaManual(raw?: Partial<TnaManualEntry> | null): TnaManualEntry {
  const base = emptyTnaManual();
  if (!raw || typeof raw !== 'object') return base;
  const rawStepHist: Record<string, TnaDateHistoryEntry[]> = {};
  if (raw.stepDateHistory && typeof raw.stepDateHistory === 'object') {
    Object.entries(raw.stepDateHistory).forEach(([k, v]) => {
      const cleaned = normalizeHistoryArray(v);
      if (cleaned.length > 0) rawStepHist[k] = cleaned;
    });
  }
  return {
    labdipCommittedDate: String(raw.labdipCommittedDate ?? ''),
    labdipActualDate: String(raw.labdipActualDate ?? ''),
    labdipRejectionDate: String(raw.labdipRejectionDate ?? ''),
    labdipApprovalDate: String(raw.labdipApprovalDate ?? ''),
    fobCommittedDate: String(raw.fobCommittedDate ?? ''),
    fobActualDate: String(raw.fobActualDate ?? ''),
    fobRejectionDate: String(raw.fobRejectionDate ?? ''),
    fobApprovalDate: String(raw.fobApprovalDate ?? ''),
    actualDispatchDate: String(raw.actualDispatchDate ?? ''),
    totalDispatchedQty: String(raw.totalDispatchedQty ?? ''),
    pendingQty: String(raw.pendingQty ?? ''),
    committedBalanceDate: String(raw.committedBalanceDate ?? ''),
    actualBalanceDispatchDate: String(raw.actualBalanceDispatchDate ?? ''),
    balanceDispatchQty: String(raw.balanceDispatchQty ?? ''),
    orderRemarks: String(raw.orderRemarks ?? ''),
    labdipRejectionHistory: normalizeHistoryArray(raw.labdipRejectionHistory),
    fobRejectionHistory: normalizeHistoryArray(raw.fobRejectionHistory),
    stepDateHistory: rawStepHist,
    updatedAt: String(raw.updatedAt ?? '')
  };
}

export function buildAllTnaRowsLookup(
  groupedOrders: GroupedOrder[],
  tnaRecordsMap: Record<string, TnaManualEntry>
): Map<string, TnaRowItem> {
  const map = new Map<string, TnaRowItem>();
  const occ: Record<string, number> = {};

  groupedOrders.forEach(order => {
    const orderDate = toTnaStorageDate(order.orderDate || '') || (order.orderDate || '').trim();
    const orderNo = (order.orderNo || '').trim();
    const customerName = (order.customerName || '').trim();

    order.items.forEach(item => {
      const itemName = (item.itemName || '').trim();
      if (itemName === '') return;

      const color = (item.color || '').trim();
      const width = (item.width || '').trim();
      const unit = (item.unit || '').trim();
      const qty = Number(item.qty) || 0;
      const unitOfItem = (item.unitOfItem || '').trim();
      const deliveryDate = toTnaStorageDate(item.deliveryDate || '') || (item.deliveryDate || '').trim();

      const altKey = buildTnaAltKey(orderNo, customerName, itemName, color, width, qty);
      occ[altKey] = (occ[altKey] || 0) + 1;
      const tnaKey = `${altKey}|_${occ[altKey]}`.substring(0, 180);

      const manual = resolveTnaManualRecord(
        tnaRecordsMap,
        tnaKey,
        altKey,
        occ[altKey],
        orderNo,
        customerName,
        itemName,
        color,
        width,
        qty
      );

      const rowObj: TnaRowItem = {
        tnaKey,
        altKey,
        orderKey: order.orderKey,
        orderDate,
        orderNo,
        customerName,
        itemName,
        color,
        width,
        unit,
        qty,
        unitOfItem,
        deliveryDate,
        orderStatus: computeTnaOrderStatus(manual),
        manual,
        labdipDelayDays: computeTnaDelayDays(manual.labdipActualDate, manual.labdipApprovalDate),
        fobDelayDays: computeTnaDelayDays(manual.fobActualDate, manual.fobApprovalDate),
        balanceDelayDays: computeTnaDelayDays(manual.committedBalanceDate, manual.actualBalanceDispatchDate)
      };
      map.set(tnaKey, rowObj);
      if (!map.has(altKey)) map.set(altKey, rowObj);
    });
  });

  return map;
}

export function buildOpenTnaRows(
  groupedOrders: GroupedOrder[],
  tnaRecordsMap: Record<string, TnaManualEntry>
): TnaRowItem[] {
  const rows: TnaRowItem[] = [];
  const occurrenceCounter: Record<string, number> = {};

  groupedOrders.forEach(order => {
    // Carried forward per order block
    const orderDate = toTnaStorageDate(order.orderDate || '') || (order.orderDate || '').trim();
    const orderNo = (order.orderNo || '').trim();
    const customerName = (order.customerName || '').trim();

    order.items.forEach(item => {
      // Strictly include ONLY rows whose Col AN status is "Open" AND Item Name (Col G) is non-blank
      const itemStatus = item.statusAN || 'Open';
      const itemName = (item.itemName || '').trim();
      if (itemStatus !== 'Open' || itemName === '') return;

      const color = (item.color || '').trim();
      const width = (item.width || '').trim();
      const unit = (item.unit || '').trim();
      const qty = Number(item.qty) || 0;
      const unitOfItem = (item.unitOfItem || '').trim();
      const deliveryDate = toTnaStorageDate(item.deliveryDate || '') || (item.deliveryDate || '').trim();

      const altKey = buildTnaAltKey(orderNo, customerName, itemName, color, width, qty);
      occurrenceCounter[altKey] = (occurrenceCounter[altKey] || 0) + 1;
      const tnaKey = `${altKey}|_${occurrenceCounter[altKey]}`.substring(0, 180);

      const manual = resolveTnaManualRecord(
        tnaRecordsMap,
        tnaKey,
        altKey,
        occurrenceCounter[altKey],
        orderNo,
        customerName,
        itemName,
        color,
        width,
        qty
      );

      rows.push({
        tnaKey,
        altKey,
        orderKey: order.orderKey,
        orderDate,
        orderNo,
        customerName,
        itemName,
        color,
        width,
        unit,
        qty,
        unitOfItem,
        deliveryDate,
        orderStatus: computeTnaOrderStatus(manual),
        manual,
        labdipDelayDays: computeTnaDelayDays(manual.labdipActualDate, manual.labdipApprovalDate),
        fobDelayDays: computeTnaDelayDays(manual.fobActualDate, manual.fobApprovalDate),
        balanceDelayDays: computeTnaDelayDays(manual.committedBalanceDate, manual.actualBalanceDispatchDate)
      });
    });
  });

  return rows;
}
