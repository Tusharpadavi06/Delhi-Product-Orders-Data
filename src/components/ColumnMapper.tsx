import React, { useState } from 'react';
import { fmsColumnMapping } from '../data/sampleOrders';
import { ArrowRight, Layers, Table, CheckCircle2, SplitSquareVertical, Calculator } from 'lucide-react';

export const ColumnMapper: React.FC = () => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'header-merge' | 'item-row' | 'dispatch-balance'>('all');

  const filteredColumns = fmsColumnMapping.filter(col => {
    if (filterCategory === 'all') return true;
    return col.category === filterCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded">
              Column Architecture &amp; Mapping
            </span>
            <span className="text-xs text-slate-500">Columns A to Z Breakdown</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            FMS Column Layout &amp; Row Merge Specification
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Understand how each column behaves in Google Sheets, whether it merges across multi-item orders, and how the balance formula is generated.
          </p>
        </div>

        {/* Visual Architecture Diagram */}
        <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
            <Table className="w-4 h-4 text-emerald-700" />
            Visual Architecture of Sheet "Product Automation"
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Block 1: A-E */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 font-mono">Cols A – E</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Merged (1–5)
                </span>
              </div>
              <h4 className="text-xs font-semibold text-blue-950 mt-1.5">Order Header Data</h4>
              <p className="text-[11px] text-blue-800/80 mt-1 leading-snug">
                Timestamp, Customer PO, Customer Name, Email, Order Date. Merged vertically across all item rows for this order.
              </p>
            </div>

            {/* Block 2: F-N */}
            <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 font-mono">Cols F – N</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                  Rows (6–14)
                </span>
              </div>
              <h4 className="text-xs font-semibold text-slate-900 mt-1.5">Item Details (NO \n)</h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                Unit, Item Name, Color, Width, UOM, Qty(K), Rate, Discount, Delivery Date. 1 distinct row per item.
              </p>
            </div>

            {/* Block 3: O-X */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 font-mono">Cols O – X</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Merged (15–24)
                </span>
              </div>
              <h4 className="text-xs font-semibold text-blue-950 mt-1.5">Logistics &amp; Status</h4>
              <p className="text-[11px] text-blue-800/80 mt-1 leading-snug">
                Remark, Customer No, Addresses, Transporter, Sales Person, Account/Approval, Branch, Order No. Merged vertically.
              </p>
            </div>

            {/* Block 4: Y-Z */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 font-mono">Cols Y – Z</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  Rows (25–26)
                </span>
              </div>
              <h4 className="text-xs font-semibold text-amber-950 mt-1.5">Dispatch &amp; Balance</h4>
              <p className="text-[11px] text-amber-800/80 mt-1 leading-snug">
                Col Y: Dispatch Qnt (manual input per item). Col Z: Balance Qnt formula <code className="font-mono text-amber-950">=K - N(Y)</code>.
              </p>
            </div>

            {/* Block 5: AN & AO-AS */}
            <div className="bg-sky-50 border border-sky-300 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-950 font-mono">Col AN &amp; AO–AS</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                  Status (40–45)
                </span>
              </div>
              <h4 className="text-xs font-semibold text-sky-950 mt-1.5">Col AN: Open / Close</h4>
              <p className="text-[11px] text-sky-800/80 mt-1 leading-snug">
                Col AN: Dropdown list [Open, In-Progress, Closed]. Col AO-AP: Delivered WhatsApp Msg &amp; Clickable link.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filterCategory === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Columns (A to AP)
        </button>
        <button
          onClick={() => setFilterCategory('header-merge')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filterCategory === 'header-merge'
              ? 'bg-blue-800 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Header Merged (A-E &amp; O-X)
        </button>
        <button
          onClick={() => setFilterCategory('item-row')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filterCategory === 'item-row'
              ? 'bg-slate-800 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Item Specification Rows (F-N)
        </button>
        <button
          onClick={() => setFilterCategory('dispatch-balance')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filterCategory === 'dispatch-balance'
              ? 'bg-emerald-800 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Dispatch &amp; Balance (Y-Z)
        </button>
      </div>

      {/* Detailed Columns Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 w-16 text-center">Col</th>
                <th className="px-4 py-2.5 w-24">1-Based</th>
                <th className="px-4 py-2.5 w-24">0-Based</th>
                <th className="px-4 py-2.5">Field Name</th>
                <th className="px-4 py-2.5">Behavior in Sheet</th>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5">Sample Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredColumns.map(col => {
                const isMerged = col.category === 'header-merge';
                const isDispatch = col.category === 'dispatch-balance';

                return (
                  <tr
                    key={col.sheetCol}
                    className={`hover:bg-slate-50 transition-colors ${
                      isMerged ? 'bg-blue-50/10' : isDispatch ? 'bg-emerald-50/20' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-900">
                      <span
                        className={`inline-block w-7 py-0.5 rounded ${
                          isMerged
                            ? 'bg-blue-100 text-blue-900'
                            : isDispatch
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {col.sheetCol}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-500 tabular-nums">
                      Col {col.colIndex1Based}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-500 tabular-nums">
                      Index {col.arrayIndex0Based}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      {col.name}
                    </td>
                    <td className="px-4 py-2.5">
                      {col.category === 'header-merge' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Vertically Merged
                        </span>
                      )}
                      {col.category === 'item-row' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          Individual Row (No \n)
                        </span>
                      )}
                      {col.category === 'dispatch-balance' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {col.sheetCol === 'Y' ? 'Manual Input (Preserved)' : 'Formula: =K - N(Y)'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {col.description}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-800 text-[11px]">
                      {col.example}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
