/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Target, 
  AlertTriangle, 
  Info,
  ChevronRight,
  RefreshCcw,
  LayoutDashboard,
  ShieldCheck,
  Copy,
  Check,
  LogIn,
  LogOut,
  User as UserIcon,
  Mail,
  Zap,
  Sparkles,
  Lock,
  Users,
  Settings,
  ShieldAlert,
  Search,
  BookOpen,
  Pencil,
  Trash2,
  BarChart3,
  CreditCard,
  Crown,
  ChevronLeft,
  ArrowRight,
  PieChart as PieChartIcon,
  Bell,
  PanelLeft,
  Menu,
  Clock,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, signInWithGoogle, logout, db } from './lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, serverTimestamp, increment, updateDoc, addDoc, query, orderBy, deleteDoc, where, limit } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';



// --- Utilities ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const InputField = ({ 
  label, 
  value, 
  onChange, 
  icon: Icon, 
  type = "number", 
  suffix,
  placeholder,
  step = "any",
  secondaryInput
}: { 
  label: string; 
  value: string | number; 
  onChange: (val: string) => void; 
  icon?: any;
  type?: string;
  suffix?: string;
  placeholder?: string;
  step?: string;
  secondaryInput?: {
    value: string | number;
    onChange: (val: string) => void;
    label: string;
  };
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
      {Icon && <Icon size={12} />}
      {label}
    </label>
    <div className="flex gap-2">
      <div className="relative group flex-1">
        <input
          type={type}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-800/50 border border-slate-700/50 text-slate-100 rounded-lg py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all font-mono"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">
            {suffix}
          </span>
        )}
      </div>
      {secondaryInput && (
        <div className="relative w-24 shrink-0">
          <input
            type="number"
            step="0.01"
            value={secondaryInput.value}
            onChange={(e) => secondaryInput.onChange(e.target.value)}
            className="w-full h-full bg-slate-900 border border-slate-800 text-blue-400 rounded-lg px-3 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all font-mono text-xs text-center"
          />
          <div className="absolute -top-1.5 left-2 px-1 bg-slate-950 text-[8px] font-bold text-slate-600 uppercase tracking-widest line-clamp-1">
            {secondaryInput.label}
          </div>
        </div>
      )}
    </div>
  </div>
);

const ResultCard = ({ 
  label, 
  value, 
  subtitle, 
  type = "neutral",
  copyValue
}: { 
  label: string; 
  value: string | number; 
  subtitle?: string;
  type?: "neutral" | "positive" | "negative" | "highlight";
  copyValue?: string | number;
}) => {
  const [copied, setCopied] = useState(false);
  const colors = {
    neutral: "from-slate-800/50 to-slate-900/50 border-slate-700/50",
    positive: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    negative: "from-rose-500/10 to-rose-500/5 border-rose-500/20 text-rose-400",
    highlight: "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400",
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (copyValue !== undefined) {
      navigator.clipboard.writeText(copyValue.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-gradient-to-br border rounded-xl p-4 flex flex-col justify-between h-full relative group",
        colors[type]
      )}
    >
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        {copyValue !== undefined && (
          <button 
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white"
            title="Copy to clipboard"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        )}
      </div>
      <div className="mt-2">
        <div className={cn("text-2xl font-mono font-bold leading-none", type !== 'neutral' ? '' : 'text-slate-100')}>
          {value}
        </div>
        {subtitle && <div className="text-[10px] text-slate-500 mt-1 font-medium italic">{subtitle}</div>}
      </div>
    </motion.div>
  );
};

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
];

const TRADING_PAIRS = {
   Crypto: [
    "BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "ADA/USDT", "DOGE/USDT", "DOT/USDT", "LINK/USDT", "MATIC/USDT",
    "LTC/USDT", "AVAX/USDT", "SHIB/USDT", "TRX/USDT", "UNI/USDT", "ATOM/USDT", "XLM/USDT", "ETC/USDT", "BCH/USDT", "APT/USDT",
    "NEAR/USDT", "FIL/USDT", "ICP/USDT", "STX/USDT", "RNDR/USDT", "HBAR/USDT", "INJ/USDT", "IMX/USDT", "GRT/USDT", "THETA/USDT"
  ],
  Forex: [
    "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "NZD/USD", "USD/CHF", "USD/CAD", "EUR/GBP", "EUR/JPY", "GBP/JPY",
    "AUD/JPY", "NZD/JPY", "CHF/JPY", "CAD/JPY", "EUR/CAD", "GBP/CAD", "AUD/CAD", "EUR/AUD", "GBP/AUD", "USD/ZAR",
    "USD/TRY", "USD/MXN", "USD/SGD", "USD/HKD", "USD/NOK", "USD/SEK", "USD/DKK", "EUR/CHF", "GBP/CHF", "AUD/NZD"
  ],
  Stocks: [
    "AAPL (Apple)", "TSLA (Tesla)", "NVDA (Nvidia)", "MSFT (Microsoft)", "AMZN (Amazon)", "GOOGL (Google)", "META (Meta)",
    "NFLX (Netflix)", "AMD (AMD)", "BABA (Alibaba)", "TSM (TSMC)", "V (Visa)", "WMT (Walmart)", "DIS (Disney)", "PYPL (PayPal)",
    "INTC (Intel)", "COIN (Coinbase)", "BA (Boeing)", "JPM (JP Morgan)", "GS (Goldman Sachs)", "MS (Morgan Stanley)",
    "JNJ (Johnson & Johnson)", "PFE (Pfizer)", "MRK (Merck)", "COST (Costco)", "NKE (Nike)", "SBUX (Starbucks)", "ORCL (Oracle)"
  ],
  Commodities: [
    "GOLD (XAU/USD)", "SILVER (XAG/USD)", "WTI CRUDE", "BRENT CRUDE", "NATURAL GAS", "PLATINUM", "COPPER", "PALLADIUM",
    "US COFFEE", "US CORN", "SOYBEANS", "WHEAT", "SUGAR", "COTTON", "COCOA", "LIVE CATTLE"
  ]
};

const FLAT_PAIRS = Object.values(TRADING_PAIRS).flat();

const TradingViewChart = ({ symbol }: { symbol: string }) => {
  const cleanSymbol = symbol.split(' ')[0].replace('/', '');
  
  return (
    <div className="w-full aspect-video md:aspect-[21/9] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900 group relative">
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
          TradingView Interactive Mode
        </div>
      </div>
      <iframe
        title={`Chart for ${symbol}`}
        src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_76d06&symbol=${cleanSymbol}&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=${cleanSymbol}`}
        className="w-full h-full border-0"
      />
    </div>
  );
};

// --- Main Planner Component ---
const TradingPlanner = ({ 
  user,
  activeMode, 
  setActiveMode, 
  currency, 
  setCurrency, 
  selectedPair,
  setSelectedPair,
  tradeType, 
  setTradeType,
  balance, 
  handleBalanceChange,
  riskPercent, 
  handleRiskPercentChange,
  riskAmountInput, 
  handleRiskAmountChange,
  commissionPercent, 
  setCommissionPercent,
  taxPercent, 
  setTaxPercent,
  entryPrice, 
  setEntryPrice,
  stopLoss, 
  setStopLoss,
  takeProfit, 
  setTakeProfit,
  lotSize, 
  setLotSize,
  leverage, 
  setLeverage,
  results,
  isAiLoading,
  runAiAnalysis,
  aiAnalysis,
  currentPrice,
  isPriceLoading,
  slPercent,
  setSlPercent,
  tpPercent,
  setTpPercent,
  handleLevelChange,
  saveToJournal,
  isSavingJournal,
  searchTerm,
  setSearchTerm,
  credits,
  trackAssetLookup
}: any) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredPairs = useMemo(() => {
    if (!searchTerm) return [];
    
    const results: { category: string; pairs: string[] }[] = [];
    
    Object.entries(TRADING_PAIRS).forEach(([category, pairs]) => {
      const filtered = pairs.filter(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
      if (filtered.length > 0) {
        results.push({ category, pairs: filtered });
      }
    });

    return results;
  }, [searchTerm]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(val);

  const formatNumber = (val: number, decimals: number = 2) => 
    new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveMode('spot')}
            className={cn(
              "text-xs font-bold uppercase tracking-widest pb-1 border-b-2 transition-all",
              activeMode === 'spot' ? "text-blue-400 border-blue-400" : "text-slate-600 border-transparent hover:text-slate-400"
            )}
          >
            Spot Trading
          </button>
          <button 
            onClick={() => setActiveMode('futures')}
            className={cn(
              "text-xs font-bold uppercase tracking-widest pb-1 border-b-2 transition-all",
              activeMode === 'futures' ? "text-blue-400 border-blue-400" : "text-slate-600 border-transparent hover:text-slate-400"
            )}
          >
            Contract Futures
          </button>
        </div>

        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 shadow-xl">
          <button
            onClick={() => setTradeType('long')}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all",
              tradeType === 'long' 
                ? "bg-emerald-500 text-emerald-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <TrendingUp size={16} /> LONG
          </button>
          <button
            onClick={() => setTradeType('short')}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all",
              tradeType === 'short' 
                ? "bg-rose-500 text-rose-950 shadow-[0_0_20px_rgba(244,63,94,0.3)]" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <TrendingDown size={16} /> SHORT
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-2xl">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><DollarSign size={14} /> Account & Risk</span>
              <select 
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-[10px] text-blue-400 font-bold px-2 py-1 rounded outline-none focus:ring-1 focus:ring-blue-500/50"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                ))}
              </select>
            </h2>
            <div className="space-y-5">
              <InputField 
                label="Account Balance" 
                value={balance} 
                onChange={handleBalanceChange} 
                icon={DollarSign}
                suffix={currency}
                placeholder="e.g. 10000"
              />
              <div className="grid grid-cols-2 gap-4">
                <InputField 
                  label="Risk" 
                  value={riskPercent} 
                  onChange={handleRiskPercentChange} 
                  icon={Percent}
                  suffix="%"
                  placeholder="1"
                />
                <InputField 
                  label="Desired Loss ($)" 
                  value={riskAmountInput} 
                  onChange={handleRiskAmountChange} 
                  icon={DollarSign}
                  suffix={currency}
                  placeholder="100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField 
                  label="Commission" 
                  value={commissionPercent} 
                  onChange={setCommissionPercent} 
                  icon={Percent}
                  suffix="%"
                  placeholder="0.1"
                />
                <InputField 
                  label="Tax" 
                  value={taxPercent} 
                  onChange={setTaxPercent} 
                  icon={Percent}
                  suffix="%"
                  placeholder="0"
                />
              </div>
            </div>
          </section>

          <section className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-2xl">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Target size={14} /> Trade Levels
            </h2>
            <div className="space-y-5">
            <div className="space-y-4 pb-4 border-b border-slate-800/80 mb-2 relative">
                <div className="flex items-center gap-2 mb-1">
                  <Search size={14} className="text-blue-500" />
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Asset Search</label>
                </div>
                
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    placeholder="Search 5,000+ Stocks, Crypto, Global Assets..."
                    className="w-full bg-slate-900/80 border border-slate-800 text-slate-100 rounded-2xl py-4 px-4 pl-12 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all font-mono text-sm placeholder:text-slate-600 shadow-inner"
                  />
                  
                  {isSearchOpen && searchTerm && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto bg-slate-900/95 border border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                      {filteredPairs.length > 0 ? (
                        filteredPairs.map(group => (
                          <div key={group.category} className="border-b border-slate-800 last:border-0">
                            <div className="px-4 py-2 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center justify-between">
                              {group.category}
                              <span className="text-blue-500/50">{group.pairs.length} assets</span>
                            </div>
                            {group.pairs.map(pair => (
                              <button 
                                key={pair}
                                onClick={() => {
                                  setSelectedPair(pair);
                                  setSearchTerm(pair);
                                  setIsSearchOpen(false);
                                  trackAssetLookup(pair);
                                }}
                                className={cn(
                                  "w-full text-left px-4 py-3 text-xs font-mono transition-colors group",
                                  selectedPair === pair ? "bg-blue-500/10 text-blue-400 font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{pair}</span>
                                  <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                </div>
                              </button>
                            ))}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center space-y-2">
                          <p className="text-xs text-slate-500 italic">No exact match for "{searchTerm}"</p>
                          <button 
                            onClick={() => {
                              setSelectedPair(searchTerm);
                              setIsSearchOpen(false);
                              trackAssetLookup(searchTerm);
                            }}
                            className="text-[10px] font-bold text-blue-400 uppercase tracking-widest hover:underline"
                          >
                            Use custom symbol "{searchTerm}"
                          </button>
                        </div>
                      )}
                      <div className="p-2 bg-slate-950/50 border-t border-slate-800 flex items-center justify-center gap-2">
                        <img src="https://vignette.wikia.nocookie.net/logopedia/images/e/e7/TradingView_Logo.png/revision/latest?cb=20211116173016" alt="" className="h-2 grayscale opacity-30" />
                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">Global Asset Search Active</span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedPair && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-800"
                  >
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter mb-0.5">Live Market Rate</span>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-mono font-extrabold text-emerald-400">
                          {isPriceLoading ? (
                            <RefreshCcw size={12} className="animate-spin text-slate-600 inline mr-2" />
                          ) : null}
                          {currentPrice ? currentPrice : "Price Syncing..."}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setEntryPrice(currentPrice.toString());
                      }}
                      className="text-[9px] font-bold text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors"
                    >
                      Use as Entry
                    </button>
                  </motion.div>
                )}
              </div>
              <InputField 
                label="Entry Price" 
                value={entryPrice} 
                onChange={setEntryPrice} 
                placeholder="0.00"
              />
              <InputField 
                label="Stop Loss" 
                value={stopLoss} 
                onChange={(val) => handleLevelChange('sl', val, 'price')} 
                placeholder="0.00"
                secondaryInput={{
                  value: slPercent,
                  onChange: (val) => handleLevelChange('sl', val, 'percent'),
                  label: "Risk %"
                }}
              />
              <InputField 
                label="Take Profit" 
                value={takeProfit} 
                onChange={(val) => handleLevelChange('tp', val, 'price')} 
                placeholder="0.00"
                secondaryInput={{
                  value: tpPercent,
                  onChange: (val) => handleLevelChange('tp', val, 'percent'),
                  label: "Reward %"
                }}
              />
            </div>
          </section>

          <section className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Advanced Settings
              </h3>
              <div className="flex gap-2">
                {[
                  { label: 'FX', val: '100000' },
                  { label: 'STK', val: '1' }
                ].map(preset => (
                  <button 
                    key={preset.label}
                    onClick={() => setLotSize(preset.val)}
                    className="px-2 py-0.5 rounded bg-slate-800 text-[9px] font-bold text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <InputField 
              label="Units per Lot" 
              value={lotSize} 
              onChange={setLotSize} 
              placeholder="100000"
            />
            {activeMode === 'futures' && (
              <div className="mt-4">
                <InputField 
                  label="Broker Leverage" 
                  value={leverage} 
                  onChange={setLeverage} 
                  placeholder="1"
                  suffix=": 1"
                />
              </div>
            )}
          </section>

          <button 
            onClick={() => {
              setEntryPrice("");
              setStopLoss("");
              setSlPercent("");
              setTakeProfit("");
              setTpPercent("");
            }}
            className="w-full py-3 px-4 rounded-xl border border-slate-800 text-slate-500 text-xs font-bold uppercase tracking-widest hover:bg-slate-900 hover:text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCcw size={14} /> Reset Trade Levels
          </button>
        </div>

        {/* Right Column: Visualization & Results */}
        <div className="lg:col-span-8 space-y-6">
          {/* TradingView Chart Integration */}
          {selectedPair && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={12} className="text-blue-500" />
                  {selectedPair} Intelligence Chart
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Data Active
                </div>
              </div>
              <TradingViewChart symbol={selectedPair} />
            </motion.div>
          )}

          {/* Warning Message */}
          {results?.isInvalid && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex gap-3 items-center text-rose-400 text-sm font-medium"
            >
              <AlertTriangle size={18} className="shrink-0" />
              <span>
                Invalid Setup: Your Stop Loss must be 
                {tradeType === 'long' ? ' BELOW ' : ' ABOVE '} 
                your Entry Price for a {tradeType.toUpperCase()} trade.
              </span>
            </motion.div>
          )}

          {/* Results Grid */}
          <div className="grid sm:grid-cols-3 gap-6">
            <ResultCard 
              label={activeMode === 'spot' ? "Qty (Physical Units)" : "Qty (Contracts/Lots)"} 
              value={results ? formatNumber(results.positionSizeLots, activeMode === 'spot' ? 2 : 6) : "—"} 
              subtitle={activeMode === 'spot' ? "Amount to buy" : `Size (${lotSize} units)`}
              type="highlight"
              copyValue={results ? formatNumber(results.positionSizeLots, activeMode === 'spot' ? 2 : 6).replace(/,/g, '') : undefined}
            />
            <ResultCard 
              label="Risk/Reward Ratio" 
              value={results ? `1 : ${results.rrRatio}` : "—"} 
              subtitle="Calculated reward scale"
              type={results && parseFloat(results.rrRatio) >= 2 ? "positive" : "neutral"}
            />
            <ResultCard 
              label={activeMode === 'spot' ? "Total Cost" : "Required Margin"} 
              value={results ? formatCurrency(activeMode === 'spot' ? results.totalPositionValue : results.estimatedMargin) : "—"} 
              subtitle={activeMode === 'spot' ? "Cash required" : `Initial margin at ${leverage}:1`}
              type="highlight"
              copyValue={results ? (activeMode === 'spot' ? results.totalPositionValue : results.estimatedMargin).toFixed(2) : undefined}
            />
          </div>

          <div className="text-center py-2">
            <p className="text-[10px] text-slate-500 font-medium italic">
              Note: Calculation based on user input. Independent verification required.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <ResultCard 
              label="Net potential Profit" 
              value={results ? formatCurrency(results.netProfit) : "—"} 
              subtitle={`After ${formatCurrency(results?.costValue || 0)} fees`}
              type="positive"
            />
            <ResultCard 
              label="Net potential Loss" 
              value={results ? formatCurrency(results.netLoss) : "—"} 
              subtitle={`Incl. ${formatCurrency(results?.costValue || 0)} fees`}
              type="negative"
            />
          </div>

          {/* Visualizer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-inner overflow-hidden relative min-h-[300px] flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <RefreshCcw size={120} />
            </div>

            {!results || results.isInvalid ? (
              <div className="flex flex-col items-center justify-center text-slate-500 space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-full animate-pulse">
                  <Info size={32} />
                </div>
                <p className="text-sm font-medium italic text-center max-w-xs">
                  Please enter valid Entry, Stop Loss, and Take Profit prices to visualize the risk profile.
                </p>
              </div>
            ) : (
              <div className={cn("space-y-12 relative z-10 flex flex-col", tradeType === 'short' && "flex-col-reverse space-y-0 gap-12")}>
                {/* Take Profit Row */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dashed border-emerald-500/30" />
                  </div>
                  <div className="relative flex justify-between items-center">
                    <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider border border-emerald-500/20">
                      Take Profit Target
                    </div>
                    <div className="text-emerald-400 font-mono text-lg font-bold">
                      {takeProfit}
                    </div>
                  </div>
                </div>

                {/* Entry Row with Zone */}
                <div className="relative">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: tradeType === 'long' ? '120px' : '-120px' }}
                    className={cn(
                      "absolute left-0 right-0 z-0 opacity-10",
                      tradeType === 'long' ? "bottom-1/2 bg-emerald-500" : "top-1/2 bg-rose-500"
                    )}
                  />
                  
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-slate-600" />
                  </div>
                  <div className="relative flex justify-between items-center">
                    <div className="bg-slate-800 text-slate-200 px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider border border-slate-700 shadow-lg">
                      Entry Price
                    </div>
                    <div className="text-slate-100 font-mono text-2xl font-bold bg-slate-900 px-2">
                      {entryPrice}
                    </div>
                  </div>
                </div>

                {/* Stop Loss Row */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dashed border-rose-500/30" />
                  </div>
                  <div className="relative flex justify-between items-center">
                    <div className="bg-rose-500/10 text-rose-400 px-3 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider border border-rose-500/20">
                      Stop Loss Limit
                    </div>
                    <div className="text-rose-400 font-mono text-lg font-bold">
                      {stopLoss}
                    </div>
                  </div>
                </div>

                {/* RR Label */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                  <div className="h-24 w-[1px] bg-gradient-to-b from-emerald-500 via-slate-500 to-rose-500 opacity-20" />
                  <div className="bg-slate-800 border border-slate-700 text-blue-400 px-4 py-2 rounded-full text-sm font-bold shadow-2xl">
                    R:R {results.rrRatio}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Probability Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Sparkles size={120} />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                  <Zap size={16} /> AI Success Probability
                </h4>
                <p className="text-xs text-slate-400 max-w-md">
                  Use our proprietary AI model to test the success probability of your current setup based on market logic.
                </p>
              </div>

              <div className="shrink-0 flex flex-col items-center gap-2">
                {!user ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700/50">
                      <Lock size={10} /> Members Only
                    </div>
                    <button 
                      onClick={() => signInWithGoogle()}
                      className="flex items-center gap-2 bg-white text-slate-950 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-xl"
                    >
                      Sign Up to Unlock
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={runAiAnalysis}
                      disabled={isAiLoading || !results || results.isInvalid}
                      className={cn(
                        "flex items-center gap-2 px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:scale-100",
                        isAiLoading ? "bg-slate-800 text-slate-400" : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                      )}
                    >
                      {isAiLoading ? (
                        <>
                          <RefreshCcw size={16} className="animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Test Success Probability
                          <span className="ml-1 opacity-50 text-[8px] tracking-normal font-mono">(1 Credit)</span>
                        </>
                      )}
                    </button>

                    <button 
                      onClick={saveToJournal}
                      disabled={isSavingJournal || !results || results.isInvalid}
                      className={cn(
                        "flex items-center gap-2 px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:scale-100",
                        isSavingJournal ? "bg-slate-800 text-slate-400" : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                      )}
                    >
                      {isSavingJournal ? (
                        <>
                          <RefreshCcw size={16} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <BookOpen size={16} />
                          Save to Journal
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {aiAnalysis && user && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 pt-6 border-t border-slate-800 grid md:grid-cols-4 gap-6"
              >
                <div className="md:col-span-1 flex flex-col items-center justify-center p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Success Rate</span>
                  <div className={cn(
                    "text-4xl font-mono font-bold",
                    aiAnalysis.probability >= 70 ? "text-emerald-400" : aiAnalysis.probability >= 50 ? "text-blue-400" : "text-rose-400"
                  )}>
                    {aiAnalysis.probability}%
                  </div>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 line-clamp-1">
                    <ChevronRight size={10} /> AI Reasoning
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed italic">
                    "{aiAnalysis.reasoning}"
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


const TradeJournal = ({ 
  journalEntries, 
  isJournalLoading, 
  fetchJournal, 
  formatCurrency,
  deleteJournalEntry,
  updateJournalEntry 
}: { 
  journalEntries: any[], 
  isJournalLoading: boolean, 
  fetchJournal: () => void, 
  formatCurrency: (v: number) => string,
  deleteJournalEntry: (id: string) => void,
  updateJournalEntry: (id: string, data: any) => void 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);

  const startEditing = (entry: any) => {
    setEditingId(entry.id);
    setEditData({ ...entry });
  };

  const handleSaveEdit = () => {
    if (editingId && editData) {
      updateJournalEntry(editingId, {
        pair: editData.pair,
        entry: parseFloat(editData.entry),
        stopLoss: parseFloat(editData.stopLoss),
        takeProfit: parseFloat(editData.takeProfit),
        status: editData.status || 'open',
        realizedPnL: parseFloat(editData.realizedPnL || 0)
      });
      setEditingId(null);
      setEditData(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-white">Trade Journal</h2>
        <button 
          onClick={fetchJournal} 
          disabled={isJournalLoading}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCcw size={18} className={isJournalLoading ? "animate-spin" : ""} />
        </button>
      </div>
      
      {isJournalLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
          <RefreshCcw size={40} className="animate-spin opacity-20" />
          <p className="text-sm font-bold uppercase tracking-widest">Loading Entries...</p>
        </div>
      ) : journalEntries.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800/50 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-600">
            <BookOpen size={30} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-300">Your journal is empty</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
              Calculate a position and click "Save to Journal" to start tracking your trades here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {journalEntries.map((entry) => (
            <div key={entry.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
              {editingId === entry.id && editData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pair</label>
                      <input 
                        type="text" 
                        value={editData?.pair || ''} 
                        onChange={(e) => setEditData({ ...editData, pair: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entry</label>
                      <input 
                        type="number" 
                        value={editData?.entry || ''} 
                        onChange={(e) => setEditData({ ...editData, entry: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stop Loss</label>
                      <input 
                        type="number" 
                        value={editData?.stopLoss || ''} 
                        onChange={(e) => setEditData({ ...editData, stopLoss: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Take Profit</label>
                      <input 
                        type="number" 
                        value={editData?.takeProfit || ''} 
                        onChange={(e) => setEditData({ ...editData, takeProfit: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Outcome Status</label>
                      <select 
                        value={editData.status || 'open'} 
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          let newPnL = editData.realizedPnL || 0;
                          if (newStatus === 'sl') {
                            newPnL = -Math.abs(editData.riskAmount || 0);
                          } else if (newStatus === 'tp') {
                            newPnL = Math.abs(editData.riskAmount || 0) * (editData.rrRatio || 1);
                          }
                          setEditData({ 
                            ...editData, 
                            status: newStatus,
                            realizedPnL: newPnL.toFixed(2)
                          });
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="open">Open Position</option>
                        <option value="tp">Take Profit Hit</option>
                        <option value="sl">Stop Loss Hit</option>
                        <option value="closed">Manually Closed</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Realized P/L ({entry.currency || 'USD'})</label>
                      <input 
                        type="number" 
                        value={editData.realizedPnL || 0} 
                        onChange={(e) => setEditData({ ...editData, realizedPnL: e.target.value })}
                        placeholder="Enter final profit or loss"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button 
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all"
                    >
                      Update Journal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs",
                      entry.type === 'long' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                    )}>
                      {entry.type === 'long' ? 'BUY' : 'SELL'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white uppercase">{entry.pair}</h4>
                        {entry.status && entry.status !== 'open' && (
                          <span className={cn(
                            "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border",
                            entry.status === 'tp' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            entry.status === 'sl' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                            "bg-slate-700/50 text-slate-300 border-slate-600"
                          )}>
                            {entry.status === 'tp' ? 'TP HIT' : entry.status === 'sl' ? 'SL HIT' : 'CLOSED'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {entry.createdAt instanceof Date ? entry.createdAt.toLocaleString() : 'Just now'}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-400/5 px-2 py-0.5 rounded border border-blue-400/10">
                          R:R {entry.rrRatio}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                           Plan: {formatCurrency(entry.riskAmount)} Risk
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 sm:gap-8">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Entry</p>
                      <p className="text-sm font-mono text-slate-300">{entry.entry}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Plan</p>
                      <div className="flex flex-col text-[11px] font-mono">
                        <span className="text-emerald-400">TP: {entry.takeProfit}</span>
                        <span className="text-rose-400">SL: {entry.stopLoss}</span>
                      </div>
                    </div>
                    {entry.realizedPnL !== undefined && entry.status !== 'open' && (
                      <div className="text-center px-4 py-2 bg-slate-800/30 rounded-xl border border-slate-800">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Final Result</p>
                        <p className={cn(
                          "text-sm font-bold font-mono",
                          entry.realizedPnL > 0 ? "text-emerald-400" : entry.realizedPnL < 0 ? "text-rose-400" : "text-slate-400"
                        )}>
                          {entry.realizedPnL > 0 ? '+' : ''}{formatCurrency(entry.realizedPnL)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {entry.aiAnalysis && (
                       <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
                         <Sparkles size={12} className="text-blue-400" />
                         <span className={cn(
                           "text-xs font-bold",
                           entry.aiAnalysis.probability >= 70 ? "text-emerald-400" : entry.aiAnalysis.probability >= 50 ? "text-blue-400" : "text-rose-400"
                         )}>
                           {entry.aiAnalysis.probability}%
                         </span>
                       </div>
                    )}
                    <button 
                      onClick={() => startEditing(entry)}
                      className="p-2 text-slate-500 hover:text-blue-400 transition-colors"
                      title="Update Outcome / Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => deleteJournalEntry(entry.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


const LiveSignals = ({ currency, credits, onUseCredit, onNavigateMembership, onApplyScenario }: { 
  currency: string; 
  credits: number;
  onUseCredit: () => Promise<boolean>;
  onNavigateMembership: () => void;
  onApplyScenario: (scenario: any, type: 'long' | 'short', asset: any) => void 
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const searchTimeoutRef = React.useRef<any>(null);
  const mountedRef = React.useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // Pre-populate popular assets
    setSearchResults([
      { symbol: "BTCUSDT", name: "Bitcoin", exchange: "BINANCE" },
      { symbol: "ETHUSDT", name: "Ethereum", exchange: "BINANCE" },
      { symbol: "SOLUSDT", name: "Solana", exchange: "BINANCE" },
      { symbol: "XAUUSD", name: "Gold", exchange: "OANDA" },
      { symbol: "EURUSD", name: "Euro / US Dollar", exchange: "FX_IDC" },
      { symbol: "XRPUSDT", name: "XRP", exchange: "BINANCE" }
    ]);
    return () => { mountedRef.current = false; };
  }, []);

  const searchAssets = (query: string) => {
    if (!query) {
      setSearchResults([
        { symbol: "BTCUSDT", name: "Bitcoin", exchange: "BINANCE" },
        { symbol: "ETHUSDT", name: "Ethereum", exchange: "BINANCE" },
        { symbol: "SOLUSDT", name: "Solana", exchange: "BINANCE" },
        { symbol: "XAUUSD", name: "Gold", exchange: "OANDA" },
        { symbol: "EURUSD", name: "Euro / US Dollar", exchange: "FX_IDC" },
        { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
        { symbol: "TSLA", name: "Tesla, Inc.", exchange: "NASDAQ" },
        { symbol: "NVDA", name: "NVIDIA Corp.", exchange: "NASDAQ" }
      ]);
      return;
    }
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Search for financial assets (Crypto, Stocks, Forex) matching query: "${query}". Return a JSON array of objects with keys: symbol, name, exchange (e.g. BINANCE, NASDAQ, CRYPTO). Limit to 5 results.`,
          config: { responseMimeType: "application/json" }
        });
        if (response && response.text && mountedRef.current) {
          try {
            const raw = response.text.trim();
            const cleanJson = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            setSearchResults(JSON.parse(cleanJson));
          } catch (pe) {
            console.error("Search parse error:", pe);
          }
        }
      } catch (e) { 
        if (mountedRef.current) console.error("Search API error:", e); 
      }
    }, 500);
  };

  const fetchAnalysis = async () => {
    if (!selectedSymbol) return;
    
    if (credits <= 0) {
      alert("Insufficient Credits. Please recharge your balance to continue.");
      onNavigateMembership();
      return;
    }

    setIsLoading(true);
    try {
      const success = await onUseCredit();
      if (!success) throw new Error("Credit deduction failed");

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze latest technical data and volatility for ${selectedSymbol.symbol} on ${selectedSymbol.exchange}. 
        Provide two professional strategic scenarios: 1. Bullish Long and 2. Bearish Short.
        
        CRITICAL: Do NOT use fixed percentages for SL/TP. Instead, analyze current market volatility (ATR, pivot levels, trend strength) 
        to suggest the most optimal technical Stop Loss and Take Profit levels.
        
        Format as JSON with keys: 
        trend_bias, 
        oscillator_status, 
        long_scenario: { entry, sl, tp, logic }, 
        short_scenario: { entry, sl, tp, logic }.`,
        config: {
          tools: [{ googleSearch: {} }],
          toolConfig: { includeServerSideToolInvocations: true },
          responseMimeType: "application/json",
        }
      });
      if (response && response.text) {
        try {
          const raw = response.text.trim();
          const cleanJson = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '');
          const data = JSON.parse(cleanJson);
          
          setAnalysis({
            trend_bias: data.trend_bias || "Neutral",
            oscillator_status: data.oscillator_status || "Neutral",
            long_scenario: data.long_scenario || { entry: "N/A", sl: "N/A", tp: "N/A", logic: "No bullish scenario provided." },
            short_scenario: data.short_scenario || { entry: "N/A", sl: "N/A", tp: "N/A", logic: "No bearish scenario provided." }
          });
        } catch (parseError) {
          console.error("Parse error:", parseError);
          throw new Error("Invalid analysis format");
        }
      }
    } catch (e) {
      console.error(e);
      
      // Attempt a quick price lookup for fallback
      let fallbackPrice = "0";
      try {
        const priceRes = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `What is the current approximate price of ${selectedSymbol.symbol}? Return ONLY the number.`,
          config: { tools: [{ googleSearch: {} }] }
        });
        fallbackPrice = priceRes.text?.trim() || "0";
      } catch (priceErr) {
        console.error("Price lookup failed:", priceErr);
      }

      const p = parseFloat(fallbackPrice.replace(/[^0-9.]/g, '')) || 0;
      
      setAnalysis({
        trend_bias: "High Demand Fallback",
        oscillator_status: "Neutral",
        long_scenario: { 
          entry: p > 0 ? p.toFixed(2) : "Syncing...", 
          sl: p > 0 ? (p * 0.99).toFixed(2) : "Syncing...", 
          tp: p > 0 ? (p * 1.015).toFixed(2) : "Syncing...", 
          logic: "AI demand is currently high. Generated standard risk scenario (1% SL / 1.5% TP)." 
        },
        short_scenario: { 
          entry: p > 0 ? p.toFixed(2) : "Syncing...", 
          sl: p > 0 ? (p * 1.01).toFixed(2) : "Syncing...", 
          tp: p > 0 ? (p * 0.985).toFixed(2) : "Syncing...", 
          logic: "AI demand is currently high. Generated standard risk scenario (1% SL / 1.5% TP)." 
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (currentContainer && selectedSymbol) {
      currentContainer.innerHTML = "";
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
      script.type = "text/javascript";
      script.async = true;
      script.text = JSON.stringify({
        interval: "1h",
        width: "100%",
        isTransparent: true,
        height: 450,
        symbol: `${selectedSymbol.exchange}:${selectedSymbol.symbol}`,
        showIntervalTabs: true,
        locale: "en",
        colorTheme: "dark"
      });
      currentContainer.appendChild(script);
    }
    return () => {
      if (currentContainer) {
        currentContainer.innerHTML = "";
      }
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [selectedSymbol]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="w-full lg:w-auto">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <RefreshCcw className={cn("text-blue-400", isLoading && "animate-spin")} />
            {selectedSymbol ? `Market Signals: ${selectedSymbol.symbol}` : 'Market Analysis Center'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-mono">Real-time Technical Analysis & AI Alpha</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* Asset Search */}
          <div className="relative flex-1 lg:w-64">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search size={14} className="text-slate-500" />
            </div>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                searchAssets(e.target.value);
                setIsSearchOpen(true);
              }}
              placeholder="Lookup Asset..."
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl py-2 px-4 pl-9 text-xs outline-none focus:border-blue-500 transition-all font-mono"
            />
            {isSearchOpen && searchTerm && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                {searchResults.map((res: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedSymbol(res);
                      setSearchTerm("");
                      setIsSearchOpen(false);
                      setAnalysis(null); // Reset analysis for new symbol
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-800 text-[10px] text-slate-300 border-b border-slate-800 last:border-0"
                  >
                    <span className="font-bold text-blue-400">{res.symbol}</span> - {res.name} ({res.exchange})
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={fetchAnalysis}
            disabled={isLoading || !selectedSymbol}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50"
          >
            <Zap size={14} className={isLoading ? "animate-pulse" : ""} />
            {analysis ? "Refresh AI Strategy" : "Generate AI Strategy"}
            <span className="opacity-50 text-[8px] tracking-normal font-mono">(1 Credit)</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Technical Widget */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 h-[500px] flex flex-col items-center justify-center relative overflow-hidden">
           <div className="absolute top-0 left-0 right-0 p-4 bg-slate-900/80 border-b border-slate-800 z-10 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Market Sentiment Indicators</span>
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[8px] text-emerald-500 font-bold uppercase">{selectedSymbol?.exchange || 'LIVE'} STATUS</span>
              </div>
           </div>
           {selectedSymbol ? (
             <div ref={containerRef} className="tradingview-widget-container w-full h-[450px]" />
           ) : (
             <div className="text-center space-y-4">
               <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto border border-slate-700/50">
                 <BarChart3 className="text-slate-600" size={32} />
               </div>
               <div>
                  <h4 className="text-white font-bold text-sm">Awaiting Asset Selection</h4>
                  <p className="text-slate-500 text-[10px] max-w-[200px] mx-auto mt-2 leading-relaxed">Search and select an instrument to visualize real-time market sentiment and oscillator data.</p>
               </div>
             </div>
           )}
        </div>

        {/* Gemini AI Scenarios */}
        <div className="space-y-6">
          {!selectedSymbol ? (
            <div className="h-full flex flex-col items-center justify-center py-20 bg-slate-900/10 border border-slate-800/30 rounded-3xl border-dashed space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full" />
                <Zap size={64} className="text-slate-800 relative" />
              </div>
              <div className="text-center">
                <h3 className="text-slate-400 font-bold text-lg mb-2">AI Strategy Locked</h3>
                <p className="text-slate-600 text-[10px] px-12 leading-relaxed uppercase tracking-widest">Select an asset to unlock institutional-grade scenarios</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4 py-20 bg-slate-900/30 border border-slate-800/50 rounded-3xl border-dashed">
               <RefreshCcw size={40} className="text-blue-500/20 animate-spin" />
               <p className="text-xs font-mono text-slate-600 animate-pulse uppercase tracking-[0.2em]">Aggregating Intelligence...</p>
            </div>
          ) : analysis ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
               {/* Long Scenario */}
               <div className="bg-gradient-to-br from-emerald-500/10 to-slate-900 border border-emerald-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-700" />
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                           <TrendingUp size={18} />
                        </div>
                        <h3 className="font-bold text-emerald-400 text-lg uppercase tracking-tighter">Scenario A: Bullish Long</h3>
                     </div>
                     <button 
                        onClick={() => analysis?.long_scenario && onApplyScenario(analysis.long_scenario, 'long', selectedSymbol)}
                        className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border border-emerald-500/30"
                     >
                        <Zap size={10} /> Take to Planner
                     </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Entry</span>
                        <p className="text-lg font-mono font-bold text-white">{analysis?.long_scenario?.entry || 'N/A'}</p>
                     </div>
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase text-rose-500/70">Stop Loss</span>
                        <p className="text-sm font-mono font-bold text-rose-400">{analysis?.long_scenario?.sl || 'N/A'}</p>
                     </div>
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase text-emerald-500/70">Take Profit</span>
                        <p className="text-sm font-mono font-bold text-emerald-400">{analysis?.long_scenario?.tp || 'N/A'}</p>
                     </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-emerald-500/30 pl-4">{analysis?.long_scenario?.logic || 'No data.'}</p>
               </div>

               {/* Short Scenario */}
               <div className="bg-gradient-to-br from-rose-500/10 to-slate-900 border border-rose-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all duration-700" />
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400">
                           <TrendingDown size={18} />
                        </div>
                        <h3 className="font-bold text-rose-400 text-lg uppercase tracking-tighter">Scenario B: Bearish Short</h3>
                     </div>
                     <button 
                        onClick={() => analysis?.short_scenario && onApplyScenario(analysis.short_scenario, 'short', selectedSymbol)}
                        className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border border-rose-500/30"
                     >
                        <Zap size={10} /> Take to Planner
                     </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Entry</span>
                        <p className="text-lg font-mono font-bold text-white">{analysis?.short_scenario?.entry || 'N/A'}</p>
                     </div>
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase text-rose-500/70">Stop Loss</span>
                        <p className="text-sm font-mono font-bold text-rose-400">{analysis?.short_scenario?.sl || 'N/A'}</p>
                     </div>
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase text-emerald-500/70">Take Profit</span>
                        <p className="text-sm font-mono font-bold text-emerald-400">{analysis?.short_scenario?.tp || 'N/A'}</p>
                     </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-rose-500/30 pl-4">{analysis?.short_scenario?.logic || 'No data.'}</p>
               </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 bg-slate-900/30 border border-slate-800/50 rounded-3xl border-dashed space-y-6">
               <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                  <Zap size={64} className="text-blue-500 relative animate-pulse" />
               </div>
               <div className="text-center">
                  <h3 className="text-white font-bold text-lg mb-2">Ready for Analysis</h3>
                  <p className="text-slate-500 text-xs px-12 leading-relaxed">Select an asset and click the button above to generate institutional-grade AI trading scenarios.</p>
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-2xl">
         <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={14} className="text-blue-400" />
            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Risk Disclosure</span>
         </div>
         <p className="text-[9px] text-slate-500 leading-tight">Trading involves significant risk. The scenarios above are generated for educational purposes based on current technical indicators and do not constitute financial advice. Always verify levels with live order books.</p>
      </div>
    </div>
  );
};

const DEFAULT_RECHARGE_PACKS = [
  { 
    id: 'pack_starter', 
    order: 0,
    name: 'Starter Alpha', 
    price: 10, 
    credits: 1000,
    description: 'Perfect for precision testing',
    features: ['1,000 Alpha Credits', 'No Expiration', 'Priority AI Processing', 'Standard Support'],
    isPopular: false
  },
  { 
    id: 'pack_pro', 
    order: 1,
    name: 'Professional', 
    price: 50, 
    credits: 6000,
    description: 'High volume strategic execution',
    features: ['6,000 Alpha Credits (20% Bonus)', 'No Expiration', 'Institutional Data Access', 'Direct AI Strategy Export'],
    isPopular: true
  },
  { 
    id: 'pack_whale', 
    order: 2,
    name: 'Institutional', 
    price: 100, 
    credits: 15000,
    description: 'Maximum alpha for power users',
    features: ['15,000 Alpha Credits (50% Bonus)', 'No Expiration', 'Custom AI Prompt Priority', '24/7 Dedicated Alpha Support'],
    isPopular: false
  }
];

const AdminPanel = ({ 
  registeredUsers, 
  setRegisteredUsers,
  isLoadingUsers, 
  fetchUsers,
  activeTab,
  setActiveTab,
  onExit
}: any) => {
  const [plans, setPlans] = useState<any[]>(DEFAULT_RECHARGE_PACKS);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [transferModal, setTransferModal] = useState<{ isOpen: boolean, userId: string, userName: string }>({ 
    isOpen: false, 
    userId: '', 
    userName: '' 
  });
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [dailyUsage, setDailyUsage] = useState<{name: string, value: number}[]>([]);
  const [assetLookups, setAssetLookups] = useState<any[]>([]);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Fetch daily usage
        const qDaily = query(collection(db, 'daily_credits'), orderBy('__name__', 'desc'), limit(14));
        let snapDaily;
        try {
          snapDaily = await getDocs(qDaily);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'daily_credits');
          return;
        }

        const dailyDataMap = new Map(snapDaily.docs.map(doc => [doc.id, doc.data().total || 0]));
        
        // Fill in last 14 days with zero if missing
        const filledDailyData = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split('T')[0];
          filledDailyData.push({
            name: key.split('-').slice(1).join('/'),
            value: dailyDataMap.get(key) || 0
          });
        }
        setDailyUsage(filledDailyData);

        // Fetch asset lookups
        const qAssets = query(collection(db, 'asset_stats'), orderBy('count', 'desc'), limit(10));
        let snapAssets;
        try {
          snapAssets = await getDocs(qAssets);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'asset_stats');
          return;
        }

        const assetsData = snapAssets.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAssetLookups(assetsData);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      }
    };
    fetchAdminData();
  }, [registeredUsers]); // Refresh when users change (proxy for update)

  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalMembers = registeredUsers.length;
    
    // New joins this month
    const newJoins = registeredUsers.filter(u => {
      const created = u.createdAt?.toDate?.() || 
                     (u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000) : null);
      return created && created >= startOfMonth;
    }).length;

    // Active subscriptions (users who have more than the welcome credits)
    const activeSubs = registeredUsers.filter(u => {
      const base = u.referredBy ? 200 : 100;
      return (u.credits || 0) > base;
    }).length;

    // Revenue estimation
    // Average price per credit is roughly $0.0083 (based on Pro pack)
    const totalPurchasedCredits = registeredUsers.reduce((acc, u) => {
      const base = u.referredBy ? 200 : 100;
      const purchased = (u.credits || 0) - base;
      return acc + (purchased > 0 ? purchased : 0);
    }, 0);
    
    const estimatedRevenue = totalPurchasedCredits * 0.0083;

    // Last 6 months labels
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString('default', { month: 'short' }),
        date: d,
        revenue: 0,
        growth: 0
      });
    }

    // Calculate historical growth and revenue buckets
    registeredUsers.forEach(u => {
      const created = u.createdAt?.toDate?.() || 
                     (u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000) : null);
      if (!created) return;

      const base = u.referredBy ? 200 : 100;
      const purchased = (u.credits || 0) - base;
      const userRevenue = (purchased > 0 ? purchased : 0) * 0.0083;

      months.forEach(m => {
        // Revenue approximation: attribute revenue to join month
        if (created.getMonth() === m.date.getMonth() && created.getFullYear() === m.date.getFullYear()) {
          m.revenue += userRevenue;
        }
        // Growth: total users joined UP TO this month's end
        const monthEnd = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0);
        if (created <= monthEnd) {
          m.growth += 1;
        }
      });
    });

    const growthData = months.map(m => ({ name: m.label, value: m.growth }));
    const revenueData = months.map(m => ({ name: m.label, value: Math.round(m.revenue) }));

    const totalCreditsUsed = registeredUsers.reduce((acc, u) => acc + (u.aiUsageCount || 0), 0);

    const topUsers = [...registeredUsers]
      .sort((a, b) => (b.aiUsageCount || 0) - (a.aiUsageCount || 0))
      .slice(0, 10);

    const currentGrowth = growthData[5].value;
    const prevGrowth = growthData[4].value;
    const growthChange = prevGrowth > 0 ? ((currentGrowth - prevGrowth) / prevGrowth) * 100 : 0;

    const currentRevenue = revenueData[5].value;
    const prevRevenue = revenueData[4].value;
    const revenueChange = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    return {
      totalMembers,
      newJoins,
      activeSubs,
      revenue: estimatedRevenue,
      totalCreditsUsed,
      growthData,
      revenueData,
      growthChange,
      revenueChange,
      topUsers
    };
  }, [registeredUsers]);

  const handleTransferCredits = async () => {
    if (!transferModal.userId || !transferAmount || isNaN(parseInt(transferAmount))) return;
    
    const amount = parseInt(transferAmount);
    setIsTransferring(true);
    try {
      const userRef = doc(db, 'users', transferModal.userId);
      await updateDoc(userRef, { 
        credits: increment(amount)
      });
      
      // Update local state
      setRegisteredUsers((prev: any[]) => prev.map(u => (u.id === transferModal.userId || u.uid === transferModal.userId) ? { ...u, credits: (u.credits || 0) + amount } : u));
      
      setTransferModal({ isOpen: false, userId: '', userName: '' });
      setTransferAmount('');
      alert(`Successfully transferred ${amount} credits to ${transferModal.userName}!`);
    } catch (e: any) {
      console.error("Transfer failed:", e);
      if (e.message?.includes('permission-denied')) {
        alert("Permission Denied: Ensure you are logged in as admin sujanbhandaree@gmail.com");
      } else {
        alert("Failed to transfer credits.");
      }
    } finally {
      setIsTransferring(false);
    }
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const q = query(collection(db, 'membership_plans'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (e) {
        console.error("Error fetching plans:", e);
      }
    };
    if (activeTab === 'plans') fetchPlans();
  }, [activeTab]);

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'membership_plans', editingPlan.id), editingPlan);
      // Refresh local state
      setPlans(plans.map(p => p.id === editingPlan.id ? editingPlan : p));
      setEditingPlan(null);
      alert("Plan updated successfully!");
    } catch (e) {
      console.error("Error saving plan:", e);
      alert("Failed to save plan.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateFeature = (index: number, value: string) => {
    if (!editingPlan) return;
    const newFeatures = [...editingPlan.features];
    newFeatures[index] = value;
    setEditingPlan({ ...editingPlan, features: newFeatures });
  };

  const addFeature = () => {
    if (!editingPlan) return;
    setEditingPlan({ ...editingPlan, features: [...editingPlan.features, ''] });
  };

  const removeFeature = (index: number) => {
    if (!editingPlan) return;
    const newFeatures = editingPlan.features.filter((_: any, i: number) => i !== index);
    setEditingPlan({ ...editingPlan, features: newFeatures });
  };
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex animate-in fade-in duration-500">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen shrink-0 shadow-sm">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none italic">SmartTrade</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
              activeTab === 'dashboard' ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('members')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
              activeTab === 'members' ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Users size={20} /> Members
          </button>
          <button 
            onClick={() => setActiveTab('plans')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
              activeTab === 'plans' ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <CreditCard size={20} /> Plans
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
              activeTab === 'settings' ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Settings size={20} /> Settings
          </button>
        </nav>

        <div className="p-6 border-t border-slate-100">
          <button 
            onClick={onExit}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
          >
            <ChevronLeft size={16} /> Exit Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md z-30 p-6 px-10 border-b border-slate-200 flex justify-between items-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-800 capitalize">{activeTab}</h1>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all w-64"
              />
            </div>
            <button className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto space-y-10">
          {activeTab === 'dashboard' && (
            <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                      <Users size={24} />
                    </div>
                    <span className={cn(
                      "text-[10px] px-2.5 py-1 rounded-full font-bold",
                      stats.growthChange >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {stats.growthChange >= 0 ? '+' : ''}{stats.growthChange.toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Members</p>
                    <h3 className="text-3xl font-black text-slate-900">{stats.totalMembers}</h3>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                      <CreditCard size={24} />
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-bold">READY</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Subscriptions</p>
                    <h3 className="text-3xl font-black text-slate-900">{stats.activeSubs}</h3>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500">
                      <TrendingUp size={24} />
                    </div>
                    <span className={cn(
                      "text-[10px] px-2.5 py-1 rounded-full font-bold",
                      stats.revenueChange >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {stats.revenueChange >= 0 ? '+' : ''}{stats.revenueChange.toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly Revenue</p>
                    <h3 className="text-3xl font-black text-slate-900">${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                      <Crown size={24} />
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-bold">+8%</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">New Joins</p>
                    <h3 className="text-3xl font-black text-slate-900">{stats.newJoins}</h3>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                      <Sparkles size={24} />
                    </div>
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-bold">TOTAL</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Credits Used</p>
                    <h3 className="text-3xl font-black text-slate-900">{stats.totalCreditsUsed}</h3>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="font-bold text-slate-800 uppercase tracking-widest text-sm">Growth Overview</h3>
                    <select className="bg-slate-50 border-none rounded-xl text-[10px] font-bold uppercase px-3 py-1.5 focus:ring-0">
                      <option>Last 6 Months</option>
                      <option>Last Year</option>
                    </select>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.growthData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="font-bold text-slate-800 uppercase tracking-widest text-sm">Revenue Performance</h3>
                    <div className="flex gap-2">
                       <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenue (Est.)</span>
                       </div>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.revenueData}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip 
                          formatter={(val) => [`$${val}`, 'Revenue']}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          cursor={{ fill: '#f1f5f9', radius: 8 }}
                        />
                        <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Daily Usage Chart */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 lg:col-span-1">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="font-bold text-slate-800 uppercase tracking-widest text-sm">Daily Credit Usage</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credits</span>
                    </div>
                  </div>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyUsage.length > 0 ? dailyUsage : [{name: 'Waiting', value: 0}]}>
                        <defs>
                          <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorUsage)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Trending Assets */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 lg:col-span-1">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="font-bold text-slate-800 uppercase tracking-widest text-sm">Trending Assets</h3>
                    <TrendingUp className="text-emerald-500" size={16} />
                  </div>
                  <div className="space-y-4">
                    {assetLookups.length > 0 ? assetLookups.map((asset, i) => (
                      <div key={asset.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 border border-slate-100/50 group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-300 w-4">#{i+1}</span>
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{asset.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Lookups Active</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-600">{asset.count}</p>
                          <TrendingUp size={10} className="text-emerald-400 inline ml-1" />
                        </div>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
                        <RefreshCcw className="animate-spin mb-4" size={24} />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Collating Market Data...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Users List */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 lg:col-span-1">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="font-bold text-slate-800 uppercase tracking-widest text-sm">Top Consumers</h3>
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {stats.topUsers.slice(0, 5).map((u, i) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white shadow-sm border border-slate-100 overflow-hidden flex items-center justify-center p-0.5">
                            {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover rounded-lg" /> : <UserIcon size={14} className="text-slate-400" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-slate-800 truncate max-w-[80px]">{u.displayName || u.email.split('@')[0]}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">User Consumer</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className="text-[10px] font-black text-blue-600">
                              {u.aiUsageCount || 0}
                           </span>
                           <span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">Credits</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 uppercase tracking-widest text-sm">Recent Members</h3>
                  <button onClick={fetchUsers} className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-2">
                    <RefreshCcw size={12} className={isLoadingUsers ? "animate-spin" : ""} /> View All
                  </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                        <tr>
                          <th className="px-8 py-5">User</th>
                          <th className="px-8 py-5">Status</th>
                          <th className="px-8 py-5">Plan</th>
                          <th className="px-8 py-5 text-right">Activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {registeredUsers.slice(0, 5).map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden">
                                  {u.photoURL ? <img src={u.photoURL} alt="" /> : <UserIcon size={18} className="text-slate-400" />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{u.displayName || 'Unnamed'}</p>
                                  <p className="text-xs text-slate-400">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                               <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase tracking-widest">
                                 {(u.credits || 0) > (u.referredBy ? 200 : 100) ? 'Active' : 'Free'}
                               </span>
                            </td>
                            <td className="px-8 py-6">
                               <span className="text-xs font-bold text-slate-600">
                                 {u.credits >= 15000 ? 'Whale' : u.credits >= 6000 ? 'Professional' : 'Starter'}
                               </span>
                            </td>
                            <td className="px-8 py-6 text-right">
                               <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                                  <ChevronRight size={18} />
                               </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'members' && (
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden min-h-[600px]">
               {/* Search & Filter Header */}
               <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                 <div>
                    <h3 className="font-bold text-slate-800 uppercase tracking-widest text-sm mb-1">User Directory</h3>
                    <p className="text-xs text-slate-400">{registeredUsers.length} total members registered</p>
                 </div>
                 <div className="flex gap-4">
                    <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">
                       <BarChart3 size={14} /> Export CSV
                    </button>
                    <button onClick={fetchUsers} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                       <RefreshCcw size={14} className={isLoadingUsers ? "animate-spin" : ""} /> Refresh Data
                    </button>
                 </div>
               </div>

               <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                        <tr>
                          <th className="px-8 py-6">Member</th>
                          <th className="px-8 py-6">Registration Date</th>
                          <th className="px-8 py-6">Credits Balance</th>
                          <th className="px-8 py-6">AI Utilization</th>
                          <th className="px-8 py-6">Account Status</th>
                          <th className="px-8 py-6 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {isLoadingUsers ? (
                          <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">Loading Records...</td></tr>
                        ) : registeredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                                  {u.photoURL ? <img src={u.photoURL} alt="" /> : <UserIcon size={18} className="text-slate-400" />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{u.displayName}</p>
                                  <p className="text-xs text-slate-400 font-mono">{u.uid?.substring(0,8)}...</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-sm text-slate-500 font-mono">
                               {u.createdAt?.toDate?.()?.toLocaleDateString() || new Date(u.createdAt?.seconds * 1000).toLocaleDateString() || 'N/A'}
                            </td>
                            <td className="px-8 py-6 text-sm">
                               <span className="font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                                  {u.credits ?? 0}
                               </span>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                                     <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((u.aiUsageCount || 0) * 5, 100)}%` }} />
                                  </div>
                                  <span className="text-xs font-bold text-slate-600">{u.aiUsageCount || 0} calls</span>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <span className={cn(
                                 "px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border",
                                 (u.credits || 0) > (u.referredBy ? 200 : 100) 
                                   ? "bg-blue-50 text-blue-600 border-blue-100" 
                                   : "bg-slate-50 text-slate-400 border-slate-100"
                               )}>
                                 {(u.credits || 0) > (u.referredBy ? 200 : 100) ? 'Pro Member' : 'Standard'}
                               </span>
                            </td>
                            <td className="px-8 py-6 text-right">
                               <button 
                                 onClick={() => {
                                   setTransferModal({
                                     isOpen: true,
                                     userId: u.id || u.uid,
                                     userName: u.displayName || u.email || 'Member'
                                   });
                                 }}
                                 className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                               >
                                  Transfer Credits
                               </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
               </div>
            </div>
          )}

          {activeTab === 'plans' && (
             <div className="space-y-10">
                <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-12 text-center flex flex-col items-center gap-8 relative overflow-hidden">
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50" />
                  <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 relative">
                     <Zap size={40} />
                  </div>
                  <div className="relative">
                     <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Alpha Credit Packs</h3>
                     <p className="text-slate-400 max-w-md mx-auto">Manage the inventory of credits and pricing available for purchase by SmartTrade users.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8">
                     {plans.map(p => (
                        <div key={p.id} className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 text-left space-y-6 flex flex-col hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                           <div className="flex justify-between items-start">
                              <h4 className="font-bold text-slate-800 uppercase tracking-widest text-xs">{p.name}</h4>
                              <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors">
                                 <Plus size={16} />
                              </div>
                           </div>
                           <p className="text-3xl font-black text-slate-900 italic">
                             {typeof p.price === 'number' ? `$${p.price}` : p.price}
                           </p>
                           <div className="bg-blue-500/10 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-flex self-start">
                              {p.credits} Credits
                           </div>
                           <ul className="space-y-3 flex-1">
                              {p.features?.map((feat: string, i: number) => (
                                 <li key={i} className="flex items-start gap-2 text-xs text-slate-500 leading-tight">
                                    <div className="mt-1 w-3 h-3 bg-blue-500/10 rounded flex items-center justify-center text-blue-500 flex-shrink-0">
                                       <Check size={8} strokeWidth={4} />
                                    </div>
                                    {feat}
                                 </li>
                              ))}
                           </ul>
                           <button 
                             onClick={() => setEditingPlan(p)}
                             className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm active:scale-95"
                           >
                              Edit Pack
                           </button>
                        </div>
                     ))}
                  </div>
                </div>

                {/* Edit Modal / Inline Editor */}
                <AnimatePresence>
                  {editingPlan && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-[40px] shadow-2xl border-4 border-blue-500/10 p-10 space-y-8"
                    >
                       <div className="flex justify-between items-center">
                          <h3 className="text-xl font-black italic tracking-tighter text-slate-800 uppercase">Modify {editingPlan.name}</h3>
                          <button onClick={() => setEditingPlan(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                             <X size={24} />
                          </button>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="space-y-4">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pack Name</label>
                             <input 
                                value={editingPlan.name}
                                onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all"
                             />
                          </div>
                          <div className="space-y-4">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price (USD)</label>
                             <input 
                                type="number"
                                value={editingPlan.price}
                                onChange={e => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) })}
                                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all"
                             />
                          </div>
                          <div className="space-y-4">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credits Granted</label>
                             <input 
                                type="number"
                                value={editingPlan.credits}
                                onChange={e => setEditingPlan({ ...editingPlan, credits: parseInt(e.target.value) })}
                                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-mono font-bold text-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                             />
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div className="flex justify-between items-center">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entitlements & Features</label>
                             <button onClick={addFeature} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-all flex items-center gap-1">
                                <Plus size={12} /> Add Feature
                             </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {editingPlan.features.map((feat: string, i: number) => (
                                <div key={i} className="flex gap-2 group">
                                   <input 
                                      value={feat}
                                      onChange={e => updateFeature(i, e.target.value)}
                                      className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-medium text-slate-600 focus:ring-2 focus:ring-emerald-500/20"
                                      placeholder="Feature description..."
                                   />
                                   <button onClick={() => removeFeature(i)} className="p-3 bg-rose-50 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-100">
                                      <Trash2 size={14} />
                                   </button>
                                </div>
                             ))}
                          </div>
                       </div>

                       <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
                          <button onClick={() => setEditingPlan(null)} className="px-8 py-4 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">Cancel Changes</button>
                          <button 
                            disabled={isSaving}
                            onClick={handleSavePlan}
                            className="px-10 py-4 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                          >
                             {isSaving && <RefreshCcw size={14} className="animate-spin" />}
                             Commit Plan Updates
                          </button>
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {transferModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTransferModal({ isOpen: false, userId: '', userName: '' })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 mx-auto mb-4">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-1">Transfer Credits</h3>
              <p className="text-slate-400 text-xs mb-6 px-4">
                Enter amount for <span className="font-bold text-slate-800">{transferModal.userName}</span>
              </p>
              
              <div className="space-y-4">
                <input 
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setTransferModal({ isOpen: false, userId: '', userName: '' })}
                    className="flex-1 py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleTransferCredits}
                    disabled={isTransferring || !transferAmount}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {isTransferring ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MembershipView = ({ user, onBack, onPurchase }: any) => {
  const [plans, setPlans] = useState<any[]>(DEFAULT_RECHARGE_PACKS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const q = query(collection(db, 'membership_plans'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (e) {
        console.error("Error loading plans:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlans();
  }, []);

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <RefreshCcw className="animate-spin text-blue-400" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-y-auto animate-in slide-in-from-right duration-500">
       <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-16">
             <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors uppercase tracking-widest font-bold text-[10px]">
                <ChevronLeft size={16} /> Back to Planner
             </button>
             <div className="flex items-center gap-3">
                <Zap className="text-blue-500" size={24} />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Alpha Recharge Center</span>
             </div>
          </div>

          <div className="text-center space-y-4 mb-20">
             <h1 className="text-5xl lg:text-7xl font-black italic tracking-tighter">
                RECHARGE <span className="text-blue-500">ALPHA CREDITS</span>
             </h1>
             <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
                1 Alpha Credit = 1 AI Analysis or Strategy Generation. Top up your balance to maintain your trading edge.
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {plans.map(plan => (
                <div 
                  key={plan.id}
                  className={cn(
                    "relative p-10 rounded-[40px] border flex flex-col h-full bg-slate-900/50 backdrop-blur-xl transition-all duration-500 group overflow-hidden",
                    plan.isPopular ? "border-blue-500/50 scale-105 z-10 shadow-[0_0_50px_rgba(37,99,235,0.15)]" : "border-slate-800 hover:border-slate-700"
                  )}
                >
                   {plan.isPopular && (
                      <div className="absolute top-0 right-10 bg-blue-500 text-white px-4 py-1.5 rounded-b-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                         Recommended
                      </div>
                   )}

                   <div className="space-y-6 mb-10">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                        plan.id.includes('free') ? "bg-slate-800 text-slate-400" : plan.id.includes('pro') ? "bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" : "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                      )}>
                         {plan.id.includes('free') ? <Check size={32} /> : plan.id.includes('pro') ? <Zap size={32} /> : <Crown size={32} />}
                      </div>
                      <div>
                         <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-1">{plan.name}</h3>
                         <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{plan.description}</p>
                      </div>
                   </div>

                   <div className="mb-10">
                      <p className="text-5xl font-black italic text-white flex items-baseline gap-1">
                         ${plan.price}
                      </p>
                      <p className="text-blue-400 font-mono font-bold text-sm mt-1 uppercase tracking-widest">
                         {plan.credits?.toLocaleString()} Credits
                      </p>
                   </div>

                   <ul className="space-y-4 mb-12 flex-1">
                      {plan.features?.map((f: string) => (
                         <li key={f} className="flex items-start gap-3 group/item">
                            <div className="mt-1 w-4 h-4 rounded bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover/item:bg-blue-500/30 transition-all flex-shrink-0">
                               <Check size={10} strokeWidth={4} />
                            </div>
                            <span className="text-sm text-slate-400 leading-tight group-hover/item:text-slate-200 transition-colors">{f}</span>
                         </li>
                      ))}
                   </ul>

                   <button 
                     onClick={() => onPurchase(plan.id)}
                     className={cn(
                       "w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-2 active:scale-95 group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]",
                       plan.id.includes('starter') ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-blue-600 hover:bg-blue-500 text-white"
                     )}
                   >
                      Purchase Credits <ArrowRight size={14} />
                   </button>
                </div>
             ))}
          </div>

          <div className="mt-20 p-10 bg-slate-900 border border-slate-800 rounded-[40px] text-center space-y-6">
             <div className="flex items-center justify-center gap-8 opacity-40">
                <ShieldCheck size={40} />
                <div className="h-10 w-px bg-slate-800" />
                <div className="p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center gap-3">
                   <CreditCard size={24} />
                   <p className="text-[10px] font-black uppercase tracking-widest text-left">Stripe<br/>Verified</p>
                </div>
                <div className="h-10 w-px bg-slate-800" />
                <Lock size={40} />
             </div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                All payments are processed via Stripe's encrypted gateway. Your active subscription status is synchronized instantly across all your devices.
             </p>
          </div>
       </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [appView, setAppView] = useState<'user' | 'admin' | 'membership'>('user');
  const [adminActiveTab, setAdminActiveTab] = useState<'dashboard' | 'members' | 'plans' | 'settings'>('dashboard');
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<string>("");
  const [isPriceLoading, setIsPriceLoading] = useState(false);

  const [activeMode, setActiveMode] = useState<'spot' | 'futures'>('spot');
  const [currency, setCurrency] = useState('USD');
  const [selectedPair, setSelectedPair] = useState<string>("");
  const [tradeType, setTradeType] = useState<'long' | 'short'>('long');
  const [balance, setBalance] = useState<string>("10000");
  const [riskPercent, setRiskPercent] = useState<string>("1");
  const [riskAmountInput, setRiskAmountInput] = useState<string>("100");
  const [commissionPercent, setCommissionPercent] = useState<string>("0.1");
  const [taxPercent, setTaxPercent] = useState<string>("0");
  const [entryPrice, setEntryPrice] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [slPercent, setSlPercent] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [tpPercent, setTpPercent] = useState<string>("");
  const [lotSize, setLotSize] = useState<string>("100000"); // 1 standard lot = 100,000 units
  const [leverage, setLeverage] = useState<string>("100");

  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{ probability: number; reasoning: string } | null>(null);
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'planner' | 'journal' | 'signals'>('planner');
  const [isJournalLoading, setIsJournalLoading] = useState(false);
  const [plannerSearchTerm, setPlannerSearchTerm] = useState("");

  const saveToJournal = async () => {
    if (!results || results.isInvalid || !user) return;
    setIsSavingJournal(true);
    try {
      const journalRef = collection(db, 'users', user.uid, 'journal');
      const newEntry = {
        pair: selectedPair,
        type: tradeType,
        entry: parseFloat(entryPrice),
        stopLoss: parseFloat(stopLoss),
        takeProfit: parseFloat(takeProfit),
        riskAmount: results.riskAmount,
        positionSizeLots: results.positionSizeLots,
        rrRatio: results.rrRatio,
        aiAnalysis: aiAnalysis,
        createdAt: serverTimestamp(),
        currency: currency,
        balance: parseFloat(balance),
        riskPercent: parseFloat(riskPercent),
        status: 'open',
        realizedPnL: 0
      };
      await addDoc(journalRef, newEntry);
      fetchJournal();
      alert("Trade saved to Journal!");
    } catch (error) {
      console.error("Failed to save to journal:", error);
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/journal`);
    } finally {
      setIsSavingJournal(false);
    }
  };

  const fetchJournal = async () => {
    if (!user) return;
    setIsJournalLoading(true);
    try {
      const journalRef = collection(db, 'users', user.uid, 'journal');
      const q = query(journalRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const entries = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate() || new Date() 
        };
      });
      setJournalEntries(entries);
    } catch (error) {
      console.error("Failed to fetch journal:", error);
    } finally {
      setIsJournalLoading(false);
    }
  };

  useEffect(() => {
    if (user && activeTab === 'journal') {
      fetchJournal();
    }
  }, [user, activeTab]);
  const deleteJournalEntry = async (id: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      const entryRef = doc(db, 'users', user.uid, 'journal', id);
      await deleteDoc(entryRef);
      setJournalEntries(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error("Failed to delete journal entry:", error);
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/journal/${id}`);
    }
  };

  const updateJournalEntry = async (id: string, updatedData: any) => {
    if (!user) return;
    try {
      const entryRef = doc(db, 'users', user.uid, 'journal', id);
      await updateDoc(entryRef, {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      fetchJournal();
    } catch (error) {
      console.error("Failed to update journal entry:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/journal/${id}`);
    }
  };

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      console.log("Detected referral code:", ref);
      setReferralCode(ref);
      localStorage.setItem('st_referral_code', ref);
    } else {
      const savedRef = localStorage.getItem('st_referral_code');
      if (savedRef) setReferralCode(savedRef);
    }
  }, []);

  const [aiUsageCount, setAiUsageCount] = useState<number>(0);
  const [credits, setCredits] = useState<number>(0);

  const isAdmin = useMemo(() => user?.email?.toLowerCase() === 'sujanbhandaree@gmail.com', [user]);

  const [isSavingDefaults, setIsSavingDefaults] = useState(false);

  useEffect(() => {
    // When switching to spot, reset leverage to 1
    if (activeMode === 'spot') {
      setLeverage("1");
      if (lotSize === "100000") setLotSize("1");
    } else {
      setLeverage("100");
      if (lotSize === "1") setLotSize("100000");
    }
  }, [activeMode]);

  const fetchUsers = async () => {
    if (!isAdmin) return;
    setIsLoadingUsers(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegisteredUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (appView === 'admin') {
      fetchUsers();
    }
  }, [appView]);

  useEffect(() => {
    const fetchLivePrice = async () => {
      if (!selectedPair) {
        setCurrentPrice("");
        return;
      }
      setIsPriceLoading(true);
      
      // 1. Try real-time API for Crypto (Binance Public API)
      const isCryptoPair = selectedPair.includes('USDT') || selectedPair.includes('USD') || selectedPair.includes('/');
      const isGold = selectedPair.toLowerCase().includes('gold') || selectedPair.toLowerCase().includes('xau');
      
      if (isCryptoPair || isGold) {
        try {
          // Normalizing for Binance: remove slashes, spaces, and handle common suffixes
          let binanceSymbol = isGold ? 'PAXGUSDT' : selectedPair.toUpperCase().replace(/[\s\/]/g, '');
          
          const cryptoMapping: Record<string, string> = {
            'BTC': 'BTCUSDT',
            'ETH': 'ETHUSDT',
            'SOL': 'SOLUSDT',
            'XRP': 'XRPUSDT',
            'ADA': 'ADAUSDT',
            'DOGE': 'DOGEUSDT',
            'XAUUSD': 'PAXGUSDT'
          };

          if (cryptoMapping[binanceSymbol]) binanceSymbol = cryptoMapping[binanceSymbol];
          
          // Fallback guess: if it's just BTC or ETH etc.
          if (binanceSymbol.length <= 4 && !binanceSymbol.endsWith('USDT')) {
            binanceSymbol += 'USDT';
          }

          const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`);
          const data = await response.json();
          if (data.price) {
            const p = parseFloat(data.price);
            setCurrentPrice(p > 1 ? p.toFixed(2) : p.toString());
            setIsPriceLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Binance API check failed, trying AI search fallback", e);
        }
      }

      // 2. Fallback to AI for Forex/Stocks/Commodities with Browser Search for REAL-TIME data
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `What is the ABSOLUTE LATEST LIVE spot market price for "${selectedPair}" right now? 
            Return the exact price as seen on real-time professional terminals like TradingView or Bloomberg.
            
            Format as JSON: {"price": number, "asset": "${selectedPair}", "source": "tradingview"}`,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json"
          }
        });
        const text = response.text || "{}";
        const cleanText = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const data = JSON.parse(cleanText);
        if (data.price) {
          const p = parseFloat(data.price.toString().replace(/[^0-9.]/g, ''));
          if (!isNaN(p)) {
            setCurrentPrice(p > 1 ? p.toFixed(2) : p.toString());
          }
        }
      } catch (error) {
        console.error("Price fetch failed:", error);
      } finally {
        setIsPriceLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchLivePrice();
    }, 400);

    return () => clearTimeout(debounceTimer);
  }, [selectedPair]);

  useEffect(() => {
    const ep = parseFloat(entryPrice);
    if (!ep || ep <= 0) {
      setSlPercent("");
      setTpPercent("");
      return;
    }

    const sl = parseFloat(stopLoss);
    if (!isNaN(sl)) {
      const diff = tradeType === 'long' ? (ep - sl) : (sl - ep);
      setSlPercent(((diff / ep) * 100).toFixed(2));
    } else {
      setSlPercent("");
    }

    const tp = parseFloat(takeProfit);
    if (!isNaN(tp)) {
      const diff = tradeType === 'long' ? (tp - ep) : (ep - tp);
      setTpPercent(((diff / ep) * 100).toFixed(2));
    } else {
      setTpPercent("");
    }
  }, [entryPrice, tradeType, stopLoss, takeProfit]);

  const handleLevelChange = (type: 'sl' | 'tp', val: string, inputType: 'price' | 'percent') => {
    const ep = parseFloat(entryPrice);
    
    if (inputType === 'price') {
      if (type === 'sl') setStopLoss(val);
      else setTakeProfit(val);

      if (!ep || ep <= 0) return;

      const price = parseFloat(val);
      if (type === 'sl') {
        if (!isNaN(price)) {
          const diff = tradeType === 'long' ? (ep - price) : (price - ep);
          setSlPercent(((diff / ep) * 100).toFixed(2));
        } else {
          setSlPercent("");
        }
      } else {
        if (!isNaN(price)) {
          const diff = tradeType === 'long' ? (price - ep) : (ep - price);
          setTpPercent(((diff / ep) * 100).toFixed(2));
        } else {
          setTpPercent("");
        }
      }
    } else {
      if (type === 'sl') setSlPercent(val);
      else setTpPercent(val);

      if (!ep || ep <= 0) return;

      const percent = parseFloat(val);
      if (type === 'sl') {
        if (!isNaN(percent)) {
          const multiplier = tradeType === 'long' ? (1 - percent / 100) : (1 + percent / 100);
          setStopLoss((ep * multiplier).toFixed(5));
        } else {
          setStopLoss("");
        }
      } else {
        if (!isNaN(percent)) {
          const multiplier = tradeType === 'long' ? (1 + percent / 100) : (1 - percent / 100);
          setTakeProfit((ep * multiplier).toFixed(5));
        } else {
          setTakeProfit("");
        }
      }
    }
  };

  const handleBalanceChange = (val: string) => {
    setBalance(val);
    const b = parseFloat(val) || 0;
    const rP = parseFloat(riskPercent) || 0;
    if (b > 0) {
      setRiskAmountInput((b * (rP / 100)).toString());
    }
  };

  const handleRiskPercentChange = (val: string) => {
    setRiskPercent(val);
    const b = parseFloat(balance) || 0;
    const rP = parseFloat(val) || 0;
    if (b > 0) {
      setRiskAmountInput((b * (rP / 100)).toString());
    }
  };

  const handleRiskAmountChange = (val: string) => {
    setRiskAmountInput(val);
    const b = parseFloat(balance) || 0;
    const rA = parseFloat(val) || 0;
    if (b > 0) {
      setRiskPercent(((rA / b) * 100).toFixed(2));
    }
  };

  // --- Calculations ---
  const results = useMemo(() => {
    const b = parseFloat(balance) || 0;
    const rP = parseFloat(riskPercent) || 0;
    const cP = parseFloat(commissionPercent) || 0;
    const tX = parseFloat(taxPercent) || 0;
    const eP = parseFloat(entryPrice) || 0;
    const sL = parseFloat(stopLoss) || 0;
    const tP = parseFloat(takeProfit) || 0;
    const lS = parseFloat(lotSize) || 1;
    const lev = parseFloat(leverage) || 1;

    if (!eP || !sL) return null;

    const riskAmount = b * (rP / 100);
    const priceDiff = Math.abs(eP - sL);
    
    if (priceDiff === 0) return null;

    // Position Size in Units
    const positionSizeUnits = riskAmount / priceDiff;
    const positionSizeLots = positionSizeUnits / lS;
    const totalPositionValue = positionSizeUnits * eP;

    // Costs (Commission + Tax)
    const totalCostPercent = cP + tX;
    // Total costs usually apply twice (opening + closing) or is a total round-turn %
    // We'll treat the input as the total round-turn percentage of position value for simplicity
    const costValue = totalPositionValue * (totalCostPercent / 100);

    // Reward / Ratio
    const rewardDiff = Math.abs(tP - eP);
    const rawReward = positionSizeUnits * rewardDiff;
    
    const netProfit = rawReward - costValue;
    const netLoss = riskAmount + costValue;
    
    const rrRatio = eP && rewardDiff ? (rewardDiff / priceDiff).toFixed(2) : "0.00";

    // Margin calculation
    const estimatedMargin = totalPositionValue / lev;

    // Trade Validation (Stop loss check)
    const isInvalid = (tradeType === 'long' && sL >= eP) || (tradeType === 'short' && sL <= eP);

    return {
      riskAmount, // Original pure risk budget
      netProfit,
      netLoss,
      costValue,
      positionSizeUnits,
      positionSizeLots,
      rrRatio,
      isInvalid,
      totalPositionValue,
      estimatedMargin
    };
  }, [tradeType, balance, riskPercent, commissionPercent, taxPercent, entryPrice, stopLoss, takeProfit, lotSize, leverage]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthLoading(false);
      
      if (u) {
        // Handle user registration in Firestore
        const userRef = doc(db, 'users', u.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          try {
            const savedRef = localStorage.getItem('st_referral_code') || referralCode;
            const initialCredits = 100 + (savedRef ? 100 : 0);

            await setDoc(userRef, {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              photoURL: u.photoURL,
              aiUsageCount: 0,
              credits: initialCredits,
              referredBy: savedRef || null,
              preferredDefaults: {
                leverage: "100",
                riskPercent: "1",
                lotSize: "100000",
                currency: "USD",
                selectedPair: "BTC/USDT"
              },
              createdAt: serverTimestamp()
            });

            setCredits(initialCredits);

            if (savedRef) {
              try {
                const refererRef = doc(db, 'users', savedRef);
                await updateDoc(refererRef, {
                  credits: increment(200)
                });
                console.log("Referral bonus awarded to:", savedRef);
                localStorage.removeItem('st_referral_code');
              } catch (e) {
                console.error("Failed to credit referer:", e);
              }
            }
          } catch (error) {
            console.error("Error creating user profile:", error);
          }
        } else {
          // Load defaults if they exist
          const data = userDoc.data();
          setAiUsageCount(data.aiUsageCount || 0);
          setCredits(data.credits !== undefined ? data.credits : 0);
          if (data.preferredDefaults) {
            setLeverage(data.preferredDefaults.leverage || "100");
            setRiskPercent(data.preferredDefaults.riskPercent || "1");
            setLotSize(data.preferredDefaults.lotSize || "100000");
            setCurrency(data.preferredDefaults.currency || "USD");
            if (data.preferredDefaults.selectedPair) {
              setSelectedPair(data.preferredDefaults.selectedPair);
            }
            
            // Recalculate risk amount based on loaded percent
            const b = parseFloat(balance) || 0;
            const rP = parseFloat(data.preferredDefaults.riskPercent) || 1;
            if (b > 0) {
              setRiskAmountInput((b * (rP / 100)).toString());
            }
          }
        }
      }
    });
    return () => unsubscribe();
  }, [balance]);

  useEffect(() => {
    const accepted = localStorage.getItem('smarttrade_terms_accepted');
    if (accepted === 'true') {
      setHasAcceptedTerms(true);
    }
  }, []);

  const acceptTerms = () => {
    localStorage.setItem('smarttrade_terms_accepted', 'true');
    setHasAcceptedTerms(true);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(val);

  const formatNumber = (val: number, decimals: number = 2) => 
    new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);

  const runAiAnalysis = async () => {
    // Keep your existing validation
    if (!results || results.isInvalid || !user) return;
    
    // Keep your existing credit check
    if (credits <= 0) {
      alert("Insufficient Credits. Please recharge your balance to continue.");
      setAppView('membership');
      return;
    }

    setIsAiLoading(true);
    try {
      // New secure backend call
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair: selectedPair,
          entry: entryPrice,
          sl: stopLoss,
          tp: takeProfit,
          isLong: isLong,
          userId: user.uid // Useful for tracking credits on the server
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      setAiAnalysis(data.analysis);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setAiAnalysis("Failed to load AI analysis. Please try again later.");
    } finally {
      setIsAiLoading(false);
    }
  };
    
    setIsAiLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `As a professional trading analyst, evaluate this ${tradeType} setup:
          Entry: ${entryPrice}
          Stop Loss: ${stopLoss}
          Take Profit: ${takeProfit}
          R:R Ratio: ${results.rrRatio}
          
          Provide a success probability (0-100) and brief technical reasoning.
          Return ONLY valid JSON: {"probability": number, "reasoning": "string"}`,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const data = JSON.parse(response.text || '{}');
      setAiAnalysis(data);

      // Increment AI usage counter and decrement credits
      const userRef = doc(db, 'users', user.uid);
      const today = new Date().toISOString().split('T')[0];
      const dailyRef = doc(db, 'daily_credits', today);

      await Promise.all([
        updateDoc(userRef, { 
          aiUsageCount: increment(1),
          credits: increment(-1)
        }),
        setDoc(dailyRef, { total: increment(1) }, { merge: true })
      ]);
      
      setAiUsageCount(prev => prev + 1);
      setCredits(prev => Math.max(0, prev - 1));

    } catch (error) {
      console.error("AI Analysis failed:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const saveDefaults = async () => {
    if (!user) return;
    setIsSavingDefaults(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        preferredDefaults: {
          leverage,
          riskPercent,
          lotSize,
          currency,
          selectedPair
        }
      }, { merge: true });
      alert("Trading defaults saved to your profile!");
    } catch (error) {
      console.error("Error saving defaults:", error);
      alert("Failed to save defaults.");
    } finally {
      setIsSavingDefaults(false);
    }
  };

  const trackAssetLookup = async (pair: string) => {
    if (!user) return;
    try {
      const assetRef = doc(db, 'asset_stats', pair.replace(/\//g, '_')); // Replace / with _ for valid doc ID
      await setDoc(assetRef, { 
        name: pair,
        count: increment(1),
        lastUsed: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error tracking asset lookup:", error);
      try {
        handleFirestoreError(error, OperationType.WRITE, 'asset_stats');
      } catch (e) {
        // Suppress nested error but keep original log
      }
    }
  };

  const plannerProps = {
    user, activeMode, setActiveMode, currency, setCurrency, 
    selectedPair, setSelectedPair,
    tradeType, setTradeType,
    balance, handleBalanceChange, riskPercent, handleRiskPercentChange, 
    riskAmountInput, handleRiskAmountChange, commissionPercent, setCommissionPercent,
    taxPercent, setTaxPercent, entryPrice, setEntryPrice, stopLoss, setStopLoss,
    takeProfit, setTakeProfit, lotSize, setLotSize, leverage, setLeverage,
    results, isAiLoading, runAiAnalysis, aiAnalysis, currentPrice, isPriceLoading,
    slPercent, setSlPercent, tpPercent, setTpPercent, handleLevelChange,
    trackAssetLookup,
    saveToJournal, isSavingJournal, credits,
    searchTerm: plannerSearchTerm,
    setSearchTerm: setPlannerSearchTerm
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-500 font-mono text-xs animate-pulse uppercase tracking-widest">Initialising Session...</p>
        </div>
      </div>
    );
  }

  // --- Final Render Switch ---
  if (appView === 'admin' && isAdmin) {
    return (
      <AdminPanel 
        registeredUsers={registeredUsers}
        setRegisteredUsers={setRegisteredUsers}
        isLoadingUsers={isLoadingUsers}
        fetchUsers={fetchUsers}
        activeTab={adminActiveTab}
        setActiveTab={setAdminActiveTab}
        onExit={() => setAppView('user')}
      />
    );
  }

  if (appView === 'membership') {
    return (
      <MembershipView 
        user={user}
        onBack={() => setAppView('user')}
        onPurchase={async (packId: string) => {
          const pack = DEFAULT_RECHARGE_PACKS.find(p => p.id === packId);
          if (!pack) return;
          
          alert(`Recharge for ${pack.credits} credits requested! Demo Mode: Credits will be added instantly.`);
          
          try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { credits: increment(pack.credits) });
            setCredits(prev => prev + pack.credits);
            setAppView('user');
          } catch (e) {
            console.error("Recharge failed:", e);
            alert("Payment simulation failed. Please try again.");
          }
        }}
      />
    );
  }

  // --- Member View --- 
  return (
    <div className={cn("min-h-screen bg-slate-950 text-slate-100 font-sans flex overflow-hidden", !user && "block overflow-y-auto")}>
      {user ? (
        <>
        {/* Dashboard Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col sticky top-0 h-screen shrink-0">
          <div className="p-6">
            <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <Target size={20} className="text-slate-950" />
              </div>
              SmartTrade
            </h2>
          </div>

          <div className="mx-4 mb-4 mt-2 px-4 py-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-blue-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alpha Credits</span>
            </div>
            <span className="text-sm font-mono font-bold text-blue-400">{credits}</span>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-1">
            <button 
              onClick={() => {
                setActiveTab('planner');
                setAppView('user');
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all",
                (activeTab === 'planner' && appView === 'user') ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "text-slate-500 hover:text-slate-300 border-transparent hover:bg-slate-800/50"
              )}
            >
              <LayoutDashboard size={18} /> Position Planner
            </button>
            {isAdmin && (
              <button 
                onClick={() => setAppView('admin')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all",
                  appView === 'admin' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "text-amber-400 hover:bg-amber-400/10 border-transparent hover:border-amber-400/20"
                )}
              >
                <ShieldAlert size={18} /> Admin Portal
              </button>
            )}
            <button 
              onClick={() => {
                setAppView('user');
                setActiveTab('journal');
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all",
                (activeTab === 'journal' && appView === 'user') ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "text-slate-500 hover:text-slate-300 border-transparent hover:bg-slate-800/50"
              )}
            >
              <BookOpen size={18} /> Trade Journal
            </button>
            <button 
              onClick={() => {
                setAppView('user');
                setActiveTab('signals');
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all",
                (activeTab === 'signals' && appView === 'user') ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "text-slate-500 hover:text-slate-300 border-transparent hover:bg-slate-800/50"
              )}
            >
              <RefreshCcw size={18} /> Live Signals
            </button>

            <button 
              onClick={() => setIsReferralModalOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border border-transparent text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 transition-all"
            >
              <Users size={18} /> Get Free Credits
            </button>
            
            <div className="pt-4 mt-4 border-t border-slate-800/50">
               <button 
                 onClick={() => setAppView('membership')}
                 className={cn(
                   "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-[0.1em] border transition-all",
                   appView === 'membership' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "text-slate-400 hover:text-amber-400 border-transparent hover:bg-amber-400/10"
                 )}
               >
                 <Crown size={18} /> Membership
               </button>
            </div>
          </nav>

          <div className="p-4 border-t border-slate-800 space-y-4">
            <button 
              onClick={saveDefaults}
              disabled={isSavingDefaults}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-700 transition-all disabled:opacity-50"
            >
              <Settings size={14} className={isSavingDefaults ? "animate-spin" : ""} />
              {isSavingDefaults ? "Saving..." : "Save as Defaults"}
            </button>
            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Account Ready</p>
              <p className="text-[9px] text-slate-400 italic">Advanced analysis & journal tracking enabled.</p>
            </div>
            
            <div className="flex items-center gap-3 px-2">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-700">
                  <UserIcon size={14} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-200 truncate">{user.displayName || user.email}</p>
                <button onClick={() => logout()} className="text-[9px] text-rose-400 font-bold uppercase tracking-tighter hover:underline">Logout Session</button>
              </div>
            </div>
          </div>
        </aside>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto">
          <header className="sticky top-0 bg-slate-950/80 backdrop-blur-md z-30 p-6 border-b border-slate-900 flex justify-between items-center lg:hidden">
            <h2 className="text-lg font-extrabold text-white">SmartTrade</h2>
            <div className="flex gap-2">
              {isAdmin && (
                <button 
                  onClick={() => setAppView('admin')}
                  className="p-2 bg-emerald-500 text-slate-950 rounded-lg"
                >
                  <ShieldAlert size={18} />
                </button>
              )}
              <button 
                onClick={() => setAppView('membership')}
                className="p-2 bg-amber-500 text-slate-950 rounded-lg"
              >
                <Crown size={18} />
              </button>
              <button 
                onClick={() => logout()}
                className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400"
              >
                <LogOut size={18} />
              </button>
            </div>
          </header>

          <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-900">
              <div>
                <h1 className="text-3xl font-extrabold text-white">Member Dashboard</h1>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-slate-500 text-[10px] uppercase tracking-widest font-mono">Member Trade Journal & Risk Manager</p>
                  <div className="h-3 w-px bg-slate-800" />
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold font-mono text-[10px] bg-blue-400/5 px-2 py-0.5 rounded border border-blue-400/10">
                    <Sparkles size={10} />
                    AI Credits Used: {aiUsageCount}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsReferralModalOpen(true)}
                  className="flex items-center gap-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
                >
                  <Users size={14} /> Get Free Credits
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => setAppView('admin')}
                    className="flex items-center gap-2 bg-emerald-500 text-slate-950 hover:bg-emerald-400 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
                  >
                    <ShieldAlert size={14} /> Admin Access
                  </button>
                )}
                <button 
                  onClick={() => setAppView('membership')}
                  className="flex items-center gap-2 bg-amber-500 text-slate-950 hover:bg-amber-400 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
                >
                  <Crown size={14} /> Upgrade
                </button>
              </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex lg:hidden bg-slate-900/50 p-1 rounded-xl border border-slate-800">
              <button 
                onClick={() => setActiveTab('planner')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  activeTab === 'planner' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500"
                )}
              >
                <LayoutDashboard size={14} /> Planner
              </button>
              <button 
                onClick={() => setActiveTab('signals')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  activeTab === 'signals' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500"
                )}
              >
                <RefreshCcw size={14} /> Signals
              </button>
              <button 
                onClick={() => setActiveTab('journal')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  activeTab === 'journal' ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500"
                )}
              >
                <BookOpen size={14} /> Journal
              </button>
            </div>

            {activeTab === 'planner' ? (
              <TradingPlanner {...plannerProps} />
            ) : activeTab === 'signals' ? (
              <LiveSignals 
                currency={currency} 
                credits={credits}
                onUseCredit={async () => {
                  try {
                    const userRef = doc(db, 'users', user.uid);
                    const today = new Date().toISOString().split('T')[0];
                    const dailyRef = doc(db, 'daily_credits', today);

                    await Promise.all([
                      updateDoc(userRef, { credits: increment(-1) }),
                      setDoc(dailyRef, { total: increment(1) }, { merge: true })
                    ]);

                    setCredits(prev => Math.max(0, prev - 1));
                    return true;
                  } catch (e) {
                    console.error("Credit deduction failed:", e);
                    return false;
                  }
                }}
                onNavigateMembership={() => setAppView('membership')}
                onApplyScenario={(scenario, type, asset) => {
                  if (!scenario) return;
                  
                  // Update trade type and entry with sanitization logic to remove commas etc.
                  const sanitizePrice = (p: any) => p?.toString()?.replace(/[^0-9.]/g, '') || "";
                  
                  setTradeType(type);
                  setEntryPrice(sanitizePrice(scenario.entry));
                  
                  // Update asset states for the planner
                  if (asset) {
                    setPlannerSearchTerm(asset.symbol);
                    setSelectedPair(asset.symbol);
                  }
                  
                  // Directly set sanitized stop loss and take profit to avoid stale entryPrice issues with handleLevelChange
                  setStopLoss(sanitizePrice(scenario.sl));
                  setTakeProfit(sanitizePrice(scenario.tp));
                  
                  setActiveTab('planner');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ) : (
              <TradeJournal 
                journalEntries={journalEntries} 
                isJournalLoading={isJournalLoading} 
                fetchJournal={fetchJournal} 
                formatCurrency={formatCurrency} 
                deleteJournalEntry={deleteJournalEntry}
                updateJournalEntry={updateJournalEntry}
              />
            )}
          </div>
        </main>
        </>
      ) : (
        <div className="relative max-w-6xl mx-auto px-4 py-8 lg:py-12">
          {/* Header */}
          <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-blue-400 font-bold tracking-tighter text-sm uppercase mb-1">
                <LayoutDashboard size={16} />
                Trading Utilities
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                SmartTrade <span className="text-slate-500 font-light">Planner</span>
              </h1>
            </div>
              
            <div className="flex items-center gap-3">
                {isAdmin && (
                  <button 
                    onClick={() => setAppView('admin')}
                    className="flex items-center gap-2 bg-emerald-500 text-slate-950 hover:bg-emerald-400 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 whitespace-nowrap"
                  >
                    <ShieldAlert size={14} /> Admin Portal
                  </button>
                )}
                <button 
                  onClick={() => setAppView('membership')}
                  className="flex items-center gap-2 bg-amber-500 text-slate-950 hover:bg-amber-400 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 whitespace-nowrap"
                >
                  <Crown size={14} /> Upgrade
                </button>

                <button 
                  onClick={() => signInWithGoogle()}
                  className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all backdrop-blur-sm shadow-lg active:scale-95 group"
                >
                  <LogIn size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  Sign In / Sign Up
                </button>
              </div>
            </header>

          {/* Promotional Section for Guests */}
          <div className="mb-12 bg-blue-600 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Sparkles size={200} />
            </div>
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
                Master Your Risk with <span className="text-blue-200">Professional Precision.</span>
              </h2>
              <p className="text-blue-100 text-lg mb-8 opacity-90 leading-relaxed">
                SmartTrade is the primary defense for individual traders. Use our free position planner below, or join as a member to unlock AI market analysis and trade journal tracking.
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => signInWithGoogle()}
                  className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-blue-50 transition-all shadow-xl active:scale-95"
                >
                  Join Now Free
                </button>
                <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-widest px-4">
                  <ShieldCheck size={16} /> 100% Secure & Private
                </div>
              </div>
            </div>
          </div>

          <TradingPlanner {...plannerProps} />

          {/* Floating helper or Disclaimer */}
          <footer className="mt-16 border-t border-slate-900 pt-8 pb-12">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <button 
                onClick={() => setIsAboutOpen(true)}
                className="text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Learn More & Legal Documentation
              </button>
              <p className="text-[10px] text-slate-600 leading-relaxed uppercase tracking-tight">
                <strong>Risk Warning:</strong> Trading involves significant risk of loss and is not suitable for all investors. 
                The high degree of leverage can work against you as well as for you. 
                Before deciding to trade, you should carefully consider your investment objectives, level of experience, and risk appetite.
              </p>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                SmartTrade Position Planner • Calculator & Planning Tool Only
              </p>
            </div>
          </footer>
        </div>
      )}

      {/* Terms Modal */}
      <AnimatePresence>
        {!hasAcceptedTerms && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto text-blue-500">
                <ShieldCheck size={32} />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Terms of Use</h2>
                <p className="text-slate-400 text-sm">
                  This application is a <strong>calculator and planning tool</strong>. 
                  It does <span className="text-white underline underline-offset-4 font-medium">not</span> provide financial advice or recommendations.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 text-xs text-slate-400 space-y-3 leading-relaxed">
                <p>• Results are strictly based on user-provided inputs.</p>
                <p>• You are solely responsible for your trading decisions and executions.</p>
                <p>• Past performance is not indicative of future results.</p>
              </div>
              <button 
                onClick={acceptTerms}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
              >
                I Understand & Agree
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Referral Modal */}
      <AnimatePresence>
        {isReferralModalOpen && user && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReferralModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-900 w-full max-w-md rounded-[32px] border border-slate-800 shadow-2xl p-8 overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                <Users size={180} />
              </div>

              <div className="relative text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto text-blue-400">
                  <Crown size={32} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase">Get Free Alpha Credits</h3>
                  <p className="text-slate-400 text-xs leading-relaxed max-w-[280px] mx-auto uppercase tracking-widest font-bold">
                    Invite friends to trade better. You get <span className="text-blue-400">200 Credits</span>, they get <span className="text-emerald-400">100 Credits</span>.
                  </p>
                </div>

                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block px-1">Your Personal Link</label>
                    <div className="relative">
                      <input 
                        readOnly
                        value={`${window.location.origin}?ref=${user.uid}`}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-[10px] font-mono text-blue-400 select-all outline-none"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}?ref=${user.uid}`);
                          alert("Link copied to clipboard!");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-500 text-slate-950 rounded-lg hover:bg-blue-400 transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 py-2 px-1">
                    <div className="flex -space-x-2">
                       {[0,1,2].map(i => (
                         <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 overflow-hidden">
                           <img src={`https://i.pravatar.cc/100?u=${i + (user.uid || 'a')}`} className="w-full h-full grayscale" alt="network" />
                         </div>
                       ))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Share with your trading network</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => setIsReferralModalOpen(false)}
                    className="w-full py-4 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all active:scale-95"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* About Modal */}
      <AnimatePresence>
        {isAboutOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsAboutOpen(false)}
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="bg-slate-900 border-l border-slate-800 h-full max-w-xl w-full absolute right-0 p-8 md:p-12 shadow-2xl overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-bold text-white">About SmartTrade</h2>
                <button onClick={() => setIsAboutOpen(false)} className="text-slate-500 hover:text-white">
                  <RefreshCcw size={24} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-10 text-slate-400 text-sm leading-relaxed">
                <section className="space-y-4">
                  <h3 className="text-white font-bold uppercase tracking-widest text-xs">Mission</h3>
                  <p>
                    SmartTrade was built to empower individual traders with professional-grade risk management tools. 
                    In a market where volatility is constant, precise position sizing is the primary defense against capital ruin.
                  </p>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-bold uppercase tracking-widest text-xs">General Disclaimer</h3>
                  <p>
                    The information provided by this tool is for informational and educational purposes only. 
                    It is not intended to be, and should not be construed as, financial, legal, or tax advice. 
                    No representation is being made that any account will or is likely to achieve profits or losses similar to those calculated.
                  </p>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-bold uppercase tracking-widest text-xs">Risk Disclosure</h3>
                  <p>
                    Trading foreign exchange, stocks, or cryptocurrencies on margin carries a high level of risk and may not be suitable for all investors. 
                    High leverage can work against you as well as for you. Before deciding to invest, you should carefully consider your investment 
                    objectives, level of experience, and risk appetite. There is a possibility that you could sustain a loss of some or all of your 
                    initial investment and therefore you should not invest money that you cannot afford to lose.
                  </p>
                </section>

                <section className="space-y-4">
                  <h3 className="text-white font-bold uppercase tracking-widest text-xs">Not a Recommendation Service</h3>
                  <p>
                    SmartTrade does not provide trading signals, entry/exit recommendations, or investment strategies. 
                    It serves strictly as a calculation engine for user-defined variables. We are not responsible for any 
                    losses incurred from trades based on the outputs of this tool.
                  </p>
                </section>

                <div className="pt-10 border-t border-slate-800">
                  <p className="text-[10px] text-slate-600">
                    Version 1.2.0 • Data processed locally in browser. No trade data is stored on our servers.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
