import React, { useMemo, useState } from 'react';
import { X, Plus, Trash2, Calendar, Clock, PackageCheck, CheckCircle2 } from 'lucide-react';

export interface DispatchLogEntry {
  id: string;
  date: string;       // DD/MM/YYYY
  timestamp: string;  // DD/MM/YYYY, hh:mm:ss AM/PM
  qty: number;
  remark?: string;
  createdAt: string;  // ISO
}

export interface DispatchLogModalTarget {
  orderKey: string;
  orderNo: string;
  customerName: string;
  customerPO: string;
  item: {
    id: string;
    itemName: string;
    color: string;
    width: string;
    unit: string;
    qty: number;
    dispatchQty: number;
    balanceQty: number;
  };
  historyKey: string;
}

interface DispatchLogModalProps {
  target: DispatchLogModalTarget;
  entries: DispatchLogEntry[];
  onClose: () => void;
  onAddEntry: (payload: {
    qty: number;
    date: string;
    remark: string;
    preserveLegacyInitialQty?: number;
  }) => void;
  onDeleteEntry: (entryId: string) => void;
  onClearAll: () => void;
}

function getTodayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isoToDDMMYYYY(iso: string): string {
  const m = String(iso || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  }
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export const DispatchLogModal: React.FC<DispatchLogModalProps> = ({
  target,
  entries,
  onClose,
  onAddEntry,
  onDeleteEntry,
  onClearAll
}) => {
  const [dateIso, setDateIso] = useState<string>(() => getTodayIso());
  const [qtyInput, setQtyInput] = useState<string>('');
  const [remarkInput, setRemarkInput] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const totalQty = Number(target.item.qty) || 0;

  // If row already had a dispatchQty entered directly before using the '+' ledger,
  // carry it forward safely so adding a 2nd part dispatch sums instead of overwriting.
  const hasLegacyUntrackedQty = entries.length === 0 && (Number(target.item.dispatchQty) || 0) > 0;
  const legacyQty = hasLegacyUntrackedQty ? Number(target.item.dispatchQty) || 0 : 0;

  const ledgerRows = useMemo(() => {
    let runningDispatched = 0;
    return entries.map((entry, idx) => {
      runningDispatched = Number((runningDispatched + (Number(entry.qty) || 0)).toFixed(4));
      const runningBalance = Number((totalQty - runningDispatched).toFixed(4));
      return {
        ...entry,
        index: idx + 1,
        cumulativeDispatched: runningDispatched,
        runningBalance
      };
    });
  }, [entries, totalQty]);

  const currentTotalDispatched = useMemo(() => {
    if (entries.length > 0) {
      return Number(
        entries.reduce((sum, e) => sum + (Number(e.qty) || 0), 0).toFixed(4)
      );
    }
    return legacyQty;
  }, [entries, legacyQty]);

  const currentBalance = Number((totalQty - currentTotalDispatched).toFixed(4));
  const draftQtyNum = qtyInput.trim() === '' ? 0 : Number(qtyInput);
  const hasValidDraft = qtyInput.trim() !== '' && Number.isFinite(draftQtyNum) && draftQtyNum > 0;
  const previewDispatched = hasValidDraft
    ? Number((currentTotalDispatched + draftQtyNum).toFixed(4))
    : currentTotalDispatched;
  const previewBalance = Number((totalQty - previewDispatched).toFixed(4));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(qtyInput);
    if (!qtyInput.trim() || !Number.isFinite(num) || num <= 0) {
      setFormError('Please enter a valid Dispatch Qty greater than 0.');
      return;
    }
    setFormError(null);
    onAddEntry({
      qty: Number(num.toFixed(4)),
      date: isoToDDMMYYYY(dateIso),
      remark: remarkInput.trim(),
      preserveLegacyInitialQty: hasLegacyUntrackedQty ? legacyQty : undefined
    });
    setQtyInput('');
    setRemarkInput('');
    setDateIso(getTodayIso());
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-600/90 text-white flex items-center justify-center shrink-0">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-white">
                  Part Dispatch Ledger — Col Y (Dispatch Qnt)
                </h3>
                {target.orderNo && (
                  <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30">
                    {target.orderNo}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                {target.customerName} · {target.item.itemName}
                {target.item.color ? ` · ${target.item.color}` : ''}
                {target.item.unit ? ` (${target.item.unit})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded cursor-pointer shrink-0"
            aria-label="Close dispatch ledger"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-3 divide-x divide-slate-200 bg-slate-50 border-b border-slate-200">
          <div className="px-4 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Qnt (Col K)
            </div>
            <div className="text-base font-extrabold font-mono tabular-nums text-slate-900 mt-0.5">
              {totalQty.toLocaleString()}
            </div>
          </div>
          <div className="px-4 py-2.5 bg-amber-50/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Total Dispatched (Col Y)
            </div>
            <div className="text-base font-extrabold font-mono tabular-nums text-amber-900 mt-0.5">
              {currentTotalDispatched.toLocaleString()}
              <span className="text-[10px] font-semibold text-amber-700 ml-1.5">
                ({entries.length > 0 ? `${entries.length} part${entries.length > 1 ? 's' : ''}` : hasLegacyUntrackedQty ? '1 previous' : '0 parts'})
              </span>
            </div>
          </div>
          <div className="px-4 py-2.5 bg-emerald-50/40">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Balance Qnt (Col Z = K − Y)
            </div>
            <div
              className={`text-base font-extrabold font-mono tabular-nums mt-0.5 ${
                currentBalance <= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {currentBalance.toLocaleString()}
              {currentBalance <= 0 && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" /> Complete
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Dispatch History Ledger Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-[11px]">
                Dispatch History Log ({entries.length + (hasLegacyUntrackedQty ? 1 : 0)} entries)
              </span>
              {(entries.length > 0 || hasLegacyUntrackedQty) && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-[10px] font-semibold text-rose-700 hover:text-rose-900 hover:underline cursor-pointer"
                >
                  Reset All to 0
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                    <th className="px-2.5 py-1.5 text-center w-8">#</th>
                    <th className="px-2.5 py-1.5 text-right">Total Qnt (K)</th>
                    <th className="px-2.5 py-1.5 text-left">Dispatch Date</th>
                    <th className="px-2.5 py-1.5 text-left">Saved Timestamp</th>
                    <th className="px-2.5 py-1.5 text-right bg-amber-50/70 text-amber-950">Dispatch Qnt</th>
                    <th className="px-2.5 py-1.5 text-right bg-emerald-50/60 text-emerald-950">Balance (Z)</th>
                    <th className="px-2.5 py-1.5 text-left">Note</th>
                    <th className="px-2 py-1.5 text-center w-10">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {hasLegacyUntrackedQty && (
                    <tr className="bg-amber-50/30">
                      <td className="px-2.5 py-1.5 text-center font-mono text-slate-500">1</td>
                      <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-slate-700">
                        {totalQty.toLocaleString()}
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-500 italic">Previous entry</td>
                      <td className="px-2.5 py-1.5 text-slate-400 font-mono text-[10px]">—</td>
                      <td className="px-2.5 py-1.5 text-right font-mono tabular-nums font-bold text-amber-900 bg-amber-50/40">
                        {legacyQty.toLocaleString()}
                      </td>
                      <td
                        className={`px-2.5 py-1.5 text-right font-mono tabular-nums font-bold bg-emerald-50/30 ${
                          totalQty - legacyQty <= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {Number((totalQty - legacyQty).toFixed(4)).toLocaleString()}
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-500 text-[10px]">
                        Existing Col Y qty (will auto-keep when adding next part)
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={onClearAll}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Clear existing dispatch qty"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )}

                  {ledgerRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-2.5 py-1.5 text-center font-mono text-slate-500">
                        {r.index}
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-slate-700">
                        {totalQty.toLocaleString()}
                      </td>
                      <td className="px-2.5 py-1.5 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {r.date}
                      </td>
                      <td className="px-2.5 py-1.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        {r.timestamp}
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-mono tabular-nums font-bold text-amber-950 bg-amber-50/40">
                        +{Number(r.qty).toLocaleString()}
                      </td>
                      <td
                        className={`px-2.5 py-1.5 text-right font-mono tabular-nums font-bold bg-emerald-50/30 ${
                          r.runningBalance <= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {r.runningBalance.toLocaleString()}
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-600 max-w-[140px] truncate" title={r.remark || ''}>
                        {r.remark || '—'}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(r.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Remove this dispatch entry and recalculate Balance"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {entries.length === 0 && !hasLegacyUntrackedQty && (
                    <tr>
                      <td colSpan={8} className="py-5 text-center text-slate-400">
                        No part dispatches recorded yet. Add the first dispatch entry below.
                      </td>
                    </tr>
                  )}
                </tbody>
                {(entries.length > 0 || hasLegacyUntrackedQty) && (
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                      <td colSpan={4} className="px-2.5 py-1.5 text-right text-slate-700">
                        Cumulative Total:
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-amber-950 bg-amber-100/70">
                        {currentTotalDispatched.toLocaleString()}
                      </td>
                      <td
                        className={`px-2.5 py-1.5 text-right font-mono tabular-nums bg-emerald-100/60 ${
                          currentBalance <= 0 ? 'text-emerald-800' : 'text-rose-800'
                        }`}
                      >
                        {currentBalance.toLocaleString()}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Add Next Part Dispatch Form */}
          <form
            onSubmit={handleSubmit}
            className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-amber-700" />
                Add Next Part Dispatch
              </span>
              <span className="text-[10px] text-slate-600 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-amber-700" />
                Timestamp auto-saved on submit
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              {/* Total Qnt (Read-only reference) */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Total Qnt (K)
                </label>
                <div className="px-2 py-1.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-800 text-right tabular-nums">
                  {totalQty.toLocaleString()}
                </div>
              </div>

              {/* Dispatch Date (Auto Today, editable) */}
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-700" />
                  Dispatch Date
                </label>
                <input
                  type="date"
                  value={dateIso}
                  onChange={(e) => setDateIso(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              {/* New Dispatch Qnt */}
              <div className="sm:col-span-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-amber-950">
                    Dispatch Qnt *
                  </label>
                  {currentBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setQtyInput(String(currentBalance));
                        setFormError(null);
                      }}
                      className="text-[9.5px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                      title="Fill full remaining balance"
                    >
                      Fill Bal ({currentBalance.toLocaleString()})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  value={qtyInput}
                  onChange={(e) => {
                    setQtyInput(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Enter qty..."
                  autoFocus
                  className="w-full px-2 py-1.5 bg-white border border-amber-400 rounded font-mono font-bold text-right text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Optional Note */}
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Note / Challan (Optional)
                </label>
                <input
                  type="text"
                  value={remarkInput}
                  onChange={(e) => setRemarkInput(e.target.value)}
                  placeholder="e.g. Lot 1 / LR / Courier"
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {formError && (
              <div className="text-[11px] font-semibold text-rose-700">{formError}</div>
            )}

            {/* Live Calculation Preview + Submit */}
            <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/80">
              <div className="text-[11px] text-slate-700 font-mono">
                {hasValidDraft ? (
                  <span>
                    After adding <strong className="text-amber-900">+{draftQtyNum.toLocaleString()}</strong>:{' '}
                    Col Y = <strong className="text-amber-950">{previewDispatched.toLocaleString()}</strong> ·{' '}
                    Col Z Balance ={' '}
                    <strong className={previewBalance <= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {previewBalance.toLocaleString()}
                    </strong>
                  </span>
                ) : (
                  <span className="text-slate-500">
                    Sum of all part dispatches automatically updates Col Y &amp; Balance Col Z (= K − Y).
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-md shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Dispatch</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
