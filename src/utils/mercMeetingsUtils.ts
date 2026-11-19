import { GroupedOrder } from '../types/fms';
import { parseTnaDateParts, toTnaStorageDate } from './tnaUtils';

export const MERC_THURSDAY_SPREADSHEET_ID = '1Wdu7PtyAEEnOY3R3OgvNM-Hnu9LnTnw1WKJQf06z-Qo';
export const MERC_THURSDAY_TAB_NAMES = [
  'Thursday Meeting for circular.',
  'Thursday Meeting for Circular.',
  'Thursday Meeting for circular',
  'Thursday Meeting for Circular'
];

export interface MercRemarkEntry {
  id: string;
  text: string;
  date: string;       // DD/MM/YYYY
  timestamp: string;  // DD/MM/YYYY hh:mm:ss AM/PM
  editorName: string;
  createdAt: string;  // ISO string
}

export interface MercMeetingManualData {
  merchantRemark: string;
  meetingUpdate: string;
  merchantRemarkHistory: MercRemarkEntry[];
  meetingUpdateHistory: MercRemarkEntry[];
  orderStatusOverride?: 'Open' | 'Closed';
  dispatchQtyOverride?: number;
  updatedAt?: string;
}

export interface MercManualOrder {
  id: string;
  orderDate: string;
  orderNo: string;
  customerName: string;
  designNo: string;
  color: string;
  totalQty: number;
  rate: number;
  dispatchCommitted: string;
  dispatchQty: number;
  balanceQty: number;
  unit: string;
  merchantRemark: string;
  meetingUpdate: string;
  merchantRemarkHistory: MercRemarkEntry[];
  meetingUpdateHistory: MercRemarkEntry[];
  orderStatus: 'Open' | 'Closed';
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MercThursdaySheetRow {
  rowIndex?: number;
  orderDate: string;
  orderNo: string;
  customerName: string;
  designNo: string;
  color: string;
  totalQty: number;
  totalQtyText?: string;
  rate: number;
  rateText?: string;
  dispatchCommitted: string;
  dispatchQty: number;
  dispatchQtyText?: string;
  balanceQty: number;
  balanceQtyText?: string;
  merchantRemark: string;
  meetingUpdate: string;
  orderStatus: 'Open' | 'Closed';
  unit?: string;
}

export interface MercMeetingRow {
  mercKey: string;
  source: 'automation' | 'manual' | 'thursday_sheet';
  manualOrderId?: string;
  automationOrderKey?: string;
  automationItemId?: string;
  automationItemWidth?: string;
  orderDate: string;
  orderNo: string;
  customerName: string;
  designNo: string;
  color: string;
  totalQty: number;
  totalQtyText?: string;
  rate: number;
  rateText?: string;
  dispatchCommitted: string;
  dispatchQty: number;
  dispatchQtyText?: string;
  balanceQty: number;
  balanceQtyText?: string;
  unit: string;
  merchantRemark: string;
  meetingUpdate: string;
  merchantRemarkHistory: MercRemarkEntry[];
  meetingUpdateHistory: MercRemarkEntry[];
  orderStatus: 'Open' | 'Closed';
}

export interface MercMeetingBuildResult {
  rows: MercMeetingRow[];
  thursdayUniqueCount: number;
  thursdayDuplicateSkippedCount: number;
}

export function isMercMeetingUnit(unit?: string): boolean {
  const u = String(unit || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  if (!u) return false;
  return u === 'cku' || u === 'warp(udhana)' || (u.includes('warp') && u.includes('udhana'));
}

export function formatMercTimestampNow(d: Date = new Date()): string {
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

export function formatMercDateToday(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function sanitizeMercKeyPart(val?: string | number): string {
  return String(val ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.#$/[\]\s]+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
}

export function toFirebaseSafeMercKey(key: string): string {
  return String(key || 'merc_row')
    .replace(/[.#$/[\]]+/g, '_')
    .substring(0, 180);
}

export function buildMercBaseKey(
  orderNo: string,
  customerName: string,
  designNo: string,
  color: string,
  qty: number | string
): string {
  return [
    sanitizeMercKeyPart(orderNo),
    sanitizeMercKeyPart(customerName),
    sanitizeMercKeyPart(designNo),
    sanitizeMercKeyPart(color),
    String(Number(qty) || 0)
  ]
    .join('|')
    .substring(0, 165);
}

export function normalizeMercRemarkArray(arr: any): MercRemarkEntry[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x) => x && typeof x === 'object' && String(x.text ?? '').trim() !== '')
    .map((x, idx) => ({
      id: String(x.id || `mhist_${idx}_${Date.now()}`),
      text: String(x.text ?? '').trim(),
      date: toTnaStorageDate(String(x.date ?? '')) || String(x.date ?? '').trim() || formatMercDateToday(),
      timestamp: String(x.timestamp ?? '').trim() || formatMercTimestampNow(),
      editorName: String(x.editorName ?? '').trim() || 'User',
      createdAt: String(x.createdAt || '')
    }));
}

export function normalizeMercManualData(raw?: Partial<MercMeetingManualData> | null): MercMeetingManualData {
  if (!raw || typeof raw !== 'object') {
    return {
      merchantRemark: '',
      meetingUpdate: '',
      merchantRemarkHistory: [],
      meetingUpdateHistory: [],
      updatedAt: ''
    };
  }
  const merchHist = normalizeMercRemarkArray(raw.merchantRemarkHistory);
  const meetHist = normalizeMercRemarkArray(raw.meetingUpdateHistory);
  const out: MercMeetingManualData = {
    merchantRemark:
      String(raw.merchantRemark ?? '').trim() ||
      (merchHist.length > 0 ? merchHist[merchHist.length - 1].text : ''),
    meetingUpdate:
      String(raw.meetingUpdate ?? '').trim() ||
      (meetHist.length > 0 ? meetHist[meetHist.length - 1].text : ''),
    merchantRemarkHistory: merchHist,
    meetingUpdateHistory: meetHist,
    updatedAt: String(raw.updatedAt ?? '')
  };
  if (raw.orderStatusOverride === 'Open' || raw.orderStatusOverride === 'Closed') {
    out.orderStatusOverride = raw.orderStatusOverride;
  }
  if (
    raw.dispatchQtyOverride !== undefined &&
    raw.dispatchQtyOverride !== null &&
    Number.isFinite(Number(raw.dispatchQtyOverride))
  ) {
    out.dispatchQtyOverride = Number(raw.dispatchQtyOverride);
  }
  return out;
}

export function normalizeMercManualOrder(id: string, raw: any): MercManualOrder | null {
  if (!raw || typeof raw !== 'object') return null;
  const totalQty = Number(raw.totalQty) || 0;
  const dispatchQty = Number(raw.dispatchQty) || 0;
  const balanceQty =
    raw.balanceQty !== undefined && raw.balanceQty !== null && raw.balanceQty !== ''
      ? Number(raw.balanceQty) || 0
      : Number((totalQty - dispatchQty).toFixed(4));
  const merchHist = normalizeMercRemarkArray(raw.merchantRemarkHistory);
  const meetHist = normalizeMercRemarkArray(raw.meetingUpdateHistory);

  return {
    id: String(raw.id || id),
    orderDate: toTnaStorageDate(String(raw.orderDate ?? '')) || String(raw.orderDate ?? '').trim(),
    orderNo: String(raw.orderNo ?? '').trim(),
    customerName: String(raw.customerName ?? '').trim(),
    designNo: String(raw.designNo ?? '').trim(),
    color: String(raw.color ?? '').trim(),
    totalQty,
    rate: Number(raw.rate) || 0,
    dispatchCommitted:
      toTnaStorageDate(String(raw.dispatchCommitted ?? '')) || String(raw.dispatchCommitted ?? '').trim(),
    dispatchQty,
    balanceQty,
    unit: String(raw.unit ?? 'CKU').trim() || 'CKU',
    merchantRemark:
      String(raw.merchantRemark ?? '').trim() ||
      (merchHist.length > 0 ? merchHist[merchHist.length - 1].text : ''),
    meetingUpdate:
      String(raw.meetingUpdate ?? '').trim() ||
      (meetHist.length > 0 ? meetHist[meetHist.length - 1].text : ''),
    merchantRemarkHistory: merchHist,
    meetingUpdateHistory: meetHist,
    orderStatus: raw.orderStatus === 'Closed' ? 'Closed' : 'Open',
    createdBy: String(raw.createdBy ?? '').trim(),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || '')
  };
}

function parseMercNumber(val: any): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const raw = String(val ?? '').replace(/,/g, '').trim();
  if (!raw) return 0;
  const direct = Number(raw.replace(/[₹$\s]/g, ''));
  if (Number.isFinite(direct)) return direct;
  // Extract first numeric value from strings with units like "170.83 Kg", "250 Mtr", "Rs. 320/kg"
  const match = raw.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const parsed = parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeMercThursdayRow(raw: any): MercThursdaySheetRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const customerName = String(raw.customerName ?? '').trim();
  const designNo = String(raw.designNo ?? '').trim();
  const orderNo = String(raw.orderNo ?? '').trim();
  if (!customerName && !designNo && !orderNo) return null;

  const totalQtyText = String(raw.totalQtyText ?? '').trim();
  const rateText = String(raw.rateText ?? '').trim();
  const dispatchQtyText = String(raw.dispatchQtyText ?? '').trim();
  const balanceQtyText = String(raw.balanceQtyText ?? '').trim();

  const totalQty =
    totalQtyText && (raw.totalQty === undefined || raw.totalQty === null || raw.totalQty === 0)
      ? parseMercNumber(totalQtyText)
      : parseMercNumber(raw.totalQty);
  const rate =
    rateText && (raw.rate === undefined || raw.rate === null || raw.rate === 0)
      ? parseMercNumber(rateText)
      : parseMercNumber(raw.rate);
  const dispatchQty =
    dispatchQtyText && (raw.dispatchQty === undefined || raw.dispatchQty === null || raw.dispatchQty === 0)
      ? parseMercNumber(dispatchQtyText)
      : parseMercNumber(raw.dispatchQty);

  const hasBal =
    balanceQtyText !== '' ||
    (raw.balanceQty !== undefined && raw.balanceQty !== null && String(raw.balanceQty).trim() !== '');
  const balanceQty = hasBal
    ? balanceQtyText && (raw.balanceQty === undefined || raw.balanceQty === null || raw.balanceQty === 0)
      ? parseMercNumber(balanceQtyText)
      : parseMercNumber(raw.balanceQty)
    : Number((totalQty - dispatchQty).toFixed(4));
  const rawStatus = String(raw.orderStatus ?? '').trim().toLowerCase();

  return {
    rowIndex: typeof raw.rowIndex === 'number' ? raw.rowIndex : undefined,
    orderDate: toTnaStorageDate(String(raw.orderDate ?? '')) || String(raw.orderDate ?? '').trim(),
    orderNo,
    customerName,
    designNo,
    color: String(raw.color ?? '').trim(),
    totalQty,
    totalQtyText: totalQtyText || undefined,
    rate,
    rateText: rateText || undefined,
    dispatchCommitted:
      toTnaStorageDate(String(raw.dispatchCommitted ?? '')) || String(raw.dispatchCommitted ?? '').trim(),
    dispatchQty,
    dispatchQtyText: dispatchQtyText || undefined,
    balanceQty,
    balanceQtyText: balanceQtyText || undefined,
    merchantRemark: String(raw.merchantRemark ?? '').trim(),
    meetingUpdate: String(raw.meetingUpdate ?? '').trim(),
    orderStatus: rawStatus === 'closed' || rawStatus === 'close' ? 'Closed' : 'Open',
    unit: String(raw.unit ?? '').trim() || 'CKU'
  };
}

function parseCsvMatrix(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csvText[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r') {
      if (csvText[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/**
 * Parses Google Sheet tab "Thursday Meeting for circular." CSV.
 * Columns align starting from the app's 2nd column (Order Date -> Order Status),
 * with automatic header detection if title/Sr No rows exist.
 */
export function parseMercThursdaySheetCsv(csvText: string): MercThursdaySheetRow[] {
  if (!csvText || csvText.trim().startsWith('<!DOCTYPE') || csvText.includes('<html')) {
    return [];
  }
  const matrix = parseCsvMatrix(csvText);
  if (matrix.length === 0) return [];

  const normHdr = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  // Detect header row within first 6 rows
  let headerRowIdx = -1;
  let colMap: Record<string, number> = {};

  for (let r = 0; r < Math.min(6, matrix.length); r++) {
    const cells = matrix[r].map(normHdr);
    const matches: Record<string, number> = {};
    cells.forEach((h, idx) => {
      if (!h) return;
      if ((h.includes('order') && h.includes('date')) || h === 'date') {
        if (matches.orderDate === undefined) matches.orderDate = idx;
      } else if (h.includes('order') && (h.includes('no') || h.includes('num'))) {
        if (matches.orderNo === undefined) matches.orderNo = idx;
      } else if (h.includes('customer') || h.includes('party')) {
        if (matches.customerName === undefined) matches.customerName = idx;
      } else if (h.includes('design') || h.includes('item')) {
        if (matches.designNo === undefined) matches.designNo = idx;
      } else if (h.includes('color') || h.includes('colour') || h.includes('shade')) {
        if (matches.color === undefined) matches.color = idx;
      } else if (
        (h.includes('total') && (h.includes('qnt') || h.includes('qty') || h.includes('quant') || h.includes('kg') || h.includes('mtr'))) ||
        (h.includes('order') && (h.includes('qnt') || h.includes('qty') || h.includes('quant'))) ||
        h === 'total' ||
        h === 'qty' ||
        h === 'qnt' ||
        h === 'quantity'
      ) {
        if (matches.totalQty === undefined) matches.totalQty = idx;
      } else if (h === 'rate' || h.startsWith('rate ') || h.includes('rate') || h.includes('price')) {
        if (matches.rate === undefined) matches.rate = idx;
      } else if (h.includes('commit') || h.includes('commited') || h.includes('delivery') || (h.includes('dispatch') && h.includes('date'))) {
        if (matches.dispatchCommitted === undefined) matches.dispatchCommitted = idx;
      } else if (
        (h.includes('dispatch') && !h.includes('commit') && !h.includes('commited') && !h.includes('date')) ||
        h.includes('dispatched')
      ) {
        if (matches.dispatchQty === undefined) matches.dispatchQty = idx;
      } else if (h.includes('balance') || h.includes('bal') || h.includes('pending qty') || h.includes('pending qnt')) {
        if (matches.balanceQty === undefined) matches.balanceQty = idx;
      } else if (h.includes('merchant') || h.includes('mechant') || h.includes('remark')) {
        if (matches.merchantRemark === undefined) matches.merchantRemark = idx;
      } else if (h.includes('meeting') || h.includes('update')) {
        if (matches.meetingUpdate === undefined) matches.meetingUpdate = idx;
      } else if (h.includes('status')) {
        if (matches.orderStatus === undefined) matches.orderStatus = idx;
      } else if (h === 'unit' || h.startsWith('unit ')) {
        if (matches.unit === undefined) matches.unit = idx;
      }
    });

    if (Object.keys(matches).length >= 4) {
      headerRowIdx = r;
      colMap = matches;
      break;
    }
  }

  // Smart fallback: derive relative indices from color / dispatchCommitted if header text varied
  const colorIdx = colMap.color !== undefined ? colMap.color : 4;
  const commitIdx = colMap.dispatchCommitted !== undefined ? colMap.dispatchCommitted : colorIdx + 3;
  const getIdx = (key: string, fallbackIdx: number) =>
    colMap[key] !== undefined ? colMap[key] : fallbackIdx;

  const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 1;
  const parsed: MercThursdaySheetRow[] = [];

  for (let r = startRow; r < matrix.length; r++) {
    const cols = matrix[r];
    if (!cols || cols.every((c) => !String(c || '').trim())) continue;

    const orderDate = String(cols[getIdx('orderDate', 0)] ?? '').trim();
    const orderNo = String(cols[getIdx('orderNo', 1)] ?? '').trim();
    const customerName = String(cols[getIdx('customerName', 2)] ?? '').trim();
    const designNo = String(cols[getIdx('designNo', 3)] ?? '').trim();
    const color = String(cols[colorIdx] ?? '').trim();

    const totalQtyRaw = String(cols[getIdx('totalQty', colorIdx + 1)] ?? '').trim();
    const rateRaw = String(cols[getIdx('rate', colorIdx + 2)] ?? '').trim();
    const dispatchCommitted = String(cols[commitIdx] ?? '').trim();
    const dispatchQtyRaw = String(cols[getIdx('dispatchQty', commitIdx + 1)] ?? '').trim();
    const balRaw = String(cols[getIdx('balanceQty', commitIdx + 2)] ?? '').trim();

    const totalQty = parseMercNumber(totalQtyRaw);
    const rate = parseMercNumber(rateRaw);
    const dispatchQty = parseMercNumber(dispatchQtyRaw);
    const balanceQty = balRaw !== '' ? parseMercNumber(balRaw) : Number((totalQty - dispatchQty).toFixed(4));
    const merchantRemark = String(cols[getIdx('merchantRemark', commitIdx + 3)] ?? '').trim();
    const meetingUpdate = String(cols[getIdx('meetingUpdate', commitIdx + 4)] ?? '').trim();
    const rawStatus = String(cols[getIdx('orderStatus', commitIdx + 5)] ?? '').trim().toLowerCase();
    const unit = colMap.unit !== undefined ? String(cols[colMap.unit] ?? '').trim() : '';

    // Skip repeated header / grand total rows
    const custLow = customerName.toLowerCase();
    const ordLow = orderNo.toLowerCase();
    if (
      custLow === 'customer name' ||
      ordLow === 'order number' ||
      ordLow === 'order no' ||
      custLow === 'total' ||
      custLow === 'grand total'
    ) {
      continue;
    }

    if (!customerName && !designNo && !orderNo) continue;

    const norm = normalizeMercThursdayRow({
      rowIndex: r + 1,
      orderDate,
      orderNo,
      customerName,
      designNo,
      color,
      totalQty,
      totalQtyText: totalQtyRaw,
      rate,
      rateText: rateRaw,
      dispatchCommitted,
      dispatchQty,
      dispatchQtyText: dispatchQtyRaw,
      balanceQty,
      balanceQtyText: balRaw,
      merchantRemark,
      meetingUpdate,
      orderStatus: rawStatus === 'closed' || rawStatus === 'close' ? 'Closed' : 'Open',
      unit: unit || 'CKU'
    });
    if (norm) parsed.push(norm);
  }

  return parsed;
}

function normDedupToken(val?: string | number): string {
  return String(val ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Produces normalized design variants so e.g. "1) Ns-1251F" matches "Ns-1251F"
 * and "NS-246H" matches "246H" when BOTH Order No and Color are identical.
 */
function getDesignDedupVariants(designNo?: string): string[] {
  const raw = String(designNo ?? '').trim();
  if (!raw) return [];
  const variants = new Set<string>();
  const exact = normDedupToken(raw);
  if (exact) variants.add(exact);

  // Strip leading list numbering like "1) ", "2) ", "4) "
  const noNum = raw.replace(/^\s*\d+\s*[\)\.\-:]\s*/, '').trim();
  const noNumTok = normDedupToken(noNum);
  if (noNumTok) variants.add(noNumTok);

  // Strip optional "NS-" / "ND-" prefix (only with dash/space so FC-1 / C-920F stay intact)
  const noNsNd = noNum.replace(/^(?:ns|nd)[-\s]+/i, '').trim();
  const noNsNdTok = normDedupToken(noNsNd);
  if (noNsNdTok && noNsNdTok.length >= 2) variants.add(noNsNdTok);

  return Array.from(variants);
}

/**
 * Generates strict color-aware deduplication signatures.
 * CRITICAL: Color is ALWAYS included whenever present so multi-color orders
 * (same Order No + same Design No + different Colors) are NEVER dropped.
 */
function getMercDedupSignatures(row: {
  orderDate?: string;
  orderNo?: string;
  customerName?: string;
  designNo?: string;
  color?: string;
  totalQty?: number;
}): string[] {
  const sigs: string[] = [];
  const ord = normDedupToken(row.orderNo);
  const cust = normDedupToken(row.customerName);
  const desVariants = getDesignDedupVariants(row.designNo);
  const col = normDedupToken(row.color);
  const dt = normDedupToken(toTnaStorageDate(row.orderDate || '') || row.orderDate || '');
  const qtyKey = String(Math.round((Number(row.totalQty) || 0) * 100));

  if (desVariants.length === 0) return sigs;

  desVariants.forEach((des) => {
    if (ord) {
      // Order No + Design + Color (always includes color so different colors never collide)
      sigs.push(`ord_des_col|${ord}|${des}|${col}`);
    } else {
      // Only when Order No is blank: require Customer + Design + Color (+ Date or positive Qty)
      if (dt && cust && col) {
        sigs.push(`dt_cust_des_col|${dt}|${cust}|${des}|${col}`);
      }
      if (cust && col && (Number(row.totalQty) || 0) > 0) {
        sigs.push(`cust_des_col_qty|${cust}|${des}|${col}|${qtyKey}`);
      }
    }
  });

  return sigs;
}

export function buildMercMeetingData(
  groupedOrders: GroupedOrder[],
  mercRecordsMap: Record<string, MercMeetingManualData>,
  manualOrdersMap: Record<string, MercManualOrder>,
  thursdaySheetRows: MercThursdaySheetRow[] = []
): MercMeetingBuildResult {
  const rows: MercMeetingRow[] = [];
  const occ: Record<string, number> = {};
  const existingSignatures = new Set<string>();

  const registerSigs = (item: {
    orderDate?: string;
    orderNo?: string;
    customerName?: string;
    designNo?: string;
    color?: string;
    totalQty?: number;
  }) => {
    getMercDedupSignatures(item).forEach((s) => existingSignatures.add(s));
  };

  // 1. Manual Orders added directly inside Merc Meetings tab (newest first at top)
  const manualList = Object.entries(manualOrdersMap)
    .map(([id, raw]) => normalizeMercManualOrder(id, raw))
    .filter((m): m is MercManualOrder => Boolean(m))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  manualList.forEach((m) => {
    registerSigs(m);
    rows.push({
      mercKey: toFirebaseSafeMercKey(m.id),
      source: 'manual',
      manualOrderId: m.id,
      orderDate: m.orderDate,
      orderNo: m.orderNo,
      customerName: m.customerName,
      designNo: m.designNo,
      color: m.color,
      totalQty: m.totalQty,
      rate: m.rate,
      dispatchCommitted: m.dispatchCommitted,
      dispatchQty: m.dispatchQty,
      balanceQty: m.balanceQty,
      unit: m.unit,
      merchantRemark: m.merchantRemark,
      meetingUpdate: m.meetingUpdate,
      merchantRemarkHistory: m.merchantRemarkHistory,
      meetingUpdateHistory: m.meetingUpdateHistory,
      orderStatus: m.orderStatus
    });
  });

  // 2. Auto-synced rows from Order Automation where AN === 'Open' AND Unit (Col F) is CKU or WARP(UDHANA)
  groupedOrders.forEach((order) => {
    const orderDate = toTnaStorageDate(order.orderDate || '') || (order.orderDate || '').trim();
    const orderNo = (order.orderNo || '').trim();
    const customerName = (order.customerName || '').trim();

    order.items.forEach((item) => {
      const itemStatus = item.statusAN || 'Open';
      if (itemStatus !== 'Open') return;
      if (!isMercMeetingUnit(item.unit)) return;

      const designNo = (item.itemName || '').trim();
      if (!designNo && !customerName) return;

      const color = (item.color || '').trim();
      const totalQty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      const dispatchCommitted =
        toTnaStorageDate(item.deliveryDate || '') || (item.deliveryDate || '').trim();
      const dispatchQty = Number(item.dispatchQty) || 0;
      const balanceQty =
        item.balanceQty !== undefined
          ? Number(item.balanceQty)
          : Number((totalQty - dispatchQty).toFixed(4));

      const baseKey = buildMercBaseKey(orderNo, customerName, designNo, color, totalQty);
      occ[baseKey] = (occ[baseKey] || 0) + 1;
      const mercKey = toFirebaseSafeMercKey(`${baseKey}|_${occ[baseKey]}`);

      const rawSaved =
        mercRecordsMap[mercKey] ||
        mercRecordsMap[`${baseKey}|_${occ[baseKey]}`] ||
        (occ[baseKey] === 1 ? mercRecordsMap[baseKey] : undefined);
      const saved = normalizeMercManualData(rawSaved);

      registerSigs({ orderDate, orderNo, customerName, designNo, color, totalQty });

      rows.push({
        mercKey,
        source: 'automation',
        automationOrderKey: order.orderKey,
        automationItemId: item.id,
        automationItemWidth: item.width || '',
        orderDate,
        orderNo,
        customerName,
        designNo,
        color,
        totalQty,
        rate,
        dispatchCommitted,
        dispatchQty,
        balanceQty,
        unit: (item.unit || '').trim(),
        merchantRemark: saved.merchantRemark,
        meetingUpdate: saved.meetingUpdate,
        merchantRemarkHistory: saved.merchantRemarkHistory,
        meetingUpdateHistory: saved.meetingUpdateHistory,
        orderStatus: 'Open'
      });
    });
  });

  // 3. Unique rows from Google Sheet tab "Thursday Meeting for circular."
  //    - Any row matching an Order Automation / Manual / earlier Sheet row is SKIPPED (no duplicates).
  //    - Unique rows are marked source = 'thursday_sheet' (displayed in silent yellow full-row fill).
  let thursdayUniqueCount = 0;
  let thursdayDuplicateSkippedCount = 0;

  thursdaySheetRows.forEach((rawRow) => {
    const tRow = normalizeMercThursdayRow(rawRow);
    if (!tRow) return;

    const sigs = getMercDedupSignatures(tRow);
    const isDuplicate = sigs.length > 0 && sigs.some((s) => existingSignatures.has(s));
    if (isDuplicate) {
      thursdayDuplicateSkippedCount++;
      return;
    }

    registerSigs(tRow);
    thursdayUniqueCount++;

    const baseKey = buildMercBaseKey(
      tRow.orderNo,
      tRow.customerName,
      tRow.designNo,
      tRow.color,
      tRow.totalQty
    );
    const thKeyBase = `thurs|${baseKey}`;
    occ[thKeyBase] = (occ[thKeyBase] || 0) + 1;
    const mercKey = toFirebaseSafeMercKey(`${thKeyBase}|_${occ[thKeyBase]}`);

    const saved = normalizeMercManualData(
      mercRecordsMap[mercKey] || (occ[thKeyBase] === 1 ? mercRecordsMap[thKeyBase] : undefined)
    );

    const finalMerchantRemark = saved.merchantRemark || tRow.merchantRemark;
    const finalMeetingUpdate = saved.meetingUpdate || tRow.meetingUpdate;
    const finalStatus: 'Open' | 'Closed' = saved.orderStatusOverride || tRow.orderStatus || 'Open';

    const hasDispatchOverride = saved.dispatchQtyOverride !== undefined;
    const finalDispatchQty = hasDispatchOverride ? saved.dispatchQtyOverride! : tRow.dispatchQty;
    const finalBalanceQty = hasDispatchOverride
      ? Number((tRow.totalQty - finalDispatchQty).toFixed(4))
      : tRow.balanceQty;

    // Extract optional unit suffix from totalQtyText (e.g. "200 Kg" -> "Kg") if user edited Dispatch Qty
    const qtyUnitMatch = (tRow.totalQtyText || '').match(/[a-zA-Z]+$/);
    const unitSuffix = qtyUnitMatch ? ` ${qtyUnitMatch[0]}` : '';

    rows.push({
      mercKey,
      source: 'thursday_sheet',
      orderDate: tRow.orderDate,
      orderNo: tRow.orderNo,
      customerName: tRow.customerName,
      designNo: tRow.designNo,
      color: tRow.color,
      totalQty: tRow.totalQty,
      totalQtyText: tRow.totalQtyText,
      rate: tRow.rate,
      rateText: tRow.rateText,
      dispatchCommitted: tRow.dispatchCommitted,
      dispatchQty: finalDispatchQty,
      dispatchQtyText: hasDispatchOverride
        ? `${finalDispatchQty.toLocaleString()}${unitSuffix}`
        : tRow.dispatchQtyText,
      balanceQty: finalBalanceQty,
      balanceQtyText: hasDispatchOverride
        ? `${finalBalanceQty.toLocaleString()}${unitSuffix}`
        : tRow.balanceQtyText,
      unit: tRow.unit || 'CKU',
      merchantRemark: finalMerchantRemark,
      meetingUpdate: finalMeetingUpdate,
      merchantRemarkHistory: saved.merchantRemarkHistory,
      meetingUpdateHistory: saved.meetingUpdateHistory,
      orderStatus: finalStatus
    });
  });

  return {
    rows,
    thursdayUniqueCount,
    thursdayDuplicateSkippedCount
  };
}

export function buildMercMeetingRows(
  groupedOrders: GroupedOrder[],
  mercRecordsMap: Record<string, MercMeetingManualData>,
  manualOrdersMap: Record<string, MercManualOrder>,
  thursdaySheetRows: MercThursdaySheetRow[] = []
): MercMeetingRow[] {
  return buildMercMeetingData(groupedOrders, mercRecordsMap, manualOrdersMap, thursdaySheetRows).rows;
}

export { parseTnaDateParts, toTnaStorageDate };
