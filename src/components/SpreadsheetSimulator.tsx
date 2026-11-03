import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GroupedOrder, ProductOrderRow, OrderItem } from '../types/fms';
import { initialRawResponses, initialExistingDispatch, fmsColumnMapping, productOrderColumns } from '../data/sampleOrders';
import { ProductOrderView, isDateOrTimestampStr, DEFAULT_BRANCH_HEAD_NAME, DEFAULT_BRANCH_HEAD_EMAIL, MONTH_OPTIONS, parseOrderDateParts } from './ProductOrderView';
import { saveOrdersToStorage, loadOrdersFromStorage, clearOrdersFromStorage } from '../utils/orderStorage';
import {
  RotateCcw,
  PlusCircle,
  Play,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  SplitSquareVertical,
  Edit3,
  AlertTriangle,
  FileCode2,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  X,
  Download,
  Filter,
  Search,
  Plus,
  Trash2,
  Table,
  Archive,
  FileSpreadsheet,
  Zap,
  CheckSquare,
  Clock,
  ArrowUpDown,
  Eye,
  EyeOff,
  Columns,
  CloudUpload,
  Database,
  Flame,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Upload,
  Lock,
  Pin,
  FileText,
  Github,
  Maximize2,
  Minimize2,
  Loader2,
  Link2,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'ginza_fms_sheet_orders_v9';
const LOCAL_STORAGE_DISPATCH_KEY = 'ginza_fms_sheet_dispatch_v9';
const LOCAL_STORAGE_COL_VISIBILITY = 'ginza_fms_col_visibility_v10';
const LOCAL_STORAGE_FIREBASE_CONFIG = 'ginza_fms_firebase_cfg_v9';
const LOCAL_STORAGE_FREEZE_CONFIG = 'ginza_fms_freeze_cfg_v9';
const LOCAL_STORAGE_CONFIRM_KEY = 'ginza_fms_confirm_msg_v9';
const LOCAL_STORAGE_COL_AA_KEY = 'ginza_fms_col_aa_v10';
const LOCAL_STORAGE_COL_AB_KEY = 'ginza_fms_col_ab_v10';
const LOCAL_STORAGE_COL_AG_KEY = 'ginza_fms_col_ag_v10';
const LOCAL_STORAGE_COL_AH_KEY = 'ginza_fms_col_ah_v10';
const LOCAL_STORAGE_COL_AI_KEY = 'ginza_fms_col_ai_v10';
const LOCAL_STORAGE_COL_AJ_KEY = 'ginza_fms_col_aj_v10';
const LOCAL_STORAGE_COL_AK_KEY = 'ginza_fms_col_ak_v10';
const LOCAL_STORAGE_COL_AL_KEY = 'ginza_fms_col_al_v10';

/**
 * Cleans any ProductOrderRow so that:
 * 1) Date/time strings never appear in referenceNo (Col 1 Order No) or orderNo (Col 27 / Col X Order No).
 * 2) Blank Branch Head Name defaults to "Vinay Chhajer" and blank Branch Head Email defaults to "vinay.chhajer@ginzalimited.com".
 */
function sanitizeProductOrderRow(row: ProductOrderRow): ProductOrderRow {
  const rawRef = (row.referenceNo || '').trim();
  const rawOrdNo = (row.orderNo || '').trim();
  let cleanRef = rawRef;
  let cleanTimestamp = (row.timestamp || '').trim();
  let cleanOrderNo = rawOrdNo;
  let cleanOrderNoTs = (row.orderNoTimestamp || '').trim();

  if (isDateOrTimestampStr(rawRef)) {
    if (!cleanTimestamp) cleanTimestamp = rawRef;
    cleanRef = '';
  }

  if (isDateOrTimestampStr(rawOrdNo)) {
    if (!cleanOrderNoTs) cleanOrderNoTs = rawOrdNo;
    cleanOrderNo = '';
  }

  const rawHeadName = (row.branchHeadName || '').trim();
  const cleanHeadName =
    rawHeadName && rawHeadName !== '—' && rawHeadName !== '-' && !isDateOrTimestampStr(rawHeadName)
      ? rawHeadName
      : DEFAULT_BRANCH_HEAD_NAME;

  const rawHeadEmail = (row.branchHeadEmail || '').trim();
  const cleanHeadEmail =
    rawHeadEmail && rawHeadEmail !== '—' && rawHeadEmail !== '-' && !isDateOrTimestampStr(rawHeadEmail)
      ? rawHeadEmail
      : DEFAULT_BRANCH_HEAD_EMAIL;

  return {
    ...row,
    referenceNo: cleanRef,
    timestamp: cleanTimestamp,
    orderNo: cleanOrderNo,
    orderNoTimestamp: cleanOrderNoTs,
    branchHeadName: cleanHeadName,
    branchHeadEmail: cleanHeadEmail
  };
}

interface SpreadsheetSimulatorProps {
  isFullWidth?: boolean;
  setIsFullWidth?: (val: boolean) => void;
}

export const SpreadsheetSimulator: React.FC<SpreadsheetSimulatorProps> = ({
  isFullWidth = true,
  setIsFullWidth
}) => {
  // Load saved orders from localStorage or fallback to updated real orders
  const [rawResponses, setRawResponses] = useState<ProductOrderRow[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(sanitizeProductOrderRow);
        }
      }
    } catch (e) {
      console.error('Failed to parse saved orders', e);
    }
    return initialRawResponses.map(sanitizeProductOrderRow);
  });

  // Guard so initial 14 sample rows never overwrite a large 6,000+ row IndexedDB dataset before async hydration finishes
  const isStorageHydratedRef = useRef<boolean>(false);

  // Load larger datasets (6,000+ rows) from IndexedDB on initial mount and sanitize any legacy date-in-OrderNo or blank Branch Head fields
  useEffect(() => {
    loadOrdersFromStorage()
      .then((saved) => {
        if (saved && Array.isArray(saved) && saved.length > 0) {
          const cleaned = saved.map(sanitizeProductOrderRow);
          setRawResponses(cleaned);
          saveOrdersToStorage(cleaned);
        }
      })
      .finally(() => {
        isStorageHydratedRef.current = true;
      });
  }, []);

  // State for user-entered dispatch quantities in Col Y
  const [dispatchRecords, setDispatchRecords] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_DISPATCH_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved dispatch', e);
    }
    return initialExistingDispatch;
  });

  // Column Visibility state (Allows hiding/showing manual columns like Addresses, Follow-ups, etc.)
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COL_VISIBILITY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          AA: parsed.AA ?? true,
          AB: parsed.AB ?? true,
          AG: parsed.AG ?? true,
          AH: parsed.AH ?? true,
          AI: parsed.AI ?? true,
          AJ: parsed.AJ ?? true,
          AK: parsed.AK ?? true,
          AL: parsed.AL ?? true,
        };
      }
    } catch (e) {}
    // Default: Show core 26 columns + operational columns AA, AB, AE, AF, AG, AH, AI, AJ, AK, AL, AM, AN, AO, AP
    const initial: Record<string, boolean> = {};
    fmsColumnMapping.forEach(col => {
      const isExtra = ['AC', 'AD', 'AQ', 'AR', 'AS'].includes(col.sheetCol);
      initial[col.sheetCol] = !isExtra;
    });
    return initial;
  });

  // Freeze Configuration: freezeColumns (0, 1: #, 2: # + PO, 3: # + PO + Name), freezeRows (1: Header, 0: None)
  const [freezeColumns, setFreezeColumns] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_FREEZE_CONFIG);
      if (saved) return JSON.parse(saved).cols ?? 2;
    } catch (e) {}
    return 2; // Default: Freeze # and Customer PO for easy scrolling
  });

  const [freezeRows, setFreezeRows] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_FREEZE_CONFIG);
      if (saved) return JSON.parse(saved).rows ?? 1;
    } catch (e) {}
    return 1;
  });
  const [showFreezeMenu, setShowFreezeMenu] = useState(false);

  // Auto-Fit Columns state (Automatically adjusts every column width to fit its data/text)
  const [autoFitColumns, setAutoFitColumns] = useState<boolean>(true);

  // Clear Product Automation Confirmation Modal
  const [showClearAutomationModal, setShowClearAutomationModal] = useState(false);

  // Syncing state for =IMPORTRANGE("1ciwoXm38UcdjVe8n2LB51H66NLyel1Q1FERMb42AfGY","Delhi!A:Z")
  const [isSyncingImportRange, setIsSyncingImportRange] = useState(false);

  // Column Dropdown Filter State: Record<colLetter, string[]>
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});

  // Active Sorting: { column: string; direction: 'asc' | 'desc' }
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

  // Active popover filter menu
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);

  // Column Visibility Manager modal
  const [showColManager, setShowColManager] = useState(false);
  const [selectedColsToHide, setSelectedColsToHide] = useState<string[]>([]);

  // Excel / CSV / Google Sheet Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTabMode, setImportTabMode] = useState<'sheet' | 'paste' | 'file'>('sheet');
  const [importSheetId, setImportSheetId] = useState('15jjr5tjxaWRPiv_nh6L9EZyFHNFZyQ3PQ6Jd89cV4k0');
  const [importTabName, setImportTabName] = useState('Order Automation 1');
  const [autoSyncToFirebase, setAutoSyncToFirebase] = useState(true);
  const [importReplaceMode, setImportReplaceMode] = useState(true);
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [pastedDataText, setPastedDataText] = useState('');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Vercel / GitHub Deployment Modal
  const [showVercelGuide, setShowVercelGuide] = useState(false);

  const DEFAULT_FIREBASE_RTDB_URL = 'https://delhi-product-order-default-rtdb.firebaseio.com';
  const DEFAULT_FIREBASE_SECRET = 'iIElINFgR124ssaG3QWjExz2lT72cRh5g502oP6J';

  // Helper to normalize Firebase Realtime Database URL (even if user pastes Console URL)
  const normalizeFirebaseDbUrl = (raw: string): string => {
    const trimmed = (raw || '').trim();
    if (!trimmed || trimmed.includes('ginza-fms-default-rtdb.firebaseio.com')) {
      return DEFAULT_FIREBASE_RTDB_URL;
    }
    // If user pasted Firebase Console URL: https://console.firebase.google.com/.../database/ INSTANCE_NAME /data...
    const consoleMatch = trimmed.match(/\/database\/([a-zA-Z0-9-]+)\/data/i);
    if (consoleMatch && consoleMatch[1]) {
      return `https://${consoleMatch[1]}.firebaseio.com`;
    }
    return trimmed
      .replace(/\/data(\/.*)?$/i, '')
      .replace(/\/product_automation(\.json)?$/i, '')
      .replace(/\/closed_orders(\.json)?$/i, '')
      .replace(/\.json$/i, '')
      .replace(/\/+$/, '');
  };

  // Firebase Live Sync & Historical Upload Modal
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [firebaseStatusMsg, setFirebaseStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [firebaseUrl, setFirebaseUrl] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_FIREBASE_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url && !parsed.url.includes('ginza-fms-default-rtdb.firebaseio.com')) {
          return parsed.url.replace(/\/+$/, '');
        }
      }
    } catch (e) {}
    return DEFAULT_FIREBASE_RTDB_URL;
  });
  const [firebaseSecret, setFirebaseSecret] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_FIREBASE_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.secret && parsed.secret.trim() !== '') {
          return parsed.secret.trim();
        }
      }
    } catch (e) {}
    return DEFAULT_FIREBASE_SECRET;
  });
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Col AE: Instant Confirmation Msg Status ("Message Sent" vs "Pending")
  const [aeStatuses, setAeStatuses] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CONFIRM_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      '5277_Fashion Dupatta Corner (Delhi)_amanpreet0704@gmail.com_8468829837_29/01/2026': 'Message Sent',
      '5281_Nandani Lace House (Delhi)_N/A_8800421410_29/01/2026': 'Message Sent',
      'N/A_Ganpati Dupatta House (Amritsar)_ganpatidupattahouse1@yahoo.com_9417054532_29/01/2026': 'Message Sent'
    };
  });

  // Col AO: Dispatch Status ("Message Sent" vs "Pending")
  const [aoStatuses, setAoStatuses] = useState<Record<string, string>>({
    '5277_Fashion Dupatta Corner (Delhi)_amanpreet0704@gmail.com_8468829837_29/01/2026': 'Message Sent',
    'N/A_Ganpati Dupatta House (Amritsar)_ganpatidupattahouse1@yahoo.com_9417054532_29/01/2026': 'Message Sent',
    '5281_Nandani Lace House (Delhi)_N/A_8800421410_29/01/2026': 'Pending'
  });

  // Col AM: LR- Number state
  const [lrNumbers, setLrNumbers] = useState<Record<string, string>>({
    '5277_Fashion Dupatta Corner (Delhi)_amanpreet0704@gmail.com_8468829837_29/01/2026': 'ATC-98442',
    'N/A_M G Enterprises (Delhi)_m.g.enterprises27474@gmail.com_9811138454_29/01/2026': '',
    'N/A_Ganpati Dupatta House (Amritsar)_ganpatidupattahouse1@yahoo.com_9417054532_29/01/2026': 'HARI-1290',
    '5281_Nandani Lace House (Delhi)_N/A_8800421410_29/01/2026': 'MEHTA-0041'
  });

  // Col AA: Status (Manual User Text Edit with Auto-Save)
  const [colAAStatuses, setColAAStatuses] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COL_AA_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      '5277_Fashion Dupatta Corner (Delhi)_amanpreet0704@gmail.com_8468829837_29/01/2026': 'In Production',
      'N/A_Ganpati Dupatta House (Amritsar)_ganpatidupattahouse1@yahoo.com_9417054532_29/01/2026': 'Partial Dispatched',
      '5281_Nandani Lace House (Delhi)_N/A_8800421410_29/01/2026': 'In Production'
    };
  });

  // Col AB: Logistics Remark (Manual User Text Edit with Auto-Save)
  const [colABRemarks, setColABRemarks] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COL_AB_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      '5277_Fashion Dupatta Corner (Delhi)_amanpreet0704@gmail.com_8468829837_29/01/2026': 'Confirm to Viren 15 days',
      'N/A_Ganpati Dupatta House (Amritsar)_ganpatidupattahouse1@yahoo.com_9417054532_29/01/2026': 'Phutta pack 56"',
      '5281_Nandani Lace House (Delhi)_N/A_8800421410_29/01/2026': '4-5 days delivery'
    };
  });

  // Col AG: Follow-up 1 Checkbox (true/false)
  const [colAGChecks, setColAGChecks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COL_AG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      '5277_Fashion Dupatta Corner (Delhi)_amanpreet0704@gmail.com_8468829837_29/01/2026': true,
      'N/A_Ganpati Dupatta House (Amritsar)_ganpatidupattahouse1@yahoo.com_9417054532_29/01/2026': true
    };
  });

  // Col AH: Follow-up 1 Timestamp (Auto populated when Col AG checked)
  const [colAHTimestamps, setColAHTimestamps] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COL_AH_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      '5277_Fashion Dupatta Corner (Delhi)_amanpreet0704@gmail.com_8468829837_29/01/2026': '30/01/2026, 11:20:00 am',
      'N/A_Ganpati Dupatta House (Amritsar)_ganpatidupattahouse1@yahoo.com_9417054532_29/01/2026': '30/01/2026, 02:45:10 pm'
    };
  });

  // Col AI: Follow-up 1 Remark (Manual User Text Edit with Auto-Save)
  const [colAIRemarks, setColAIRemarks] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COL_AI_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      '5277_Fashion Dupatta Corner (Delhi)_amanpreet0704@gmail.com_8468829837_29/01/2026': 'Confirmed with client delivery schedule',
      'N/A_Ganpati Dupatta House (Amritsar)_ganpatidupattahouse1@yahoo.com_9417054532_29/01/2026': '413 Mtr sent via Hari Transport'
    };
  });

  // Col AJ: Follow-up 2 Checkbox (true/false)
  const [colAJChecks, setColAJChecks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COL_AJ_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      'N/A_Ganpati Dupatta House (Amritsar)_ganpatidupattahouse1@yahoo.com_9417054532_29/01/2026': true
    };
  });

  // Col AK: Follow-up 2 Timestamp (Auto populated when Col AJ checked)
  const [colAKTimestamps, setColAKTimestamps] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COL_AK_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      'N/A_Ganpati Dupatta House (Amritsar)_ganpatidupattahouse1@yahoo.com_9417054532_29/01/2026': '31/01/2026, 10:15:22 am'
    };
  });

  // Col AL: Follow-up 2 Remark (Manual User Text Edit with Auto-Save)
  const [colALRemarks, setColALRemarks] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COL_AL_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      'N/A_Ganpati Dupatta House (Amritsar)_ganpatidupattahouse1@yahoo.com_9417054532_29/01/2026': 'Balance 67 Mtr pending next roll lot'
    };
  });

  // Active Sheet tab: 'product_order' (28-Col Raw Flat Sheet), 'automation' (Product Automation: Active Orders), 'closed' (Closed Orders Archive)
  const [activeSheetTab, setActiveSheetTab] = useState<'product_order' | 'automation' | 'closed'>('product_order');

  // Status Filter in Toolbar
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Open' | 'In-Progress' | 'Closed'>('ALL');

  // Month & Year Filter for Order Automation / Closed Orders tabs
  const [automationMonth, setAutomationMonth] = useState<string>('ALL');
  const [automationYear, setAutomationYear] = useState<string>('ALL');

  // View mode: 'merged' (Customer A-E & N-X Vertically Merged) vs 'unmerged' (Flat row-wise)
  const [viewMode, setViewMode] = useState<'merged' | 'unmerged'>('merged');

  // Global search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Status message for simulation feedback
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Modal for previewing WhatsApp dispatch link (Col AO -> AP)
  const [whatsAppModalOrder, setWhatsAppModalOrder] = useState<GroupedOrder | null>(null);
  const [copiedWhatsAppMsg, setCopiedWhatsAppMsg] = useState(false);

  // Modal for previewing Instant Confirmation WhatsApp (Col AE -> AF)
  const [confirmWhatsAppModalOrder, setConfirmWhatsAppModalOrder] = useState<GroupedOrder | null>(null);
  const [copiedConfirmMsg, setCopiedConfirmMsg] = useState(false);

  // Modal for New Order entry
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  // Modal for adding item to existing order
  const [addingItemToOrder, setAddingItemToOrder] = useState<GroupedOrder | null>(null);

  // Quick edit modal for Order No (Col X)
  const [editingOrderNo, setEditingOrderNo] = useState<{ key: string; po: string; value: string } | null>(null);

  // Debounced safe saving to IndexedDB (supports 10,000+ items without 3,000 cap)
  useEffect(() => {
    if (!isStorageHydratedRef.current) return;
    const timer = setTimeout(() => {
      // 1. Save entire array to IndexedDB (no 3,000 cap, supports 10,000+ rows)
      saveOrdersToStorage(rawResponses);
      // 2. Safe fallback to localStorage for smaller datasets
      try {
        if (rawResponses.length <= 1500) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rawResponses));
        }
      } catch (e) {
        // LocalStorage quota reached, safely handled by IndexedDB above
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [rawResponses]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_STORAGE_DISPATCH_KEY, JSON.stringify(dispatchRecords));
      } catch (e) {}
    }, 600);
    return () => clearTimeout(timer);
  }, [dispatchRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_COL_VISIBILITY, JSON.stringify(visibleCols));
    } catch (e) {}
  }, [visibleCols]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_FREEZE_CONFIG, JSON.stringify({ cols: freezeColumns, rows: freezeRows }));
    } catch (e) {}
  }, [freezeColumns, freezeRows]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_STORAGE_CONFIRM_KEY, JSON.stringify(aeStatuses));
        localStorage.setItem(LOCAL_STORAGE_COL_AA_KEY, JSON.stringify(colAAStatuses));
        localStorage.setItem(LOCAL_STORAGE_COL_AB_KEY, JSON.stringify(colABRemarks));
        localStorage.setItem(LOCAL_STORAGE_COL_AG_KEY, JSON.stringify(colAGChecks));
        localStorage.setItem(LOCAL_STORAGE_COL_AH_KEY, JSON.stringify(colAHTimestamps));
        localStorage.setItem(LOCAL_STORAGE_COL_AI_KEY, JSON.stringify(colAIRemarks));
        localStorage.setItem(LOCAL_STORAGE_COL_AJ_KEY, JSON.stringify(colAJChecks));
        localStorage.setItem(LOCAL_STORAGE_COL_AK_KEY, JSON.stringify(colAKTimestamps));
        localStorage.setItem(LOCAL_STORAGE_COL_AL_KEY, JSON.stringify(colALRemarks));
      } catch (e) {}
    }, 600);
    return () => clearTimeout(timer);
  }, [
    aeStatuses,
    colAAStatuses,
    colABRemarks,
    colAGChecks,
    colAHTimestamps,
    colAIRemarks,
    colAJChecks,
    colAKTimestamps,
    colALRemarks
  ]);

  // Group raw responses into consecutive order blocks while preserving 100% of rows & detecting duplicate rows
  const groupedOrders: GroupedOrder[] = useMemo(() => {
    // 1. Pre-scan for duplicate rows within the same sheet tab
    const sigCounts: Record<string, number> = {};
    const sigSeenIndex: Record<string, number> = {};

    const buildDupSig = (row: ProductOrderRow): string => {
      const tabBucket = row.sheetSource || (row.statusAN === 'Closed' ? 'closed' : 'automation');
      const po = (row.customerPO || '').toLowerCase().trim();
      const cust = (row.customerName || '').toLowerCase().trim();
      const item = (row.itemName || '').toLowerCase().trim();
      const color = (row.color || '').toLowerCase().trim();
      const width = (row.width || '').toLowerCase().trim();
      const qty = String(row.qty || 0);
      const ordNo = (row.orderNo || '').toLowerCase().trim();
      if (!cust && !item && !po) return '';
      return `${tabBucket}|${po}|${cust}|${ordNo}|${item}|${color}|${width}|${qty}`;
    };

    rawResponses.forEach((row) => {
      const sig = buildDupSig(row);
      if (sig) {
        sigCounts[sig] = (sigCounts[sig] || 0) + 1;
      }
    });

    // 2. Group consecutive rows belonging to the same customer order into Vertically Merged Order Blocks ("Merged Visual View")
    const result: GroupedOrder[] = [];
    let lastGroup: GroupedOrder | null = null;
    let lastBucket = '';
    let lastNormCust = '';
    let lastNormPO = '';
    let lastNormDate = '';
    let lastNormOrdNo = '';

    rawResponses.forEach((row, idx) => {
      const baseOrderKey = [
        row.customerPO,
        row.customerName,
        row.customerEmail,
        row.customerNumber,
        row.orderDate
      ].map(v => (v || '').trim()).join('_');

      const normBucket = row.sheetSource === 'closed' || row.statusAN === 'Closed' ? 'closed' : 'active';
      const poClean = (row.customerPO || '').trim();
      const normPO = ['n/a', '-', 'nil', 'na'].includes(poClean.toLowerCase()) ? '' : poClean.toLowerCase();
      const ordNoClean = (row.orderNo || '').trim();
      const normOrdNo = ordNoClean.toLowerCase();
      const custClean = (row.customerName || '').trim();
      const normCust = custClean.toLowerCase();
      const dateClean = (row.orderDate || '').trim();
      const normDate = dateClean.toLowerCase();

      // Merge if continuation sub-row (blank customer name with item data) OR consecutive row for same Customer + PO + Date
      const isContinuationSubRow =
        lastGroup !== null &&
        lastBucket === normBucket &&
        normCust === '' &&
        Boolean((row.itemName && row.itemName.trim() !== '') || row.qty);

      const isSameCustomerOrderBlock =
        lastGroup !== null &&
        lastBucket === normBucket &&
        normCust !== '' &&
        lastNormCust === normCust &&
        lastNormPO === normPO &&
        lastNormDate === normDate &&
        (lastNormOrdNo === normOrdNo || lastNormOrdNo === '' || normOrdNo === '');

      const canMergeWithPrevious = isContinuationSubRow || isSameCustomerOrderBlock;

      const dupSig = buildDupSig(row);
      const dupTotal = dupSig ? (sigCounts[dupSig] || 1) : 1;
      const isDuplicate = dupTotal > 1;
      if (dupSig) {
        sigSeenIndex[dupSig] = (sigSeenIndex[dupSig] || 0) + 1;
      }

      if (!canMergeWithPrevious || !lastGroup) {
        const uniqueOrderKey = `${baseOrderKey}__G${idx}`;
        lastGroup = {
          orderKey: baseOrderKey,
          referenceNo: row.referenceNo || '',
          timestamp: row.timestamp || '',
          customerPO: row.customerPO || '',
          customerName: row.customerName || '',
          customerEmail: row.customerEmail || '',
          orderDate: row.orderDate || '',
          items: [],
          remark: row.remark || '',
          customerNumber: row.customerNumber || '',
          billingAddress: row.billingAddress || '',
          deliveryAddress: row.deliveryAddress || '',
          transporterName: row.transporterName || '',
          salesPerson: row.salesPerson || '',
          accountStatus: row.accountStatus || '',
          branch: row.branch || '',
          approvalStatus: row.approvalStatus || '',
          branchHeadName: row.branchHeadName || '',
          branchHeadEmail: row.branchHeadEmail || '',
          orderNo: row.orderNo || '',
          orderNoTimestamp: row.orderNoTimestamp || '',
          statusAN: (row.statusAN as any) || 'Open',
          sheetSource: row.sheetSource,
          colAA: row.colAA,
          colAB: row.colAB,
          colAC: row.colAC,
          colAD: row.colAD,
          colAE: row.colAE,
          colAG: row.colAG,
          colAH: row.colAH,
          colAI: row.colAI,
          colAJ: row.colAJ,
          colAK: row.colAK,
          colAL: row.colAL,
          lrNumber: row.lrNumber,
          colAO: row.colAO
        };
        // Keep baseOrderKey for operational state lookups, or unique if blank
        if (!baseOrderKey.replace(/_/g, '')) {
          lastGroup.orderKey = uniqueOrderKey;
        }
        result.push(lastGroup);
        lastBucket = normBucket;
        lastNormCust = normCust;
        lastNormPO = normPO;
        lastNormDate = normDate;
        lastNormOrdNo = normOrdNo;
      } else {
        if (!lastGroup.orderNo && row.orderNo) {
          lastGroup.orderNo = row.orderNo;
          lastGroup.orderNoTimestamp = row.orderNoTimestamp;
          lastNormOrdNo = normOrdNo;
        }
        if (!lastGroup.colAA && row.colAA) lastGroup.colAA = row.colAA;
        if (!lastGroup.colAB && row.colAB) lastGroup.colAB = row.colAB;
        if (!lastGroup.colAC && row.colAC) lastGroup.colAC = row.colAC;
        if (!lastGroup.colAD && row.colAD) lastGroup.colAD = row.colAD;
        if (!lastGroup.colAE && row.colAE) lastGroup.colAE = row.colAE;
        if (lastGroup.colAG === undefined && row.colAG !== undefined) lastGroup.colAG = row.colAG;
        if (!lastGroup.colAH && row.colAH) lastGroup.colAH = row.colAH;
        if (!lastGroup.colAI && row.colAI) lastGroup.colAI = row.colAI;
        if (lastGroup.colAJ === undefined && row.colAJ !== undefined) lastGroup.colAJ = row.colAJ;
        if (!lastGroup.colAK && row.colAK) lastGroup.colAK = row.colAK;
        if (!lastGroup.colAL && row.colAL) lastGroup.colAL = row.colAL;
        if (!lastGroup.lrNumber && row.lrNumber) lastGroup.lrNumber = row.lrNumber;
        if (!lastGroup.colAO && row.colAO) lastGroup.colAO = row.colAO;
      }

      const itemKey = `${lastGroup.orderKey}___${(row.itemName || '').trim()}___${(row.color || '').trim()}___${(row.width || '').trim()}`;
      const dispatch =
        dispatchRecords[row.orderId] !== undefined
          ? dispatchRecords[row.orderId]
          : row.dispatchQty !== undefined && row.dispatchQty !== null
          ? row.dispatchQty
          : dispatchRecords[itemKey] !== undefined
          ? dispatchRecords[itemKey]
          : 0;
      const balance =
        row.balanceQty !== undefined &&
        row.balanceQty !== null &&
        dispatchRecords[row.orderId] === undefined &&
        dispatchRecords[itemKey] === undefined
          ? row.balanceQty
          : Number(((row.qty || 0) - dispatch).toFixed(4));

      lastGroup.items.push({
        id: row.orderId,
        unit: row.unit || '',
        itemName: row.itemName || '',
        color: row.color || '',
        width: row.width || '',
        unitOfItem: row.unitOfItem || '',
        qty: row.qty || 0,
        rate: row.rate || 0,
        discount: row.discount || 0,
        deliveryDate: row.deliveryDate || '',
        dispatchQty: dispatch,
        balanceQty: balance,
        statusAN: (row.statusAN as any) || 'Open',
        isDuplicate,
        duplicateCount: dupTotal,
        duplicateGroupIndex: dupSig ? sigSeenIndex[dupSig] : 1
      });
    });

    return result;
  }, [rawResponses, dispatchRecords]);

  // Handle Status AN Dropdown Change PER ITEM: 'Open' | 'In-Progress' | 'Closed'
  // Automatically syncs to Firebase Realtime Database so Closed Orders appear on every system/device!
  const handleItemStatusChange = (orderId: string, newStatus: 'Open' | 'In-Progress' | 'Closed') => {
    let affectedItemName = '';
    setRawResponses(prev => {
      const updated = prev.map(row => {
        if (row.orderId === orderId) {
          affectedItemName = row.itemName;
          return {
            ...row,
            statusAN: newStatus,
            sheetSource: newStatus === 'Closed' ? ('closed' as const) : ('product_order' as const)
          };
        }
        return row;
      });
      // Immediately push updated status (including Closed Orders) to Firebase Cloud
      pushOrdersToFirebase(updated).catch(() => {});
      return updated;
    });

    setSyncFeedback(
      `Item "${affectedItemName || orderId}" Col AN set to "${newStatus}". ${
        newStatus === 'Closed'
          ? 'Moved to "Closed Orders" tab & synced to Firebase Cloud!'
          : 'Active in "Order Automation" & synced to Firebase Cloud!'
      }`
    );
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Handle changing Dispatch Qty in Col Y
  const handleDispatchChange = (orderKey: string, item: { itemName: string; color: string; width: string }, newQtyStr: string) => {
    const val = newQtyStr === '' ? 0 : (Number(newQtyStr) || 0);
    const itemKey = `${orderKey}___${item.itemName.trim()}___${item.color.trim()}___${item.width.trim()}`;

    setDispatchRecords(prev => ({
      ...prev,
      [item.id]: val,
      [itemKey]: val
    }));

    setRawResponses(prev =>
      prev.map(row => {
        if (row.orderId === item.id) {
          return {
            ...row,
            dispatchQty: val,
            balanceQty: Number(((row.qty || 0) - val).toFixed(4))
          };
        }
        return row;
      })
    );
  };

  // Delete an entire order
  const handleDeleteOrder = (orderKey: string, poName: string) => {
    if (!window.confirm(`Are you sure you want to delete order "${poName}"?`)) return;
    setRawResponses(prev =>
      prev.filter(row => {
        const key = [
          row.customerPO,
          row.customerName,
          row.customerEmail,
          row.customerNumber,
          row.orderDate
        ].map(v => (v || '').trim()).join('_');
        return key !== orderKey;
      })
    );
    setSyncFeedback(`Order ${poName} deleted successfully.`);
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  // Delete single item row
  const handleDeleteItem = (itemOrderId: string) => {
    setRawResponses(prev => prev.filter(row => row.orderId !== itemOrderId));
    setSyncFeedback(`Item row removed.`);
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  // Clear / Delete all rows from Product Order tab (Wipes table to 0 rows for clean 1:1 fresh upload)
  const handleClearAllProductOrders = async () => {
    setRawResponses([]);
    setDispatchRecords({});
    await clearOrdersFromStorage();
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_DISPATCH_KEY);
    } catch (e) {}
    setSyncFeedback('✓ All rows deleted from Product Order tab. Ready for clean 1:1 fresh upload!');
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Clear / Wipe Product Automation Tab (and all operational states) for fresh new data upload
  const handleClearAutomationTab = async (openImportAfter: boolean = false) => {
    setRawResponses([]);
    setDispatchRecords({});
    setAeStatuses({});
    setAoStatuses({});
    setLrNumbers({});
    setColAAStatuses({});
    setColABRemarks({});
    setColAGChecks({});
    setColAHTimestamps({});
    setColAIRemarks({});
    setColAJChecks({});
    setColAKTimestamps({});
    setColALRemarks({});
    await clearOrdersFromStorage();
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_DISPATCH_KEY);
      localStorage.removeItem(LOCAL_STORAGE_CONFIRM_KEY);
      localStorage.removeItem(LOCAL_STORAGE_COL_AA_KEY);
      localStorage.removeItem(LOCAL_STORAGE_COL_AB_KEY);
      localStorage.removeItem(LOCAL_STORAGE_COL_AG_KEY);
      localStorage.removeItem(LOCAL_STORAGE_COL_AH_KEY);
      localStorage.removeItem(LOCAL_STORAGE_COL_AI_KEY);
      localStorage.removeItem(LOCAL_STORAGE_COL_AJ_KEY);
      localStorage.removeItem(LOCAL_STORAGE_COL_AK_KEY);
      localStorage.removeItem(LOCAL_STORAGE_COL_AL_KEY);
    } catch (e) {}
    setShowClearAutomationModal(false);
    setSyncFeedback('✓ Product Automation tab cleared completely (0 rows). Ready for new data!');
    setTimeout(() => setSyncFeedback(null), 4500);

    if (openImportAfter) {
      setImportReplaceMode(true);
      setImportError(null);
      setShowImportModal(true);
    }
  };

  // Add Item to existing order
  const handleAddItemToExistingOrder = (order: GroupedOrder, newItemData: Partial<OrderItem>) => {
    const newId = `ORD-${Date.now().toString().slice(-4)}`;
    const newRow: ProductOrderRow = {
      orderId: newId,
      timestamp: order.timestamp,
      customerPO: order.customerPO,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      orderDate: order.orderDate,
      unit: newItemData.unit || 'WARP(UDHANA)',
      itemName: newItemData.itemName || 'L-4014/NS',
      color: newItemData.color || 'White',
      width: newItemData.width || '56"',
      unitOfItem: newItemData.unitOfItem || 'MTR',
      qty: Number(newItemData.qty) || 100,
      rate: Number(newItemData.rate) || 150,
      discount: Number(newItemData.discount) || 0,
      deliveryDate: newItemData.deliveryDate || '15/11/2026',
      remark: order.remark,
      customerNumber: order.customerNumber,
      billingAddress: order.billingAddress,
      deliveryAddress: order.deliveryAddress,
      transporterName: order.transporterName,
      salesPerson: order.salesPerson,
      accountStatus: order.accountStatus,
      branch: order.branch,
      approvalStatus: order.approvalStatus,
      branchHeadName: '',
      orderNo: order.orderNo,
      statusAN: order.statusAN || 'Open'
    };

    setRawResponses(prev => [...prev, newRow]);
    setAddingItemToOrder(null);
    setSyncFeedback(`Added item "${newItemData.itemName}" to order ${order.customerPO}! Merged block expanded.`);
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Save new multi-item order from modal
  const handleCreateNewOrder = (orderData: {
    customerPO: string;
    customerName: string;
    customerEmail: string;
    customerNumber: string;
    orderDate: string;
    billingAddress: string;
    deliveryAddress: string;
    transporterName: string;
    salesPerson: string;
    orderNo: string;
    remark: string;
    statusAN: 'Open' | 'In-Progress' | 'Closed';
    items: Array<{
      unit: string;
      itemName: string;
      color: string;
      width: string;
      unitOfItem: string;
      qty: number;
      rate: number;
      discount: number;
      deliveryDate: string;
    }>;
  }) => {
    const nowStr = new Date().toLocaleString('en-IN');
    const newRows: ProductOrderRow[] = orderData.items.map((it, idx) => ({
      orderId: `ORD-${Date.now()}-${idx + 1}`,
      timestamp: nowStr,
      customerPO: orderData.customerPO,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      orderDate: orderData.orderDate || new Date().toISOString().split('T')[0],
      unit: it.unit || 'WARP(UDHANA)',
      itemName: it.itemName,
      color: it.color,
      width: it.width,
      unitOfItem: it.unitOfItem,
      qty: Number(it.qty) || 0,
      rate: Number(it.rate) || 0,
      discount: Number(it.discount) || 0,
      deliveryDate: it.deliveryDate,
      remark: orderData.remark,
      customerNumber: orderData.customerNumber,
      billingAddress: orderData.billingAddress,
      deliveryAddress: orderData.deliveryAddress,
      transporterName: orderData.transporterName,
      salesPerson: orderData.salesPerson,
      accountStatus: 'Approved',
      branch: 'Mumbai Central',
      approvalStatus: 'APPROVED',
      branchHeadName: orderData.salesPerson,
      orderNo: orderData.orderNo,
      statusAN: orderData.statusAN
    }));

    // Append new orders at the bottom of the sheet
    setRawResponses(prev => [...prev, ...newRows]);
    setShowNewOrderModal(false);
    setSyncFeedback(`New Order "${orderData.customerPO}" added at the bottom with ${orderData.items.length} items!`);
    setTimeout(() => setSyncFeedback(null), 4500);
  };

  // Reset to default sample data
  const handleReset = () => {
    if (window.confirm("Do you want to reset the sheet data to default sample records?")) {
      setRawResponses(initialRawResponses);
      setDispatchRecords(initialExistingDispatch);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_DISPATCH_KEY);
      setSyncFeedback("Reset to default sample data.");
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  // Format Timestamp in DD/MM/YYYY HH:mm:ss matching Google Sheet "Product Order" Column AB (28)
  const formatSheetColABTimestamp = (d: Date = new Date()): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // Push Order No (Col AA / 27) & Timestamp (Col AB / 28) updates to Firebase /product_order_aa_ab for 2-way Google Sheet <-> App sync
  const pushAAABOverrideToFirebase = async (rowsUpdated: ProductOrderRow[]) => {
    if (!rowsUpdated || rowsUpdated.length === 0) return;
    try {
      const baseTargetUrl = normalizeFirebaseDbUrl(firebaseUrl || DEFAULT_FIREBASE_RTDB_URL);
      const cleanSecret = (firebaseSecret || DEFAULT_FIREBASE_SECRET).trim();
      const authQuery = cleanSecret ? `?auth=${encodeURIComponent(cleanSecret)}` : '';
      const payload: Record<string, any> = {};

      rowsUpdated.forEach(r => {
        const orderSig = `${(r.customerPO || '').trim().toLowerCase()}|${(r.customerName || '').trim().toLowerCase()}|${(r.orderDate || '').trim().toLowerCase()}`
          .replace(/[.#$/[\]\s]+/g, '_');
        const rowMatchSig = `${(r.customerPO || '').trim().toLowerCase()}|${(r.customerName || '').trim().toLowerCase()}|${(r.itemName || '').trim().toLowerCase()}|${(r.color || '').trim().toLowerCase()}|${(r.width || '').trim().toLowerCase()}|${Number(r.qty) || 0}|${(r.orderDate || '').trim().toLowerCase()}`
          .replace(/[.#$/[\]\s]+/g, '_');
        const sheetRowNum = r.orderId.startsWith('DELHI-') ? Number(r.orderId.replace('DELHI-', '')) : undefined;

        const record = {
          order_no: r.orderNo || '',
          order_no_timestamp: r.orderNoTimestamp || '',
          reference_no: r.referenceNo || '',
          customer_po: r.customerPO || '',
          customer_name: r.customerName || '',
          order_date: r.orderDate || '',
          item_name: r.itemName || '',
          sheet_row: sheetRowNum || null,
          updated_at: new Date().toISOString()
        };
        if (orderSig) payload[`ord_${orderSig}`] = record;
        if (rowMatchSig) payload[`row_${rowMatchSig}`] = record;
      });

      await fetch(`${baseTargetUrl}/product_order_aa_ab.json${authQuery}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      // Ignore network errors silently
    }
  };

  // Generate or assign Order No for a row in Product Order sheet (and sync across all items of that same Customer Order block + Firebase + Sheet Col AA/AB)
  const handleGenerateOrderNo = (orderId: string, customNo?: string) => {
    const generatedNo = (customNo && customNo.trim() !== '')
      ? customNo.trim()
      : `DLFSO2526-0${Math.floor(1750 + Math.random() * 50)}`;
    const nowStr = formatSheetColABTimestamp();
    let affectedItem = '';

    setRawResponses(prev => {
      const targetRow = prev.find(r => r.orderId === orderId);
      const targetCust = (targetRow?.customerName || '').trim().toLowerCase();
      const targetPO = ['n/a', '-', 'nil', 'na'].includes((targetRow?.customerPO || '').trim().toLowerCase())
        ? ''
        : (targetRow?.customerPO || '').trim().toLowerCase();
      const targetDate = (targetRow?.orderDate || '').trim().toLowerCase();
      const changedRows: ProductOrderRow[] = [];

      const updatedAll = prev.map(row => {
        const rowCust = (row.customerName || '').trim().toLowerCase();
        const rowPO = ['n/a', '-', 'nil', 'na'].includes((row.customerPO || '').trim().toLowerCase())
          ? ''
          : (row.customerPO || '').trim().toLowerCase();
        const rowDate = (row.orderDate || '').trim().toLowerCase();
        const isSiblingOfSameOrder =
          targetCust !== '' &&
          rowCust === targetCust &&
          rowPO === targetPO &&
          rowDate === targetDate &&
          (!row.orderNo || row.orderNo.trim() === '' || row.orderNo === targetRow?.orderNo);

        if (row.orderId === orderId || isSiblingOfSameOrder) {
          if (row.orderId === orderId) affectedItem = row.itemName;
          const updatedRow: ProductOrderRow = {
            ...row,
            orderNo: generatedNo,
            orderNoTimestamp: nowStr,
            statusAN: row.statusAN || 'Open'
          };
          changedRows.push(updatedRow);
          return updatedRow;
        }
        return row;
      });

      // Immediately push to Firebase /product_order_aa_ab & /product_automation for 2-way sync
      pushAAABOverrideToFirebase(changedRows);
      pushOrdersToFirebase(updatedAll).catch(() => {});
      return updatedAll;
    });

    setSyncFeedback(
      `Order No "${generatedNo}" & Timestamp (${nowStr}) updated in Col AA (27) & Col AB (28) and synced to Cloud!`
    );
    setTimeout(() => setSyncFeedback(null), 4500);
  };

  // Generate Order No for all pending rows in Product Order
  const handleGenerateAllPendingOrderNo = () => {
    let counter = 1752;
    const nowStr = formatSheetColABTimestamp();
    let countGenerated = 0;

    setRawResponses(prev => {
      const changedRows: ProductOrderRow[] = [];
      const updatedAll = prev.map(row => {
        if (!row.orderNo || row.orderNo.trim() === '') {
          countGenerated++;
          const genNo = `DLFSO2526-0${counter++}`;
          const updatedRow: ProductOrderRow = {
            ...row,
            orderNo: genNo,
            orderNoTimestamp: nowStr,
            statusAN: row.statusAN || 'Open'
          };
          changedRows.push(updatedRow);
          return updatedRow;
        }
        return row;
      });
      pushAAABOverrideToFirebase(changedRows);
      pushOrdersToFirebase(updatedAll).catch(() => {});
      return updatedAll;
    });

    setSyncFeedback(
      `Generated Order Numbers for ${countGenerated} pending orders! All flowed to Order Automation & synced to Cloud.`
    );
    setTimeout(() => setSyncFeedback(null), 4500);
  };

  // Add new row into Product Order (Appends at the bottom like IMPORTRANGE)
  const handleAddNewProductOrderRow = (newRow: ProductOrderRow) => {
    setRawResponses(prev => {
      const updated = [...prev, newRow];
      pushOrdersToFirebase(updated).catch(() => {});
      return updated;
    });
    setSyncFeedback(`New Order ${newRow.customerPO} (${newRow.referenceNo}) added at the bottom of Product Order!`);
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Update row field in Product Order
  const handleUpdateProductOrderRow = (orderId: string, field: keyof ProductOrderRow, value: any) => {
    setRawResponses(prev => {
      const changedRows: ProductOrderRow[] = [];
      const updated = prev.map(row => {
        if (row.orderId === orderId) {
          const updatedRow = { ...row, [field]: value };
          if (field === 'orderNo' && value && !updatedRow.orderNoTimestamp) {
            updatedRow.orderNoTimestamp = formatSheetColABTimestamp();
          }
          changedRows.push(updatedRow);
          return updatedRow;
        }
        return row;
      });
      if (field === 'orderNo' || field === 'orderNoTimestamp') {
        pushAAABOverrideToFirebase(changedRows);
        pushOrdersToFirebase(updated).catch(() => {});
      }
      return updated;
    });
  };

  // Update Order No (Col X in Order Automation <-> Col AA in Product Order)
  const handleSaveOrderNo = () => {
    if (!editingOrderNo) return;
    const nowStr = formatSheetColABTimestamp();
    setRawResponses(prev => {
      const changedRows: ProductOrderRow[] = [];
      const updatedAll = prev.map(row => {
        const key = [
          row.customerPO,
          row.customerName,
          row.customerEmail,
          row.customerNumber,
          row.orderDate
        ].map(v => (v || '').trim()).join('_');

        if (key === editingOrderNo.key) {
          const updatedRow: ProductOrderRow = {
            ...row,
            orderNo: editingOrderNo.value,
            orderNoTimestamp: nowStr,
            statusAN: row.statusAN || 'Open'
          };
          changedRows.push(updatedRow);
          return updatedRow;
        }
        return row;
      });
      pushAAABOverrideToFirebase(changedRows);
      pushOrdersToFirebase(updatedAll).catch(() => {});
      return updatedAll;
    });
    setSyncFeedback(`Order No for ${editingOrderNo.po} set to "${editingOrderNo.value}" (Col AA & Col X synced)!`);
    setEditingOrderNo(null);
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Handlers for Operational Columns AA, AB, AG, AH, AI, AJ, AK, AL
  const handleToggleColAG = (orderKey: string, checked: boolean) => {
    setColAGChecks(prev => ({ ...prev, [orderKey]: checked }));
    if (checked) {
      const ts = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setColAHTimestamps(prev => ({ ...prev, [orderKey]: ts }));
      setSyncFeedback(`Col AG Checked ✓ | Auto Timestamp set to ${ts} in Col AH`);
    } else {
      setColAHTimestamps(prev => ({ ...prev, [orderKey]: '' }));
      setSyncFeedback(`Col AG Unchecked | Col AH Timestamp cleared`);
    }
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  const handleToggleColAJ = (orderKey: string, checked: boolean) => {
    setColAJChecks(prev => ({ ...prev, [orderKey]: checked }));
    if (checked) {
      const ts = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setColAKTimestamps(prev => ({ ...prev, [orderKey]: ts }));
      setSyncFeedback(`Col AJ Checked ✓ | Auto Timestamp set to ${ts} in Col AK`);
    } else {
      setColAKTimestamps(prev => ({ ...prev, [orderKey]: '' }));
      setSyncFeedback(`Col AJ Unchecked | Col AK Timestamp cleared`);
    }
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  const handleUpdateColAA = (orderKey: string, val: string) => {
    setColAAStatuses(prev => ({ ...prev, [orderKey]: val }));
  };

  const handleUpdateColAB = (orderKey: string, val: string) => {
    setColABRemarks(prev => ({ ...prev, [orderKey]: val }));
  };

  const handleUpdateColAI = (orderKey: string, val: string) => {
    setColAIRemarks(prev => ({ ...prev, [orderKey]: val }));
  };

  const handleUpdateColAL = (orderKey: string, val: string) => {
    setColALRemarks(prev => ({ ...prev, [orderKey]: val }));
  };

  // Export entire sheet as CSV (Exact 45 Columns from user's specification)
  const handleExportCSV = () => {
    const headers = [
      'Timestamp', 'Customer PO', 'Customer Name', 'Customer Email', 'Order Date',
      'Unit', 'Item Name', 'Color', 'Width', 'Unit (of Item)', 'Qty', 'Rate', 'Discount', 'Delivery Date',
      'Remark', 'Customer Number', 'Billing Address', 'Delivery Address', 'Transporter Name',
      'Sales Person Name', 'Account Status', 'Approval', 'Timestamp', 'Order Number',
      'Dispatch Qnt', 'Balance Qnt', 'Status', 'Remark', 'Confirmation Mail', 'Mail Status',
      'Confirmation Msg', 'Whatspp Link', 'Follow-up 1', 'Timestamp', 'Follow-up 1 Remark',
      'Follow-up 2', 'Timestamp', 'Follow-up 2 Remark', 'LR- Number', 'Open / Close',
      'Delivered Whatspp Msg', 'Whatspp Link', 'Delivery Email', 'Delivery Email Link', 'Email Status Column'
    ];

    const rows: string[][] = [];

    groupedOrders.forEach(order => {
      order.items.forEach(item => {
        rows.push([
          `"${order.timestamp || ''}"`,
          `"${order.customerPO || ''}"`,
          `"${order.customerName || ''}"`,
          `"${order.customerEmail || ''}"`,
          `"${order.orderDate || ''}"`,
          `"${item.unit || ''}"`,
          `"${item.itemName || ''}"`,
          `"${item.color || ''}"`,
          `"${item.width || ''}"`,
          `"${item.unitOfItem || ''}"`,
          `${item.qty}`,
          `${item.rate}`,
          `${item.discount}`,
          `"${item.deliveryDate || ''}"`,
          `"${(order.remark || '').replace(/"/g, '""')}"`,
          `"${order.customerNumber || ''}"`,
          `"${(order.billingAddress || '').replace(/"/g, '""')}"`,
          `"${(order.deliveryAddress || '').replace(/"/g, '""')}"`,
          `"${order.transporterName || ''}"`,
          `"${order.salesPerson || ''}"`,
          `"${order.accountStatus || ''}"`,
          `"${order.approvalStatus || ''}"`,
          `"${order.branch || ''}"`,
          `"${order.orderNo || ''}"`,
          `${item.dispatchQty || 0}`,
          `${item.balanceQty || 0}`,
          `"${colAAStatuses[order.orderKey] || 'In Production'}"`,
          `"${(colABRemarks[order.orderKey] || '').replace(/"/g, '""')}"`,
          `"Sent"`,
          `"Delivered"`,
          `"${aeStatuses[order.orderKey] || 'Pending'}"`,
          `"${(aeStatuses[order.orderKey] || 'Pending') === 'Message Sent' ? 'Sent WA' : ''}"`,
          `"${colAGChecks[order.orderKey] ? 'Yes' : 'No'}"`,
          `"${colAHTimestamps[order.orderKey] || ''}"`,
          `"${(colAIRemarks[order.orderKey] || '').replace(/"/g, '""')}"`,
          `"${colAJChecks[order.orderKey] ? 'Yes' : 'No'}"`,
          `"${colAKTimestamps[order.orderKey] || ''}"`,
          `"${(colALRemarks[order.orderKey] || '').replace(/"/g, '""')}"`,
          `"${lrNumbers[order.orderKey] || ''}"`,
          `"${order.statusAN || 'Open'}"`,
          `"${aoStatuses[order.orderKey] || 'Pending'}"`,
          `"${aoStatuses[order.orderKey] === 'Message Sent' ? 'Sent Messages' : ''}"`,
          `"${order.customerEmail || ''}"`,
          `""`,
          `"Sent"`
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GINZA_Product_Automation_45Col_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSyncFeedback('Downloaded 45-Column GINZA FMS CSV file ready for Excel / Google Sheet!');
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  // Helper: Extract Clean Google Sheet ID from URL or Raw ID
  const extractSheetId = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  };

  // Helper: Push order rows to Firebase Realtime Database (Supports Auth Secret + Public Rules + Chunked Batching)
  const pushOrdersToFirebase = async (
    rowsToSync: ProductOrderRow[],
    customUrl?: string,
    customSecret?: string
  ): Promise<{ activeOrders: number; closedOrders: number; totalRows: number; usedUrl: string }> => {
    const baseTargetUrl = normalizeFirebaseDbUrl(customUrl || firebaseUrl || DEFAULT_FIREBASE_RTDB_URL);
    const rawSecret = (customSecret !== undefined && customSecret.trim() !== '' ? customSecret : firebaseSecret || DEFAULT_FIREBASE_SECRET).trim();
    const cleanSecret = rawSecret || DEFAULT_FIREBASE_SECRET;

    if (!baseTargetUrl) {
      throw new Error('Firebase Realtime Database URL not specified.');
    }

    // Group rows by orderKey
    const tempGroupMap: Record<string, ProductOrderRow[]> = {};
    rowsToSync.forEach((r, idx) => {
      const poPart = (r.customerPO && r.customerPO !== 'N/A' ? r.customerPO : `ROW_${idx + 1}`).trim();
      const k = `${poPart}_${r.customerName || 'NOCUST'}_${r.orderNo || r.orderDate || 'NODATE'}`;
      if (!tempGroupMap[k]) tempGroupMap[k] = [];
      tempGroupMap[k].push(r);
    });

    const automationPayload: Record<string, any> = {};
    const closedPayload: Record<string, any> = {};

    Object.entries(tempGroupMap).forEach(([rawKey, items]) => {
      const first = items[0];
      const safeKey = rawKey.replace(/[.#$/\[\]\s]+/g, '_').substring(0, 110);

      const activeItems = items.filter(it => (it.statusAN || 'Open') !== 'Closed' && it.sheetSource !== 'closed');
      const closedItems = items.filter(it => (it.statusAN || 'Open') === 'Closed' || it.sheetSource === 'closed');

      if (activeItems.length > 0) {
        automationPayload[safeKey] = {
          order_key: safeKey,
          reference_no: first.referenceNo || '',
          timestamp: first.timestamp || '',
          customer_po: first.customerPO || 'N/A',
          customer_name: first.customerName || '',
          customer_email: first.customerEmail || '',
          order_date: first.orderDate || '',
          order_no: first.orderNo || '',
          order_no_timestamp: first.orderNoTimestamp || '',
          sales_person: first.salesPerson || '',
          transporter_name: first.transporterName || '',
          billing_address: first.billingAddress || '',
          delivery_address: first.deliveryAddress || '',
          customer_number: first.customerNumber || '',
          remark: first.remark || '',
          account_status: first.accountStatus || '',
          approval_status: first.approvalStatus || '',
          branch: first.branch || 'Delhi',
          branch_head_name: first.branchHeadName || DEFAULT_BRANCH_HEAD_NAME,
          branch_head_email: first.branchHeadEmail || DEFAULT_BRANCH_HEAD_EMAIL,
          status: first.statusAN || 'Open',
          items: activeItems.map((it, idx) => ({
            order_id: it.orderId,
            item_index: idx + 1,
            item_category: it.unit || '',
            item_name: it.itemName || '',
            color: it.color || '',
            width: it.width || '',
            unit: it.unitOfItem || it.unit || '',
            unit_of_item: it.unitOfItem || '',
            qty: Number(it.qty) || 0,
            rate: Number(it.rate) || 0,
            discount: Number(it.discount) || 0,
            delivery_date: it.deliveryDate || '',
            dispatch_qty: Number(it.dispatchQty) || 0,
            balance_qty: Number(it.balanceQty ?? it.qty) || 0,
            status: it.statusAN || 'Open'
          })),
          total_qty: activeItems.reduce((s, it) => s + (Number(it.qty) || 0), 0),
          total_dispatch_qty: activeItems.reduce((s, it) => s + (Number(it.dispatchQty) || 0), 0),
          total_balance_qty: activeItems.reduce((s, it) => s + (Number(it.balanceQty ?? it.qty) || 0), 0),
          last_synced_at: new Date().toISOString()
        };
      } else if (closedItems.length > 0) {
        // Order moved completely to Closed: remove from /product_automation in Firebase
        automationPayload[safeKey] = null;
      }

      if (closedItems.length > 0) {
        closedPayload[safeKey] = {
          order_key: safeKey,
          reference_no: first.referenceNo || '',
          timestamp: first.timestamp || '',
          customer_po: first.customerPO || 'N/A',
          customer_name: first.customerName || '',
          customer_email: first.customerEmail || '',
          order_date: first.orderDate || '',
          order_no: first.orderNo || '',
          order_no_timestamp: first.orderNoTimestamp || '',
          sales_person: first.salesPerson || '',
          transporter_name: first.transporterName || '',
          billing_address: first.billingAddress || '',
          delivery_address: first.deliveryAddress || '',
          customer_number: first.customerNumber || '',
          remark: first.remark || '',
          account_status: first.accountStatus || '',
          approval_status: first.approvalStatus || '',
          branch: first.branch || 'Delhi',
          branch_head_name: first.branchHeadName || DEFAULT_BRANCH_HEAD_NAME,
          branch_head_email: first.branchHeadEmail || DEFAULT_BRANCH_HEAD_EMAIL,
          status: 'Closed',
          items: closedItems.map((it, idx) => ({
            order_id: it.orderId,
            item_index: idx + 1,
            item_category: it.unit || '',
            item_name: it.itemName || '',
            color: it.color || '',
            width: it.width || '',
            unit: it.unitOfItem || it.unit || '',
            unit_of_item: it.unitOfItem || '',
            qty: Number(it.qty) || 0,
            rate: Number(it.rate) || 0,
            discount: Number(it.discount) || 0,
            delivery_date: it.deliveryDate || '',
            dispatch_qty: Number(it.dispatchQty) || 0,
            balance_qty: Number(it.balanceQty) || 0,
            status: 'Closed'
          })),
          total_qty: closedItems.reduce((s, it) => s + (Number(it.qty) || 0), 0),
          total_dispatch_qty: closedItems.reduce((s, it) => s + (Number(it.dispatchQty) || 0), 0),
          total_balance_qty: closedItems.reduce((s, it) => s + (Number(it.balanceQty) || 0), 0),
          last_synced_at: new Date().toISOString()
        };
      }
    });

    // Always persist full dataset in browser IndexedDB for instant offline/reload persistence of 6,000+ rows
    await saveOrdersToStorage(rowsToSync);

    // Helper to send PATCH request with auth token (and fallback if needed)
    const sendPatchWithFallback = async (baseUrl: string, nodePath: string, payloadObj: Record<string, any>): Promise<Response> => {
      const authQuery = cleanSecret ? `?auth=${encodeURIComponent(cleanSecret)}` : '';
      const res = await fetch(`${baseUrl}/${nodePath}.json${authQuery}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadObj)
      });
      if ((res.status === 401 || res.status === 403) && cleanSecret !== DEFAULT_FIREBASE_SECRET) {
        return fetch(`${baseUrl}/${nodePath}.json?auth=${encodeURIComponent(DEFAULT_FIREBASE_SECRET)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadObj)
        });
      }
      if ((res.status === 401 || res.status === 403) && cleanSecret) {
        return fetch(`${baseUrl}/${nodePath}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadObj)
        });
      }
      return res;
    };

    // Test primary URL first
    const workingUrl = baseTargetUrl;
    let lastHttpStatus = 0;
    let lastErrorText = '';
    let foundWorkingUrl = false;

    try {
      const pingResp = await sendPatchWithFallback(workingUrl, '_connection_test', {
        last_sync_at: new Date().toISOString(),
        total_rows: rowsToSync.length,
        active_orders: Object.keys(automationPayload).filter(k => automationPayload[k] !== null).length,
        closed_orders: Object.keys(closedPayload).length,
        status: 'Connected'
      });
      lastHttpStatus = pingResp.status;
      if (pingResp.ok) {
        foundWorkingUrl = true;
      } else {
        lastErrorText = await pingResp.text();
      }
    } catch (netErr: any) {
      lastErrorText = netErr.message || 'Network error';
    }

    if (!foundWorkingUrl) {
      if (lastHttpStatus === 404) {
        throw new Error(
          `Firebase URL "${baseTargetUrl}" returned 404 Not Found. Kripya Firebase Console > Build > Realtime Database > Data tab ke upar di hui exact URL copy karke Firebase box me paste karein!`
        );
      }
      if (lastHttpStatus === 401 || lastHttpStatus === 403) {
        throw new Error(
          `Firebase Auth / AppCheck Notice (HTTP ${lastHttpStatus}: ${lastErrorText}). Kripya Firebase Database Secret box me apna Secret (${DEFAULT_FIREBASE_SECRET}) rakhein aur Save Config dabayein.`
        );
      }
      throw new Error(`Firebase HTTP ${lastHttpStatus || 'Error'}: ${lastErrorText.substring(0, 160)}`);
    }

    // Upload automationPayload in batches of 250 order blocks so large 6,000+ row sheets never timeout
    const autoEntries = Object.entries(automationPayload);
    const BATCH_SIZE = 250;
    for (let i = 0; i < autoEntries.length; i += BATCH_SIZE) {
      const batchSlice = Object.fromEntries(autoEntries.slice(i, i + BATCH_SIZE));
      const resp = await sendPatchWithFallback(workingUrl, 'product_automation', batchSlice);
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Firebase HTTP ${resp.status}: ${text.substring(0, 150)}`);
      }
    }

    // Upload closedPayload in batches of 250 order blocks
    const closedEntries = Object.entries(closedPayload);
    for (let i = 0; i < closedEntries.length; i += BATCH_SIZE) {
      const batchSlice = Object.fromEntries(closedEntries.slice(i, i + BATCH_SIZE));
      const resp2 = await sendPatchWithFallback(workingUrl, 'closed_orders', batchSlice);
      if (!resp2.ok) {
        const text = await resp2.text();
        throw new Error(`Firebase HTTP ${resp2.status}: ${text.substring(0, 150)}`);
      }
    }

    return {
      activeOrders: autoEntries.filter(([, v]) => v !== null).length,
      closedOrders: closedEntries.filter(([, v]) => v !== null).length,
      totalRows: rowsToSync.length,
      usedUrl: workingUrl
    };
  };

  // Helper: Pull / Read saved Active & Closed Orders from Firebase Realtime Database so ALL systems show identical Closed Orders & Order Automation data!
  const fetchOrdersFromFirebase = async (
    customUrl?: string,
    customSecret?: string
  ): Promise<{ activeRows: ProductOrderRow[]; closedRows: ProductOrderRow[] }> => {
    const baseTargetUrl = normalizeFirebaseDbUrl(customUrl || firebaseUrl || DEFAULT_FIREBASE_RTDB_URL);
    const cleanSecret = (customSecret !== undefined && customSecret.trim() !== '' ? customSecret : firebaseSecret || DEFAULT_FIREBASE_SECRET).trim();
    const authQuery = cleanSecret ? `?auth=${encodeURIComponent(cleanSecret)}` : '';
    const activeRows: ProductOrderRow[] = [];
    const closedRows: ProductOrderRow[] = [];

    const parseFirebaseNodeToRows = (
      dataObj: Record<string, any> | null,
      isClosedNode: boolean
    ): ProductOrderRow[] => {
      if (!dataObj || typeof dataObj !== 'object' || (dataObj as any).error) return [];
      const rows: ProductOrderRow[] = [];
      let counter = 1;
      Object.entries(dataObj).forEach(([orderKey, orderVal]) => {
        if (!orderVal || typeof orderVal !== 'object') return;
        const itemsArr = Array.isArray(orderVal.items)
          ? orderVal.items
          : orderVal.items && typeof orderVal.items === 'object'
          ? Object.values(orderVal.items)
          : [];

        itemsArr.forEach((it: any, idx: number) => {
          if (!it) return;
          const qtyNum = Number(it.qty) || 0;
          const dispNum = Number(it.dispatch_qty) || 0;
          const balNum = it.balance_qty !== undefined ? Number(it.balance_qty) : qtyNum - dispNum;
          const rawUnitVal = (it.unit || '').trim();
          const isMeasureUnit = ['MTR', 'PCS', 'KG', 'KGS', 'ROLL', 'PKT', 'GROSS', 'YARD'].includes(rawUnitVal.toUpperCase());
          rows.push(
            sanitizeProductOrderRow({
              orderId: it.order_id || `FB-${isClosedNode ? 'CLS' : 'ACT'}-${orderKey.substring(0, 24)}-${idx + 1}-${counter++}`,
              referenceNo: orderVal.reference_no || '',
              timestamp: orderVal.timestamp || orderVal.order_date || '',
              customerPO: orderVal.customer_po || 'N/A',
              customerName: orderVal.customer_name || '',
              customerEmail: orderVal.customer_email || '',
              orderDate: orderVal.order_date || '',
              unit: it.item_category || (isMeasureUnit ? 'ELASTIC' : rawUnitVal) || '',
              itemName: it.item_name || '',
              color: it.color || '',
              width: it.width || '',
              unitOfItem: it.unit_of_item || (isMeasureUnit ? rawUnitVal : 'MTR'),
              qty: qtyNum,
              rate: Number(it.rate) || 0,
              discount: Number(it.discount) || 0,
              deliveryDate: it.delivery_date || '',
              remark: orderVal.remark || '',
              customerNumber: orderVal.customer_number || '',
              billingAddress: orderVal.billing_address || '',
              deliveryAddress: orderVal.delivery_address || '',
              transporterName: orderVal.transporter_name || '',
              salesPerson: orderVal.sales_person || '',
              accountStatus: orderVal.account_status || 'Approved',
              branch: orderVal.branch || 'Delhi',
              approvalStatus: orderVal.approval_status || 'APPROVED',
              branchHeadName: orderVal.branch_head_name || DEFAULT_BRANCH_HEAD_NAME,
              branchHeadEmail: orderVal.branch_head_email || DEFAULT_BRANCH_HEAD_EMAIL,
              orderNo: orderVal.order_no || '',
              orderNoTimestamp: orderVal.order_no_timestamp || '',
              statusAN: isClosedNode ? 'Closed' : ((it.status || orderVal.status || 'Open') as any),
              dispatchQty: dispNum,
              balanceQty: balNum,
              sheetSource: isClosedNode ? 'closed' : 'product_order'
            })
          );
        });
      });
      return rows;
    };

    const fetchNodeWithAuthFallback = async (nodeName: string): Promise<any> => {
      try {
        const res = await fetch(`${baseTargetUrl}/${nodeName}.json${authQuery}`);
        if (res.ok) return await res.json();
        if (res.status === 401 || res.status === 403) {
          const fallbackRes = await fetch(`${baseTargetUrl}/${nodeName}.json?auth=${encodeURIComponent(DEFAULT_FIREBASE_SECRET)}`);
          if (fallbackRes.ok) return await fallbackRes.json();
        }
      } catch (e) {}
      return null;
    };

    try {
      const [closedData, autoData] = await Promise.all([
        fetchNodeWithAuthFallback('closed_orders'),
        fetchNodeWithAuthFallback('product_automation')
      ]);

      if (closedData) {
        closedRows.push(...parseFirebaseNodeToRows(closedData, true));
      }

      if (autoData) {
        activeRows.push(...parseFirebaseNodeToRows(autoData, false));
      }
    } catch (e) {
      // Ignore network errors silently during background pull
    }

    return { activeRows, closedRows };
  };

  // Helper: Robust CSV parser respecting quotes and newlines
  const parseCsvRows = (text: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === '\t') && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  };

  // Direct Excel / CSV Paste or Google Sheet Fetch Data Parser
  const handleParseImportedData = async (
    text: string,
    syncFirebase: boolean = true,
    sourceLabel: string = 'Import'
  ) => {
    if (!text.trim()) return;

    const parsedRows = parseCsvRows(text.trim());
    if (parsedRows.length === 0) {
      setImportError('Sheet data me koi valid rows nahi mili.');
      return;
    }

    const newItems: ProductOrderRow[] = [];
    const newColAA: Record<string, string> = {};
    const newColAB: Record<string, string> = {};
    const newAeStatuses: Record<string, string> = {};
    const newColAG: Record<string, boolean> = {};
    const newColAH: Record<string, string> = {};
    const newColAI: Record<string, string> = {};
    const newColAJ: Record<string, boolean> = {};
    const newColAK: Record<string, string> = {};
    const newColAL: Record<string, string> = {};
    const newLrNumbers: Record<string, string> = {};
    const newAoStatuses: Record<string, string> = {};

    let currentTimestamp = '';
    let currentPO = '';
    let currentName = '';
    let currentDate = '';
    let currentEmail = '';
    let currentPhone = '';
    let currentBilling = '';
    let currentDelivery = '';
    let currentTransporter = '';
    let currentSalesPerson = '';
    let currentAccountStatus = '';
    let currentApproval = '';
    let currentBranch = '';
    let currentOrderNo = '';
    let currentRemark = '';
    let currentColAA = '';
    let currentColAB = '';
    let currentColAC = '';
    let currentColAD = '';
    let currentColAE = '';
    let currentColAG: boolean | undefined = undefined;
    let currentColAH = '';
    let currentColAI = '';
    let currentColAJ: boolean | undefined = undefined;
    let currentColAK = '';
    let currentColAL = '';
    let currentLrNumber = '';
    let currentColAO = '';

    const tabLower = importTabName.toLowerCase().trim();
    const labelLower = sourceLabel.toLowerCase().trim();
    const isClosedTabImport =
      tabLower.includes('closed') || labelLower.includes('closed') || activeSheetTab === 'closed';
    const isAutomationTabImport =
      !isClosedTabImport &&
      (tabLower.includes('automation') || labelLower.includes('automation'));

    // Helper: detect if a string is a date/timestamp (e.g. "9/22/2026 10:37:28" or "2/11/2026, 3:03:18 pm")
    // so a timestamp never accidentally gets placed into Order Number (Col X)
    const isTimestampLike = (val: string): boolean => {
      const s = (val || '').trim();
      if (!s) return false;
      // Matches DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD with optional time
      if (/^\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}(\s*,?\s*\d{1,2}:\d{2}(:\d{2})?(\s*[ap]m)?)?$/i.test(s)) {
        return true;
      }
      return false;
    };

    parsedRows.forEach((cols, index) => {
      const firstColLower = (cols[0] || '').toLowerCase().trim();
      const secondColLower = (cols[1] || '').toLowerCase().trim();
      const thirdColLower = (cols[2] || '').toLowerCase().trim();
      const fourthColLower = (cols[3] || '').toLowerCase().trim();
      const seventhColLower = (cols[6] || '').toLowerCase().trim();

      // Skip header row(s) if they contain header keywords
      if (
        index <= 1 &&
        (firstColLower.includes('timestamp') ||
          firstColLower.includes('order no') ||
          firstColLower === 'a' ||
          secondColLower.includes('customer po') ||
          secondColLower.includes('timestamp') ||
          thirdColLower.includes('customer name') ||
          fourthColLower.includes('customer email') ||
          seventhColLower.includes('item name') ||
          firstColLower.includes('#'))
      ) {
        return;
      }

      if (cols.length < 2) return;

      // Determine whether row is 28-col Product Order or 45-col Product Automation / Closed Orders
      const isProductOrder28Format =
        !isAutomationTabImport &&
        !isClosedTabImport &&
        (tabLower === 'delhi' ||
          tabLower === 'product order' ||
          ((cols[0] || '').trim().startsWith('GNZ-') && cols.length <= 30));

      if (isProductOrder28Format) {
        // Detect if cols[0] is Timestamp (26/27-col Delhi!A:Z where Col A is Timestamp) vs cols[0] is Reference Order No (28-col where Col A is GNZ-...)
        const startsWithTimestamp = isDateOrTimestampStr(cols[0]) && !isDateOrTimestampStr(cols[1]);
        const offset = startsWithTimestamp ? 0 : 1;

        const refNo = startsWithTimestamp ? '' : (cols[0] ? cols[0].trim() : '');
        const timestamp = cols[offset] ? cols[offset].trim() : '';
        const po = cols[offset + 1] ? cols[offset + 1].trim() : '';
        const custName = cols[offset + 2] ? cols[offset + 2].trim() : '';
        const email = cols[offset + 3] ? cols[offset + 3].trim() : '';
        const date = cols[offset + 4] ? cols[offset + 4].trim() : '';
        const unit = cols[offset + 5] ? cols[offset + 5].trim() : '';
        const itemName = cols[offset + 6] ? cols[offset + 6].trim() : '';
        const color = cols[offset + 7] ? cols[offset + 7].trim() : '';
        const width = cols[offset + 8] ? cols[offset + 8].trim() : '';
        const unitOfItem = cols[offset + 9] ? cols[offset + 9].trim() : '';
        const qty = cols[offset + 10] ? (parseFloat(cols[offset + 10].replace(/,/g, '')) || 0) : 0;
        const rate = cols[offset + 11] ? (parseFloat(cols[offset + 11].replace(/[₹,\s]/g, '')) || 0) : 0;
        const discount = cols[offset + 12] ? (parseFloat(cols[offset + 12].replace(/[%,\s]/g, '')) || 0) : 0;
        const deliveryDate = cols[offset + 13] ? cols[offset + 13].trim() : '';
        const remark = cols[offset + 14] ? cols[offset + 14].trim() : '';
        const phone = cols[offset + 15] ? cols[offset + 15].trim() : '';
        const billing = cols[offset + 16] ? cols[offset + 16].trim() : '';
        const delivery = cols[offset + 17] ? cols[offset + 17].trim() : '';
        const transporter = cols[offset + 18] ? cols[offset + 18].trim() : '';
        const sales = cols[offset + 19] ? cols[offset + 19].trim() : '';
        const accountStatus = cols[offset + 20] ? cols[offset + 20].trim() : '';
        const branch = cols[offset + 21] ? cols[offset + 21].trim() : 'Delhi';
        const approvalStatus = cols[offset + 22] ? cols[offset + 22].trim() : '';
        const branchHeadName = cols[offset + 23] ? cols[offset + 23].trim() : DEFAULT_BRANCH_HEAD_NAME;
        const branchHeadEmail = cols[offset + 24] ? cols[offset + 24].trim() : DEFAULT_BRANCH_HEAD_EMAIL;
        const orderNo = cols[offset + 25] ? cols[offset + 25].trim() : '';
        const orderNoTimestamp = cols[offset + 26] ? cols[offset + 26].trim() : '';

        if (!custName && !itemName && !refNo && !po) return;

        newItems.push(
          sanitizeProductOrderRow({
            orderId: `ORD-IMP-${index + 1}-${Date.now().toString(36)}`,
            referenceNo: refNo,
            timestamp: timestamp,
            customerPO: po,
            customerName: custName,
            customerEmail: email,
            orderDate: date,
            unit: unit,
            itemName: itemName,
            color: color,
            width: width,
            unitOfItem: unitOfItem,
            qty: qty,
            rate: rate,
            discount: discount,
            deliveryDate: deliveryDate,
            remark: remark,
            customerNumber: phone,
            billingAddress: billing,
            deliveryAddress: delivery,
            transporterName: transporter,
            salesPerson: sales,
            accountStatus: accountStatus,
            branch: branch,
            approvalStatus: approvalStatus,
            branchHeadName: branchHeadName || DEFAULT_BRANCH_HEAD_NAME,
            branchHeadEmail: branchHeadEmail || DEFAULT_BRANCH_HEAD_EMAIL,
            orderNo: orderNo,
            orderNoTimestamp: orderNoTimestamp,
            statusAN: 'Open',
            dispatchQty: 0,
            balanceQty: qty,
            sheetSource: 'product_order'
          })
        );
      } else {
        // Exact 45-column Product Automation / Order Automation 1 / Closed Orders layout (1:1 from Google Sheet)
        // Determine if this row is a merged continuation sub-row (Cols A, B, C are all blank while Item columns have data)
        const hasHeaderData = Boolean(
          (cols[0] && cols[0].trim() !== '') ||
          (cols[1] && cols[1].trim() !== '') ||
          (cols[2] && cols[2].trim() !== '')
        );
        const hasItemData = Boolean(
          (cols[5] && cols[5].trim() !== '') ||
          (cols[6] && cols[6].trim() !== '') ||
          (cols[10] && cols[10].trim() !== '')
        );

        // Skip completely empty rows
        if (!hasHeaderData && !hasItemData) return;

        if (hasHeaderData) {
          // New order block: take exact cell values from this row and DO NOT leak previous customer's values!
          currentTimestamp = (cols[0] || '').trim();
          currentPO = (cols[1] || '').trim();
          currentName = (cols[2] || '').trim();
          currentEmail = (cols[3] || '').trim();
          currentDate = (cols[4] || '').trim();
          currentRemark = (cols[14] || '').trim();
          currentPhone = (cols[15] || '').trim();
          currentBilling = (cols[16] || '').trim();
          currentDelivery = (cols[17] || '').trim();
          currentTransporter = (cols[18] || '').trim();
          currentSalesPerson = (cols[19] || '').trim();
          currentAccountStatus = (cols[20] || '').trim();
          currentApproval = (cols[21] || '').trim();

          const rawColW = (cols[22] || '').trim();
          const rawColX = (cols[23] || '').trim();

          // Guard against Timestamp accidentally appearing in Col X (Order Number)
          if (isTimestampLike(rawColX) && !isTimestampLike(rawColW) && rawColW !== '' && rawColW.toUpperCase() !== 'APPROVED') {
            // Col W and Col X were swapped in the sheet row
            currentBranch = rawColX;
            currentOrderNo = rawColW;
          } else if (isTimestampLike(rawColX)) {
            // Col X contains a timestamp instead of an Order No — keep it in Timestamp (Col W) and leave Order No blank
            currentBranch = rawColW || rawColX;
            currentOrderNo = '';
          } else {
            currentBranch = rawColW;
            currentOrderNo = rawColX;
          }

          currentColAA = (cols[26] || '').trim();
          currentColAB = (cols[27] || '').trim();
          currentColAC = (cols[28] || '').trim();
          currentColAD = (cols[29] || '').trim();
          currentColAE = (cols[30] || '').trim();
          if (cols[32] && cols[32].trim() !== '') {
            const v = cols[32].toLowerCase().trim();
            currentColAG = v === 'true' || v === 'yes' || v === '1' || v === 'done' || v === '✓';
          } else {
            currentColAG = undefined;
          }
          currentColAH = (cols[33] || '').trim();
          currentColAI = (cols[34] || '').trim();
          if (cols[35] && cols[35].trim() !== '') {
            const v = cols[35].toLowerCase().trim();
            currentColAJ = v === 'true' || v === 'yes' || v === '1' || v === 'done' || v === '✓';
          } else {
            currentColAJ = undefined;
          }
          currentColAK = (cols[36] || '').trim();
          currentColAL = (cols[37] || '').trim();
          currentLrNumber = (cols[38] || '').trim();
          currentColAO = (cols[40] || '').trim();
        } else {
          // Merged continuation sub-row of the current order: only update if sub-row explicitly has a non-empty value
          if (cols[14] && cols[14].trim() !== '') currentRemark = cols[14].trim();
          if (cols[23] && cols[23].trim() !== '' && !isTimestampLike(cols[23].trim())) {
            currentOrderNo = cols[23].trim();
          }
          if (cols[26] && cols[26].trim() !== '') currentColAA = cols[26].trim();
          if (cols[27] && cols[27].trim() !== '') currentColAB = cols[27].trim();
          if (cols[28] && cols[28].trim() !== '') currentColAC = cols[28].trim();
          if (cols[29] && cols[29].trim() !== '') currentColAD = cols[29].trim();
          if (cols[30] && cols[30].trim() !== '') currentColAE = cols[30].trim();
          if (cols[32] && cols[32].trim() !== '') {
            const v = cols[32].toLowerCase().trim();
            currentColAG = v === 'true' || v === 'yes' || v === '1' || v === 'done' || v === '✓';
          }
          if (cols[33] && cols[33].trim() !== '') currentColAH = cols[33].trim();
          if (cols[34] && cols[34].trim() !== '') currentColAI = cols[34].trim();
          if (cols[35] && cols[35].trim() !== '') {
            const v = cols[35].toLowerCase().trim();
            currentColAJ = v === 'true' || v === 'yes' || v === '1' || v === 'done' || v === '✓';
          }
          if (cols[36] && cols[36].trim() !== '') currentColAK = cols[36].trim();
          if (cols[37] && cols[37].trim() !== '') currentColAL = cols[37].trim();
          if (cols[38] && cols[38].trim() !== '') currentLrNumber = cols[38].trim();
          if (cols[40] && cols[40].trim() !== '') currentColAO = cols[40].trim();
        }

        const timestamp = currentTimestamp;
        const po = currentPO;
        const custName = currentName;
        const email = currentEmail;
        const date = currentDate;
        const unit = (cols[5] || '').trim();
        const itemName = (cols[6] || '').trim();
        const color = (cols[7] || '').trim();
        const width = (cols[8] || '').trim();
        const unitOfItem = (cols[9] || '').trim();
        const qty = cols[10] ? (parseFloat(cols[10].replace(/[^0-9.-]/g, '')) || 0) : 0;
        const rate = cols[11] ? (parseFloat(cols[11].replace(/[^0-9.-]/g, '')) || 0) : 0;
        const discount = cols[12] ? (parseFloat(cols[12].replace(/[^0-9.-]/g, '')) || 0) : 0;
        const deliveryDate = (cols[13] || '').trim();
        const remark = currentRemark;
        const phone = currentPhone;
        const billing = currentBilling;
        const delivery = currentDelivery;
        const transporter = currentTransporter;
        const sales = currentSalesPerson;
        const accountStatus = currentAccountStatus;
        const approvalStatus = currentApproval;
        const branch = currentBranch;
        const orderNo = currentOrderNo;
        const dispatchQty = cols[24] ? (parseFloat(cols[24].replace(/[^0-9.-]/g, '')) || 0) : 0;
        const balanceQty =
          cols[25] && cols[25].trim() !== ''
            ? (parseFloat(cols[25].replace(/[^0-9.-]/g, '')) || 0)
            : Math.max(0, Number((qty - dispatchQty).toFixed(4)));

        const rawStatus = (cols[39] || '').toLowerCase().trim();
        let statusAN: 'Open' | 'In-Progress' | 'Closed' = 'Open';
        if (isClosedTabImport) {
          statusAN = 'Closed';
        } else if (isAutomationTabImport) {
          // Keep all rows from "Order Automation 1" / "Product Automation 1" in Product Automation tab 1:1
          statusAN = rawStatus.includes('prog') ? 'In-Progress' : 'Open';
        } else {
          if (rawStatus === 'closed' || rawStatus === 'close') statusAN = 'Closed';
          else if (rawStatus.includes('prog')) statusAN = 'In-Progress';
        }

        const targetSource: 'automation' | 'closed' = isClosedTabImport ? 'closed' : 'automation';
        const orderKey = [po, custName, email, phone, date].map(v => (v || '').trim()).join('_');

        if (currentColAA) newColAA[orderKey] = currentColAA;
        if (currentColAB) newColAB[orderKey] = currentColAB;
        if (currentColAE) newAeStatuses[orderKey] = currentColAE;
        if (currentColAG !== undefined) newColAG[orderKey] = currentColAG;
        if (currentColAH) newColAH[orderKey] = currentColAH;
        if (currentColAI) newColAI[orderKey] = currentColAI;
        if (currentColAJ !== undefined) newColAJ[orderKey] = currentColAJ;
        if (currentColAK) newColAK[orderKey] = currentColAK;
        if (currentColAL) newColAL[orderKey] = currentColAL;
        if (currentLrNumber) newLrNumbers[orderKey] = currentLrNumber;
        if (currentColAO) newAoStatuses[orderKey] = currentColAO;

        newItems.push(
          sanitizeProductOrderRow({
            orderId: `IMP-${Date.now()}-${index}`,
            referenceNo: '',
            timestamp: timestamp,
            customerPO: po,
            customerName: custName,
            customerEmail: email,
            orderDate: date,
            unit: unit,
            itemName: itemName,
            color: color,
            width: width,
            unitOfItem: unitOfItem,
            qty: qty,
            rate: rate,
            discount: discount,
            deliveryDate: deliveryDate,
            remark: remark,
            customerNumber: phone,
            billingAddress: billing,
            deliveryAddress: delivery,
            transporterName: transporter,
            salesPerson: sales,
            accountStatus: accountStatus,
            branch: branch,
            approvalStatus: approvalStatus,
            branchHeadName: DEFAULT_BRANCH_HEAD_NAME,
            branchHeadEmail: DEFAULT_BRANCH_HEAD_EMAIL,
            orderNo: orderNo,
            orderNoTimestamp: '',
            statusAN: statusAN,
            dispatchQty: dispatchQty,
            balanceQty: balanceQty,
            sheetSource: targetSource,
            colAA: currentColAA || undefined,
            colAB: currentColAB || undefined,
            colAC: currentColAC || undefined,
            colAD: currentColAD || undefined,
            colAE: currentColAE || undefined,
            colAG: currentColAG,
            colAH: currentColAH || undefined,
            colAI: currentColAI || undefined,
            colAJ: currentColAJ,
            colAK: currentColAK || undefined,
            colAL: currentColAL || undefined,
            lrNumber: currentLrNumber || undefined,
            colAO: currentColAO || undefined
          })
        );
      }
    });

    if (newItems.length > 0) {
      isStorageHydratedRef.current = true;
      const importedSource = newItems[0].sheetSource || 'automation';
      let mergedFinalRows: ProductOrderRow[] = [];

      if (importReplaceMode) {
        // Clear stale manual dispatch overrides so Google Sheet Col Y values display 1:1
        setDispatchRecords({});
        try {
          localStorage.removeItem(LOCAL_STORAGE_DISPATCH_KEY);
        } catch (e) {}

        // Replace ONLY the rows belonging to the imported tab (and remove initial sample ORD-* demo rows) so other tabs never lose their data!
        setRawResponses(prev => {
          const otherTabRows = prev.filter(r => {
            if (/^ORD-(REAL|NANDANI|PENDING|\d+)/.test(r.orderId)) return false; // Strip initial demo rows once real sheet data is imported
            const rSource = r.sheetSource || (r.statusAN === 'Closed' ? 'closed' : 'automation');
            return rSource !== importedSource;
          });
          mergedFinalRows = [...otherTabRows, ...newItems];
          return mergedFinalRows;
        });
        if (Object.keys(newColAA).length > 0) setColAAStatuses(prev => ({ ...prev, ...newColAA }));
        if (Object.keys(newColAB).length > 0) setColABRemarks(prev => ({ ...prev, ...newColAB }));
        if (Object.keys(newAeStatuses).length > 0) setAeStatuses(prev => ({ ...prev, ...newAeStatuses }));
        if (Object.keys(newColAG).length > 0) setColAGChecks(prev => ({ ...prev, ...newColAG }));
        if (Object.keys(newColAH).length > 0) setColAHTimestamps(prev => ({ ...prev, ...newColAH }));
        if (Object.keys(newColAI).length > 0) setColAIRemarks(prev => ({ ...prev, ...newColAI }));
        if (Object.keys(newColAJ).length > 0) setColAJChecks(prev => ({ ...prev, ...newColAJ }));
        if (Object.keys(newColAK).length > 0) setColAKTimestamps(prev => ({ ...prev, ...newColAK }));
        if (Object.keys(newColAL).length > 0) setColALRemarks(prev => ({ ...prev, ...newColAL }));
        if (Object.keys(newLrNumbers).length > 0) setLrNumbers(prev => ({ ...prev, ...newLrNumbers }));
        if (Object.keys(newAoStatuses).length > 0) setAoStatuses(prev => ({ ...prev, ...newAoStatuses }));
      } else {
        // Append new orders at the bottom
        setRawResponses(prev => {
          mergedFinalRows = [...prev, ...newItems];
          return mergedFinalRows;
        });
        if (Object.keys(newColAA).length > 0) setColAAStatuses(prev => ({ ...prev, ...newColAA }));
        if (Object.keys(newColAB).length > 0) setColABRemarks(prev => ({ ...prev, ...newColAB }));
        if (Object.keys(newAeStatuses).length > 0) setAeStatuses(prev => ({ ...prev, ...newAeStatuses }));
        if (Object.keys(newColAG).length > 0) setColAGChecks(prev => ({ ...prev, ...newColAG }));
        if (Object.keys(newColAH).length > 0) setColAHTimestamps(prev => ({ ...prev, ...newColAH }));
        if (Object.keys(newColAI).length > 0) setColAIRemarks(prev => ({ ...prev, ...newColAI }));
        if (Object.keys(newColAJ).length > 0) setColAJChecks(prev => ({ ...prev, ...newColAJ }));
        if (Object.keys(newColAK).length > 0) setColAKTimestamps(prev => ({ ...prev, ...newColAK }));
        if (Object.keys(newColAL).length > 0) setColALRemarks(prev => ({ ...prev, ...newColAL }));
        if (Object.keys(newLrNumbers).length > 0) setLrNumbers(prev => ({ ...prev, ...newLrNumbers }));
        if (Object.keys(newAoStatuses).length > 0) setAoStatuses(prev => ({ ...prev, ...newAoStatuses }));
      }

      if (importedSource === 'closed') {
        setActiveSheetTab('closed');
      } else if (importedSource === 'automation') {
        setActiveSheetTab('automation');
      } else if (importedSource === 'product_order') {
        setActiveSheetTab('product_order');
      }

      setShowImportModal(false);
      setPastedDataText('');
      setImportError(null);

      // Persist & Auto-Sync
      const rowsToSave = mergedFinalRows.length > 0 ? mergedFinalRows : newItems;
      if (syncFirebase && firebaseUrl) {
        try {
          await pushOrdersToFirebase(rowsToSave);
          setSyncFeedback(
            `✓ Successfully imported ${newItems.length.toLocaleString()} exact rows from "${sourceLabel}" (Other tabs preserved 100%)!`
          );
        } catch (fbErr: any) {
          console.warn('Firebase sync note:', fbErr);
          await saveOrdersToStorage(rowsToSave);
          setSyncFeedback(
            `✓ Successfully imported ${newItems.length.toLocaleString()} exact rows from "${sourceLabel}" into application!`
          );
        }
      } else {
        await saveOrdersToStorage(rowsToSave);
        setSyncFeedback(`✓ Successfully imported ${newItems.length.toLocaleString()} exact rows from "${sourceLabel}" into application!`);
      }

      setTimeout(() => setSyncFeedback(null), 5000);
    } else {
      setImportError('Koi valid data row import nahi ho saki. Kripya column structure verify karein.');
    }
  };

  // Google Sheet Direct Fetch and Import Handler (Supports trailing spaces in tab names like "Order Automation 1 " or "Product Automation 1 ")
  const handleFetchFromGoogleSheet = async () => {
    const cleanId = extractSheetId(importSheetId);
    if (!cleanId) {
      setImportError('Kripya valid Google Sheet ID ya full Google Sheets URL enter karein.');
      return;
    }
    if (!importTabName.trim()) {
      setImportError('Kripya Tab / Sheet ka naam enter karein (e.g. Order Automation 1, Product Automation 1, Closed Orders).');
      return;
    }

    setIsFetchingSheet(true);
    setImportError(null);

    // Try candidate tab names (exact, with trailing space, trimmed, and fallback aliases)
    const trimmedTab = importTabName.trim();
    const candidateTabs = Array.from(
      new Set([
        importTabName,
        `${trimmedTab} `,
        trimmedTab,
        ...(trimmedTab.toLowerCase().includes('automation')
          ? ['Order Automation 1', 'Order Automation 1 ', 'Product Automation 1 ', 'Product Automation 1', 'Product Automation']
          : []),
        ...(trimmedTab.toLowerCase().includes('closed')
          ? ['Closed Orders', 'Closed Orders ', 'Closed Order', 'Closed']
          : [])
      ])
    );

    try {
      let csvText = '';
      let matchedTab = trimmedTab;

      for (const tabCandidate of candidateTabs) {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabCandidate)}`;
        const resp = await fetch(gvizUrl);
        if (resp.ok) {
          const text = await resp.text();
          if (text && text.trim().length > 0 && !text.startsWith('<!DOCTYPE html>') && !text.includes('<html')) {
            csvText = text;
            matchedTab = tabCandidate;
            break;
          }
        }
      }

      if (!csvText && !trimmedTab.toLowerCase().includes('closed')) {
        // Fallback: try fetching first default sheet if specific tab name returned HTML
        const fallbackUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv`;
        const respFallback = await fetch(fallbackUrl);
        if (respFallback.ok) {
          const text = await respFallback.text();
          if (text && text.trim().length > 0 && !text.startsWith('<!DOCTYPE html>') && !text.includes('<html')) {
            csvText = text;
          }
        }
      }

      if (!csvText || csvText.trim().length === 0) {
        throw new Error(
          `Tab "${importTabName}" fetch nahi ho saka. Kripya verify karein ki Google Sheet me tab ka exact naam "${importTabName}" hai aur Share -> "Anyone with the link can view" active hai.`
        );
      }

      // Parse and import data
      await handleParseImportedData(csvText, autoSyncToFirebase, `Google Sheet Tab: ${matchedTab.trim()}`);
    } catch (err: any) {
      console.error('Google Sheet Import Error:', err);
      setImportError(
        err.message || 'Google Sheet se data fetch karne me error aayi. Kripya check karein ki Sheet me Share -> "Anyone with the link can view" active hai.'
      );
    } finally {
      setIsFetchingSheet(false);
    }
  };

  // Dedicated Live Sync for Google Sheet "15jjr5tjxaWRPiv_nh6L9EZyFHNFZyQ3PQ6Jd89cV4k0" (Tab: "Product Order" Cols A:AB)
  // and =IMPORTRANGE("1ciwoXm38UcdjVe8n2LB51H66NLyel1Q1FERMb42AfGY","Delhi!A:Z")
  // Loads 100% Total Orders + Col AA (27: Order No) + Col AB (28: Timestamp) into Product Order and flows them into Order Automation!
  const handleSyncDelhiImportRange = async (silent: boolean = false) => {
    const fmsSheetId = '15jjr5tjxaWRPiv_nh6L9EZyFHNFZyQ3PQ6Jd89cV4k0';
    const delhiSheetId = '1ciwoXm38UcdjVe8n2LB51H66NLyel1Q1FERMb42AfGY';
    const delhiTab = 'Delhi';
    if (!silent) {
      setIsSyncingImportRange(true);
      setSyncFeedback('Syncing Product Order (Cols A:AB — Order No AA & Timestamp AB) & Firebase Cloud...');
    }

    const cacheBust = `&_t=${Date.now()}`;
    const candidateUrls = [
      // 1. Primary: FMS Sheet "Product Order" tab (has all Delhi!A:Z rows + Col AA (27) Order No & Col AB (28) Timestamp!)
      `https://docs.google.com/spreadsheets/d/${fmsSheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Product Order')}${cacheBust}`,
      // 2. Fallback: Direct Delhi!A:Z sheet
      `https://docs.google.com/spreadsheets/d/${delhiSheetId}/gviz/tq?tqx=out:csv&range=A:Z&sheet=${encodeURIComponent(delhiTab)}${cacheBust}`
    ];

    try {
      let csvText = '';
      for (const url of candidateUrls) {
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const text = await resp.text();
            if (text && text.trim().length > 0 && !text.startsWith('<!DOCTYPE html>') && !text.includes('<html')) {
              csvText = text;
              break;
            }
          }
        } catch (e) {}
      }

      if (!csvText) {
        throw new Error('Sheet access restricted or requires link sharing.');
      }

      const parsedRows = parseCsvRows(csvText.trim());
      const fetchedRows: ProductOrderRow[] = [];

      let lastTimestamp = '';
      let lastPO = 'N/A';
      let lastCustName = '';
      let lastEmail = '';
      let lastDate = '';
      let lastRemark = '';
      let lastPhone = '';
      let lastBilling = '';
      let lastDelivery = '';
      let lastTransporter = '';
      let lastSales = '';
      let lastAccountStatus = '';
      let lastBranch = 'Delhi';
      let lastApproval = '';
      let lastHeadName = DEFAULT_BRANCH_HEAD_NAME;
      let lastHeadEmail = DEFAULT_BRANCH_HEAD_EMAIL;

      parsedRows.forEach((cols, index) => {
        const firstColLower = (cols[0] || '').toLowerCase().trim();
        const secondColLower = (cols[1] || '').toLowerCase().trim();
        if (
          index === 0 &&
          (firstColLower.includes('timestamp') ||
            firstColLower.includes('order') ||
            secondColLower.includes('timestamp') ||
            secondColLower.includes('customer'))
        ) {
          return;
        }
        if (cols.length < 4) return;

        // Detect if sheet starts with Timestamp in cols[0] vs Reference No (Col A) in cols[0]
        const startsWithTimestamp = isDateOrTimestampStr(cols[0]) && !isDateOrTimestampStr(cols[1]);
        const offset = startsWithTimestamp ? 0 : 1;

        const refNo = startsWithTimestamp ? '' : (cols[0] || '').trim();
        const rawTimestamp = (cols[offset] || '').trim();
        const rawPO = (cols[offset + 1] || '').trim();
        const rawCustName = (cols[offset + 2] || '').trim();
        const rawEmail = (cols[offset + 3] || '').trim();
        const rawDate = (cols[offset + 4] || '').trim();
        const unit = (cols[offset + 5] || '').trim();
        const itemName = (cols[offset + 6] || '').trim();
        const color = (cols[offset + 7] || '').trim();
        const width = (cols[offset + 8] || '').trim();
        const unitOfItem = (cols[offset + 9] || '').trim();
        const qty = cols[offset + 10] ? (parseFloat(cols[offset + 10].replace(/[^0-9.-]/g, '')) || 0) : 0;
        const rate = cols[offset + 11] ? (parseFloat(cols[offset + 11].replace(/[^0-9.-]/g, '')) || 0) : 0;
        const discount = cols[offset + 12] ? (parseFloat(cols[offset + 12].replace(/[^0-9.-]/g, '')) || 0) : 0;
        const deliveryDate = (cols[offset + 13] || '').trim();
        const rawRemark = (cols[offset + 14] || '').trim();
        const rawPhone = (cols[offset + 15] || '').trim();
        const rawBilling = (cols[offset + 16] || '').trim();
        const rawDelivery = (cols[offset + 17] || '').trim();
        const rawTransporter = (cols[offset + 18] || '').trim();
        const rawSales = (cols[offset + 19] || '').trim();
        const rawAccountStatus = (cols[offset + 20] || '').trim();
        const rawBranch = (cols[offset + 21] || '').trim();
        const rawApproval = (cols[offset + 22] || '').trim();
        const rawHeadName = (cols[offset + 23] || '').trim();
        const rawHeadEmail = (cols[offset + 24] || '').trim();
        // Column AA (Col 27 = idx 26 when offset=1) = Order No
        const orderNo = (cols[offset + 25] || '').trim();
        // Column AB (Col 28 = idx 27 when offset=1) = Timestamp ( O.N Generate )
        const orderNoTimestamp = (cols[offset + 26] || '').trim();

        // Skip any empty or broken fragment line that has no timestamp, customer, item, or qty
        if (!rawTimestamp && !rawCustName && !itemName && !qty) return;

        if (rawCustName) {
          lastTimestamp = rawTimestamp;
          lastPO = rawPO || 'N/A';
          lastCustName = rawCustName;
          lastEmail = rawEmail;
          lastDate = rawDate;
          lastRemark = rawRemark;
          lastPhone = rawPhone;
          lastBilling = rawBilling;
          lastDelivery = rawDelivery;
          lastTransporter = rawTransporter;
          lastSales = rawSales;
          lastAccountStatus = rawAccountStatus;
          lastBranch = rawBranch || 'Delhi';
          lastApproval = rawApproval;
          lastHeadName = rawHeadName || DEFAULT_BRANCH_HEAD_NAME;
          lastHeadEmail = rawHeadEmail || DEFAULT_BRANCH_HEAD_EMAIL;
        }

        fetchedRows.push(
          sanitizeProductOrderRow({
            orderId: `DELHI-${index + 1}`,
            referenceNo: refNo,
            timestamp: rawCustName ? rawTimestamp : lastTimestamp,
            customerPO: rawCustName ? (rawPO || 'N/A') : lastPO,
            customerName: rawCustName || lastCustName,
            customerEmail: rawCustName ? rawEmail : lastEmail,
            orderDate: rawCustName ? rawDate : lastDate,
            unit,
            itemName,
            color,
            width,
            unitOfItem,
            qty,
            rate,
            discount,
            deliveryDate,
            remark: rawRemark || lastRemark,
            customerNumber: rawCustName ? rawPhone : lastPhone,
            billingAddress: rawCustName ? rawBilling : lastBilling,
            deliveryAddress: rawCustName ? rawDelivery : lastDelivery,
            transporterName: rawCustName ? rawTransporter : lastTransporter,
            salesPerson: rawCustName ? rawSales : lastSales,
            accountStatus: rawCustName ? rawAccountStatus : lastAccountStatus,
            branch: (rawCustName ? rawBranch : lastBranch) || 'Delhi',
            approvalStatus: rawCustName ? rawApproval : lastApproval,
            branchHeadName: (rawCustName ? rawHeadName : lastHeadName) || DEFAULT_BRANCH_HEAD_NAME,
            branchHeadEmail: (rawCustName ? rawHeadEmail : lastHeadEmail) || DEFAULT_BRANCH_HEAD_EMAIL,
            orderNo,
            orderNoTimestamp,
            statusAN: 'Open',
            dispatchQty: 0,
            balanceQty: qty,
            sheetSource: 'product_order'
          })
        );
      });

      if (fetchedRows.length === 0) {
        throw new Error('No valid rows found in Product Order / Delhi!A:Z');
      }

      isStorageHydratedRef.current = true;

      // Also pull Closed Orders, Active Order updates, and 2-way Col AA/AB overrides from Firebase Cloud
      const baseTargetUrl = normalizeFirebaseDbUrl(firebaseUrl || DEFAULT_FIREBASE_RTDB_URL);
      const cleanSecret = (firebaseSecret || DEFAULT_FIREBASE_SECRET).trim();
      const authQuery = cleanSecret ? `?auth=${encodeURIComponent(cleanSecret)}` : '';

      const [fbCloud, aaAbCloudData] = await Promise.all([
        fetchOrdersFromFirebase(),
        fetch(`${baseTargetUrl}/product_order_aa_ab.json${authQuery}`)
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null)
      ]);

      const aaAbOverrides: Record<string, any> =
        aaAbCloudData && typeof aaAbCloudData === 'object' && !aaAbCloudData.error ? aaAbCloudData : {};

      let finalMergedForCloud: ProductOrderRow[] = [];

      setRawResponses(prev => {
        // Strip initial demo rows
        const cleanPrev = prev.filter(r => !/^ORD-(REAL|NANDANI|PENDING|\d+)/.test(r.orderId));

        // Combine local existing rows + Firebase Cloud rows for lookup (local closed/modified rows + Firebase closed/modified rows)
        const makeRowMatchKey = (r: ProductOrderRow) =>
          `${(r.customerPO || '').trim().toLowerCase()}|${(r.customerName || '').trim().toLowerCase()}|${(r.itemName || '').trim().toLowerCase()}|${(r.color || '').trim().toLowerCase()}|${(r.width || '').trim().toLowerCase()}|${Number(r.qty) || 0}|${(r.orderDate || '').trim().toLowerCase()}`;

        const makeOrderSig = (r: ProductOrderRow) =>
          `ord_${`${(r.customerPO || '').trim().toLowerCase()}|${(r.customerName || '').trim().toLowerCase()}|${(r.orderDate || '').trim().toLowerCase()}`.replace(/[.#$/[\]\s]+/g, '_')}`;

        const makeRowSig = (r: ProductOrderRow) =>
          `row_${makeRowMatchKey(r).replace(/[.#$/[\]\s]+/g, '_')}`;

        const allKnownClosedRows: ProductOrderRow[] = [...fbCloud.closedRows];
        const seenClosedSigs = new Set(allKnownClosedRows.map(makeRowMatchKey));
        cleanPrev.forEach(r => {
          if (r.statusAN === 'Closed' || r.sheetSource === 'closed') {
            const sig = makeRowMatchKey(r);
            if (!seenClosedSigs.has(sig)) {
              allKnownClosedRows.push(r);
              seenClosedSigs.add(sig);
            }
          }
        });

        const closedLookupMap = new Map<string, ProductOrderRow>();
        allKnownClosedRows.forEach(r => closedLookupMap.set(makeRowMatchKey(r), r));

        const existingQueueByKey = new Map<string, ProductOrderRow[]>();
        // Seed from Firebase active rows first, then local cleanPrev overrides
        [...fbCloud.activeRows, ...cleanPrev].forEach(r => {
          const k = makeRowMatchKey(r);
          const list = existingQueueByKey.get(k) || [];
          list.push(r);
          existingQueueByKey.set(k, list);
        });

        const matchedClosedKeys = new Set<string>();

        const mergedDelhiRows: ProductOrderRow[] = fetchedRows.map(fRow => {
          const k = makeRowMatchKey(fRow);
          const cloudAAAB = aaAbOverrides[makeRowSig(fRow)] || aaAbOverrides[makeOrderSig(fRow)];
          // 2-Way ("Multipurpose") Resolution for Col AA (Order No) and Col AB (Timestamp):
          // - If Google Sheet has Order No (fRow.orderNo), use it unless Web App has an explicit override in /product_order_aa_ab
          // - If Google Sheet Order No is blank, use Web App / Firebase override if present
          const resolvedOrderNo =
            (cloudAAAB?.order_no && (!fRow.orderNo || fRow.orderNo === cloudAAAB.order_no))
              ? cloudAAAB.order_no
              : (fRow.orderNo || cloudAAAB?.order_no || '');
          const resolvedOrderNoTs =
            fRow.orderNoTimestamp || cloudAAAB?.order_no_timestamp || '';

          const closedMatch = closedLookupMap.get(k);
          if (closedMatch) {
            matchedClosedKeys.add(k);
            return {
              ...fRow,
              orderNo: resolvedOrderNo || closedMatch.orderNo || '',
              orderNoTimestamp: resolvedOrderNoTs || closedMatch.orderNoTimestamp || '',
              statusAN: 'Closed',
              sheetSource: 'closed',
              dispatchQty: closedMatch.dispatchQty ?? fRow.dispatchQty ?? 0,
              balanceQty: closedMatch.balanceQty ?? fRow.balanceQty ?? 0,
              colAA: closedMatch.colAA ?? fRow.colAA,
              colAB: closedMatch.colAB ?? fRow.colAB,
              colAC: closedMatch.colAC ?? fRow.colAC,
              colAD: closedMatch.colAD ?? fRow.colAD,
              colAE: closedMatch.colAE ?? fRow.colAE,
              colAG: closedMatch.colAG ?? fRow.colAG,
              colAH: closedMatch.colAH ?? fRow.colAH,
              colAI: closedMatch.colAI ?? fRow.colAI,
              colAJ: closedMatch.colAJ ?? fRow.colAJ,
              colAK: closedMatch.colAK ?? fRow.colAK,
              colAL: closedMatch.colAL ?? fRow.colAL,
              lrNumber: closedMatch.lrNumber ?? fRow.lrNumber,
              colAO: closedMatch.colAO ?? fRow.colAO
            };
          }

          const candidates = existingQueueByKey.get(k);
          const match = candidates && candidates.length > 0 ? candidates[candidates.length - 1] : undefined;
          if (match) {
            return {
              ...fRow,
              orderNo: resolvedOrderNo || match.orderNo || '',
              orderNoTimestamp: resolvedOrderNoTs || match.orderNoTimestamp || '',
              statusAN: match.statusAN || fRow.statusAN || 'Open',
              sheetSource: match.statusAN === 'Closed' ? 'closed' : (fRow.sheetSource || 'product_order'),
              dispatchQty: match.dispatchQty ?? fRow.dispatchQty ?? 0,
              balanceQty: match.balanceQty ?? fRow.balanceQty ?? fRow.qty,
              colAA: match.colAA ?? fRow.colAA,
              colAB: match.colAB ?? fRow.colAB,
              colAC: match.colAC ?? fRow.colAC,
              colAD: match.colAD ?? fRow.colAD,
              colAE: match.colAE ?? fRow.colAE,
              colAG: match.colAG ?? fRow.colAG,
              colAH: match.colAH ?? fRow.colAH,
              colAI: match.colAI ?? fRow.colAI,
              colAJ: match.colAJ ?? fRow.colAJ,
              colAK: match.colAK ?? fRow.colAK,
              colAL: match.colAL ?? fRow.colAL,
              lrNumber: match.lrNumber ?? fRow.lrNumber,
              colAO: match.colAO ?? fRow.colAO
            };
          }
          return {
            ...fRow,
            orderNo: resolvedOrderNo,
            orderNoTimestamp: resolvedOrderNoTs
          };
        });

        // Collect all additional closed orders from Firebase /closed_orders and local storage that were not in Delhi!A:Z
        const extraClosedRows: ProductOrderRow[] = allKnownClosedRows
          .filter(closedRow => !matchedClosedKeys.has(makeRowMatchKey(closedRow)))
          .map(closedRow => ({
            ...closedRow,
            statusAN: 'Closed' as const,
            sheetSource: 'closed' as const
          }));

        const explicitAutoRows = cleanPrev.filter(r => r.sheetSource === 'automation' && r.statusAN !== 'Closed');

        if (explicitAutoRows.length > mergedDelhiRows.length) {
          const autoKeys = new Set(explicitAutoRows.map(makeRowMatchKey));
          const brandNewDelhiRows = mergedDelhiRows.filter(f => !autoKeys.has(makeRowMatchKey(f)));
          finalMergedForCloud = [...explicitAutoRows, ...brandNewDelhiRows, ...extraClosedRows];
          return finalMergedForCloud;
        }
        finalMergedForCloud = [...mergedDelhiRows, ...extraClosedRows];
        return finalMergedForCloud;
      });

      // Push combined dataset (including all Closed Orders & Active Orders) to Firebase in the background
      setTimeout(() => {
        if (finalMergedForCloud.length > 0) {
          pushOrdersToFirebase(finalMergedForCloud).catch(() => {});
        }
      }, 400);

      if (!silent) {
        const countWithAA = fetchedRows.filter(r => r.orderNo && r.orderNo.trim() !== '').length;
        const countWithAB = fetchedRows.filter(r => r.orderNoTimestamp && r.orderNoTimestamp.trim() !== '').length;
        setSyncFeedback(
          `✓ Synced "Product Order" (15jjr5tjxaWRPiv_nh6L9EZyFHNFZyQ3PQ6Jd89cV4k0)! ${fetchedRows.length.toLocaleString()} rows loaded (${countWithAA.toLocaleString()} Col AA Order Nos & ${countWithAB.toLocaleString()} Col AB Timestamps).`
        );
        setTimeout(() => setSyncFeedback(null), 5000);
      }
    } catch (err: any) {
      if (!silent) {
        setImportSheetId(fmsSheetId);
        setImportTabName('Product Order');
        setImportReplaceMode(false);
        setImportError(
          `Live Sheet fetch notice (${err.message}). Make sure Sheet "15jjr5tjxaWRPiv_nh6L9EZyFHNFZyQ3PQ6Jd89cV4k0" (Tab: Product Order) is shared as "Anyone with the link can view".`
        );
        setShowImportModal(true);
        setSyncFeedback(null);
      }
    } finally {
      if (!silent) {
        setIsSyncingImportRange(false);
      }
    }
  };

  // Pull latest Closed Orders & Active updates from Firebase Cloud whenever user opens app or switches to Closed Orders tab
  const handleRefreshFromFirebaseCloud = async () => {
    const fbCloud = await fetchOrdersFromFirebase();
    if (fbCloud.closedRows.length === 0 && fbCloud.activeRows.length === 0) return;

    setRawResponses(prev => {
      const cleanPrev = prev.filter(r => !/^ORD-(REAL|NANDANI|PENDING|\d+)/.test(r.orderId));
      const baseRows = cleanPrev.length > 0 ? cleanPrev : fbCloud.activeRows;

      const makeRowMatchKey = (r: ProductOrderRow) =>
        `${(r.customerPO || '').trim().toLowerCase()}|${(r.customerName || '').trim().toLowerCase()}|${(r.itemName || '').trim().toLowerCase()}|${(r.color || '').trim().toLowerCase()}|${(r.width || '').trim().toLowerCase()}|${Number(r.qty) || 0}|${(r.orderDate || '').trim().toLowerCase()}`;

      const closedMap = new Map<string, ProductOrderRow>();
      fbCloud.closedRows.forEach(r => closedMap.set(makeRowMatchKey(r), r));

      const matchedKeys = new Set<string>();
      const updated = baseRows.map(row => {
        const k = makeRowMatchKey(row);
        const closedMatch = closedMap.get(k);
        if (closedMatch) {
          matchedKeys.add(k);
          return {
            ...row,
            orderNo: closedMatch.orderNo || row.orderNo || '',
            orderNoTimestamp: closedMatch.orderNoTimestamp || row.orderNoTimestamp || '',
            statusAN: 'Closed' as const,
            sheetSource: 'closed' as const,
            dispatchQty: closedMatch.dispatchQty ?? row.dispatchQty ?? 0,
            balanceQty: closedMatch.balanceQty ?? row.balanceQty ?? 0
          };
        }
        return row;
      });

      const existingKeys = new Set(updated.map(makeRowMatchKey));
      const newClosedFromCloud = fbCloud.closedRows.filter(
        r => !matchedKeys.has(makeRowMatchKey(r)) && !existingKeys.has(makeRowMatchKey(r))
      );

      return newClosedFromCloud.length > 0 ? [...updated, ...newClosedFromCloud] : updated;
    });
  };

  // Automatically sync Firebase Cloud + Google Sheet "Product Order" (A:AB) on mount and every 30s for real-time 2-way updates
  useEffect(() => {
    handleRefreshFromFirebaseCloud();
    const timer = setTimeout(() => {
      handleSyncDelhiImportRange(true);
    }, 600);
    const interval = setInterval(() => {
      handleSyncDelhiImportRange(true);
    }, 30000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // 1-Click Upload all current Sheet Data to Firebase Realtime Database
  const handleUploadToFirebase = async () => {
    try {
      setFirebaseStatusMsg({ type: 'info', text: 'Connecting & uploading orders to Firebase Realtime Database...' });
      setUploadProgress(20);
      const cleanUrl = normalizeFirebaseDbUrl(firebaseUrl);
      setFirebaseUrl(cleanUrl);
      setSyncFeedback('Connecting to Firebase Realtime Database...');

      // Save current config in localStorage
      localStorage.setItem(
        LOCAL_STORAGE_FIREBASE_CONFIG,
        JSON.stringify({
          url: cleanUrl,
          secret: firebaseSecret
        })
      );

      setUploadProgress(55);
      const res = await pushOrdersToFirebase(rawResponses, cleanUrl, firebaseSecret);
      setUploadProgress(100);
      const successMsg = `✓ Successfully uploaded ${res.activeOrders} active order blocks & ${res.closedOrders} closed orders (${res.totalRows.toLocaleString()} total rows) to Firebase (${res.usedUrl})! Ab Firebase Console > Realtime Database > Data tab check karein.`;
      setFirebaseStatusMsg({ type: 'success', text: successMsg });
      setSyncFeedback(successMsg);
      setTimeout(() => {
        setUploadProgress(null);
      }, 2500);
    } catch (err: any) {
      console.error('Firebase Upload Error:', err);
      setUploadProgress(null);
      const errMsg = err.message || 'Check Firebase Realtime Database URL & Rules';
      setFirebaseStatusMsg({ type: 'error', text: errMsg });
      setSyncFeedback(`Firebase Upload Error: ${errMsg}`);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  // Available Years dynamically extracted from orders for Order Automation Month/Year filter
  const availableAutomationYears = useMemo(() => {
    const yearsSet = new Set<string>(['2025', '2026']);
    rawResponses.forEach(r => {
      const parsed = parseOrderDateParts(r.orderDate, r.timestamp);
      if (parsed && parsed.year >= 2020 && parsed.year <= 2035) {
        yearsSet.add(String(parsed.year));
      }
    });
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [rawResponses]);

  // Filter orders based on activeSheetTab & statusFilter & Month/Year filter & search & column filters & duplicate filter
  const filteredOrders = useMemo(() => {
    const result: GroupedOrder[] = [];

    groupedOrders.forEach(order => {
      // All active orders from Product Order (IMPORTRANGE Delhi!A:Z) and Order Automation flow directly into Order Automation in Merged Visual View format!
      if (order.sheetSource === 'product_order' && activeSheetTab === 'closed') {
        if (order.statusAN !== 'Closed') return;
      }

      // Month & Year Filter on Order Automation / Closed Orders
      if (automationMonth !== 'ALL' || automationYear !== 'ALL') {
        const parsed = parseOrderDateParts(order.orderDate, order.timestamp);
        if (automationMonth !== 'ALL') {
          if (!parsed || String(parsed.month) !== automationMonth) return;
        }
        if (automationYear !== 'ALL') {
          if (!parsed || String(parsed.year) !== automationYear) return;
        }
      }

      // Filter items according to tab, status filter, duplicate filter, and column filters
      const relevantItems = order.items.filter(item => {
        const itemStatus = item.statusAN || 'Open';

        // 1. Tab filter
        if (activeSheetTab === 'automation') {
          if (order.sheetSource === 'closed' || itemStatus === 'Closed') return false;
        } else if (activeSheetTab === 'closed') {
          if (order.sheetSource !== 'closed' && itemStatus !== 'Closed') return false;
        }

        // 2. Duplicate Rows only filter
        if (showDuplicatesOnly && !item.isDuplicate) {
          return false;
        }

        // 3. Toolbar Status dropdown filter
        if (statusFilter !== 'ALL' && itemStatus !== statusFilter) {
          return false;
        }

        // 4. Item-level Column Filters (F to N, Y, Z, AN)
        if (colFilters['F'] && colFilters['F'].length > 0 && !colFilters['F'].includes(item.unit)) return false;
        if (colFilters['G'] && colFilters['G'].length > 0 && !colFilters['G'].includes(item.itemName)) return false;
        if (colFilters['H'] && colFilters['H'].length > 0 && !colFilters['H'].includes(item.color)) return false;
        if (colFilters['I'] && colFilters['I'].length > 0 && !colFilters['I'].includes(item.width)) return false;
        if (colFilters['AN'] && colFilters['AN'].length > 0 && !colFilters['AN'].includes(itemStatus)) return false;

        return true;
      });

      // If no items in this order match the current tab/filter, skip this order
      if (relevantItems.length === 0) return;

      // Header-level Column Filters (A to E, O to X, AE, AF, AO, AP)
      for (const [colKey, selectedVals] of Object.entries(colFilters)) {
        if (!selectedVals || selectedVals.length === 0) continue;
        if (colKey === 'A' && !selectedVals.includes(order.timestamp)) return;
        if (colKey === 'B' && !selectedVals.includes(order.customerPO)) return;
        if (colKey === 'C' && !selectedVals.includes(order.customerName)) return;
        if (colKey === 'D' && !selectedVals.includes(order.customerEmail)) return;
        if (colKey === 'E' && !selectedVals.includes(order.orderDate)) return;
        if (colKey === 'S' && !selectedVals.includes(order.transporterName)) return;
        if (colKey === 'T' && !selectedVals.includes(order.salesPerson)) return;
        if (colKey === 'U' && !selectedVals.includes(order.accountStatus)) return;
        if (colKey === 'V' && !selectedVals.includes(order.approvalStatus)) return;
        if (colKey === 'X' && !selectedVals.includes(order.orderNo || 'Set SO#')) return;
        if (colKey === 'AE' && !selectedVals.includes(aeStatuses[order.orderKey] || 'Pending')) return;
        if (colKey === 'AO' && !selectedVals.includes(aoStatuses[order.orderKey] || 'Pending')) return;
      }

      // Global Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesPO = (order.customerPO || '').toLowerCase().includes(q);
        const matchesName = (order.customerName || '').toLowerCase().includes(q);
        const matchesOrderNo = (order.orderNo || '').toLowerCase().includes(q);
        const matchesSales = (order.salesPerson || '').toLowerCase().includes(q);
        const matchesTransporter = (order.transporterName || '').toLowerCase().includes(q);
        const matchesAnyItem = relevantItems.some(
          it => (it.itemName || '').toLowerCase().includes(q) || (it.color || '').toLowerCase().includes(q)
        );
        if (!matchesPO && !matchesName && !matchesOrderNo && !matchesSales && !matchesTransporter && !matchesAnyItem) {
          return;
        }
      }

      result.push({
        ...order,
        items: relevantItems
      });
    });

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortConfig.column === 'B') {
          valA = a.customerPO;
          valB = b.customerPO;
        } else if (sortConfig.column === 'C') {
          valA = a.customerName;
          valB = b.customerName;
        } else if (sortConfig.column === 'K') {
          valA = a.items.reduce((s, it) => s + it.qty, 0);
          valB = b.items.reduce((s, it) => s + it.qty, 0);
        } else {
          valA = a.customerPO;
          valB = b.customerPO;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [groupedOrders, activeSheetTab, statusFilter, automationMonth, automationYear, searchTerm, colFilters, sortConfig, aeStatuses, aoStatuses, showDuplicatesOnly]);

  // Virtual Pagination for Product Automation & Closed Orders to prevent browser crash/freeze
  const [automationPage, setAutomationPage] = useState(1);
  const [automationPageSize, setAutomationPageSize] = useState<number>(50);

  const totalAutomationPages = Math.max(1, Math.ceil(filteredOrders.length / (automationPageSize || 50)));
  const safeAutomationPage = Math.min(automationPage, totalAutomationPages);

  const paginatedOrders = useMemo(() => {
    if (automationPageSize === 0) return filteredOrders;
    const start = (safeAutomationPage - 1) * automationPageSize;
    return filteredOrders.slice(start, start + automationPageSize);
  }, [filteredOrders, safeAutomationPage, automationPageSize]);

  const startRowNumber = useMemo(() => {
    if (automationPageSize === 0 || safeAutomationPage <= 1) return 2;
    let count = 2;
    const prev = filteredOrders.slice(0, (safeAutomationPage - 1) * automationPageSize);
    prev.forEach(o => { count += o.items.length; });
    return count;
  }, [filteredOrders, safeAutomationPage, automationPageSize]);

  // Total Orders for Product Order tab (as per =IMPORTRANGE("1ciwoXm38UcdjVe8n2LB51H66NLyel1Q1FERMb42AfGY","Delhi!A:Z"))
  const productOrderRows = useMemo(() => {
    const activeRows = rawResponses.filter(r => r.sheetSource !== 'closed' && r.statusAN !== 'Closed');
    return activeRows.length > 0 ? activeRows : rawResponses;
  }, [rawResponses]);

  // Aggregate metrics (Exact Row Counts matching Google Sheets 1:1)
  const totalOrdersCount = groupedOrders.length;
  const pendingOnCount = productOrderRows.filter(r => !r.orderNo || r.orderNo.trim() === '').length;
  const activeItemsCount = useMemo(() => {
    let count = 0;
    groupedOrders.forEach(o => {
      o.items.forEach(it => {
        if (o.sheetSource !== 'closed' && (it.statusAN || 'Open') !== 'Closed') count++;
      });
    });
    return count;
  }, [groupedOrders]);

  const closedItemsCount = useMemo(() => {
    let count = 0;
    groupedOrders.forEach(o => {
      o.items.forEach(it => {
        if (o.sheetSource === 'closed' || (it.statusAN || 'Open') === 'Closed') count++;
      });
    });
    return count;
  }, [groupedOrders]);

  const duplicateItemsCount = useMemo(() => {
    let count = 0;
    groupedOrders.forEach(o => {
      o.items.forEach(it => {
        const isClosed = o.sheetSource === 'closed' || (it.statusAN || 'Open') === 'Closed';
        if (activeSheetTab === 'closed' && isClosed && it.isDuplicate) count++;
        else if (activeSheetTab !== 'closed' && !isClosed && it.isDuplicate) count++;
      });
    });
    return count;
  }, [groupedOrders, activeSheetTab]);

  const activeOrdersCount = activeItemsCount;
  const closedOrdersCount = closedItemsCount;
  const totalItemRows = filteredOrders.reduce((sum, ord) => sum + ord.items.length, 0);
  const totalOrderQty = filteredOrders.reduce((sum, ord) => sum + ord.items.reduce((s, it) => s + it.qty, 0), 0);
  const totalDispatched = filteredOrders.reduce((sum, ord) => sum + ord.items.reduce((s, it) => s + (it.dispatchQty || 0), 0), 0);
  const totalBalance = totalOrderQty - totalDispatched;

  // Toggle filter value for a column
  const toggleColFilterValue = (col: string, val: string) => {
    setColFilters(prev => {
      const current = prev[col] || [];
      if (current.includes(val)) {
        const next = current.filter(v => v !== val);
        if (next.length === 0) {
          const copy = { ...prev };
          delete copy[col];
          return copy;
        }
        return { ...prev, [col]: next };
      } else {
        return { ...prev, [col]: [...current, val] };
      }
    });
  };

  // Get unique values for ANY column to show in filter dropdown
  const getUniqueColumnValues = (col: string): string[] => {
    const set = new Set<string>();
    groupedOrders.forEach(o => {
      if (col === 'A') set.add(o.timestamp);
      else if (col === 'B') set.add(o.customerPO);
      else if (col === 'C') set.add(o.customerName);
      else if (col === 'D') set.add(o.customerEmail);
      else if (col === 'E') set.add(o.orderDate);
      else if (col === 'F') o.items.forEach(it => set.add(it.unit));
      else if (col === 'G') o.items.forEach(it => set.add(it.itemName));
      else if (col === 'H') o.items.forEach(it => set.add(it.color));
      else if (col === 'I') o.items.forEach(it => set.add(it.width));
      else if (col === 'S') set.add(o.transporterName);
      else if (col === 'T') set.add(o.salesPerson);
      else if (col === 'U') set.add(o.accountStatus);
      else if (col === 'V') set.add(o.approvalStatus);
      else if (col === 'X') set.add(o.orderNo || 'Set SO#');
      else if (col === 'AN') set.add(o.statusAN || 'Open');
    });
    return Array.from(set).filter(Boolean);
  };

  return (
    <div className="space-y-4">
      {/* SPREADSHEET TOOLBAR & CONTROLS */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
        {/* Top Control Bar - ALL IN ONE SINGLE LINE */}
        <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto select-none scrollbar-none whitespace-nowrap">
          {/* Left Controls Group in Single Line */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search Box */}
            <div className="relative w-48 sm:w-56 shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search PO, Customer, Item, Order No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-6 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 placeholder-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
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
                value={automationMonth}
                onChange={(e) => {
                  setAutomationMonth(e.target.value);
                  setAutomationPage(1);
                }}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-1"
              >
                {MONTH_OPTIONS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-300 shadow-2xs shrink-0">
              <span className="text-[11px] font-bold text-slate-600">Year:</span>
              <select
                value={automationYear}
                onChange={(e) => {
                  setAutomationYear(e.target.value);
                  setAutomationPage(1);
                }}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL">All Years</option>
                {availableAutomationYears.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            {/* Clear Month/Year Filter if active */}
            {(automationMonth !== 'ALL' || automationYear !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setAutomationMonth('ALL');
                  setAutomationYear('ALL');
                  setAutomationPage(1);
                }}
                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
              >
                <X className="w-3 h-3" />
                <span>Clear Date</span>
              </button>
            )}

            {/* Quick Status Filter */}
            <div className="flex items-center gap-1 text-xs shrink-0">
              <span className="text-slate-500 font-medium text-[11px] flex items-center gap-0.5">
                <Filter className="w-3 h-3" />
                Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Statuses ({totalOrdersCount})</option>
                <option value="Open">🔵 Open Only ({groupedOrders.filter(o => o.statusAN === 'Open').length})</option>
                <option value="In-Progress">🟡 In-Progress Only ({groupedOrders.filter(o => o.statusAN === 'In-Progress').length})</option>
                <option value="Closed">🟢 Closed Only ({groupedOrders.filter(o => o.statusAN === 'Closed').length})</option>
              </select>
            </div>

            {/* ONLY Order Status Badge (Shows Exact Row Counts matching Google Sheet) */}
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-950 text-xs shadow-2xs shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
              <span className="text-[11px] font-bold text-sky-800">Sheet Rows :</span>
              <span className="font-mono font-bold text-xs">{activeItemsCount.toLocaleString()} Active / {closedItemsCount.toLocaleString()} Closed</span>
            </div>

            {/* Duplicate Rows Color Filter Indicator */}
            <button
              type="button"
              onClick={() => {
                setShowDuplicatesOnly(prev => !prev);
                setAutomationPage(1);
              }}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                showDuplicatesOnly
                  ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                  : duplicateItemsCount > 0
                  ? 'bg-rose-100 text-rose-900 border-rose-400 hover:bg-rose-200'
                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
              }`}
              title="Highlight and filter duplicate rows in Action column"
            >
              <span className={`w-2 h-2 rounded-full ${duplicateItemsCount > 0 ? 'bg-rose-500 animate-ping' : 'bg-slate-400'}`} />
              <span>Duplicates: {duplicateItemsCount}</span>
              {showDuplicatesOnly && <span className="text-[10px] underline ml-0.5">(Showing Only Duplicates)</span>}
            </button>

            {/* Clear active filters button */}
            {Object.keys(colFilters).length > 0 && (
              <button
                onClick={() => setColFilters({})}
                className="px-1.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 flex items-center gap-1 shrink-0"
              >
                <X className="w-3 h-3" />
                <span>Reset ({Object.keys(colFilters).length})</span>
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-slate-300 shrink-0 mx-0.5" />

          {/* Right Controls Group in Single Line */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Switch */}
            <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg text-xs shrink-0">
              <button
                onClick={() => setViewMode('merged')}
                className={`px-2 py-1 rounded-md transition-all font-semibold ${
                  viewMode === 'merged'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="A-E & N-X Vertically Merged with Individual Product Item Rows"
              >
                ⚡ Merged Visual View
              </button>
              <button
                onClick={() => setViewMode('unmerged')}
                className={`px-2 py-1 rounded-md transition-all font-medium ${
                  viewMode === 'unmerged'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="100% Flat Row-Wise View (Independent Row Data)"
              >
                Flat Unmerged
              </button>
            </div>

            {/* FREEZE / UNFREEZE PANES SPLIT BUTTON (Direct click toggles Freeze (2) <-> Unfreeze) */}
            <div className="relative shrink-0 inline-flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (freezeColumns > 0 || freezeRows > 0) {
                    setFreezeColumns(0);
                    setFreezeRows(0);
                    setShowFreezeMenu(false);
                    setSyncFeedback('🔓 Unfrozen all columns and header rows!');
                  } else {
                    setFreezeColumns(2);
                    setFreezeRows(1);
                    setShowFreezeMenu(false);
                    setSyncFeedback('📌 Frozen 2 columns (# + PO) and Header Row!');
                  }
                  setTimeout(() => setSyncFeedback(null), 3000);
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-l-lg border transition-colors shadow-2xs cursor-pointer ${
                  freezeColumns > 0 || freezeRows > 0
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
                title={
                  freezeColumns > 0 || freezeRows > 0
                    ? 'Click to Unfreeze all columns & rows'
                    : 'Click to Freeze 2 columns (# + PO) & Header Row'
                }
              >
                <Pin className={`w-3 h-3 ${freezeColumns > 0 || freezeRows > 0 ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>
                  {freezeColumns > 0 || freezeRows > 0
                    ? `Freeze (${freezeColumns}) · Click to Unfreeze`
                    : 'Unfrozen (Click to Freeze)'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowFreezeMenu(!showFreezeMenu)}
                className={`px-1.5 py-1 text-xs font-semibold rounded-r-lg border-y border-r transition-colors shadow-2xs cursor-pointer ${
                  freezeColumns > 0 || freezeRows > 0
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
                title="More Freeze / Unfreeze Options"
              >
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {showFreezeMenu && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 text-xs space-y-1.5">
                  {/* Direct 1-Click Unfreeze All Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setFreezeColumns(0);
                      setFreezeRows(0);
                      setShowFreezeMenu(false);
                      setSyncFeedback('🔓 Unfrozen all columns and rows!');
                      setTimeout(() => setSyncFeedback(null), 3000);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-bold flex items-center justify-between cursor-pointer ${
                      freezeColumns === 0 && freezeRows === 0
                        ? 'bg-rose-100 text-rose-900 border border-rose-300'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <span>🔓 Unfreeze All (Cols &amp; Rows)</span>
                    {freezeColumns === 0 && freezeRows === 0 && <span>✓</span>}
                  </button>

                  <span className="text-[10px] uppercase font-bold text-slate-400 block px-1 pt-1 border-t border-slate-100">
                    Freeze Columns
                  </span>
                  <div className="space-y-0.5">
                    <button
                      onClick={() => { setFreezeColumns(0); setShowFreezeMenu(false); }}
                      className={`w-full text-left px-2 py-1 rounded cursor-pointer ${freezeColumns === 0 ? 'bg-emerald-50 font-bold text-emerald-900' : 'hover:bg-slate-50 text-slate-700'}`}
                    >
                      Unfreeze Columns (0)
                    </button>
                    <button
                      onClick={() => { setFreezeColumns(1); setShowFreezeMenu(false); }}
                      className={`w-full text-left px-2 py-1 rounded cursor-pointer ${freezeColumns === 1 ? 'bg-emerald-50 font-bold text-emerald-900' : 'hover:bg-slate-50 text-slate-700'}`}
                    >
                      Freeze 1 Col (#)
                    </button>
                    <button
                      onClick={() => { setFreezeColumns(2); setShowFreezeMenu(false); }}
                      className={`w-full text-left px-2 py-1 rounded cursor-pointer ${freezeColumns === 2 ? 'bg-emerald-50 font-bold text-emerald-900' : 'hover:bg-slate-50 text-slate-700'}`}
                    >
                      Freeze 2 Cols (# + PO) ★
                    </button>
                    <button
                      onClick={() => { setFreezeColumns(3); setShowFreezeMenu(false); }}
                      className={`w-full text-left px-2 py-1 rounded cursor-pointer ${freezeColumns === 3 ? 'bg-emerald-50 font-bold text-emerald-900' : 'hover:bg-slate-50 text-slate-700'}`}
                    >
                      Freeze 3 Cols (# + PO + Name)
                    </button>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block px-1 pt-1 border-t border-slate-100">
                    Freeze Rows
                  </span>
                  <div className="space-y-0.5">
                    <button
                      onClick={() => { setFreezeRows(1); setShowFreezeMenu(false); }}
                      className={`w-full text-left px-2 py-1 rounded cursor-pointer ${freezeRows === 1 ? 'bg-emerald-50 font-bold text-emerald-900' : 'hover:bg-slate-50 text-slate-700'}`}
                    >
                      Freeze Header Row ★
                    </button>
                    <button
                      onClick={() => { setFreezeRows(0); setShowFreezeMenu(false); }}
                      className={`w-full text-left px-2 py-1 rounded cursor-pointer ${freezeRows === 0 ? 'bg-emerald-50 font-bold text-emerald-900' : 'hover:bg-slate-50 text-slate-700'}`}
                    >
                      Unfreeze Header Row (0)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Columns Hide / Show Button */}
            <button
              onClick={() => setShowColManager(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="Hide / Show Specific Columns"
            >
              <Columns className="w-3 h-3 text-emerald-700" />
              <span>Columns ({Object.values(visibleCols).filter(Boolean).length}/45)</span>
            </button>

            {/* Clear Product Automation Tab Button */}
            <button
              onClick={() => setShowClearAutomationModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="Clear all rows in Product Automation & upload fresh new data"
            >
              <Trash2 className="w-3 h-3 text-rose-600" />
              <span>Clear Tab</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded border border-slate-300 shrink-0 cursor-pointer"
              title="Export CSV / Excel"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Firebase Cloud Sync Button */}
            <button
              onClick={() => setShowFirebaseModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="Upload historical data to Firebase"
            >
              <Flame className="w-3 h-3 fill-white" />
              <span>Firebase</span>
            </button>

            {/* Reset data */}
            <button
              onClick={handleReset}
              className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded shrink-0 cursor-pointer"
              title="Reset to default sample data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* FULL SIZE ON BUTTON IN THE FAR RIGHT CORNER */}
            {setIsFullWidth && (
              <button
                onClick={() => setIsFullWidth(!isFullWidth)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all shadow-xs shrink-0 ${
                  isFullWidth
                    ? 'bg-emerald-700 text-white border-emerald-800 hover:bg-emerald-800'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                }`}
                title={isFullWidth ? "Click for Boxed View" : "Click for Full Screen View"}
              >
                {isFullWidth ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                <span>{isFullWidth ? 'Full Size ON' : 'Full Size OFF'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sync feedback notification */}
        {syncFeedback && (
          <div className="p-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{syncFeedback}</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-mono">Saved in Browser LocalStorage ✓</span>
          </div>
        )}

        {/* THE MAIN SPREADSHEET TABLE GRID CONTAINER (Vertical & Horizontal Scroll Box with Freeze Panes) */}
        {activeSheetTab === 'product_order' ? (
          <ProductOrderView
            orders={productOrderRows}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            isFullWidth={isFullWidth}
            freezeColumns={freezeColumns}
            freezeRows={freezeRows}
            autoFitColumns={autoFitColumns}
            isSyncingImportRange={isSyncingImportRange}
            onSyncImportRange={handleSyncDelhiImportRange}
            onGenerateOrderNo={handleGenerateOrderNo}
            onGenerateAllPending={handleGenerateAllPendingOrderNo}
            onDeleteRow={handleDeleteItem}
            onClearAllRows={handleClearAllProductOrders}
            onOpenImportModal={() => {
              setImportSheetId('1ciwoXm38UcdjVe8n2LB51H66NLyel1Q1FERMb42AfGY');
              setImportTabName('Delhi');
              setShowImportModal(true);
            }}
            onOpenFirebaseModal={() => {
              setFirebaseStatusMsg(null);
              setShowFirebaseModal(true);
            }}
            onUpdateRow={handleUpdateProductOrderRow}
            onNavigateToAutomation={() => {
              setViewMode('merged');
              setActiveSheetTab('automation');
            }}
            onAddNewRow={handleAddNewProductOrderRow}
          />
        ) : (
          <div className={`overflow-x-auto overflow-y-auto ${isFullWidth ? 'h-[calc(100vh-140px)] max-h-[89vh]' : 'h-[640px] max-h-[74vh]'} select-text relative fms-sheet-scroll border border-slate-300 rounded-lg shadow-inner bg-white`}>
            <table className={`${autoFitColumns ? 'w-max min-w-full table-auto' : 'w-full'} border-collapse text-xs text-left`}>
            {/* The Sticky Column Letters Header with Rich Fill Colors */}
            <thead className={`${freezeRows === 1 ? 'sticky top-0 z-30' : ''} select-none border-b-2 border-slate-900`}>
              <tr className="font-mono text-[11px]">
                {/* # Column */}
                <th
                  className={`w-12 px-2 py-1 text-center bg-slate-900 text-slate-300 border-r border-slate-800 font-bold ${
                    freezeColumns >= 1 ? 'sticky left-0 z-40 bg-slate-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.3)]' : ''
                  }`}
                >
                  #
                </th>
                {/* Action Column */}
                <th className="w-14 px-2 py-1 text-center bg-slate-900 text-slate-300 border-r border-slate-800 font-bold">
                  Action
                </th>

                {fmsColumnMapping.map(col => {
                  if (!visibleCols[col.sheetCol]) return null;
                  const isFiltered = colFilters[col.sheetCol] && colFilters[col.sheetCol].length > 0;
                  const isSorted = sortConfig && sortConfig.column === col.sheetCol;

                  let bgColor = 'bg-slate-900 text-slate-300 border-r border-slate-800';
                  if (['A', 'B', 'C', 'D', 'E'].includes(col.sheetCol)) {
                    bgColor = 'bg-sky-950 text-sky-200 border-r border-sky-900';
                  } else if (['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].includes(col.sheetCol)) {
                    bgColor = 'bg-slate-950 text-slate-200 border-r border-slate-800';
                  } else if (['O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X'].includes(col.sheetCol)) {
                    bgColor = 'bg-indigo-950 text-indigo-200 border-r border-indigo-900';
                  } else if (col.sheetCol === 'Y') {
                    bgColor = 'bg-amber-900 text-amber-100 border-r border-amber-800 font-extrabold';
                  } else if (col.sheetCol === 'Z') {
                    bgColor = 'bg-emerald-900 text-emerald-100 border-r border-emerald-800 font-extrabold';
                  } else if (['AA', 'AB'].includes(col.sheetCol)) {
                    bgColor = 'bg-teal-950 text-teal-200 border-r border-teal-900 font-bold';
                  } else if (['AG', 'AH', 'AI'].includes(col.sheetCol)) {
                    bgColor = 'bg-emerald-950 text-emerald-200 border-r border-emerald-900 font-bold';
                  } else if (['AJ', 'AK', 'AL'].includes(col.sheetCol)) {
                    bgColor = 'bg-sky-950 text-sky-200 border-r border-sky-900 font-bold';
                  } else if (col.sheetCol === 'AN') {
                    bgColor = 'bg-blue-900 text-blue-100 border-r border-blue-800 font-extrabold';
                  } else if (col.sheetCol === 'AO' || col.sheetCol === 'AP') {
                    bgColor = 'bg-purple-950 text-purple-200 border-r border-purple-900';
                  }

                  // Sticky freeze column styles
                  let stickyStyle = '';
                  if (col.sheetCol === 'B' && freezeColumns >= 2) {
                    stickyStyle = 'sticky left-[48px] z-40 bg-sky-950 text-sky-100 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.3)]';
                  } else if (col.sheetCol === 'C' && freezeColumns >= 3) {
                    stickyStyle = 'sticky left-[158px] z-40 bg-sky-950 text-sky-100 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.3)]';
                  }

                  return (
                    <th
                      key={col.sheetCol}
                      className={`px-2 py-1 text-center font-bold ${bgColor} ${stickyStyle}`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{col.sheetCol}</span>
                        {isSorted && (
                          <span className="text-[10px] text-emerald-400 font-bold">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                        {isFiltered && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* Row 2: Human Readable Column Names with Filters & Elegant Fill Color */}
              <tr className="bg-slate-800 text-slate-100 font-sans text-[11px] font-semibold border-b-2 border-slate-950">
                <th
                  className={`px-2 py-1 text-center bg-slate-900 text-slate-400 border-r border-slate-700 ${
                    freezeColumns >= 1 ? 'sticky left-0 z-40 bg-slate-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.3)]' : ''
                  }`}
                >
                  1
                </th>
                <th className="px-2 py-1 text-center bg-slate-900 text-slate-400 border-r border-slate-700 text-[10px]">
                  Action
                </th>

                {fmsColumnMapping.map(col => {
                  if (!visibleCols[col.sheetCol]) return null;
                  const isFiltered = colFilters[col.sheetCol] && colFilters[col.sheetCol].length > 0;

                  // Rich fill color for specific functional groups
                  let bgHead = 'bg-slate-800 text-slate-100 border-r border-slate-700';
                  if (col.sheetCol === 'Y') {
                    bgHead = 'bg-amber-950 text-amber-200 border-r border-amber-800 font-bold';
                  } else if (col.sheetCol === 'Z') {
                    bgHead = 'bg-emerald-950 text-emerald-200 border-r border-emerald-800 font-bold';
                  } else if (['AA', 'AB'].includes(col.sheetCol)) {
                    bgHead = 'bg-teal-900 text-teal-100 border-r border-teal-800 font-bold';
                  } else if (['AG', 'AH', 'AI'].includes(col.sheetCol)) {
                    bgHead = 'bg-emerald-900 text-emerald-100 border-r border-emerald-800 font-bold';
                  } else if (['AJ', 'AK', 'AL'].includes(col.sheetCol)) {
                    bgHead = 'bg-sky-900 text-sky-100 border-r border-sky-800 font-bold';
                  } else if (col.sheetCol === 'AN') {
                    bgHead = 'bg-blue-950 text-sky-200 border-r border-blue-800 font-bold';
                  } else if (['A', 'B', 'C', 'D', 'E'].includes(col.sheetCol)) {
                    bgHead = 'bg-slate-850 text-sky-100 border-r border-slate-700';
                  }

                  // Sticky freeze column styles
                  let stickyStyle = '';
                  if (col.sheetCol === 'B' && freezeColumns >= 2) {
                    stickyStyle = 'sticky left-[48px] z-40 bg-slate-850 text-sky-200 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.3)]';
                  } else if (col.sheetCol === 'C' && freezeColumns >= 3) {
                    stickyStyle = 'sticky left-[158px] z-40 bg-slate-850 text-sky-200 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.3)]';
                  }

                  return (
                    <th
                      key={col.sheetCol}
                      className={`px-2.5 py-1 whitespace-nowrap ${bgHead} ${stickyStyle}`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="whitespace-nowrap">{col.name}</span>
                        {/* Filter on EVERY column */}
                        <button
                          onClick={() => setActiveFilterCol(activeFilterCol === col.sheetCol ? null : col.sheetCol)}
                          className={`p-0.5 rounded hover:bg-slate-700 transition-colors ${
                            isFiltered ? 'text-rose-400 font-extrabold bg-rose-950' : 'text-slate-400 hover:text-white'
                          }`}
                          title={`Filter, Sort or Hide ${col.name} (${col.sheetCol})`}
                        >
                          <Filter className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="font-sans">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={45} className="text-center py-14 text-slate-500 bg-white">
                    <AlertCircle className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-800">
                      Product Automation tab is clean (0 orders currently displayed).
                    </p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      Upload new data from Google Sheet / Excel, add a new order, or assign an Order No in Product Order.
                    </p>
                    <div className="flex items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setImportReplaceMode(true);
                          setImportError(null);
                          setShowImportModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs text-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Import New Data (Sheet / Paste / CSV)</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                renderSpreadsheetRows(
                  paginatedOrders,
                  viewMode === 'merged',
                  visibleCols,
                  freezeColumns,
                  {
                    onDispatchChange: handleDispatchChange,
                    onItemStatusChange: handleItemStatusChange,
                    onDeleteOrder: handleDeleteOrder,
                    onDeleteItem: handleDeleteItem,
                    onOpenOrderNoModal: setEditingOrderNo,
                    onOpenAddItemModal: setAddingItemToOrder,
                    onOpenConfirmWhatsAppModal: setConfirmWhatsAppModalOrder,
                    onOpenWhatsAppModal: setWhatsAppModalOrder,
                    aeStatuses,
                    setAeStatuses,
                    aoStatuses,
                    setAoStatuses,
                    lrNumbers,
                    setLrNumbers,
                    setSyncFeedback,
                    colAAStatuses,
                    onUpdateColAA: handleUpdateColAA,
                    colABRemarks,
                    onUpdateColAB: handleUpdateColAB,
                    colAGChecks,
                    onToggleColAG: handleToggleColAG,
                    colAHTimestamps,
                    colAIRemarks,
                    onUpdateColAI: handleUpdateColAI,
                    colAJChecks,
                    onToggleColAJ: handleToggleColAJ,
                    colAKTimestamps,
                    colALRemarks,
                    onUpdateColAL: handleUpdateColAL
                  },
                  startRowNumber,
                  autoFitColumns
                )
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* FAST VIRTUAL PAGINATION BAR (Prevents browser freeze & unresponsive page notifications) */}
        {(activeSheetTab === 'automation' || activeSheetTab === 'closed') && filteredOrders.length > 0 && (
          <div className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-slate-100 border-t border-slate-300 text-xs text-slate-700 select-none">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-800">
                Showing <span className="font-bold text-emerald-700 font-mono">{totalItemRows.toLocaleString()}</span> exact sheet rows
                <span className="text-slate-500 font-normal ml-1">
                  (Page {safeAutomationPage} of {totalAutomationPages} · {filteredOrders.length.toLocaleString()} order blocks)
                </span>
              </span>

              <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-300">
                <span className="text-[11px] text-slate-500">Orders per page:</span>
                <select
                  value={automationPageSize}
                  onChange={(e) => {
                    setAutomationPageSize(Number(e.target.value));
                    setAutomationPage(1);
                  }}
                  className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value={20}>20 orders</option>
                  <option value={25}>25 orders (Recommended)</option>
                  <option value={50}>50 orders</option>
                  <option value={100}>100 orders</option>
                  <option value={0}>All (May lag if &gt;500)</option>
                </select>
              </div>
            </div>

            {automationPageSize > 0 && totalAutomationPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAutomationPage(p => Math.max(1, p - 1))}
                  disabled={safeAutomationPage <= 1}
                  className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-medium cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>

                <span className="px-2 text-xs font-medium text-slate-600">
                  Page <strong className="text-slate-900">{safeAutomationPage}</strong> of <strong>{totalAutomationPages}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => setAutomationPage(p => Math.min(totalAutomationPages, p + 1))}
                  disabled={safeAutomationPage >= totalAutomationPages}
                  className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-medium cursor-pointer"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* COLUMN HEADER FILTER POPOVER (Works on EVERY Column with HIDE THIS COLUMN Option) */}
        {activeFilterCol && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setActiveFilterCol(null)}>
            <div
              className="bg-white rounded-xl shadow-2xl border border-slate-300 p-4 w-72 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-emerald-600" />
                  {fmsColumnMapping.find(c => c.sheetCol === activeFilterCol)?.name} ({activeFilterCol})
                </span>
                <button onClick={() => setActiveFilterCol(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sorting options */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSortConfig({ column: activeFilterCol, direction: 'asc' });
                    setActiveFilterCol(null);
                  }}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700 flex items-center justify-center gap-1"
                >
                  <ArrowUp className="w-3 h-3 text-emerald-600" />
                  <span>Sort A → Z</span>
                </button>
                <button
                  onClick={() => {
                    setSortConfig({ column: activeFilterCol, direction: 'desc' });
                    setActiveFilterCol(null);
                  }}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700 flex items-center justify-center gap-1"
                >
                  <ArrowDown className="w-3 h-3 text-emerald-600" />
                  <span>Sort Z → A</span>
                </button>
              </div>

              {/* HIDE THIS COLUMN OPTION (Requested by user) */}
              <button
                onClick={() => {
                  setVisibleCols(prev => ({ ...prev, [activeFilterCol]: false }));
                  setActiveFilterCol(null);
                  setSyncFeedback(`Column ${activeFilterCol} hidden. Use 'Columns' button to unhide.`);
                  setTimeout(() => setSyncFeedback(null), 3000);
                }}
                className="w-full py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-semibold flex items-center justify-center gap-1.5 border border-rose-200"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide this Column ({activeFilterCol})</span>
              </button>

              {/* Unique values list with checkboxes */}
              <div>
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">Select values to filter:</span>
                <div className="max-h-44 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded border border-slate-200">
                  {getUniqueColumnValues(activeFilterCol).map(val => {
                    const isChecked = !colFilters[activeFilterCol] || colFilters[activeFilterCol].includes(val);
                    return (
                      <label key={val} className="flex items-center gap-2 py-0.5 px-1 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleColFilterValue(activeFilterCol, val)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="truncate text-slate-800">{val}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => {
                    setColFilters(prev => {
                      const copy = { ...prev };
                      delete copy[activeFilterCol];
                      return copy;
                    });
                    setActiveFilterCol(null);
                  }}
                  className="text-slate-500 hover:text-slate-800 text-[11px] underline"
                >
                  Clear Filter
                </button>
                <button
                  onClick={() => setActiveFilterCol(null)}
                  className="px-3 py-1 bg-emerald-700 text-white rounded font-medium hover:bg-emerald-800"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GOOGLE SHEETS BOTTOM TABS BAR */}
        <div className="bg-slate-200 border-t border-slate-300 px-3 py-2 flex flex-wrap items-center justify-between gap-3 select-none">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {/* Tab 1: Product Order (28-Col Flat Sheet - Shows Total Orders as per =IMPORTRANGE("1ciwoXm38UcdjVe8n2LB51H66NLyel1Q1FERMb42AfGY","Delhi!A:Z")) */}
            <button
              onClick={() => setActiveSheetTab('product_order')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-t-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeSheetTab === 'product_order'
                  ? 'bg-white text-blue-900 shadow-sm border-t-2 border-blue-600'
                  : 'bg-slate-300/80 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Product Order (Total Orders)</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-mono font-bold">
                {productOrderRows.length.toLocaleString()} orders
              </span>
            </button>

            {/* Tab 2: Order Automation */}
            <button
              onClick={() => {
                setViewMode('merged');
                setActiveSheetTab('automation');
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-t-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeSheetTab === 'automation'
                  ? 'bg-white text-emerald-800 shadow-sm border-t-2 border-emerald-600'
                  : 'bg-slate-300/80 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Order Automation</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">
                {activeItemsCount.toLocaleString()} rows
              </span>
            </button>

            {/* Tab 3: Closed Orders (Archive) */}
            <button
              onClick={() => {
                setActiveSheetTab('closed');
                handleRefreshFromFirebaseCloud();
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-t-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeSheetTab === 'closed'
                  ? 'bg-white text-indigo-900 shadow-sm border-t-2 border-indigo-600'
                  : 'bg-slate-300/80 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-indigo-600" />
              <span>Closed Orders (Archive)</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 font-mono font-bold">
                {closedItemsCount.toLocaleString()} rows
              </span>
            </button>
          </div>

          {/* Status info */}
          <div className="text-[11px] text-slate-600 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Web Sheet Workspace</span>
            <span>·</span>
            <span>{freezeColumns > 0 || freezeRows > 0 ? `Freeze (${freezeColumns}) Active` : 'Unfrozen'}</span>
            <span>·</span>
            <span className="font-mono text-emerald-800 font-semibold">Vercel Ready</span>
          </div>
        </div>
      </div>

      {/* MODAL: CLEAR PRODUCT AUTOMATION TAB & ADD NEW DATA */}
      {showClearAutomationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-gradient-to-r from-rose-900 to-red-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-300" />
                <h3 className="font-bold text-sm">Clear Product Automation &amp; Upload New Data</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClearAutomationModal(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">
                Kya aap <span className="text-emerald-700 font-bold">Product Automation</span> tab ka purana data clear karke naya data dalna chahte hain?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] space-y-1">
                <p className="font-semibold text-rose-900">• Purane sabhi sample orders, dispatch records aur remarks clear ho jayenge (0 rows).</p>
                <p>• Clear hone ke turant baad aap apna naya data Google Sheet, Excel/CSV ya Paste (Ctrl+V) se fresh dal sakte hain.</p>
              </div>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearAutomationModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleClearAutomationTab(false)}
                className="px-3.5 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All (0 Rows)</span>
              </button>
              <button
                type="button"
                onClick={() => handleClearAutomationTab(true)}
                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Clear &amp; Add New Data ➔</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DIRECT GOOGLE SHEET (ID + TAB) & EXCEL / CSV DATA IMPORT */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <Upload className="w-4 h-4 text-sky-400" />
                  Import Google Sheet / Excel Data &amp; Sync to Firebase
                </h3>
                <p className="text-[11px] text-slate-300">
                  Google Sheet ID aur Tab Name enter karke live data load karein ya direct paste karein
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportError(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setImportTabMode('sheet');
                  setImportError(null);
                }}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                  importTabMode === 'sheet'
                    ? 'border-blue-600 text-blue-900 bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span>⚡ Live Google Sheet (ID + Tab)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportTabMode('paste');
                  setImportError(null);
                }}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                  importTabMode === 'paste'
                    ? 'border-emerald-600 text-emerald-900 bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Copy className="w-3.5 h-3.5 text-emerald-600" />
                <span>📋 Paste Rows (Ctrl+V)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportTabMode('file');
                  setImportError(null);
                }}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                  importTabMode === 'file'
                    ? 'border-indigo-600 text-indigo-900 bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>📁 Upload File (.csv)</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* Error Callout */}
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block text-xs">Import Issue:</span>
                    <p className="text-[11px] leading-relaxed text-rose-800">{importError}</p>
                    <p className="text-[10px] text-rose-700 font-medium">
                      💡 Tip: Agar Sheet internal/private ho, toh Google Sheet me jaakar rows select karke <strong>Ctrl+C</strong> karein aur yahan <strong>"Paste Rows (Ctrl+V)"</strong> tab me paste kar dein!
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 1: GOOGLE SHEET ID & TAB NAME */}
              {importTabMode === 'sheet' && (
                <div className="space-y-4">
                  {/* Google Sheet ID input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                        <Link2 className="w-3.5 h-3.5 text-blue-600" />
                        Google Sheet ID ya Full Sheet URL:
                      </label>
                      <span className="text-[10px] text-slate-500">
                        URL paste karne par ID auto-extract hoti hai
                      </span>
                    </div>
                    <input
                      type="text"
                      value={importSheetId}
                      onChange={(e) => {
                        setImportSheetId(e.target.value);
                        setImportError(null);
                      }}
                      placeholder="e.g. 1ciwoXm38UcdjVe8n2LB51H66NLyel1Q1FERMb42AfGY"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                      <span>
                        Extracted ID:{' '}
                        <code className="text-blue-800 font-bold font-mono">
                          {extractSheetId(importSheetId) || 'None'}
                        </code>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setImportSheetId('1ciwoXm38UcdjVe8n2LB51H66NLyel1Q1FERMb42AfGY');
                            setImportTabName('Delhi');
                            setImportReplaceMode(false);
                          }}
                          className="text-emerald-700 font-bold hover:underline cursor-pointer"
                        >
                          Use Delhi IMPORTRANGE (Delhi!A:Z)
                        </button>
                        <span>|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setImportSheetId('15jjr5tjxaWRPiv_nh6L9EZyFHNFZyQ3PQ6Jd89cV4k0');
                            setImportTabName('Product Automation 1');
                            setImportReplaceMode(true);
                          }}
                          className="text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          Use FMS Automation Sheet (Product Automation 1)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tab / Sheet Name input */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-800 block mb-1">
                      Tab / Sheet Name (Google Sheet ke bottom tab ka naam):
                    </label>
                    <input
                      type="text"
                      value={importTabName}
                      onChange={(e) => {
                        setImportTabName(e.target.value);
                        setImportError(null);
                      }}
                      placeholder="e.g. Product Automation 1 / Delhi / Product Order"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    {/* Quick Selection Chips */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-medium">Quick Pick:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setImportSheetId('15jjr5tjxaWRPiv_nh6L9EZyFHNFZyQ3PQ6Jd89cV4k0');
                          setImportTabName('Order Automation 1');
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                          importTabName.trim() === 'Order Automation 1'
                            ? 'bg-blue-100 border-blue-400 text-blue-900'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Order Automation 1
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImportSheetId('15jjr5tjxaWRPiv_nh6L9EZyFHNFZyQ3PQ6Jd89cV4k0');
                          setImportTabName('Product Automation 1');
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                          importTabName.trim() === 'Product Automation 1'
                            ? 'bg-blue-100 border-blue-400 text-blue-900'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Product Automation 1
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImportSheetId('15jjr5tjxaWRPiv_nh6L9EZyFHNFZyQ3PQ6Jd89cV4k0');
                          setImportTabName('Closed Orders');
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                          importTabName.trim() === 'Closed Orders'
                            ? 'bg-indigo-100 border-indigo-400 text-indigo-900'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Closed Orders
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImportSheetId('1ciwoXm38UcdjVe8n2LB51H66NLyel1Q1FERMb42AfGY');
                          setImportTabName('Delhi');
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                          importTabName === 'Delhi'
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Delhi (IMPORTRANGE A:Z)
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportTabName('Product Order')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                          importTabName === 'Product Order'
                            ? 'bg-blue-100 border-blue-400 text-blue-900'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Product Order
                      </button>
                    </div>
                  </div>

                  {/* Firebase Auto-Sync Checkbox card */}
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/90 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoSyncToFirebase}
                        onChange={(e) => setAutoSyncToFirebase(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
                        Auto-save imported data to Firebase Realtime Database
                      </span>
                    </label>
                    <div className="pl-6 text-[10px] text-amber-900/80 space-y-0.5">
                      <p>
                        Data import hote hi direct Firebase me batch update ho jayega taaki aapka data cloud me permanently save rahe aur har device par live show ho.
                      </p>
                      <p className="font-mono text-slate-600 truncate">
                        Target: <span className="text-amber-800">{firebaseUrl}</span> (Auth Secret: Configured ✓)
                      </p>
                    </div>
                  </div>

                  {/* Guidance Note */}
                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-sky-950 text-[11px] leading-relaxed">
                    <span className="font-bold block text-sky-900 mb-0.5">📌 Permission Note for Google Sheets:</span>
                    Google Sheets se direct fetch karne ke liye Sheet ka link sharing <strong>"Anyone with the link can view"</strong> hona chahiye.
                  </div>
                </div>
              )}

              {/* TAB 2: PASTE ROWS DIRECTLY */}
              {importTabMode === 'paste' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Paste rows directly copied from Google Sheets / Excel (Ctrl+V):
                    </label>
                    <textarea
                      rows={8}
                      value={pastedDataText}
                      onChange={(e) => setPastedDataText(e.target.value)}
                      placeholder="Google Sheet me rows select karke Ctrl+C karein aur yahan Ctrl+V karein...&#10;Columns automatically PO, Customer, Items, Qty, Rate, Dispatch, Status etc. me map honge."
                      className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Firebase Auto-Sync Checkbox card */}
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/90">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoSyncToFirebase}
                        onChange={(e) => setAutoSyncToFirebase(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
                        Save pasted data to Firebase Realtime Database
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 3: FILE UPLOAD */}
              {importTabMode === 'file' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Select a .CSV or .TXT file from your computer:
                    </label>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            if (content) setPastedDataText(content);
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                    />
                  </div>

                  {pastedDataText && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-600 max-h-28 overflow-y-auto">
                      File loaded (~{pastedDataText.split('\n').filter(Boolean).length} rows detected)
                    </div>
                  )}

                  {/* Firebase Auto-Sync Checkbox card */}
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/90">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoSyncToFirebase}
                        onChange={(e) => setAutoSyncToFirebase(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
                        Save uploaded data to Firebase Realtime Database
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Upload Mode Card: Clean 1:1 Fresh Upload vs Append */}
              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 flex items-center gap-1.5">
                    <span>⚡ Upload Mode:</span>
                  </span>
                  <span className="text-[10px] text-blue-800 font-semibold bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300">
                    Recommended: Replace All (Zero Duplicates)
                  </span>
                </div>
                <div className="space-y-1.5 pl-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 select-none">
                    <input
                      type="radio"
                      name="importReplaceMode"
                      checked={importReplaceMode}
                      onChange={() => setImportReplaceMode(true)}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span>✓ Replace All Rows (Clean 1:1 Fresh Upload — Purges old/duplicate rows)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600 select-none">
                    <input
                      type="radio"
                      name="importReplaceMode"
                      checked={!importReplaceMode}
                      onChange={() => setImportReplaceMode(false)}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Append to Existing Rows (Add rows below current data)</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-between border-t border-slate-200">
                <span className="text-[11px] text-slate-500">
                  Multiple times import kar sakte hain — clean 1:1 mapping ensure hogi!
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportError(null);
                    }}
                    className="px-3.5 py-1.5 text-slate-600 hover:text-slate-800 font-medium"
                  >
                    Cancel
                  </button>

                  {importTabMode === 'sheet' ? (
                    <button
                      type="button"
                      disabled={isFetchingSheet || !importSheetId.trim() || !importTabName.trim()}
                      onClick={handleFetchFromGoogleSheet}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      {isFetchingSheet ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Fetching Google Sheet...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Fetch &amp; Import from Sheet</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!pastedDataText.trim()}
                      onClick={() => handleParseImportedData(pastedDataText, autoSyncToFirebase, importTabMode === 'paste' ? 'Pasted Data' : 'Uploaded File')}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Import into Sheet Grid</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COLUMN VISIBILITY MANAGER (HIDE / SHOW MANUAL COLUMNS & HIDE SELECTED) */}
      {showColManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Columns className="w-4 h-4 text-emerald-400" />
                  Customize Visible Columns (Hide / Show Manual Columns)
                </h3>
                <p className="text-[11px] text-slate-300">
                  Select which columns appear in your spreadsheet grid
                </p>
              </div>
              <button onClick={() => setShowColManager(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto text-xs">
              {/* Quick toggle presets */}
              <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200">
                <button
                  onClick={() => {
                    const all: Record<string, boolean> = {};
                    fmsColumnMapping.forEach(c => all[c.sheetCol] = true);
                    setVisibleCols(all);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700"
                >
                  Show All 45
                </button>
                <button
                  onClick={() => {
                    const focused: Record<string, boolean> = {};
                    fmsColumnMapping.forEach(c => {
                      focused[c.sheetCol] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AN', 'AO', 'AP'].includes(c.sheetCol);
                    });
                    setVisibleCols(focused);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700"
                >
                  Standard FMS View (28)
                </button>
                <button
                  onClick={() => {
                    const min: Record<string, boolean> = {};
                    fmsColumnMapping.forEach(c => {
                      min[c.sheetCol] = ['B', 'C', 'G', 'K', 'L', 'Y', 'Z', 'AN'].includes(c.sheetCol);
                    });
                    setVisibleCols(min);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700"
                >
                  Compact Dispatch (8)
                </button>
              </div>

              {/* Grid of all columns */}
              <div className="grid grid-cols-2 gap-1.5">
                {fmsColumnMapping.map(col => (
                  <label
                    key={col.sheetCol}
                    className={`flex items-center gap-2 p-1.5 rounded border transition-colors cursor-pointer ${
                      visibleCols[col.sheetCol] ? 'bg-emerald-50/60 border-emerald-200 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!visibleCols[col.sheetCol]}
                      onChange={(e) => setVisibleCols(prev => ({ ...prev, [col.sheetCol]: e.target.checked }))}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-mono font-bold text-[11px] w-6 text-emerald-800">{col.sheetCol}</span>
                    <span className="truncate text-xs">{col.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {Object.values(visibleCols).filter(Boolean).length} of 45 columns visible
              </span>
              <button
                onClick={() => setShowColManager(false)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FIREBASE CLOUD SYNC & HISTORICAL DATA UPLOAD */}
      {showFirebaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Flame className="w-5 h-5 fill-white" />
                  Firebase Cloud Sync &amp; Historical Data Upload
                </h3>
                <p className="text-xs text-amber-100">
                  Load up to 1 Lakh+ rows without browser lag or script timeouts
                </p>
              </div>
              <button onClick={() => setShowFirebaseModal(false)} className="text-amber-100 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-950 space-y-1">
                <span className="font-bold block text-sm flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-amber-700" />
                  Firebase Data Kahan Save Hota Hai?
                </span>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  Data <strong>Firebase Console &gt; Build &gt; Realtime Database &gt; Data</strong> tab me <code>/product_automation</code> aur <code>/closed_orders</code> me save hota hai.
                  (Firestore Database me nahi, Realtime Database me check karein!)
                </p>
              </div>

              {/* Live Diagnostic Status Banner inside Modal */}
              {firebaseStatusMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    firebaseStatusMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : firebaseStatusMsg.type === 'error'
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-sky-50 border-sky-300 text-sky-950'
                  }`}
                >
                  {firebaseStatusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold leading-relaxed">{firebaseStatusMsg.text}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    1. Firebase Realtime Database URL (Apne Firebase Console se paste karein):
                  </label>
                  <input
                    type="text"
                    value={firebaseUrl}
                    onChange={(e) => {
                      setFirebaseUrl(e.target.value);
                      setFirebaseStatusMsg(null);
                    }}
                    placeholder="https://your-project-id-default-rtdb.firebaseio.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-600 mt-1 block leading-relaxed">
                    📌 <strong>Important:</strong> Apne <strong>Firebase Console &gt; Build &gt; Realtime Database &gt; Data</strong> tab me jayein, wahan box ke upar jo link diya hai (jaise <code>https://...-default-rtdb.firebaseio.com</code> ya <code>https://...-default-rtdb.asia-southeast1.firebasedatabase.app</code>) use copy karke yahan paste karein.
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    2. Firebase Database Secret (Optional — Leave Blank if Rules are .write: true):
                  </label>
                  <input
                    type="text"
                    value={firebaseSecret}
                    onChange={(e) => setFirebaseSecret(e.target.value)}
                    placeholder="Leave blank if your Firebase Rules have .read: true, .write: true"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none bg-slate-50"
                  />
                  <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
                    ✓ Aapne Rules me <code>".read": true, ".write": true</code> lagaya hai, isliye Secret blank rakh sakte hain!
                  </span>
                </div>
              </div>

              {/* Upload Progress Bar if active */}
              {uploadProgress !== null && (
                <div className="space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Uploading {rawResponses.length.toLocaleString()} Rows to Firebase...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Batching: 250 order blocks per request (Zero Quota Loss)
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const cleanUrl = normalizeFirebaseDbUrl(firebaseUrl);
                      setFirebaseUrl(cleanUrl);
                      localStorage.setItem(
                        LOCAL_STORAGE_FIREBASE_CONFIG,
                        JSON.stringify({ url: cleanUrl, secret: firebaseSecret })
                      );
                      setFirebaseStatusMsg({ type: 'success', text: `✓ Saved Firebase URL (${cleanUrl})!` });
                      setSyncFeedback('Saved Firebase URL & Config!');
                      setTimeout(() => setSyncFeedback(null), 3000);
                    }}
                    className="w-full sm:w-auto px-3.5 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 text-xs cursor-pointer"
                  >
                    Save Config
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const targetUrl = normalizeFirebaseDbUrl(firebaseUrl);
                        setFirebaseUrl(targetUrl);
                        const cleanSec = (firebaseSecret || DEFAULT_FIREBASE_SECRET).trim();
                        const authParam = cleanSec ? `?auth=${encodeURIComponent(cleanSec)}` : '';
                        const testUrl = `${targetUrl}/_connection_test.json${authParam}`;
                        setFirebaseStatusMsg({ type: 'info', text: `Testing connection to ${targetUrl}...` });
                        const resp = await fetch(testUrl, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            tested_at: new Date().toISOString(),
                            status: 'Connected',
                            client: 'GINZA Web FMS'
                          })
                        });
                        if (resp.ok) {
                          setFirebaseStatusMsg({
                            type: 'success',
                            text: `✓ Firebase Connected Successfully! (${targetUrl}/_connection_test). Ab "1-Click Upload Data to Firebase" par click karein.`
                          });
                        } else {
                          const errTxt = await resp.text();
                          setFirebaseStatusMsg({
                            type: 'error',
                            text: `Firebase Connection Failed (HTTP ${resp.status}): ${errTxt.substring(0, 120)}`
                          });
                        }
                      } catch (err: any) {
                        setFirebaseStatusMsg({
                          type: 'error',
                          text: `Firebase Test Error: ${err.message || 'Check your Firebase URL'}`
                        });
                      }
                    }}
                    className="w-full sm:w-auto px-3.5 py-2 border border-amber-300 bg-amber-50 rounded-lg font-semibold text-amber-900 hover:bg-amber-100 text-xs cursor-pointer"
                  >
                    📡 Test Ping
                  </button>
                </div>

                <button
                  type="button"
                  disabled={uploadProgress !== null}
                  onClick={handleUploadToFirebase}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>1-Click Upload Data to Firebase ({rawResponses.length.toLocaleString()} Rows)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW MULTI-ITEM ORDER */}
      {showNewOrderModal && (
        <NewOrderModal
          onClose={() => setShowNewOrderModal(false)}
          onSubmit={handleCreateNewOrder}
        />
      )}

      {/* MODAL: ADD ITEM TO EXISTING ORDER */}
      {addingItemToOrder && (
        <AddItemModal
          order={addingItemToOrder}
          onClose={() => setAddingItemToOrder(null)}
          onSubmit={(itemData) => handleAddItemToExistingOrder(addingItemToOrder, itemData)}
        />
      )}

      {/* MODAL: QUICK EDIT ORDER NO (COL X) */}
      {editingOrderNo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 max-w-md w-full">
            <h3 className="text-sm font-bold text-slate-900">
              Edit Order Number (Col X)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Set or update Sales Order number for <strong className="text-slate-800">{editingOrderNo.po}</strong>.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Sales Order Number (Col X)</label>
                <input
                  type="text"
                  value={editingOrderNo.value}
                  onChange={(e) => setEditingOrderNo({ ...editingOrderNo, value: e.target.value })}
                  placeholder="e.g. DMN/02241/25-26 / TDN/03590/25-26"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                  autoFocus
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingOrderNo(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOrderNo}
                className="px-4 py-1.5 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800"
              >
                Save Order No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WHATSAPP DISPATCH PREVIEW */}
      {whatsAppModalOrder && (() => {
        const cleanPhone = (whatsAppModalOrder.customerNumber || '').replace(/[+\-\s]/g, '').replace(/^0+/, '');
        const itemBlocks = whatsAppModalOrder.items.map(it => (
          `*Item Name*    : ${it.itemName}\n` +
          `*Color*        : ${it.color}\n` +
          `*Dispatch Qnt* : ${it.dispatchQty || 0}\n` +
          `*Unit of Item* : ${it.unitOfItem}`
        )).join('\n--------------------------\n');

        const messageText =
          `Dear ${whatsAppModalOrder.customerName},\n\n` +
          `We are pleased to inform you that your order has been *successfully dispatched*.\n\n` +
          `*Order Summary*\n` +
          `--------------------------\n` +
          `Order Date : ${whatsAppModalOrder.orderDate}\n` +
          `Order No   : ${whatsAppModalOrder.orderNo || 'DMN/02241/25-26'}\n` +
          `Transporter: ${whatsAppModalOrder.transporterName || 'Mehta transport'}\n\n` +
          `*Dispatched Items*\n` +
          `--------------------------\n` +
          itemBlocks + `\n\n` +
          `Thank you for choosing Ginza Industries Ltd.`;

        const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
              <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-emerald-800 text-white">
                    <MessageSquare className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm">WhatsApp Dispatch Link Preview (Col AO → AP)</h3>
                    <p className="text-[11px] text-emerald-100">Formula generated via HYPERLINK + ENCODEURL</p>
                  </div>
                </div>
                <button
                  onClick={() => setWhatsAppModalOrder(null)}
                  className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Customer &amp; Phone (Col P)</span>
                    <span className="font-bold text-slate-800">{whatsAppModalOrder.customerName}</span>
                    <span className="font-mono text-emerald-700 block">{cleanPhone || '8800421410'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Order No &amp; Date (Col X &amp; E)</span>
                    <span className="font-bold text-slate-800">{whatsAppModalOrder.orderNo || 'DMN/02241/25-26'}</span>
                    <span className="text-slate-600 block">{whatsAppModalOrder.orderDate}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Dispatched Message (Multi-item summary):
                    </label>
                    <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {whatsAppModalOrder.items.length} Product Items
                    </span>
                  </div>
                  <div className="bg-[#eef8f2] border border-[#c1e7ce] p-3.5 rounded-xl font-mono text-xs whitespace-pre-wrap text-slate-800 leading-relaxed shadow-inner">
                    {messageText}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(messageText);
                    setCopiedWhatsAppMsg(true);
                    setTimeout(() => setCopiedWhatsAppMsg(false), 2500);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {copiedWhatsAppMsg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedWhatsAppMsg ? 'Copied Message!' : 'Copy Text'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWhatsAppModalOrder(null)}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
                  >
                    Close
                  </button>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Send on WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: INSTANT CONFIRMATION WHATSAPP PREVIEW (Col AE ➔ AF) */}
      {confirmWhatsAppModalOrder && (() => {
        const cleanPhone = (confirmWhatsAppModalOrder.customerNumber || '').replace(/[^0-9]/g, '');
        const displayOrderNo = confirmWhatsAppModalOrder.orderNo?.trim() || confirmWhatsAppModalOrder.customerPO?.trim() || 'Pending';
        const NL = '\n';
        const NL2 = '\n\n';

        const itemBlocks = confirmWhatsAppModalOrder.items.map((it, idx) => {
          const itemHeader = confirmWhatsAppModalOrder.items.length > 1 ? `*Item ${idx + 1}:*${NL}` : '';
          return (
            itemHeader +
            `Item Name: ${it.itemName}${NL}` +
            `Color: ${it.color}${NL}` +
            `Qnt: ${it.qty}${NL}` +
            `Price: ${it.rate}${NL}` +
            `Delivery Date: ${it.deliveryDate || ''}`
          );
        });

        const itemsText = itemBlocks.join(`${NL}--------------------------${NL}`);
        let addressLine = '';
        if (confirmWhatsAppModalOrder.deliveryAddress && confirmWhatsAppModalOrder.deliveryAddress.trim()) {
          addressLine = `Delivery Address: ${confirmWhatsAppModalOrder.deliveryAddress.trim()}${NL}`;
        }

        const messageText =
          `Dear ${confirmWhatsAppModalOrder.customerName || 'Customer'},${NL2}` +
          `Thank you for choosing Ginza Industries Ltd.${NL2}` +
          `Your Order has been successfully received and is now being processed.${NL2}` +
          `*Order Summary*${NL2}` +
          `Order Date: ${confirmWhatsAppModalOrder.orderDate}${NL}` +
          `Order Number: ${displayOrderNo}${NL}` +
          addressLine +
          `--------------------------${NL}` +
          itemsText + `${NL}` +
          `--------------------------${NL2}` +
          `Thank you for your continued support & trust in Soie and Ginza Industries Limited.`;

        const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
              <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-emerald-800 text-white">
                    <MessageSquare className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm">Order Confirmation WhatsApp Preview (Col AE ➔ AF)</h3>
                    <p className="text-[11px] text-emerald-100">Formula generated via HYPERLINK + ENCODEURL</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmWhatsAppModalOrder(null)}
                  className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Customer &amp; Phone (Col P)</span>
                    <span className="font-bold text-slate-800">{confirmWhatsAppModalOrder.customerName}</span>
                    <span className="font-mono text-emerald-700 block">{cleanPhone || '8800421410'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Order No &amp; Date (Col X &amp; E)</span>
                    <span className="font-bold text-slate-800">{displayOrderNo}</span>
                    <span className="text-slate-600 block">{confirmWhatsAppModalOrder.orderDate}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Order Confirmation Message (Instant Booking Notice):
                    </label>
                    <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {confirmWhatsAppModalOrder.items.length} Product Items
                    </span>
                  </div>
                  <div className="bg-[#eef8f2] border border-[#c1e7ce] p-3.5 rounded-xl font-mono text-xs whitespace-pre-wrap text-slate-800 leading-relaxed shadow-inner">
                    {messageText}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(messageText);
                    setCopiedConfirmMsg(true);
                    setTimeout(() => setCopiedConfirmMsg(false), 2500);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {copiedConfirmMsg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedConfirmMsg ? 'Copied Message!' : 'Copy Text'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmWhatsAppModalOrder(null)}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
                  >
                    Close
                  </button>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Send on WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// RENDER FUNCTION FOR ROWS (Handles Merged A-E, N-X, and Freeze Panes)
function renderSpreadsheetRows(
  orders: GroupedOrder[],
  useMerge: boolean,
  visibleCols: Record<string, boolean>,
  freezeColumns: number,
  handlers: {
    onDispatchChange: (orderKey: string, item: any, valStr: string) => void;
    onItemStatusChange: (orderId: string, newStatus: 'Open' | 'In-Progress' | 'Closed') => void;
    onDeleteOrder: (orderKey: string, poName: string) => void;
    onDeleteItem: (itemOrderId: string) => void;
    onOpenOrderNoModal: (data: { key: string; po: string; value: string }) => void;
    onOpenAddItemModal: (order: GroupedOrder) => void;
    onOpenConfirmWhatsAppModal: (order: GroupedOrder) => void;
    onOpenWhatsAppModal: (order: GroupedOrder) => void;
    aeStatuses: Record<string, string>;
    setAeStatuses: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    aoStatuses: Record<string, string>;
    setAoStatuses: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    lrNumbers: Record<string, string>;
    setLrNumbers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setSyncFeedback: (msg: string | null) => void;
    colAAStatuses: Record<string, string>;
    onUpdateColAA: (orderKey: string, val: string) => void;
    colABRemarks: Record<string, string>;
    onUpdateColAB: (orderKey: string, val: string) => void;
    colAGChecks: Record<string, boolean>;
    onToggleColAG: (orderKey: string, checked: boolean) => void;
    colAHTimestamps: Record<string, string>;
    colAIRemarks: Record<string, string>;
    onUpdateColAI: (orderKey: string, val: string) => void;
    colAJChecks: Record<string, boolean>;
    onToggleColAJ: (orderKey: string, checked: boolean) => void;
    colAKTimestamps: Record<string, string>;
    colALRemarks: Record<string, string>;
    onUpdateColAL: (orderKey: string, val: string) => void;
  },
  startRowIndex: number = 2,
  autoFitColumns: boolean = true
) {
  let rowNumber = startRowIndex; // Sheets start row 2 (or offset for page)
  const rows: React.ReactNode[] = [];

  orders.forEach((order) => {
    const rowSpan = useMerge ? order.items.length : 1;
    const currentOrderKey = order.orderKey;
    const currentStatus = order.statusAN || 'Open';

    order.items.forEach((item, itemIdx) => {
      const isFirst = itemIdx === 0;
      const isLast = itemIdx === order.items.length - 1;
      const showHeaderCols = !useMerge || isFirst;
      const thisRow = rowNumber;

      const bottomBorderClass = useMerge && isLast
        ? 'border-b-2 border-b-slate-400'
        : 'border-b border-b-slate-200';

      const cellBottomBorder = useMerge ? 'border-b-2 border-b-slate-400' : '';

      // Freeze column positioning styles
      const numSticky = freezeColumns >= 1 ? 'sticky left-0 z-20 bg-slate-50 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.15)]' : '';
      const poSticky = freezeColumns >= 2 ? 'sticky left-[48px] z-20 bg-blue-50/90 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.15)]' : '';
      const nameSticky = freezeColumns >= 3 ? 'sticky left-[158px] z-20 bg-blue-50/90 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.15)]' : '';

      rows.push(
        <tr
          key={`${order.orderKey}_${item.id}_${itemIdx}`}
          className={`transition-colors ${
            item.isDuplicate
              ? 'bg-rose-50/60 hover:bg-rose-100/70'
              : 'hover:bg-slate-50'
          } ${bottomBorderClass}`}
        >
          {/* Row Number */}
          <td
            className={`px-1.5 py-0.5 text-center border-r border-slate-300 font-mono text-[10px] ${
              item.isDuplicate
                ? 'bg-rose-200 text-rose-950 font-extrabold'
                : 'bg-slate-50 text-slate-500'
            } ${numSticky} ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
          >
            {thisRow}
          </td>

          {/* Action Column (Per-Row Duplicate Color Indicator + Delete Action) */}
          <td
            className={`px-1.5 py-0.5 text-center border-r border-slate-300 align-middle whitespace-nowrap ${
              item.isDuplicate
                ? 'bg-rose-500 text-white font-extrabold shadow-inner'
                : 'bg-emerald-50/70 text-emerald-800'
            } ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            title={
              item.isDuplicate
                ? `⚠️ DUPLICATE ROW DETECTED (Copy #${item.duplicateGroupIndex} of ${item.duplicateCount} identical rows for ${order.customerName} - ${item.itemName})`
                : 'Unique Row (No Duplicate)'
            }
          >
            <div className="flex items-center justify-center gap-1">
              {item.isDuplicate ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-700 text-amber-200 text-[9px] font-mono font-extrabold tracking-tight border border-amber-300/80 shadow-2xs">
                  DUP ×{item.duplicateCount}
                </span>
              ) : (
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Unique Row ✓" />
              )}
              <button
                onClick={() => handlers.onDeleteItem(item.id)}
                className={`p-0.5 rounded transition-colors cursor-pointer ${
                  item.isDuplicate
                    ? 'text-white hover:bg-rose-700 hover:text-amber-200'
                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                }`}
                title={item.isDuplicate ? 'Delete this duplicate row' : 'Delete this row'}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </td>

          {/* COLUMNS A TO E: VERTICAL MERGE */}
          {showHeaderCols && (
            <>
              {/* Col A: Timestamp */}
              {visibleCols['A'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-600 align-middle bg-blue-50/20 whitespace-nowrap text-[11px] ${cellBottomBorder}`}
                >
                  {order.timestamp}
                </td>
              )}

              {/* Col B: Customer PO */}
              {visibleCols['B'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 font-bold text-slate-900 align-middle bg-blue-50/20 whitespace-nowrap text-[11px] ${poSticky} ${cellBottomBorder}`}
                >
                  <div className="flex items-center gap-1">
                    <span className={order.customerPO === '5281' ? 'text-emerald-700 font-extrabold' : ''}>{order.customerPO}</span>
                    {useMerge && order.items.length > 1 && (
                      <span className="text-[9px] px-1 py-0.1 rounded-full bg-blue-100 text-blue-800 font-mono font-bold">
                        {order.items.length} itm
                      </span>
                    )}
                  </div>
                </td>
              )}

              {/* Col C: Customer Name */}
              {visibleCols['C'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 font-semibold text-slate-800 align-middle bg-blue-50/20 whitespace-nowrap text-[11px] ${nameSticky} ${cellBottomBorder}`}
                >
                  {order.customerName}
                </td>
              )}

              {/* Col D: Customer Email */}
              {visibleCols['D'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-600 align-middle bg-blue-50/20 whitespace-nowrap text-[10px] ${cellBottomBorder}`}
                >
                  {order.customerEmail}
                </td>
              )}

              {/* Col E: Order Date */}
              {visibleCols['E'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-600 align-middle bg-blue-50/20 whitespace-nowrap text-[11px] ${cellBottomBorder}`}
                >
                  {order.orderDate}
                </td>
              )}
            </>
          )}

          {/* COLUMNS F TO N: INDIVIDUAL PRODUCT ITEM ROWS (NEVER MERGED) */}
          {/* Col F: Unit */}
          {visibleCols['F'] && (
            <td
              className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-700 whitespace-nowrap font-medium text-[11px] ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              {item.unit}
            </td>
          )}

          {/* Col G: Item Name */}
          {visibleCols['G'] && (
            <td
              className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 font-semibold text-slate-900 whitespace-nowrap text-[11px] ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span>{item.itemName}</span>
                {order.items.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlers.onDeleteItem(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-600 text-slate-300 p-0.5 rounded"
                    title="Delete item row"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </td>
          )}

          {/* Col H: Color */}
          {visibleCols['H'] && (
            <td
              className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-700 whitespace-nowrap text-[11px] ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              {item.color}
            </td>
          )}

          {/* Col I: Width */}
          {visibleCols['I'] && (
            <td
              className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-700 whitespace-nowrap text-[11px] ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              {item.width}
            </td>
          )}

          {/* Col J: Unit (of Item) */}
          {visibleCols['J'] && (
            <td
              className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-600 whitespace-nowrap text-[11px] ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              {item.unitOfItem}
            </td>
          )}

          {/* Col K: Qty */}
          {visibleCols['K'] && (
            <td
              className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 font-mono font-bold text-slate-900 text-right whitespace-nowrap text-[11px] ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              {item.qty.toLocaleString()}
            </td>
          )}

          {/* Col L: Rate */}
          {visibleCols['L'] && (
            <td
              className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 font-mono text-slate-700 text-right whitespace-nowrap text-[11px] ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              ₹{item.rate}
            </td>
          )}

          {/* Col M: Discount */}
          {visibleCols['M'] && (
            <td
              className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 font-mono text-slate-700 text-right whitespace-nowrap text-[11px] ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              {item.discount}%
            </td>
          )}

          {/* Col N: Delivery Date */}
          {visibleCols['N'] && (
            <td
              className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-600 whitespace-nowrap text-[11px] ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              {item.deliveryDate}
            </td>
          )}

          {/* COLUMNS O TO X: VERTICAL MERGE */}
          {showHeaderCols && (
            <>
              {/* Col O: Remark */}
              {visibleCols['O'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-600 align-middle bg-blue-50/20 text-[11px] ${
                    autoFitColumns ? 'whitespace-nowrap' : 'whitespace-nowrap max-w-[180px] truncate'
                  } ${cellBottomBorder}`}
                  title={order.remark}
                >
                  {order.remark || '—'}
                </td>
              )}

              {/* Col P: Customer Number */}
              {visibleCols['P'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 font-mono text-slate-700 align-middle bg-blue-50/20 whitespace-nowrap text-[11px] ${cellBottomBorder}`}
                >
                  {order.customerNumber}
                </td>
              )}

              {/* Col Q: Billing Address */}
              {visibleCols['Q'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-600 align-middle bg-blue-50/20 text-[11px] ${
                    autoFitColumns ? 'whitespace-nowrap' : 'whitespace-nowrap max-w-[180px] truncate'
                  } ${cellBottomBorder}`}
                  title={order.billingAddress}
                >
                  {order.billingAddress}
                </td>
              )}

              {/* Col R: Delivery Address */}
              {visibleCols['R'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-600 align-middle bg-blue-50/20 text-[11px] ${
                    autoFitColumns ? 'whitespace-nowrap' : 'whitespace-nowrap max-w-[180px] truncate'
                  } ${cellBottomBorder}`}
                  title={order.deliveryAddress}
                >
                  {order.deliveryAddress}
                </td>
              )}

              {/* Col S: Transporter Name */}
              {visibleCols['S'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-700 align-middle bg-blue-50/20 whitespace-nowrap text-[11px] ${cellBottomBorder}`}
                >
                  {order.transporterName}
                </td>
              )}

              {/* Col T: Sales Person Name */}
              {visibleCols['T'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-700 align-middle bg-blue-50/20 whitespace-nowrap text-[11px] ${cellBottomBorder}`}
                >
                  {order.salesPerson}
                </td>
              )}

              {/* Col U: Account Status */}
              {visibleCols['U'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-700 align-middle bg-blue-50/20 whitespace-nowrap ${cellBottomBorder}`}
                >
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-medium">
                    {order.accountStatus || 'Approved'}
                  </span>
                </td>
              )}

              {/* Col V: Approval */}
              {visibleCols['V'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-700 align-middle bg-blue-50/20 whitespace-nowrap text-[11px] ${cellBottomBorder}`}
                >
                  {order.approvalStatus}
                </td>
              )}

              {/* Col W: Approval Timestamp */}
              {visibleCols['W'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-700 align-middle bg-blue-50/20 whitespace-nowrap text-[10px] ${cellBottomBorder}`}
                >
                  {order.branch}
                </td>
              )}

              {/* Col X: Order Number (Editable) */}
              {visibleCols['X'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 font-mono font-medium text-slate-900 align-middle bg-blue-50/20 whitespace-nowrap text-[11px] ${cellBottomBorder}`}
                >
                  <div className="flex items-center gap-1">
                    <span className={order.orderNo ? 'font-bold text-slate-900' : 'text-slate-400 italic'}>
                      {order.orderNo || 'Set SO#'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlers.onOpenOrderNoModal({ key: order.orderKey, po: order.customerPO, value: order.orderNo });
                      }}
                      className="text-slate-400 hover:text-emerald-700 p-0.5 rounded transition-colors"
                      title="Edit Order Number in Col X"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </td>
              )}
            </>
          )}

          {/* COLUMN Y: DISPATCH QNT (MANUAL USER ENTRY PER ITEM ROW) */}
          {visibleCols['Y'] && (
            <td
              className={`px-1.5 py-0.5 border-r border-slate-300 bg-amber-50/40 whitespace-nowrap text-right ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              <div className="flex items-center justify-end gap-1">
                <input
                  type="number"
                  step="any"
                  value={item.dispatchQty || ''}
                  placeholder="0"
                  onChange={(e) => handlers.onDispatchChange(order.orderKey, item, e.target.value)}
                  className="w-18 px-1.5 py-0.5 text-right font-mono text-[11px] font-bold text-amber-950 bg-white border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none h-6"
                />
              </div>
            </td>
          )}

          {/* COLUMN Z: BALANCE QNT (= K - Y) */}
          {visibleCols['Z'] && (
            <td
              className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 bg-emerald-50/40 whitespace-nowrap text-right text-[11px] ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              <div className="flex items-center justify-end gap-1.5">
                <span
                  className={`font-mono font-bold text-[11px] tabular-nums ${
                    (item.balanceQty || 0) <= 0
                      ? 'text-emerald-700'
                      : (item.dispatchQty || 0) > 0
                      ? 'text-amber-700'
                      : 'text-slate-900'
                  }`}
                >
                  {item.balanceQty?.toLocaleString()}
                </span>
                {(item.balanceQty || 0) <= 0 ? (
                  <span className="text-[9px] px-1 py-0.1 rounded bg-emerald-100 text-emerald-800 font-bold">
                    Done
                  </span>
                ) : (item.dispatchQty || 0) > 0 ? (
                  <span className="text-[9px] px-1 py-0.1 rounded bg-amber-100 text-amber-800 font-bold">
                    Partial
                  </span>
                ) : (
                  <span className="text-[9px] px-1 py-0.1 rounded bg-slate-100 text-slate-600 font-medium">
                    Pending
                  </span>
                )}
              </div>
            </td>
          )}

          {/* EXTRA OPERATIONAL COLUMNS AA TO AM (IF VISIBLE) */}
          {showHeaderCols && (
            <>
              {/* Col AA: Status (Manual User Text Edit with Auto-Save) */}
              {visibleCols['AA'] && (
                <td rowSpan={rowSpan} className={`px-1.5 py-0.5 border-r border-slate-300 align-middle whitespace-nowrap ${cellBottomBorder}`}>
                  <input
                    type="text"
                    placeholder="Status..."
                    size={autoFitColumns ? Math.max((handlers.colAAStatuses[currentOrderKey] ?? order.colAA ?? '').length + 2, 12) : undefined}
                    value={handlers.colAAStatuses[currentOrderKey] ?? order.colAA ?? ''}
                    onChange={(e) => handlers.onUpdateColAA(currentOrderKey, e.target.value)}
                    className={`${autoFitColumns ? 'w-auto min-w-[95px]' : 'w-28'} px-1.5 py-0.5 border border-teal-300 rounded text-[11px] font-semibold text-slate-800 bg-teal-50/20 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 h-6 shadow-2xs`}
                    title="Col AA: Editable Status (Auto-saved)"
                  />
                </td>
              )}

              {/* Col AB: Remark (Manual User Text Edit with Auto-Save) */}
              {visibleCols['AB'] && (
                <td rowSpan={rowSpan} className={`px-1.5 py-0.5 border-r border-slate-300 align-middle whitespace-nowrap ${cellBottomBorder}`}>
                  <input
                    type="text"
                    placeholder="Remark..."
                    size={autoFitColumns ? Math.max((handlers.colABRemarks[currentOrderKey] ?? order.colAB ?? '').length + 2, 12) : undefined}
                    value={handlers.colABRemarks[currentOrderKey] ?? order.colAB ?? ''}
                    onChange={(e) => handlers.onUpdateColAB(currentOrderKey, e.target.value)}
                    className={`${autoFitColumns ? 'w-auto min-w-[100px]' : 'w-32'} px-1.5 py-0.5 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 h-6 shadow-2xs`}
                    title="Col AB: Editable Logistics Remark (Auto-saved)"
                  />
                </td>
              )}
              {visibleCols['AC'] && (
                <td rowSpan={rowSpan} className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-700 align-middle text-[11px] ${cellBottomBorder}`}>
                  {order.colAC || 'Sent'}
                </td>
              )}
              {visibleCols['AD'] && (
                <td rowSpan={rowSpan} className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-emerald-700 font-medium align-middle text-[11px] ${cellBottomBorder}`}>
                  {order.colAD || 'Delivered'}
                </td>
              )}
              {/* Col AE: Instant Confirmation Msg */}
              {visibleCols['AE'] && (
                <td rowSpan={rowSpan} className={`px-1.5 py-0.5 border-r border-slate-300 text-center align-middle bg-blue-50/20 whitespace-nowrap ${cellBottomBorder}`}>
                  <select
                    value={handlers.aeStatuses[currentOrderKey] ?? order.colAE ?? 'Pending'}
                    onChange={(e) => {
                      const val = e.target.value;
                      handlers.setAeStatuses(prev => ({ ...prev, [currentOrderKey]: val }));
                      handlers.setSyncFeedback(`Col AE Confirmation set to "${val}". ${val === 'Message Sent' ? 'Instant WhatsApp link active in Col AF!' : 'Pending status.'}`);
                      setTimeout(() => handlers.setSyncFeedback(null), 3500);
                    }}
                    className="text-[10px] bg-white border border-blue-300 rounded px-1.5 py-0.5 font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none h-6"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Message Sent">Message Sent</option>
                  </select>
                </td>
              )}

              {/* Col AF: Whatspp Link (Instant Confirmation AE ➔ AF) */}
              {visibleCols['AF'] && (
                <td rowSpan={rowSpan} className={`px-1.5 py-0.5 border-r border-slate-300 text-center align-middle bg-emerald-50/20 whitespace-nowrap ${cellBottomBorder}`}>
                  {(handlers.aeStatuses[currentOrderKey] ?? order.colAE ?? 'Pending') === 'Message Sent' ? (
                    <button
                      onClick={() => handlers.onOpenConfirmWhatsAppModal(order)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                      title="Send Instant Order Confirmation WhatsApp (AE ➔ AF)"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Send WA</span>
                      <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                    </button>
                  ) : (
                    <span className="text-slate-400 font-mono text-[10px] italic">—</span>
                  )}
                </td>
              )}

              {/* Col AG: Follow-up 1 (Checkbox - when clicked, timestamp comes in Col AH) */}
              {visibleCols['AG'] && (
                <td rowSpan={rowSpan} className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-center align-middle ${cellBottomBorder} bg-emerald-50/30`}>
                  <label className="inline-flex items-center justify-center cursor-pointer p-0.5" title="Check to record Follow-up 1 timestamp in Col AH">
                    <input
                      type="checkbox"
                      checked={Boolean(handlers.colAGChecks[currentOrderKey] ?? order.colAG)}
                      onChange={(e) => handlers.onToggleColAG(currentOrderKey, e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                    />
                  </label>
                </td>
              )}

              {/* Col AH: Timestamp (Auto-generated from Col AG Checkbox) */}
              {visibleCols['AH'] && (
                <td rowSpan={rowSpan} className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 align-middle text-[10px] font-mono ${cellBottomBorder} whitespace-nowrap bg-emerald-50/10`}>
                  {(handlers.colAHTimestamps[currentOrderKey] ?? order.colAH) ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
                      <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{handlers.colAHTimestamps[currentOrderKey] ?? order.colAH}</span>
                    </span>
                  ) : (
                    <span className="text-slate-300 italic text-[10px]">—</span>
                  )}
                </td>
              )}

              {/* Col AI: Follow-up 1 Remark (Manual User Text Edit with Auto-Save) */}
              {visibleCols['AI'] && (
                <td rowSpan={rowSpan} className={`px-1.5 py-0.5 border-r border-slate-300 align-middle whitespace-nowrap ${cellBottomBorder}`}>
                  <input
                    type="text"
                    placeholder="Follow-up 1 remark..."
                    size={autoFitColumns ? Math.max((handlers.colAIRemarks[currentOrderKey] ?? order.colAI ?? '').length + 2, 16) : undefined}
                    value={handlers.colAIRemarks[currentOrderKey] ?? order.colAI ?? ''}
                    onChange={(e) => handlers.onUpdateColAI(currentOrderKey, e.target.value)}
                    className={`${autoFitColumns ? 'w-auto min-w-[120px]' : 'w-36'} px-1.5 py-0.5 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 h-6 shadow-2xs`}
                    title="Col AI: Editable Follow-up 1 Remark (Auto-saved)"
                  />
                </td>
              )}

              {/* Col AJ: Follow-up 2 (Checkbox - when clicked, timestamp comes in Col AK) */}
              {visibleCols['AJ'] && (
                <td rowSpan={rowSpan} className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-center align-middle ${cellBottomBorder} bg-sky-50/30`}>
                  <label className="inline-flex items-center justify-center cursor-pointer p-0.5" title="Check to record Follow-up 2 timestamp in Col AK">
                    <input
                      type="checkbox"
                      checked={Boolean(handlers.colAJChecks[currentOrderKey] ?? order.colAJ)}
                      onChange={(e) => handlers.onToggleColAJ(currentOrderKey, e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer shadow-2xs"
                    />
                  </label>
                </td>
              )}

              {/* Col AK: Timestamp (Auto-generated from Col AJ Checkbox) */}
              {visibleCols['AK'] && (
                <td rowSpan={rowSpan} className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 align-middle text-[10px] font-mono ${cellBottomBorder} whitespace-nowrap bg-sky-50/10`}>
                  {(handlers.colAKTimestamps[currentOrderKey] ?? order.colAK) ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-300 font-bold">
                      <Clock className="w-3 h-3 text-sky-600 shrink-0" />
                      <span>{handlers.colAKTimestamps[currentOrderKey] ?? order.colAK}</span>
                    </span>
                  ) : (
                    <span className="text-slate-300 italic text-[10px]">—</span>
                  )}
                </td>
              )}

              {/* Col AL: Follow-up 2 Remark (Manual User Text Edit with Auto-Save) */}
              {visibleCols['AL'] && (
                <td rowSpan={rowSpan} className={`px-1.5 py-0.5 border-r border-slate-300 align-middle whitespace-nowrap ${cellBottomBorder}`}>
                  <input
                    type="text"
                    placeholder="Follow-up 2 remark..."
                    size={autoFitColumns ? Math.max((handlers.colALRemarks[currentOrderKey] ?? order.colAL ?? '').length + 2, 16) : undefined}
                    value={handlers.colALRemarks[currentOrderKey] ?? order.colAL ?? ''}
                    onChange={(e) => handlers.onUpdateColAL(currentOrderKey, e.target.value)}
                    className={`${autoFitColumns ? 'w-auto min-w-[120px]' : 'w-36'} px-1.5 py-0.5 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 h-6 shadow-2xs`}
                    title="Col AL: Editable Follow-up 2 Remark (Auto-saved)"
                  />
                </td>
              )}
              {/* Col AM: LR- Number */}
              {visibleCols['AM'] && (
                <td rowSpan={rowSpan} className={`px-1.5 py-0.5 border-r border-slate-300 font-mono text-slate-800 align-middle whitespace-nowrap ${cellBottomBorder}`}>
                  <input
                    type="text"
                    placeholder="e.g. MEHTA-0041"
                    size={autoFitColumns ? Math.max((handlers.lrNumbers[currentOrderKey] ?? order.lrNumber ?? '').length + 2, 12) : undefined}
                    value={handlers.lrNumbers[currentOrderKey] ?? order.lrNumber ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      handlers.setLrNumbers(prev => ({ ...prev, [currentOrderKey]: val }));
                    }}
                    className={`${autoFitColumns ? 'w-auto min-w-[95px]' : 'w-24'} px-1.5 py-0.5 border border-slate-300 rounded font-mono text-[11px] h-6`}
                  />
                </td>
              )}
            </>
          )}

          {/* COLUMN AN: OPEN / CLOSE (INDIVIDUAL PRODUCT ITEM ROW - NEVER MERGED, LIKE F-N AND Y-Z) */}
          {visibleCols['AN'] && (
            <td
              className={`px-1.5 py-0.5 border-r border-slate-300 text-center align-middle bg-sky-50/20 whitespace-nowrap ${
                useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''
              }`}
            >
              <div className="flex items-center justify-center">
                <select
                  value={item.statusAN || 'Open'}
                  onChange={(e) => handlers.onItemStatusChange(item.id, e.target.value as any)}
                  className={`text-[11px] font-bold rounded px-1.5 py-0.5 border transition-all cursor-pointer focus:outline-none focus:ring-1 h-6 shadow-2xs ${
                    (item.statusAN || 'Open') === 'Closed'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400 focus:ring-emerald-500'
                      : (item.statusAN || 'Open') === 'In-Progress'
                      ? 'bg-amber-100 text-amber-900 border-amber-400 focus:ring-amber-500'
                      : 'bg-sky-100 text-sky-900 border-sky-400 focus:ring-sky-500'
                  }`}
                >
                  <option value="Open">🔵 Open</option>
                  <option value="In-Progress">🟡 In-Progress</option>
                  <option value="Closed">🟢 Closed</option>
                </select>
              </div>
            </td>
          )}

          {/* COLUMNS AO TO AS: DELIVERED WHATSAPP & EMAILS (VERTICALLY MERGED PER ORDER) */}
          {showHeaderCols && (
            <>
              {/* Col AO: Delivered Whatspp Msg */}
              {visibleCols['AO'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-1.5 py-0.5 border-r border-slate-300 text-center align-middle bg-purple-50/20 whitespace-nowrap ${cellBottomBorder}`}
                >
                  <select
                    value={handlers.aoStatuses[currentOrderKey] ?? order.colAO ?? 'Pending'}
                    onChange={(e) => {
                      const val = e.target.value;
                      handlers.setAoStatuses(prev => ({ ...prev, [currentOrderKey]: val }));
                      handlers.setSyncFeedback(`Col AO set to "${val}". ${val === 'Message Sent' ? 'WhatsApp button activated in Col AP!' : 'Pending status.'}`);
                      setTimeout(() => handlers.setSyncFeedback(null), 3500);
                    }}
                    className="text-[10px] bg-white border border-purple-300 rounded px-1.5 py-0.5 font-medium text-slate-800 focus:ring-1 focus:ring-purple-500 focus:outline-none h-6"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Message Sent">Message Sent</option>
                  </select>
                </td>
              )}

              {/* Col AP: Whatspp Link */}
              {visibleCols['AP'] && (
                <td
                  rowSpan={rowSpan}
                  className={`px-1.5 py-0.5 border-r border-slate-300 text-center align-middle bg-emerald-50/20 whitespace-nowrap ${cellBottomBorder}`}
                >
                  {(handlers.aoStatuses[currentOrderKey] || 'Pending') === 'Message Sent' ? (
                    <button
                      onClick={() => handlers.onOpenWhatsAppModal(order)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                      title="Send WhatsApp Dispatch Notice"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Send WA</span>
                      <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                    </button>
                  ) : (
                    <span className="text-slate-400 font-mono text-[10px] italic">—</span>
                  )}
                </td>
              )}

              {/* COLUMNS AQ TO AS IF VISIBLE */}
              {visibleCols['AQ'] && (
                <td rowSpan={rowSpan} className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-slate-600 align-middle text-[10px] ${cellBottomBorder}`}>
                  {order.customerEmail || '—'}
                </td>
              )}
              {visibleCols['AR'] && (
                <td rowSpan={rowSpan} className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-blue-600 align-middle text-center text-[10px] ${cellBottomBorder}`}>
                  <span className="underline cursor-pointer">Email</span>
                </td>
              )}
              {visibleCols['AS'] && (
                <td rowSpan={rowSpan} className={`px-2 py-0.5 sm:py-1 border-r border-slate-300 text-emerald-700 align-middle text-center text-[10px] ${cellBottomBorder}`}>
                  Sent
                </td>
              )}
            </>
          )}
        </tr>
      );

      rowNumber++;
    });
  });

  return rows;
}

// MODAL COMPONENT: CREATE NEW ORDER WITH MULTIPLE ITEMS
interface NewOrderModalProps {
  onClose: () => void;
  onSubmit: (orderData: any) => void;
}

const NewOrderModal: React.FC<NewOrderModalProps> = ({ onClose, onSubmit }) => {
  const [customerPO, setCustomerPO] = useState(`PO-${Math.floor(1000 + Math.random() * 9000)}`);
  const [customerName, setCustomerName] = useState('Nandani Lace House (Delhi)');
  const [customerEmail, setCustomerEmail] = useState('nandani@lacehouse.com');
  const [customerNumber, setCustomerNumber] = useState('8800421410');
  const [orderDate, setOrderDate] = useState('29/01/2026');
  const [billingAddress, setBillingAddress] = useState('Ground Floor, 18/C-1, Gali No. 13, E Block, Khajuri Khas, Delhi');
  const [deliveryAddress, setDeliveryAddress] = useState('Ground Floor, 18/C-1, Gali No. 13, E Block, Khajuri Khas, Delhi');
  const [transporterName, setTransporterName] = useState('Mehta transport');
  const [salesPerson, setSalesPerson] = useState('Lalit Maroo');
  const [orderNo, setOrderNo] = useState(`DMN/0${Math.floor(2000 + Math.random() * 900)}/25-26`);
  const [remark, setRemark] = useState('Confirm to sunilji 4-5 din');
  const [statusAN, setStatusAN] = useState<'Open' | 'In-Progress' | 'Closed'>('Open');

  // Items in this order
  const [items, setItems] = useState([
    {
      unit: 'ELASTIC',
      itemName: 'N5412-18MM',
      color: 'White',
      width: '18 mm',
      unitOfItem: 'MTR',
      qty: 32000,
      rate: 4.21,
      discount: 0,
      deliveryDate: '02/06/2026'
    },
    {
      unit: 'ELASTIC',
      itemName: 'N5412-25MM',
      color: 'White',
      width: '25 mm',
      unitOfItem: 'MTR',
      qty: 28000,
      rate: 5.38,
      discount: 0,
      deliveryDate: '02/06/2026'
    }
  ]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        unit: 'ELASTIC',
        itemName: 'N5412-10MM',
        color: 'White',
        width: '10 mm',
        unitOfItem: 'MTR',
        qty: 32000,
        rate: 2.46,
        discount: 0,
        deliveryDate: '02/06/2026'
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems(items.map((it, idx) => idx === index ? { ...it, [field]: value } : it));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      customerPO,
      customerName,
      customerEmail,
      customerNumber,
      orderDate,
      billingAddress,
      deliveryAddress,
      transporterName,
      salesPerson,
      orderNo,
      remark,
      statusAN,
      items
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              Add Customer Order (Multi-Item Vertical Merge)
            </h3>
            <p className="text-xs text-slate-300">
              Columns A–E and N–X will vertically merge across all {items.length} items entered below.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Order Header Fields */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
              Order Header Details (Merged Columns A–E &amp; N–X)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Customer PO (Col B)</label>
                <input
                  type="text"
                  required
                  value={customerPO}
                  onChange={(e) => setCustomerPO(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Customer Name (Col C)</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-medium"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Customer Number (Col P)</label>
                <input
                  type="text"
                  value={customerNumber}
                  onChange={(e) => setCustomerNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Order Date (Col E)</label>
                <input
                  type="text"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Transporter Name (Col S)</label>
                <input
                  type="text"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Order Number (Col X)</label>
                <input
                  type="text"
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Open / Close (Col AN)</label>
                <select
                  value={statusAN}
                  onChange={(e) => setStatusAN(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-sky-400 text-sky-950 font-bold rounded"
                >
                  <option value="Open">🔵 Open</option>
                  <option value="In-Progress">🟡 In-Progress</option>
                  <option value="Closed">🟢 Closed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Billing &amp; Delivery Address (Col Q &amp; R)</label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => {
                    setBillingAddress(e.target.value);
                    setDeliveryAddress(e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Remark (Col O)</label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Individual Item Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Product Items ({items.length} Rows — Cols F to N)
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item Row</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                  <span className="w-5 text-center font-mono font-bold text-slate-400 text-[11px]">{idx + 1}</span>
                  <div className="w-32">
                    <input
                      type="text"
                      placeholder="Item Name (Col G)"
                      value={it.itemName}
                      onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-medium"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="text"
                      placeholder="Color (Col H)"
                      value={it.color}
                      onChange={(e) => handleItemChange(idx, 'color', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div className="w-16">
                    <input
                      type="text"
                      placeholder="Width (Col I)"
                      value={it.width}
                      onChange={(e) => handleItemChange(idx, 'width', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      placeholder="Qty (Col K)"
                      value={it.qty}
                      onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono font-bold text-right"
                    />
                  </div>
                  <div className="w-16">
                    <input
                      type="number"
                      placeholder="Rate (Col L)"
                      value={it.rate}
                      onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono text-right"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="text"
                      placeholder="Delivery Date"
                      value={it.deliveryDate}
                      onChange={(e) => handleItemChange(idx, 'deliveryDate', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded ml-auto"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 shadow-sm"
            >
              Add Multi-Item Order to Sheet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// MODAL COMPONENT: ADD ITEM TO EXISTING ORDER
interface AddItemModalProps {
  order: GroupedOrder;
  onClose: () => void;
  onSubmit: (itemData: any) => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ order, onClose, onSubmit }) => {
  const [unit, setUnit] = useState('ELASTIC');
  const [itemName, setItemName] = useState('N5412-10MM');
  const [color, setColor] = useState('White');
  const [width, setWidth] = useState('10 mm');
  const [unitOfItem, setUnitOfItem] = useState('MTR');
  const [qty, setQty] = useState(15000);
  const [rate, setRate] = useState(2.8);
  const [discount, setDiscount] = useState(0);
  const [deliveryDate, setDeliveryDate] = useState('02/06/2026');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      unit,
      itemName,
      color,
      width,
      unitOfItem,
      qty,
      rate,
      discount,
      deliveryDate
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Add Item to {order.customerPO}</h3>
            <p className="text-[11px] text-slate-500">Customer: {order.customerName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Item Name (Col G)</label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Color (Col H)</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Width (Col I)</label>
              <input
                type="text"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Qty (Col K)</label>
              <input
                type="number"
                required
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Rate ₹ (Col L)</label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Disc % (Col M)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Delivery Target Date (Col N)</label>
            <input
              type="text"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 font-bold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 shadow-sm"
            >
              Add Item Row
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
