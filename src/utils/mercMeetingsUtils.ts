import { GroupedOrder } from '../types/fms';
import { parseTnaDateParts, toTnaStorageDate } from './tnaUtils';

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

export interface MercMeetingRow {
  mercKey: string;
  source: 'automation' | 'manual';
  manualOrderId?: string;
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
  return {
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

export function buildMercMeetingRows(
  groupedOrders: GroupedOrder[],
  mercRecordsMap: Record<string, MercMeetingManualData>,
  manualOrdersMap: Record<string, MercManualOrder>
): MercMeetingRow[] {
  const rows: MercMeetingRow[] = [];
  const occ: Record<string, number> = {};

  // 1. Manual Orders added directly inside Merc Meetings tab (newest first at top for immediate access to Open/Closed dropdown)
  const manualList = Object.entries(manualOrdersMap)
    .map(([id, raw]) => normalizeMercManualOrder(id, raw))
    .filter((m): m is MercManualOrder => Boolean(m))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  manualList.forEach((m) => {
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

      rows.push({
        mercKey,
        source: 'automation',
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

  return rows;
}

export { parseTnaDateParts, toTnaStorageDate };
