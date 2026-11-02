import React, { useState } from 'react';
import { GasScriptConfig, defaultGasConfig, generateGasCode, getWhatsAppSnippet } from '../utils/gasGenerator';
import { Copy, Check, Download, Settings2, Sliders, CheckCircle2, ShieldCheck, FileCode, Sparkles, AlertTriangle, Zap, Database, MessageSquare } from 'lucide-react';

interface CodeViewerProps {
  onCopyCode: () => void;
  copied: boolean;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ onCopyCode, copied }) => {
  const [config, setConfig] = useState<GasScriptConfig>(defaultGasConfig);
  const [showConfig, setShowConfig] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const generatedCode = React.useMemo(() => {
    return generateGasCode(config);
  }, [config]);

  // Handle downloading Code.gs
  const handleDownload = () => {
    const filename =
      config.mode === 'delta-bigdata'
        ? 'GINZA_Delta_BigData_ZeroDataLoss.gs'
        : config.mode === 'firebase-sync'
        ? 'GINZA_Firebase_Batch_Sync.gs'
        : config.mode === 'supabase-fms'
        ? 'GINZA_Supabase_FMS.gs'
        : config.mode === 'ginza-45'
        ? 'GINZA_FMS_Optimized.gs'
        : 'FMS_Lean_26Col.gs';
    const blob = new Blob([generatedCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Script Selector Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {config.mode === 'delta-bigdata'
                  ? 'Recommended: Zero Data Loss Engine'
                  : config.mode === 'firebase-sync'
                  ? 'Cloud Database: Batch Sync Engine'
                  : 'Production-Ready Code'}
              </span>
              <span className="text-xs text-slate-500 font-mono">Google Apps Script (.gs)</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              {config.mode === 'delta-bigdata'
                ? 'GINZA FMS Delta Big Data Engine (Zero Data Loss & Fast Speed)'
                : config.mode === 'firebase-sync'
                ? 'GINZA FMS + Firebase Cloud Sync (Batch Quota-Safe & Auto-Sync)'
                : config.mode === 'supabase-fms'
                ? 'GINZA FMS + Supabase Cloud Script (External Cloud DB)'
                : config.mode === 'ginza-45'
                ? 'GINZA FMS Combined Script (Legacy Full Refresh)'
                : 'Lean FMS Automation Script (26 Columns A to Z)'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tabs: <code className="font-mono text-emerald-800 font-bold bg-emerald-50 px-1 py-0.5 rounded">"{config.sourceSheetName}"</code> → <code className="font-mono text-blue-800 font-bold bg-blue-50 px-1 py-0.5 rounded">"{config.targetSheetName}"</code>
              {config.mode !== 'lean-26' && <> + <code className="font-mono text-purple-800 font-bold bg-purple-50 px-1 py-0.5 rounded">"{config.archiveSheetName}"</code> (Archive)</>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Script Version Toggle */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                onClick={() => setConfig({ ...config, mode: 'delta-bigdata' })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  config.mode === 'delta-bigdata'
                    ? 'bg-emerald-700 text-white font-bold shadow-xs'
                    : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Delta Big Data (Recommended)</span>
              </button>
              <button
                onClick={() => setConfig({ ...config, mode: 'firebase-sync' })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  config.mode === 'firebase-sync'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'text-amber-800 hover:text-amber-950 hover:bg-amber-50'
                }`}
              >
                <span>🔥 Firebase Sync</span>
              </button>
              <button
                onClick={() => setConfig({ ...config, mode: 'ginza-45' })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  config.mode === 'ginza-45'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Legacy Refresh
              </button>
              <button
                onClick={() => setConfig({ ...config, mode: 'supabase-fms' })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  config.mode === 'supabase-fms'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Supabase Sync</span>
              </button>
              <button
                onClick={() => setConfig({ ...config, mode: 'lean-26' })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  config.mode === 'lean-26'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lean 26 Cols
              </button>
            </div>

            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                showConfig
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              {showConfig ? 'Hide Config' : 'Customize Config'}
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download .gs
            </button>

            <button
              onClick={onCopyCode}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors shadow-xs ${
                copied
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied Script!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Full Script
                </>
              )}
            </button>
          </div>
        </div>

        {/* Configuration Panel Drawer */}
        {showConfig && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-150">
            <div>
              <label className="text-[11px] font-medium text-slate-600 block">Source Sheet Name</label>
              <input
                type="text"
                value={config.sourceSheetName}
                onChange={(e) => setConfig({ ...config, sourceSheetName: e.target.value })}
                className="mt-1 w-full px-2.5 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600 block">Target Sheet Name</label>
              <input
                type="text"
                value={config.targetSheetName}
                onChange={(e) => setConfig({ ...config, targetSheetName: e.target.value })}
                className="mt-1 w-full px-2.5 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
            {config.mode !== 'lean-26' && (
              <div>
                <label className="text-[11px] font-medium text-slate-600 block">Archive Sheet Name</label>
                <input
                  type="text"
                  value={config.archiveSheetName}
                  onChange={(e) => setConfig({ ...config, archiveSheetName: e.target.value })}
                  className="mt-1 w-full px-2.5 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
            )}
            {config.mode === 'firebase-sync' && (
              <>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block">Firebase Database URL (.firebaseio.com)</label>
                  <input
                    type="text"
                    value={config.firebaseUrl || ''}
                    placeholder="https://your-app-default-rtdb.firebaseio.com"
                    onChange={(e) => setConfig({ ...config, firebaseUrl: e.target.value })}
                    className="mt-1 w-full px-2.5 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block">Database Secret / Auth Token</label>
                  <input
                    type="password"
                    value={config.firebaseSecret || ''}
                    placeholder="Paste database secret (optional for test mode)"
                    onChange={(e) => setConfig({ ...config, firebaseSecret: e.target.value })}
                    className="mt-1 w-full px-2.5 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </>
            )}
            {config.mode === 'supabase-fms' && (
              <>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block">Supabase Project URL</label>
                  <input
                    type="text"
                    value={config.supabaseUrl || ''}
                    onChange={(e) => setConfig({ ...config, supabaseUrl: e.target.value })}
                    className="mt-1 w-full px-2.5 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block">Supabase Anon Key</label>
                  <input
                    type="text"
                    value={config.supabaseKey || ''}
                    onChange={(e) => setConfig({ ...config, supabaseKey: e.target.value })}
                    className="mt-1 w-full px-2.5 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Loading Prevention Audit Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-emerald-950 block">SHA-256 Fingerprint Check</span>
              <span className="text-emerald-900/80 text-[11px]">
                Jab source unchanged ho, to script 0.5s me exit ho jati hai bina poori sheet ko refresh kiye!
              </span>
            </div>
          </div>

          <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-purple-900 block">Closed Orders Archival</span>
              <span className="text-purple-800/80 text-[11px]">
                AN = Closed hote hi order "Closed Orders" me chala jata hai. Active sheet hamesha lean rehti hai.
              </span>
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-blue-900 block">Isolated Column Y &amp; Z</span>
              <span className="text-blue-800/80 text-[11px]">
                Dispatch quantity dalte hi sirf us row ka Z calculate hota hai bina poori sheet ko reload kiye.
              </span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 flex items-start gap-2.5">
            <MessageSquare className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-emerald-950 block">WhatsApp Dispatch Link (AO → AP)</span>
              <span className="text-emerald-800/80 text-[11px]">
                AO me "Message Sent" aate hi AP me multi-item dynamic WhatsApp API link auto generate ho jata hai.
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-slate-900 block">Clean Borders &amp; Filters</span>
              <span className="text-slate-600 text-[11px]">
                Cell-by-cell border loop hatakar block border lagaya gaya hai jo sheet ko smooth rakhta hai.
              </span>
            </div>
          </div>
        </div>

        {/* WhatsApp Dispatch Link Quick Banner */}
        <div className="mt-4 p-3.5 bg-emerald-50/90 border border-emerald-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="text-xl">📱</span>
            <div>
              <span className="text-xs font-bold text-emerald-950 block">
                WhatsApp Dispatch Function: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-300">fmsSetWhatsAppLinkForOrder_(sheet, editedRow)</code>
              </span>
              <p className="text-[11px] text-emerald-900 mt-0.5 leading-snug">
                Jab <strong>AO</strong> me "Message Sent" select kiya jata hai, tab <strong>AP</strong> me clickable link banta hai. Formula pure block ke items (G=Item, H=Color, Y=Dispatch Qty, J=Unit) ko <code className="font-mono">MAP + SEQUENCE</code> se combine karta hai!
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(getWhatsAppSnippet());
              setCopiedWhatsApp(true);
              setTimeout(() => setCopiedWhatsApp(false), 2500);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-800 text-white hover:bg-emerald-900 transition-colors shrink-0 shadow-xs"
          >
            {copiedWhatsApp ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied WhatsApp Code!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy WhatsApp Function Only
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Viewer Container */}
      <div className="bg-slate-900 rounded-xl shadow-md border border-slate-800 overflow-hidden text-slate-200">
        {/* Code Header Bar */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs text-slate-300 font-medium">
              {config.mode === 'supabase-fms'
                ? 'GINZA_Supabase_FMS.gs'
                : config.mode === 'ginza-45'
                ? 'GINZA_FMS_Optimized.gs'
                : 'FMS_Lean_26Col.gs'}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-mono">Google Apps Script</span>
          </div>

          <button
            onClick={onCopyCode}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        {/* Code Content */}
        <div className="overflow-x-auto p-4 font-mono text-xs leading-relaxed max-h-[700px] select-text">
          <pre className="text-slate-300 whitespace-pre">
            {generatedCode}
          </pre>
        </div>

        {/* Code Footer Bar */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400">
          <div>
            Included: <span className="text-emerald-400">updateFMSFromResponses()</span>, <span className="text-emerald-400">onEdit(e)</span>, <span className="text-emerald-400">fmsSetWhatsAppLinkForOrder_()</span>, <span className="text-emerald-400">fmsCloseOrder_()</span>, <span className="text-emerald-400">fmsReopenOrder_()</span>
          </div>
          <button
            onClick={handleDownload}
            className="text-slate-300 hover:text-white underline"
          >
            Download .gs file
          </button>
        </div>
      </div>
    </div>
  );
};
