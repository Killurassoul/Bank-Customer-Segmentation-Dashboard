import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Target,
  LineChart,
  Search,
  Building,
  Sliders,
  PlayCircle,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  RefreshCw,
  Sun,
  Moon
} from 'lucide-react';

import { generateCustomerData } from './data';
import { processSegmentation, computeCorrelationMatrix } from './clustering';
import {
  Scatter2DPlot,
  DistributionDonut,
  RadarProfiles,
  GroupedBarPlot,
  ElbowPlot,
  SilhouetteBarPlot,
  CorrelationHeatmap,
  IndividualRadarCompare,
  SEGMENT_COLORS,
  formatFCFA
} from './components/Charts';
import { Customer } from './types';

export default function App() {
  // -----------------------------------------------------------------------------
  // 🌍 STATE SUITE
  // -----------------------------------------------------------------------------
  const [k, setK] = useState<number>(5);
  const [projectionMethod, setProjectionMethod] = useState<'PCA' | 't-SNE'>('PCA');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'profiles' | 'evaluation' | 'explorer'>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [explorerFilterCluster, setExplorerFilterCluster] = useState<string>('All Selected');
  const [activeFeatureField, setActiveFeatureField] = useState<string>('annual_income');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(10001);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  // -----------------------------------------------------------------------------
  // ⏱️ REAL-TIME ANIMATION TICKER HOOK (For dynamic floating/bobbing elements)
  // -----------------------------------------------------------------------------
  const [animationTime, setAnimationTime] = useState(0);

  useEffect(() => {
    let animFrameId: number;
    let lastTime = performance.now();
    
    const updateTick = () => {
      const now = performance.now();
      const elapsed = (now - lastTime) / 1000;
      setAnimationTime(prev => prev + elapsed);
      animFrameId = requestAnimationFrame(updateTick);
    };
    
    animFrameId = requestAnimationFrame(updateTick);
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  // Load static 300 customers dataset once
  const rawCustomers = useMemo(() => generateCustomerData(), []);

  // Compute live segmentation (K-Means, PCA, Silhouette, elbow benchmarks, summaries)
  const { clustered, avgSilhouette, wcss, elbowPoints, summaries } = useMemo(() => {
    return processSegmentation(rawCustomers, k);
  }, [rawCustomers, k]);

  // Sync segment toggles when target cluster volume (k) changes
  const segmentNamesList = useMemo(() => summaries.map(s => s.cluster_name), [summaries]);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);

  useEffect(() => {
    setSelectedSegments(segmentNamesList);
  }, [segmentNamesList]);

  // Handle segment checkbox toggles
  const handleToggleSegment = (name: string) => {
    if (selectedSegments.includes(name)) {
      if (selectedSegments.length > 1) { // Guard against empty selections
        setSelectedSegments(selectedSegments.filter(s => s !== name));
      }
    } else {
      setSelectedSegments([...selectedSegments, name]);
    }
  };

  // Filter dataset based on checked sidebar categories
  const filteredCustomers = useMemo(() => {
    return clustered.filter(c => selectedSegments.includes(c.cluster_name));
  }, [clustered, selectedSegments]);

  // Find dominant segment metrics safely
  const dominantSegment = useMemo(() => {
    if (filteredCustomers.length === 0) return null;
    const counts: { [key: string]: number } = {};
    filteredCustomers.forEach(c => {
      counts[c.cluster_name] = (counts[c.cluster_name] || 0) + 1;
    });
    let maxName = '';
    let maxCount = -1;
    Object.entries(counts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxName = name;
      }
    });
    return { name: maxName, count: maxCount };
  }, [filteredCustomers]);

  // Dynamic metrics stats calculator (mean ± standard deviation) for profile grids
  const segmentStatsTable = useMemo(() => {
    return summaries.map(s => {
      const sub = clustered.filter(c => c.cluster === s.cluster);

      const meanSqDiff = (field: 'age' | 'annual_income' | 'spending_score' | 'credit_score' | 'account_balance' | 'num_products' | 'tenure_years', mean: number) => {
        const variance = sub.reduce((acc, c) => acc + Math.pow(c[field] - mean, 2), 0) / (sub.length || 1);
        return Math.sqrt(variance);
      };

      return {
        name: s.cluster_name,
        size: s.size,
        color: s.color,
        ageMean: s.avg_age,
        ageStd: meanSqDiff('age', s.avg_age),
        incomeMean: s.avg_income,
        incomeStd: meanSqDiff('annual_income', s.avg_income),
        spendingMean: s.avg_spending,
        spendingStd: meanSqDiff('spending_score', s.avg_spending),
        creditMean: s.avg_credit,
        creditStd: meanSqDiff('credit_score', s.avg_credit),
        balanceMean: s.avg_balance,
        balanceStd: meanSqDiff('account_balance', s.avg_balance),
        productsMean: s.avg_products,
        productsStd: meanSqDiff('num_products', s.avg_products)
      };
    });
  }, [summaries, clustered]);

  // Core features of selection
  const featureList = [
    { key: 'annual_income', label: 'Revenu Annuel' },
    { key: 'account_balance', label: 'Solde du Compte' },
    { key: 'spending_score', label: 'Score de Dépenses' },
    { key: 'credit_score', label: 'Score de Crédit' },
    { key: 'age', label: 'Âge' },
    { key: 'num_products', label: 'Nombre de Produits' },
    { key: 'tenure_years', label: 'Ancienneté (Années)' }
  ];

  const activeFeatureLabel = useMemo(() => {
    return featureList.find(f => f.key === activeFeatureField)?.label || '';
  }, [activeFeatureField]);

  // Correlation matrix cache
  const correlationOutput = useMemo(() => computeCorrelationMatrix(), []);

  // Filter customer Explorer values dynamically
  const explorerCustomers = useMemo(() => {
    let result = filteredCustomers;
    if (explorerFilterCluster !== 'All Selected') {
      result = result.filter(c => c.cluster_name === explorerFilterCluster);
    }
    if (searchQuery.trim() !== '') {
      result = result.filter(c => c.customer_id.toString().includes(searchQuery.trim()));
    }
    return result;
  }, [filteredCustomers, explorerFilterCluster, searchQuery]);

  // Select first customer as fallback when active array shifts
  useEffect(() => {
    if (explorerCustomers.length > 0) {
      const ids = explorerCustomers.map(c => c.customer_id);
      if (!ids.includes(selectedCustomerId)) {
        setSelectedCustomerId(ids[0]);
      }
    }
  }, [explorerCustomers, selectedCustomerId]);

  // Active customer handle
  const activeCustomerRecord = useMemo(() => {
    return clustered.find(c => c.customer_id === selectedCustomerId) || clustered[0];
  }, [clustered, selectedCustomerId]);

  const activeCustomerSummaryGroup = useMemo(() => {
    if (!activeCustomerRecord) return summaries[0];
    return summaries.find(s => s.cluster === activeCustomerRecord.cluster) || summaries[0];
  }, [summaries, activeCustomerRecord]);

  return (
    <div className={`min-h-screen relative ${themeMode === 'dark' ? 'bg-[#0A0E1A] text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans antialiased transition-colors duration-200`}>
      {/* 🇸🇳 Sénégal Header Flag Band */}
      <div className="w-full h-1.5 flex select-none relative z-50">
        <div className="flex-1 bg-emerald-600" />
        <div className="flex-1 bg-amber-500" />
        <div className="flex-1 bg-rose-600" />
      </div>

      {/* 🇸🇳 Senegal Ambient Floating Mesh Glows (subtle backdrop) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 z-0">
        <div className="absolute top-[-10%] left-[5%] w-[45vw] h-[45vw] rounded-full bg-emerald-700/10 blur-[130px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[40%] right-[10%] w-[40vw] h-[40vw] rounded-full bg-yellow-600/5 blur-[120px] animate-pulse" style={{ animationDuration: '11s' }} />
        <div className="absolute bottom-[-10%] left-[25%] w-[45vw] h-[45vw] rounded-full bg-red-700/5 blur-[140px] animate-pulse" style={{ animationDuration: '9s' }} />
      </div>

      {/* Space Grotesk elegant font injector */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        .font-space { font-family: 'Space Grotesk', sans-serif; }
      `}</style>

      {/* Main container layout split: Sidebar left (compact desktop standard), Main dashboard right */}
      <div className="flex flex-col lg:flex-row min-h-screen relative z-10">
        
        {/* ==========================================
            🎛️ SIDEBAR COHESIVE CONTROLS VIEW
           ========================================== */}
        <aside className={`lg:w-[320px] flex-shrink-0 border-b lg:border-b-0 lg:border-r p-6 flex flex-col justify-between ${themeMode === 'dark' ? 'bg-[#0D1224] border-[#00D4FF22]' : 'bg-white border-slate-200'}`}>
          <div className="space-y-6">
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-white/5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-tr from-emerald-600 via-amber-500 to-rose-600 font-bold text-white text-sm select-none shadow">
                🇸🇳
              </div>
              <span className="text-lg font-bold tracking-tight text-white font-space">TERANGA<span className="text-[#00D4FF]">SEG</span></span>
            </div>

            {/* Slider control */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#00D4FF]" /> Nombre de Segments (k)
                </span>
                <span className="text-[#00D4FF] font-mono font-bold bg-[#00D4FF11] px-2 py-0.5 rounded border border-[#00D4FF]/20">
                  {k}
                </span>
              </div>
              <input
                id="cluster-k-slider"
                type="range"
                min="2"
                max="10"
                value={k}
                onChange={(e) => setK(parseInt(e.target.value))}
                className="w-full accent-[#00D4FF] cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 leading-normal">
                Modifie dynamiquement l'algorithme de partition K-Means pour regrouper les profils clients.
              </p>
            </div>

            {/* Projection Selector */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00D4FF]" /> Méthode de Projection
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProjectionMethod('PCA')}
                  className={`flex-1 py-1.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    projectionMethod === 'PCA'
                      ? 'bg-[#1A1F35] border border-[#00D4FF] text-[#00D4FF]'
                      : 'bg-[#0A0E1A] border border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  PCA
                </button>
                <button
                  type="button"
                  onClick={() => setProjectionMethod('t-SNE')}
                  className={`flex-1 py-1.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    projectionMethod === 't-SNE'
                      ? 'bg-[#1A1F35] border border-[#00D4FF] text-[#00D4FF]'
                      : 'bg-[#0A0E1A] border border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  t-SNE
                </button>
              </div>
            </div>

            {/* Segment isolation filters checklist */}
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-[#00D4FF]" /> Filtrer les Segments ({selectedSegments.length})</span>
              <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                {segmentNamesList.map((name, idx) => {
                  const sColor = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
                  const isChecked = selectedSegments.includes(name);

                  return (
                    <label key={name} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/30 hover:bg-slate-900/50 cursor-pointer select-none text-xs border border-white/5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSegment(name)}
                        className="rounded accent-[#00D4FF] cursor-pointer w-3.5 h-3.5"
                      />
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: sColor }}></span>
                      <span className="text-slate-200 truncate font-medium">{name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Theme switcher */}
            <div className="space-y-2 pt-4 border-t border-white/5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">Thème Graphique</span>
              <div className="flex rounded-lg bg-slate-950 p-1 border border-white/5">
                <button
                  onClick={() => setThemeMode('dark')}
                  className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 text-[11px] font-medium rounded-md transition-colors ${themeMode === 'dark' ? 'bg-[#19203a] text-[#00D4FF] font-bold' : 'text-slate-400'}`}
                >
                  <Sun className="w-3 h-3" /> Sombre Cosmique
                </button>
                <button
                  onClick={() => setThemeMode('light')}
                  className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 text-[11px] font-medium rounded-md transition-colors ${themeMode === 'light' ? 'bg-white text-cyan-600 font-bold shadow-sm' : 'text-slate-400'}`}
                >
                  <Moon className="w-3 h-3" /> Clair Pur
                </button>
              </div>
            </div>
          </div>

          {/* Model Status Box & Footer branding */}
          <div className="mt-6 pt-4 border-t border-white/5 space-y-4">
            <div className="p-3 bg-[#1A1F35] rounded-lg border border-[#00D4FF22]">
              <p className="text-[10px] text-[#FFB800] uppercase font-bold mb-1">Algorithme K-Means</p>
              <p className="text-xs text-white">Prêt • k={k} Optimisé</p>
            </div>
            <div className="text-center leading-normal">
              <p className="text-[10px] text-[#00D4FF]/60 font-mono tracking-wider font-semibold uppercase">SUITE BANKSEG</p>
              <p className="text-[9px] text-gray-600 mt-0.5">Replica Streamlit Live</p>
            </div>
          </div>
        </aside>

        {/* ==========================================
            💎 MAIN BODY SUITE (Tabs Controller)
           ========================================== */}
        <main className="flex-1 p-6 lg:p-8 space-y-6 overflow-x-hidden">
          
          {/* Header block info banner */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-bold font-space tracking-tight text-white flex items-center gap-2">
                  <span className="text-[#00D4FF]">🔮</span> Segmentation Clients • SÉNÉGAL 🇸🇳
                </h2>
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold uppercase select-none">PORTFEUILLE F CFA ACTIF</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Plateforme d'aide à la décision du Sénégal analysant les comportements d'épargne avec partitionnement K-Means et projections 2D (PCA / t-SNE).
              </p>
            </div>
            
            {/* Sidebar inline help tooltip details */}
            <div className="flex items-center gap-2.5 p-2.5 bg-[#1A1F35] border border-[#00D4FF22] rounded-lg text-xs max-w-[340px]">
              <Info className="w-5 h-5 text-[#00D4FF] flex-shrink-0" />
              <p className="text-[10px] text-slate-400 leading-normal">
                <strong>Code Python disponible :</strong> Retrouvez le script Streamlit Python original à la racine du projet (<code className="text-[#FFB800]">bank_segmentation/</code>).
              </p>
            </div>
          </div>

          {/* 🏷️ CUSTOM TABS SELECTOR (Cloned from Streamlit st.tabs with active teal line markers) */}
          <div className="flex border-b border-[#00D4FF11] gap-1 overflow-x-auto select-none">
            {[
              { id: 'overview', label: '📈 Vue d\'Ensemble' },
              { id: 'profiles', label: '👥 Profils des Segments' },
              { id: 'evaluation', label: '🧪 Évaluation Modèle' },
              { id: 'explorer', label: '🔍 Explorateur Clients' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as 'overview' | 'profiles' | 'evaluation' | 'explorer')}
                className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider font-space border-b-2 transition-all cursor-pointer whitespace-nowrap outline-none ${selectedTab === tab.id ? 'border-[#00D4FF] text-[#00D4FF] font-bold bg-[#00D4FF]/10' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ========================================================
              TAB 1: OVERVIEW PANEL
             ======================================================== */}
          <AnimatePresence mode="wait">
            {selectedTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 25 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -25 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-6"
              >
              
              {/* Highlight Metrics Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Metric 1 */}
                <div className="p-4 rounded-xl bg-[#1A1F35] border border-[#00D4FF22] shadow-lg flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Clients Analysés</p>
                    <h4 className="text-2xl font-bold font-space text-[#00D4FF]">{filteredCustomers.length}</h4>
                    <p className="text-[9px] text-[#00D4FF]/60 font-mono">Moteur de Données en Mémoire</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#00D4FF]/10 flex items-center justify-center text-[#00D4FF] border border-[#00D4FF]/20">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="p-4 rounded-xl bg-[#1A1F35] border border-[#00D4FF22] shadow-lg flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Segments Actifs (k)</p>
                    <h4 className="text-2xl font-bold font-space text-[#00D4FF]">{k}</h4>
                    <p className="text-[9px] text-slate-400 font-mono font-space">Partition dynamique K-Means</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#00D4FF]/10 flex items-center justify-center text-[#00D4FF] border border-[#00D4FF]/20">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="p-4 rounded-xl bg-[#1A1F35] border border-[#00D4FF22] shadow-lg flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Indice de Silhouette Moyen</p>
                    <h4 className="text-2xl font-bold font-space text-[#00D4FF]">{avgSilhouette.toFixed(3)}</h4>
                    <p className="text-[9px] text-slate-400 font-mono">Cohésion de la partition</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#00D4FF]/10 flex items-center justify-center text-[#00D4FF] border border-[#00D4FF]/20">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="p-4 rounded-xl bg-[#1A1F35] border border-[#00D4FF22] shadow-lg flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Segment Majoritaire</p>
                    <h4 className="text-2xl font-bold font-space text-[#00D4FF]">{dominantSegment?.count || 0} comptes</h4>
                    <p className="text-[10px] text-[#FFB800] font-bold truncate max-w-[170px]">{dominantSegment?.name || 'N/A'}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#00D4FF]/10 flex items-center justify-center text-[#00D4FF] border border-[#00D4FF]/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* Main Overview Graphics Block */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 2D Projection visual map (left column) */}
                <div className="lg:col-span-8 h-full">
                  <Scatter2DPlot
                    key={`scatter-${projectionMethod}-${k}`}
                    data={filteredCustomers}
                    method={projectionMethod}
                    animationTime={animationTime}
                  />
                </div>

                {/* Donut distribution indicators (right column) */}
                <div className="lg:col-span-4 h-full">
                  <DistributionDonut
                    key={`donut-${k}`}
                    summaries={summaries}
                  />
                </div>

              </div>

            </motion.div>
          )}

          {/* ========================================================
              TAB 2: CLUSTER PROFILES PANEL
             ======================================================== */}
          {selectedTab === 'profiles' && (
            <motion.div
              key="profiles"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Spider/Radar features overlays */}
                <div className="lg:col-span-7">
                  <RadarProfiles
                    key={`radar-${k}`}
                    summaries={summaries}
                    customers={filteredCustomers}
                    animationTime={animationTime}
                  />
                </div>

                {/* Contrast bar curves with active dropdown toggle */}
                <div className="lg:col-span-5 flex flex-col space-y-4">
                  <div className="p-4 rounded-xl bg-[#1A1F35] border border-[#00D4FF11] space-y-2">
                    <label htmlFor="feature-profile-select" className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Sélectionnez la variable de comparaison :</label>
                    <select
                      id="feature-profile-select"
                      value={activeFeatureField}
                      onChange={(e) => setActiveFeatureField(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-[#00D4FF33] text-white outline-none font-bold focus:border-[#00D4FF]"
                    >
                      {featureList.map(feat => (
                        <option key={feat.key} value={feat.key}>{feat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1">
                    <GroupedBarPlot
                      key={`grouped-bar-${k}-${activeFeatureField}`}
                      summaries={summaries}
                      activeField={activeFeatureField}
                      activeLabel={activeFeatureLabel}
                    />
                  </div>
                </div>

              </div>

              {/* Comprehensive Segment cohorts mean statistics database table listing */}
              <div className="rounded-xl p-5 bg-[#1A1F35] border border-[#00D4FF22] backdrop-blur-md space-y-4">
                <div>
                  <h3 className="text-white font-medium text-base mb-1 font-space">Statistiques Moyennes Comparatives (Moyenne ± Écart-Type)</h3>
                  <p className="text-xs text-slate-400">Rapport complet des indicateurs et descripteurs clés calculés par segment clientèle.</p>
                </div>

                <div className="overflow-x-auto rounded-lg border border-white/5">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="bg-slate-950 text-[10px] uppercase text-gray-400 border-b border-white/10">
                        <th className="p-3">Groupe de Cohorte / Segment</th>
                        <th className="p-3 text-center">Effectif du Segment</th>
                        <th className="p-3 text-center">Âge Moyen</th>
                        <th className="p-3 text-center">Revenu Annuel</th>
                        <th className="p-3 text-center">Solde Compte</th>
                        <th className="p-3 text-center">Indice Dépenses (0-100)</th>
                        <th className="p-3 text-center">Score de Crédit</th>
                        <th className="p-3 text-center">Produits Souscrits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {segmentStatsTable.map((seg) => (
                        <tr key={seg.name} className="hover:bg-slate-900/40 select-none">
                          <td className="p-3 font-semibold text-white flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: seg.color }}></span>
                            {seg.name}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-[#00D4FF]">{seg.size} clients</td>
                          <td className="p-3 text-center font-mono text-gray-300">{seg.ageMean.toFixed(1)} <span className="text-[10px] text-gray-500">±{seg.ageStd.toFixed(1)}</span></td>
                          <td className="p-3 text-center font-mono font-semibold text-amber-500">{formatFCFA(seg.incomeMean)} <span className="text-[9px] text-gray-500 font-normal font-mono">±{formatFCFA(seg.incomeStd)}</span></td>
                          <td className="p-3 text-center font-mono font-bold text-green-400">{formatFCFA(seg.balanceMean)} <span className="text-[9px] text-gray-500 font-normal font-mono">±{formatFCFA(seg.balanceStd)}</span></td>
                          <td className="p-3 text-center font-mono text-gray-300">{seg.spendingMean.toFixed(1)} <span className="text-[10px] text-gray-500">±{seg.spendingStd.toFixed(1)}</span></td>
                          <td className="p-3 text-center font-mono text-gray-300">{Math.round(seg.creditMean)} FICO <span className="text-[10px] text-gray-500">±{seg.creditStd.toFixed(0)}</span></td>
                          <td className="p-3 text-center font-mono text-gray-300">{seg.productsMean.toFixed(1)} <span className="text-[10px] text-gray-500">±{seg.productsStd.toFixed(1)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}

          {/* ========================================================
              TAB 3: MODEL EVALUATION PANEL
             ======================================================== */}
          {selectedTab === 'evaluation' && (
            <motion.div
              key="evaluation"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* WCSS elbows */}
                <ElbowPlot
                  key={`elbow-${k}`}
                  points={elbowPoints}
                  currentK={k}
                />

                {/* Silhouette index bar */}
                <SilhouetteBarPlot
                  key={`silhouette-${k}`}
                  summaries={summaries}
                />

              </div>

              {/* Feature linear correlation heatmap matrix */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                <div className="md:col-span-8">
                  <CorrelationHeatmap
                    key={`heatmap-${k}`}
                    matrix={correlationOutput.matrix}
                    labels={correlationOutput.labels}
                  />
                </div>

                <div className="md:col-span-4 rounded-xl p-5 bg-[#1A1F35] border border-[#00D4FF22] flex flex-col justify-between">
                  <div>
                    <h3 className="text-white font-medium text-base mb-2 font-space">Rapport de Qualité Modèle</h3>
                    <div className="space-y-2 mt-4 text-xs tracking-normal leading-relaxed text-slate-300">
                      <p>
                        La partition client courante est calculée avec <strong>k = {k} centroïdes</strong>.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 mt-2 text-slate-400">
                        <li><strong>Silhouette Globale :</strong> <span className="text-[#00D4FF] font-mono font-bold">{avgSilhouette.toFixed(4)}</span></li>
                        <li><strong>Inertie Intra-Classe (WCSS) :</strong> <span className="text-[#FFB800] font-mono font-bold">{Math.round(wcss).toLocaleString()}</span></li>
                      </ul>
                      <p className="mt-3 text-slate-400">
                        Une structure idéale maximise la silhouette globale et sépare distinctement les nuages de points. Utilisez les légendes de score de silhouette ci-dessus pour identifier les segments plus diffus.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800 text-[10px] text-gray-500 font-mono">
                    Indicateurs mathématiques calculés instantanément à l'aide d'un moteur vectoriel JavaScript.
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* ========================================================
              TAB 4: CUSTOMER EXPLORER PANEL
             ======================================================== */}
          {selectedTab === 'explorer' && (
            <motion.div
              key="explorer"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              
              <div className="p-4 rounded-xl bg-[#1A1F35] border border-[#00D4FF22]">
                <h4 className="text-sm font-space font-semibold text-white uppercase tracking-wider mb-3">🔍 Exploration de la Base de Données Clients</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search text inputs */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      id="customer-search-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher un ID Client (ex: 10001)..."
                      className="w-full p-2 pl-9 text-xs font-semibold rounded-lg bg-slate-900 border border-white/10 focus:ring-1 focus:ring-[#00D4FF] outline-none text-white"
                    />
                  </div>

                  {/* Quick segment isolation filter */}
                  <div>
                    <select
                      id="segment-explorer-select"
                      value={explorerFilterCluster}
                      onChange={(e) => setExplorerFilterCluster(e.target.value)}
                      className="w-full p-2 text-xs font-semibold rounded-lg bg-slate-900 border border-white/10 focus:ring-1 focus:ring-[#00D4FF] outline-none text-white"
                    >
                      <option value="All Selected">Filtre Rapide : Tous les Segments</option>
                      {segmentNamesList.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Informative counts details */}
                  <div className="text-right flex items-center justify-end text-xs text-slate-400 font-mono pr-2">
                    Résultats : <span className="text-[#00D4FF] font-semibold px-1.5">{explorerCustomers.length}</span> sur {filteredCustomers.length} comptes
                  </div>
                </div>
              </div>

              {/* Data display columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Scrollable visual grid list */}
                <div className="lg:col-span-7 rounded-xl bg-[#1A1F35] border border-[#00D4FF1F] backdrop-blur-md overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-950/20">
                    <h5 className="text-xs font-space font-semibold uppercase tracking-wider text-slate-300">📁 Comptes de la Cohorte Sélectionnée</h5>
                    <span className="text-[10px] text-gray-500 font-mono">L'ID couleur correspond au segment assigné</span>
                  </div>

                  <div className="max-h-[460px] overflow-y-auto overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-[10px] uppercase text-gray-400 border-b border-white/10 sticky top-0 z-10">
                          <th className="p-3">Numéro Client</th>
                          <th className="p-3">Segment Assigné</th>
                          <th className="p-3">Revenu Annuel</th>
                          <th className="p-3">Solde Compte</th>
                          <th className="p-3 text-center">Âge</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {explorerCustomers.map((cust) => {
                          const isActive = cust.customer_id === selectedCustomerId;
                          
                          // Custom row background color highlights based on cluster index
                          const groupBgs = [
                            'hover:bg-blue-950/20',
                            'hover:bg-amber-950/20',
                            'hover:bg-emerald-950/20',
                            'hover:bg-pink-950/20',
                            'hover:bg-purple-950/20',
                            'hover:bg-red-950/20',
                            'hover:bg-cyan-950/20',
                            'hover:bg-teal-950/20',
                            'hover:bg-orange-950/20'
                          ];
                          const activeRowBg = [
                            'bg-blue-950/45 border-l-2 border-blue-500',
                            'bg-amber-950/45 border-l-2 border-amber-500',
                            'bg-emerald-950/45 border-l-2 border-emerald-500',
                            'bg-pink-950/45 border-l-2 border-pink-500',
                            'bg-purple-950/45 border-l-2 border-purple-500',
                            'bg-red-950/45 border-l-2 border-red-500',
                            'bg-cyan-950/45 border-l-2 border-cyan-500',
                            'bg-teal-950/45 border-l-2 border-teal-500',
                            'bg-orange-950/45 border-l-2 border-orange-500'
                          ];

                          const bgClass = isActive 
                            ? activeRowBg[cust.cluster % activeRowBg.length]
                            : `${groupBgs[cust.cluster % groupBgs.length]} cursor-pointer transition-colors`;

                          return (
                            <tr
                              key={cust.customer_id}
                              onClick={() => setSelectedCustomerId(cust.customer_id)}
                              className={bgClass}
                            >
                              <td className="p-3 font-semibold font-mono tracking-wide text-white">#{cust.customer_id}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: SEGMENT_COLORS[cust.cluster % SEGMENT_COLORS.length] }}></span>
                                  <span className="font-medium truncate max-w-[130px]">{cust.cluster_name}</span>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-amber-400 font-semibold">{formatFCFA(cust.annual_income)}</td>
                              <td className="p-3 font-mono text-green-400 font-semibold">{formatFCFA(cust.account_balance)}</td>
                              <td className="p-3 text-center font-mono text-gray-300">{cust.age} ans</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Account Detail Inspector Card */}
                <div className="lg:col-span-5 space-y-4">
                  {activeCustomerRecord && (
                    <div className="rounded-xl p-5 bg-[#1A1F35] border border-[#00D4FF22] shadow-2xl space-y-4">
                      
                      {/* Blueprint Header */}
                      <div className="pb-3 border-b border-white/5 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none">Fiche Client Sélectionné</p>
                          <h4 className="text-lg font-bold font-space text-[#00D4FF] mt-1">Client ID #{activeCustomerRecord.customer_id}</h4>
                        </div>
                        <span className="text-[10px] px-2.5 py-1 rounded bg-[#10b981]/20 text-emerald-400 font-mono font-bold leading-none select-none border border-emerald-500/20">SCORE FICO OK</span>
                      </div>

                      {/* Info metrics table */}
                      <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                          <span className="text-gray-400 font-medium">Segment Client Assigné :</span>
                          <span className="font-bold text-white tracking-wide">{activeCustomerRecord.cluster_name}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                          <span className="text-gray-400 font-medium">Revenu Annuel :</span>
                          <span className="font-semibold text-amber-500 font-mono">{formatFCFA(activeCustomerRecord.annual_income)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                          <span className="text-gray-400 font-medium">Solde Courant Compte :</span>
                          <span className="font-bold text-green-400 font-mono">{formatFCFA(activeCustomerRecord.account_balance)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                          <span className="text-gray-400 font-medium">Évaluation de Crédit (FICO) :</span>
                          <span className="font-semibold text-white font-mono">{activeCustomerRecord.credit_score} points</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                          <span className="text-gray-400 font-medium">Indice de Dépenses :</span>
                          <span className="font-semibold text-red-400 font-mono">{activeCustomerRecord.spending_score} / 100</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                          <span className="text-gray-400 font-medium">Âge de l'assuré :</span>
                          <span className="font-medium text-white font-mono">{activeCustomerRecord.age} ans</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
                          <span className="text-gray-400 font-medium">Produits Bancaires Actifs :</span>
                          <span className="font-medium text-white font-mono">{activeCustomerRecord.num_products} produits</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-gray-400 font-medium">Ancienneté Relationnelle :</span>
                          <span className="font-medium text-white font-mono">{activeCustomerRecord.tenure_years} ans d'ancienneté</span>
                        </div>
                      </div>

                      {/* Direct comparative spider chart comparison visual overlay */}
                      {activeCustomerSummaryGroup && (
                        <div className="pt-2 border-t border-white/5">
                          <IndividualRadarCompare
                            key={`individual-radar-${k}-${activeCustomerRecord.customer_id}`}
                            customer={activeCustomerRecord}
                            summary={activeCustomerSummaryGroup}
                            animationTime={animationTime}
                          />
                        </div>
                      )}

                    </div>
                  )}
                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>

        </main>

      </div>
    </div>
  );
}
