import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Customer, ClusterSummary } from '../types';
import { SH_FEATURES } from '../clustering';

export const formatFCFA = (euros: number): string => {
  const cfa = Math.round(euros * 655.957);
  return `${cfa.toLocaleString('fr-FR')} F CFA`;
};

const SimpleExplainer: React.FC<{
  title: string;
  explanation: string;
  illustration: React.ReactNode;
}> = ({ title, explanation, illustration }) => {
  const [show, setShow] = useState(true);
  return (
    <div className="mt-4 overflow-hidden rounded-lg bg-[#0F1423] border-l-4 border-l-[#15803d] border border-[#00D4FF11] p-3 transition-all duration-300 text-left">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold font-space text-[#00D4FF] uppercase tracking-wider">
          🇸🇳 Guide & Illustration Simplifiée
        </span>
        <button
          onClick={() => setShow(!show)}
          className="text-[9px] font-mono tracking-wider bg-[#00D4FF11] hover:bg-[#00D4FF22] border border-[#00D4FF33] px-2 py-0.5 rounded text-[#00D4FF] focus:outline-none transition-all cursor-pointer"
        >
          {show ? "Réduire" : "Développer"}
        </button>
      </div>
      {show && (
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-[#1A1F35] rounded-lg border border-white/5 shadow-inner">
            {illustration}
          </div>
          <div className="text-[11px] text-slate-300 leading-relaxed flex-1">
            <span className="font-bold text-[#FFB800] block mb-0.5 font-space">{title}</span>
            {explanation}
          </div>
        </div>
      )}
    </div>
  );
};


// Colors for consistent segment presentation
export const SEGMENT_COLORS = [
  '#00D4FF', // Sleek Cyan
  '#FFB800', // Gold
  '#D946EF', // Fuchsia / Pink
  '#34D399', // Emerald
  '#F43F5E', // Rose
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Darker Cyan
  '#14B8A6', // Teal
  '#6B7280'  // Slate
];

interface BaseChartProps {
  summaries: ClusterSummary[];
}

/**
 * 2D Dimensional Projection Scatter Plot
 */
interface Scatter2DPlotProps {
  data: Customer[];
  method: 'PCA' | 't-SNE';
  animationTime?: number;
}

export const Scatter2DPlot: React.FC<Scatter2DPlotProps> = ({ data, method, animationTime }) => {
  const [hoveredNode, setHoveredNode] = useState<Customer | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (data.length === 0) {
    return (
      <div className="h-[430px] rounded-xl flex items-center justify-center bg-[#1A1F35] border border-[#00D4FF11] text-gray-400">
        Aucun client visible à afficher.
      </div>
    );
  }

  // Find min/max coordinate ranges to scale automatically inside 100% SVG viewport
  const coordsX = data.map(c => method === 'PCA' ? c.pca_1 : c.tsne_1);
  const coordsY = data.map(c => method === 'PCA' ? c.pca_2 : c.tsne_2);

  const minX = Math.min(...coordsX);
  const maxX = Math.max(...coordsX);
  const minY = Math.min(...coordsY);
  const maxY = Math.max(...coordsY);

  const rangeX = (maxX - minX) || 1;
  const rangeY = (maxY - minY) || 1;

  // Render variables
  const width = 640;
  const height = 400;
  const padding = 45;

  const getCanvasX = (v: number) => {
    return padding + ((v - minX) / rangeX) * (width - padding * 2);
  };

  const getCanvasY = (v: number) => {
    // Invert SVG coordination so higher projection is physically upwards
    return height - padding - ((v - minY) / rangeY) * (height - padding * 2);
  };

  // Get segment color based on cluster ID
  const getColor = (clusterIdx: number) => SEGMENT_COLORS[clusterIdx % SEGMENT_COLORS.length];

  // Map bubble radius based on account balance volume
  const getRadius = (balance: number) => {
    const minBal = 0;
    const maxBal = 500000;
    const minR = 4.5;
    const maxR = 15;
    return minR + (balance / maxBal) * (maxR - minR);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative w-full rounded-xl p-5 bg-[#1A1F35] border border-[#00D4FF1F] backdrop-blur-md"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-medium text-base">Cartographie des Clients (Espace 2D - {method})</h3>
        <span className="text-xs font-mono text-[#00D4FF] px-2 py-0.5 rounded-md bg-[#00D4FF]/10">Taille de bulle ∝ Solde du Compte (F CFA)</span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          {/* Subtle grid ticks */}
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
          <line x1={width / 2} y1={padding} x2={width / 2} y2={height - padding} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" strokeWidth="1" />

          {/* Boundaries */}
          <rect x={padding - 10} y={padding - 10} width={width - padding * 2 + 20} height={height - padding * 2 + 20} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} rx={8} />

          {/* Render customer nodes */}
          {data.map((c, i) => {
            const xVal = method === 'PCA' ? c.pca_1 : c.tsne_1;
            const yVal = method === 'PCA' ? c.pca_2 : c.tsne_2;

            // Apply a high-fidelity real-time bobbing effect so that the graphics actively move!
            const t = animationTime || 0;
            const uniqueOffset = (c.customer_id % 37) * 0.95;
            // Float movement
            const floatX = Math.sin(t * 1.2 + uniqueOffset) * 6.5;
            const floatY = Math.cos(t * 1.5 + uniqueOffset) * 6.5;

            const cx = getCanvasX(xVal) + floatX;
            const cy = getCanvasY(yVal) + floatY;
            const r = getRadius(c.account_balance);
            const isHovered = hoveredNode?.customer_id === c.customer_id;

            return (
              <circle
                key={c.customer_id}
                cx={cx}
                cy={cy}
                r={isHovered ? r + 3.5 : r}
                fill={getColor(c.cluster)}
                fillOpacity={isHovered ? 0.95 : 0.65}
                stroke={isHovered ? '#FFFFFF' : 'rgba(255,255,255,0.2)'}
                strokeWidth={isHovered ? 2 : 1}
                className="transition-all duration-100 cursor-crosshair"
                style={{
                  filter: isHovered ? `drop-shadow(0 0 8px ${getColor(c.cluster)})` : 'none'
                }}
                onMouseEnter={(e) => {
                  setHoveredNode(c);
                  const bounds = e.currentTarget.getBoundingClientRect();
                  const container = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                  if (container) {
                    setTooltipPos({
                      x: bounds.left - container.left + bounds.width / 2,
                      y: bounds.top - container.top - 10
                    });
                  }
                }}
                onMouseLeave={() => hoveredNode?.customer_id === c.customer_id && setHoveredNode(null)}
              />
            );
          })}
        </svg>

        {/* Floating Tooltip detail display */}
        {hoveredNode && (
          <div
            className="absolute z-30 p-3 bg-[#0D1224]/95 border border-[#00D4FF66] rounded-lg pointer-events-none text-xs text-slate-100 shadow-xl transition-all duration-75 min-w-[210px]"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="font-bold text-[#00D4FF] mb-1 border-b border-white/10 pb-1 flex justify-between">
              <span>Client #{hoveredNode.customer_id}</span>
              <span className="text-gray-400 font-normal">{hoveredNode.age} ans</span>
            </div>
            <div className="space-y-1 font-mono">
              <p className="font-bold text-white text-[11px] truncate mb-1">{hoveredNode.cluster_name}</p>
              <div className="flex justify-between gap-4">
                <span className="text-[10px] text-gray-400">Revenu Annuel:</span>
                <span className="text-amber-400 font-semibold">{formatFCFA(hoveredNode.annual_income)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[10px] text-gray-400">Solde Compte:</span>
                <span className="text-green-400 font-semibold">{formatFCFA(hoveredNode.account_balance)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[10px] text-gray-400">Score Dépense:</span>
                <span className="text-red-400 font-semibold">{hoveredNode.spending_score}/100</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[10px] text-gray-400">Score de Crédit:</span>
                <span className="text-blue-400 font-semibold">{hoveredNode.credit_score} FICO</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
        {(Array.from(new Set(data.map(c => c.cluster))) as number[]).sort((a, b) => a - b).map(cId => (
          <div key={cId} className="flex items-center gap-1.5 py-0.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: getColor(cId) }}></span>
            <span className="text-xs text-gray-300 font-medium">
              {data.find(c => c.cluster === cId)?.cluster_name}
            </span>
          </div>
        ))}
      </div>

      <SimpleExplainer
        title="La Carte des Clients du Sénégal"
        explanation="Chaque petit point coloré représente un client sénégalais. Les clients côte à côte se ressemblent ! L'algorithme a automatiquement détecté comment les regrouper logiquement. Plus l'icône de leur bulle est grande, plus ils ont d'argent sur leur compte !"
        illustration={
          <svg width="28" height="28" viewBox="0 0 24 24" className="text-[#00D4FF] stroke-current fill-[#00D4FF]/20 animate-pulse" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" strokeDasharray="3 3"/>
            <circle cx="8" cy="8" r="2.5" fill="#15803d"/>
            <circle cx="16" cy="16" r="4.5" fill="#FFB800" stroke="#FFFFFF" strokeWidth="1"/>
            <circle cx="13" cy="9" r="1.5" fill="#EF4444"/>
          </svg>
        }
      />
    </motion.div>
  );
};

/**
 * Concentric Distribution Pie & Donut Chart
 */
export const DistributionDonut: React.FC<BaseChartProps> = ({ summaries }) => {
  const total = summaries.reduce((acc, curr) => acc + curr.size, 0);

  let cumulativePercent = 0;
  const slices = summaries.map((s, idx) => {
    const percent = s.size / total;
    const startAngle = cumulativePercent * 360;
    cumulativePercent += percent;
    const endAngle = cumulativePercent * 360;
    return {
      ...s,
      percent,
      startAngle,
      endAngle
    };
  });

  // Calculate coordinates on drawing arcs
  const getArcPath = (startAngle: number, endAngle: number, radius = 90, innerRadius = 50) => {
    const rad = (angle: number) => (angle - 90) * Math.PI / 180;
    const sX = 140 + radius * Math.cos(rad(startAngle));
    const sY = 140 + radius * Math.sin(rad(startAngle));
    const eX = 140 + radius * Math.cos(rad(endAngle));
    const eY = 140 + radius * Math.sin(rad(endAngle));

    const sXi = 140 + innerRadius * Math.cos(rad(startAngle));
    const sYi = 140 + innerRadius * Math.sin(rad(startAngle));
    const eXi = 140 + innerRadius * Math.cos(rad(endAngle));
    const eYi = 140 + innerRadius * Math.sin(rad(endAngle));

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `
      M ${sX} ${sY}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${eX} ${eY}
      L ${eXi} ${eYi}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${sXi} ${sYi}
      Z
    `;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="h-full rounded-xl p-5 bg-[#1A1F35] border border-[#00D4FF22] backdrop-blur-md flex flex-col justify-between"
    >
      <h3 className="text-white font-medium text-base mb-4 font-space">Proportion des Segments Clientèle</h3>
      
      <div className="flex flex-col md:flex-row items-center justify-center gap-6 my-auto">
        <div className="relative">
          <svg width="280" height="280" className="overflow-visible">
            {slices.map((slice, idx) => {
              // Special case: full circle guard
              const path = slice.percent >= 0.99 
                ? getArcPath(0, 359.9, 90, 50)
                : getArcPath(slice.startAngle, slice.endAngle, 90, 50);

              return (
                <path
                  key={slice.cluster}
                  d={path}
                  fill={slice.color}
                  className="hover:scale-105 origin-[140px_140px] transition-transform duration-150 cursor-pointer"
                  stroke="#1A1F35"
                  strokeWidth="2.5"
                >
                  <title>{slice.cluster_name}: {slice.size} clients ({(slice.percent * 100).toFixed(1)}%)</title>
                </path>
              );
            })}
            <circle cx="140" cy="140" r="48" fill="#171d37" />
            <text x="140" y="136" textAnchor="middle" fill="#8A99AD" className="text-[10px] font-mono leading-none font-bold uppercase">CLIENTS TOTAL</text>
            <text x="140" y="156" textAnchor="middle" fill="#FFFFFF" className="text-xl font-bold font-sans tracking-tight">{total}</text>
          </svg>
        </div>

        <div className="space-y-2.5 w-full max-w-[240px]">
          {slices.map((s) => (
            <div key={s.cluster} className="flex items-center justify-between p-2 rounded bg-slate-900/40 border border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs font-medium text-white truncate max-w-[130px]">{s.cluster_name}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-cyan-400 font-bold">{s.size}</span>
                <span className="text-[10px] text-gray-400 ml-1">({(s.percent*100).toFixed(0)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SimpleExplainer
        title="La Part de Gâteau des Segments"
        explanation="Ce graphique rond montre qui est majoritaire dans la banque. S'agit-il des jeunes actifs sénégalais, des épargnants très riches, ou de la classe moyenne ? On voit tout de suite quelle part est la plus grosse !"
        illustration={
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-[#FFB800] stroke-current fill-[#FFB800]/20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" className="text-[#10B981] fill-[#10B981]/20" />
          </svg>
        }
      />
    </motion.div>
  );
};

/**
 * Interactive Radar Profiles Chart
 */
interface RadarProfilesProps {
  summaries: ClusterSummary[];
  customers: Customer[];
  animationTime?: number;
}

export const RadarProfiles: React.FC<RadarProfilesProps> = ({ summaries, customers, animationTime }) => {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);

  // Radar Features (same layout axes as defined in python requirements)
  const features = ['age', 'annual_income', 'spending_score', 'credit_score', 'account_balance', 'num_products'];
  const labels = ['Âge', 'Revenu Annuel', 'Score Dépenses', 'Score de Crédit', 'Solde Compte', 'Nbr Produits'];

  // Global feature limits for min-max division (same scales as python)
  const globMin: { [key: string]: number } = { age: 18, annual_income: 15000, spending_score: 1, credit_score: 300, account_balance: 0, num_products: 1 };
  const globMax: { [key: string]: number } = { age: 75, annual_income: 200000, spending_score: 100, credit_score: 850, account_balance: 500000, num_products: 5 };

  // Calculate coordinates array of normalized nodes (angles step inside 360)
  const width = 360;
  const height = 360;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = 120;

  const pointsStep = Math.PI * 2 / features.length;

  const getPointsPath = (summary: ClusterSummary) => {
    const rawVals = [
      summary.avg_age,
      summary.avg_income,
      summary.avg_spending,
      summary.avg_credit,
      summary.avg_balance,
      summary.avg_products
    ];

    const coordPoints = rawVals.map((v, i) => {
      const featKey = features[i];
      let norm = (v - globMin[featKey]) / (globMax[featKey] - globMin[featKey]);

      // Breathe effect for moving real-time graphics!
      if (animationTime) {
        const drift = Math.sin(animationTime * 1.3 + i * 1.5 + summary.cluster * 2.1) * 0.024;
        norm = Math.max(0.01, Math.min(1.0, norm + drift));
      }

      const angle = i * pointsStep - Math.PI / 2;
      const radius = Math.max(5, norm * maxRadius);

      return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle)
      };
    });

    return coordPoints.map(p => `${p.x},${p.y}`).join(' ') + ` ${coordPoints[0].x},${coordPoints[0].y}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="rounded-xl p-5 bg-[#1A1F35] border border-[#00D4FF22] backdrop-blur-md flex flex-col justify-between"
    >
      <h3 className="text-white font-medium text-base mb-2 font-space">Profil Global des Segments (Centroïdes)</h3>
      <p className="text-xs text-gray-400 mb-4 h-8">Surbrillance interactive comparant la moyenne normalisée des variables financières (bornes de 0 à 1).</p>

      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 my-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[280px] h-auto overflow-visible select-none">
          {/* Circular polygon rings as distance guide markers */}
          {[0.2, 0.4, 0.6, 0.8, 1].map((lvl) => {
            const r = lvl * maxRadius;
            const pointsStr = Array.from({ length: features.length }).map((_, i) => {
              const angle = i * pointsStep - Math.PI / 2;
              return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
            }).join(' ') + ` ${cx + r},${cy - Math.PI/2}`;

            return (
              <polygon
                key={lvl}
                points={pointsStr}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            );
          })}

          {/* Feature spokes axes */}
          {features.map((_, i) => {
            const angle = i * pointsStep - Math.PI / 2;
            const targetX = cx + maxRadius * Math.cos(angle);
            const targetY = cy + maxRadius * Math.sin(angle);
            
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={targetX}
                y2={targetY}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Radial axis text labels */}
          {labels.map((label, i) => {
            const angle = i * pointsStep - Math.PI / 2;
            const extRadius = maxRadius + 22;
            const textX = cx + extRadius * Math.cos(angle);
            const textY = cy + extRadius * Math.sin(angle);
            
            let anchor: 'middle' | 'start' | 'end' = 'middle';
            if (Math.cos(angle) > 0.1) anchor = 'start';
            if (Math.cos(angle) < -0.1) anchor = 'end';

            return (
              <text
                key={i}
                x={textX}
                y={textY + 4}
                fill="#8A99AD"
                textAnchor={anchor}
                className="text-[9.5px] font-mono leading-none tracking-tight font-semibold"
              >
                {label}
              </text>
            );
          })}

          {/* Render Cluster Polygons Overlays */}
          {summaries.map((s, idx) => {
            const pathPoints = getPointsPath(s);
            const isHovered = hoveredSegment === s.cluster;
            const hasFocus = hoveredSegment === null || isHovered;

            return (
              <polygon
                key={s.cluster}
                points={pathPoints}
                fill={s.color}
                fillOpacity={isHovered ? 0.35 : (hasFocus ? 0.13 : 0.02)}
                stroke={s.color}
                strokeWidth={isHovered ? 3 : (hasFocus ? 1.8 : 0.6)}
                className="transition-all duration-150 cursor-pointer"
                style={{
                  filter: isHovered ? `drop-shadow(0 0 10px ${s.color}77)` : 'none'
                }}
                onMouseEnter={() => setHoveredSegment(s.cluster)}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            );
          })}
        </svg>

        {/* Legend listing */}
        <div className="space-y-2 lg:w-[150px] flex-shrink-0">
          {summaries.map((s) => (
            <div
              key={s.cluster}
              className={`p-2 rounded text-xs transition-colors duration-100 cursor-pointer ${hoveredSegment === s.cluster ? 'bg-slate-800' : 'bg-slate-900/35 hover:bg-slate-800/50'}`}
              onMouseEnter={() => setHoveredSegment(s.cluster)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-1 stroke-2 inline-block rounded-none border-b-2" style={{ borderColor: s.color }} />
                <span className="font-medium text-white truncate max-w-[110px]">{s.cluster_name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SimpleExplainer
        title="L'Étoile des Tempéraments"
        explanation="C'est la toile d'araignée de nos groupes. Chaque branche représente une donnée (comme l'âge, l'épargne ou les dépenses). Lorsque la forme d'un groupe s'étend loin vers l'extérieur pour un critère, cela signifie que ce groupe est champion dans ce domaine !"
        illustration={
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-fuchsia-400 stroke-current fill-fuchsia-400/20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L15 9L22 10L17 15L18 22L12 18L6 22L7 15L2 10L9 9Z" />
          </svg>
        }
      />
    </motion.div>
  );
};

/**
 * Grouped Bar Chart of Cluster Feature Means
 */
interface GroupedBarPlotProps {
  summaries: ClusterSummary[];
  activeField: string;
  activeLabel: string;
}

export const GroupedBarPlot: React.FC<GroupedBarPlotProps> = ({ summaries, activeField, activeLabel }) => {
  // Read feature averages
  const getFieldAvg = (s: ClusterSummary): number => {
    switch (activeField) {
      case 'age': return s.avg_age;
      case 'annual_income': return s.avg_income;
      case 'spending_score': return s.avg_spending;
      case 'credit_score': return s.avg_credit;
      case 'account_balance': return s.avg_balance;
      case 'num_products': return s.avg_products;
      case 'tenure_years': return s.avg_tenure;
      default: return 0;
    }
  };

  const avgs = summaries.map(getFieldAvg);
  const maxVal = Math.max(...avgs) || 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="rounded-xl p-5 bg-[#1A1F35] border border-[#00D4FF22] backdrop-blur-md flex flex-col justify-between h-full"
    >
      <div>
        <h3 className="text-white font-medium text-base mb-1 font-space">Moyennes de l'Attribut</h3>
        <p className="text-xs text-slate-400 mb-6 font-mono">Variable Actuelle : <span className="text-[#00D4FF] font-bold">{activeLabel}</span></p>
      </div>

      <div className="space-y-4 my-auto">
        {summaries.map((s, idx) => {
          const val = getFieldAvg(s);
          const percentWidth = (val / maxVal) * 100;

          const displayFormat = activeField.includes('income') || activeField.includes('balance')
            ? formatFCFA(val)
            : val.toFixed(1);

          return (
            <div key={s.cluster} className="space-y-1">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-200 truncate pr-4 max-w-[200px]">{s.cluster_name}</span>
                <span className="text-cyan-400 font-mono font-bold leading-none">{displayFormat}</span>
              </div>
              <div className="w-full bg-slate-900/60 rounded-full h-3 border border-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${percentWidth}%`,
                    backgroundColor: s.color,
                    boxShadow: `0 0 8px ${s.color}35`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <SimpleExplainer
        title="La Hauteur des Barres Comparatives"
        explanation="Choisissez une donnée ci-dessus (comme le Revenu ou l'Âge) : ce graphique montre instantanément le niveau moyen de chaque groupe sous forme de barres horizontales. C'est l'outil de comparaison le plus simple et direct !"
        illustration={
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-emerald-400 stroke-current fill-emerald-400/20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" strokeWidth="3" />
            <line x1="12" y1="20" x2="12" y2="4" strokeWidth="3" />
            <line x1="6" y1="20" x2="6" y2="14" strokeWidth="3" />
          </svg>
        }
      />
    </motion.div>
  );
};

/**
 * Elbow Method Optimization Plot
 */
interface ElbowPlotProps {
  points: number[];
  currentK: number;
}

export const ElbowPlot: React.FC<ElbowPlotProps> = ({ points, currentK }) => {
  const width = 500;
  const height = 280;
  const padding = 45;

  const maxVal = Math.max(...points) || 1;
  const minVal = Math.min(...points) || 0;
  const rangeY = (maxVal - minVal) || 1;

  const getCanvasX = (k: number) => {
    return padding + ((k - 1) / 9) * (width - padding * 2);
  };

  const getCanvasY = (v: number) => {
    return height - padding - ((v - minVal) / rangeY) * (height - padding * 2);
  };

  const linePoints = points.map((v, i) => `${getCanvasX(i + 1)},${getCanvasY(v)}`).join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="rounded-xl p-5 bg-[#1A1F35] border border-[#00D4FF22] backdrop-blur-md flex flex-col justify-between"
    >
      <div>
        <h3 className="text-white font-medium text-base mb-1 font-space">Courbe du Coude (Inertie vs k)</h3>
        <p className="text-xs text-gray-400 mb-4 h-8">Repère l'inertie intra-classe décroissante pour identifier le nombre de clusters optimal (k).</p>
      </div>

      <div className="relative my-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          {/* Coordinate borders */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />

          {/* WCSS Curve path line */}
          <polyline
            points={linePoints}
            fill="none"
            stroke="#00D4FF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Selected K Vertical Line Indicator */}
          <line
            x1={getCanvasX(currentK)}
            y1={padding - 5}
            x2={getCanvasX(currentK)}
            y2={height - padding}
            stroke="#EF4444"
            strokeWidth="2.5"
            strokeDasharray="4 4"
          />

          {/* Vertical label anchor mark */}
          <text
            x={getCanvasX(currentK) + 6}
            y={padding + 12}
            fill="#EF4444"
            className="text-[10px] font-mono leading-none font-bold"
          >
            Sélectionné : k={currentK}
          </text>

          {/* Circle indices */}
          {points.map((v, i) => {
            const k = i + 1;
            const cx = getCanvasX(k);
            const cy = getCanvasY(v);
            const isActive = k === currentK;

            return (
              <g key={k} className="group cursor-default">
                <circle
                  cx={cx}
                  cy={cy}
                  r={isActive ? 7 : 4.5}
                  fill={isActive ? '#FFB800' : '#111528'}
                  stroke={isActive ? '#FFFFFF' : '#00D4FF'}
                  strokeWidth="2.5"
                />
                <text
                  x={cx}
                  y={cy - 12}
                  fill={isActive ? '#FFB800' : '#8A99AD'}
                  textAnchor="middle"
                  className={`text-[9.5px] font-mono font-semibold ${isActive ? 'font-bold' : ''}`}
                >
                  k={k}
                </text>
              </g>
            );
          })}

          {/* Bottom indices */}
          {[1,2,3,4,5,6,7,8,9,10].map((k) => (
            <text
              key={k}
              x={getCanvasX(k)}
              y={height - padding + 16}
              fill="#64748B"
              textAnchor="middle"
              className="text-[10px] font-mono"
            >
              {k}
            </text>
          ))}
        </svg>
      </div>

      <div className="mt-4 p-3 rounded bg-cyan-950/20 border border-cyan-500/10 text-xs text-slate-300 leading-relaxed">
        La <strong>"Courbe du Coude"</strong> permet de cibler le point d'inflexion où l'augmentation de k n'apporte plus d'explication significative.
      </div>

      <SimpleExplainer
        title="Le Pli du Coude (Choix Idéal)"
        explanation="Imaginez que vous pliez le bras. Le 'coude' est l'endroit parfait où s'arrêter ! Pour l'intelligence artificielle, ce point de rupture montre le nombre idéal de groupes de clients à créer pour avoir une analyse claire et facile."
        illustration={
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-red-400 stroke-current" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 3 4 L 11 16 L 21 18" />
            <circle cx="11" cy="16" r="4.5" fill="#FFB800" stroke="#FFFFFF" strokeWidth="1" className="animate-ping" />
            <circle cx="11" cy="16" r="3" fill="#EF4444" />
          </svg>
        }
      />
    </motion.div>
  );
};

/**
 * Silhouette Indices Bar Chart Summary
 */
export const SilhouetteBarPlot: React.FC<BaseChartProps> = ({ summaries }) => {
  const width = 500;
  const height = 280;
  const padding = 45;

  const barCapacity = width - padding * 2;
  const barWidth = Math.max(10, (barCapacity / summaries.length) - 15);
  const numSteps = summaries.length;

  const scoreLimit = 1.0;

  const getCanvasY = (v: number) => {
    return height - padding - (v / scoreLimit) * (height - padding * 2);
  };

  const getBarColor = (score: number) => {
    if (score >= 0.5) return '#10B981'; // Green
    if (score >= 0.3) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="rounded-xl p-5 bg-[#1A1F35] border border-[#00D4FF22] backdrop-blur-md flex flex-col justify-between"
    >
      <div>
        <h3 className="text-white font-medium text-base mb-1 font-space">Cohesion de Silhouette Moyenne</h3>
        <p className="text-xs text-gray-400 mb-4 h-8">Calcule la cohésion de chaque segment (0 à 1). Les couleurs déterminent la solidité de la segmentation.</p>
      </div>

      <div className="relative my-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          {/* Bottom axis line */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />

          {/* Guide dashes lines for bounds 0.3 and 0.5 */}
          {[0.3, 0.5].map((shLvl) => (
            <g key={shLvl}>
              <line
                x1={padding}
                y1={getCanvasY(shLvl)}
                x2={width - padding}
                y2={getCanvasY(shLvl)}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <text x={padding - 8} y={getCanvasY(shLvl) + 3} fill="#64748B" textAnchor="end" className="text-[9px] font-mono">
                {shLvl.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Render stats bar columns */}
          {summaries.map((s, idx) => {
            const xPos = padding + (idx / numSteps) * barCapacity + (barCapacity / numSteps - barWidth) / 2;
            const scoreVal = s.avg_silhouette;
            const yBarCent = getCanvasY(scoreVal);
            const colHeight = Math.max(2, (height - padding) - yBarCent);
            const activeColor = getBarColor(scoreVal);

            return (
              <g key={s.cluster}>
                <rect
                  x={xPos}
                  y={yBarCent}
                  width={barWidth}
                  height={colHeight}
                  fill={activeColor}
                  fillOpacity="0.85"
                  rx="3"
                  className="hover:fill-opacity-100 transition-all duration-100"
                />
                
                {/* Score text overlay */}
                <text
                  x={xPos + barWidth / 2}
                  y={yBarCent - 6}
                  fill={activeColor}
                  textAnchor="middle"
                  className="text-[9px] font-semibold font-mono"
                >
                  {scoreVal.toFixed(3)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex justify-center gap-4 mt-4 font-mono text-[10px]">
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/> <span className="text-gray-400">&gt;0.5 Forte</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/> <span className="text-gray-400">0.3-0.5 Moyenne</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/> <span className="text-gray-400">&lt;0.3 Faible</span></div>
      </div>

      <SimpleExplainer
        title="La Cohérence des Groupes (Score de Qualité)"
        explanation="Ce graphique attribue une note de cohésion à chaque groupe. Plus la barre est haute et verte, plus le groupe est soudé et uni (les clients se ressemblent vraiment). Si elle est rouge ou basse, c'est que les clients de ce groupe sont assez différents les uns des autres."
        illustration={
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-violet-400 stroke-current fill-violet-400/20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" stroke="#10B981" strokeWidth="2.5" fill="none" />
          </svg>
        }
      />
    </motion.div>
  );
};

/**
 * Dense Feature Heatmap Component
 */
interface HeatmapProps {
  matrix: number[][];
  labels: string[];
}

export const CorrelationHeatmap: React.FC<HeatmapProps> = ({ matrix, labels }) => {
  const size = matrix.length;
  const width = 450;
  const height = 450;
  const cellWidth = Math.floor(350 / size);

  // Offset left/top to account for long vertical text labels alignment
  const offsetX = 100;
  const offsetY = 70;

  // Render heat scale values matching cell correlation indexes
  const getCellColor = (val: number) => {
    // Standard diverging red-blue scale
    if (val >= 0) {
      // Interpolate Blue spectrum: RGBA(59, 130, 246)
      const op = Math.min(1.0, val * 1.1);
      return `rgba(59, 130, 246, ${op})`;
    } else {
      // Interpolate Red spectrum: RGBA(239, 68, 68)
      const op = Math.min(1.0, Math.abs(val) * 1.1);
      return `rgba(239, 68, 68, ${op})`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="rounded-xl p-5 bg-[#1A1F35] border border-[#00D4FF22] backdrop-blur-md flex flex-col justify-between h-full"
    >
      <div>
        <h3 className="text-white font-medium text-base mb-1 font-space">Matrice de Corrélation des variables</h3>
        <p className="text-xs text-gray-400 mb-6">Indices de dépendance réciproque. Le bleu indique une corrélation positive forte ; le rouge indique une relation négative inverse.</p>
      </div>

      <div className="relative my-auto overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[420px] mx-auto h-auto overflow-visible select-none">
          {matrix.map((row, rIdx) => 
            row.map((val, cIdx) => {
              const x = offsetX + cIdx * cellWidth;
              const y = offsetY + rIdx * cellWidth;
              const cellColor = getCellColor(val);

              return (
                <g key={`${rIdx}-${cIdx}`}>
                  <rect
                    x={x}
                    y={y}
                    width={cellWidth - 1}
                    height={cellWidth - 1}
                    fill={cellColor}
                    stroke="rgba(10, 14, 26, 0.4)"
                    strokeWidth={1}
                  />
                  {/* Correlation numeric value overlay */}
                  <text
                    x={x + cellWidth / 2}
                    y={y + cellWidth / 2 + 3}
                    fill={Math.abs(val) > 0.45 ? '#FFFFFF' : '#94A3B8'}
                    textAnchor="middle"
                    className="text-[9.5px] font-mono font-bold"
                  >
                    {val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                  </text>
                </g>
              );
            })
          )}

          {/* Left row legends */}
          {labels.map((lbl, rIdx) => (
            <text
              key={rIdx}
              x={offsetX - 8}
              y={offsetY + rIdx * cellWidth + cellWidth / 2 + 3}
              fill="#8A99AD"
              textAnchor="end"
              className="text-[10px] font-mono leading-none tracking-tight font-semibold"
            >
              {lbl}
            </text>
          ))}

          {/* Top column legends (Rotated 45 degrees so they fit nicely) */}
          {labels.map((lbl, cIdx) => (
            <g key={cIdx} transform={`translate(${offsetX + cIdx * cellWidth + cellWidth / 2}, ${offsetY - 8}) rotate(-35)`}>
              <text
                x="0"
                y="0"
                fill="#8A99AD"
                textAnchor="end"
                className="text-[9.5px] font-mono font-semibold"
              >
                {lbl}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <SimpleExplainer
        title="La Grille des Affinités (Amis ou Ennemis ?)"
        explanation="C'est la carte d'amitié entre deux données ! Si la case est bleu foncé, les deux critères montent ensemble (par exemple : un haut revenu est souvent lié à une grosse épargne). Si c'est rouge, ils font l'inverse (quand l'un monte, l'autre descend)."
        illustration={
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-400 stroke-current fill-[#3B82F6]/20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
          </svg>
        }
      />
    </motion.div>
  );
};

/**
 * Individual Customer vs Cluster Centroid Comparative Radar Plot
 */
interface IndividualRadarCompareProps {
  customer: Customer;
  summary: ClusterSummary;
  animationTime?: number;
}

export const IndividualRadarCompare: React.FC<IndividualRadarCompareProps> = ({ customer, summary, animationTime }) => {
  const features = ['age', 'annual_income', 'spending_score', 'credit_score', 'account_balance', 'num_products'];
  const labels = ['Âge', 'Revenu', 'Dépenses', 'Crédit', 'Solde', 'Produits'];

  const globMin: { [key: string]: number } = { age: 18, annual_income: 15000, spending_score: 1, credit_score: 300, account_balance: 0, num_products: 1 };
  const globMax: { [key: string]: number } = { age: 75, annual_income: 200000, spending_score: 100, credit_score: 850, account_balance: 500000, num_products: 5 };

  const width = 280;
  const height = 280;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = 90;
  
  const pointsStep = Math.PI * 2 / features.length;

  const getPointsStr = (dataPoints: number[], isCluster: boolean) => {
    const coords = dataPoints.map((v, i) => {
      const featKey = features[i];
      let norm = (v - globMin[featKey]) / (globMax[featKey] - globMin[featKey]);

      // Apply real-time movement wave wobbling
      if (animationTime) {
        const factor = isCluster ? 1.7 : 1.3;
        const drift = Math.sin(animationTime * factor + i * 1.6) * 0.022;
        norm = Math.max(0.01, Math.min(1.0, norm + drift));
      }

      const angle = i * pointsStep - Math.PI / 2;
      const radius = Math.max(5, norm * maxRadius);

      return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle)
      };
    });

    return coords.map(p => `${p.x},${p.y}`).join(' ') + ` ${coords[0].x},${coords[0].y}`;
  };

  const custVals = [customer.age, customer.annual_income, customer.spending_score, customer.credit_score, customer.account_balance, customer.num_products];
  const clVals = [summary.avg_age, summary.avg_income, summary.avg_spending, summary.avg_credit, summary.avg_balance, summary.avg_products];

  const custPointsPath = getPointsStr(custVals, false);
  const clPointsPath = getPointsStr(clVals, true);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="rounded-xl p-4 bg-[#0D1224] border border-[#00D4FF11] flex flex-col items-center"
    >
      <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-2 self-start font-space">Empreinte Comparative de l'Actif</h4>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[200px] h-auto overflow-visible select-none">
        {/* Ring guides */}
        {[0.3, 0.6, 1].map((lvl) => (
          <circle
            key={lvl}
            cx={cx}
            cy={cy}
            r={lvl * maxRadius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* Feature axes spokes */}
        {features.map((_, i) => {
          const angle = i * pointsStep - Math.PI / 2;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + maxRadius * Math.cos(angle)}
              y2={cy + maxRadius * Math.sin(angle)}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          );
        })}

        {/* Labels text */}
        {labels.map((lbl, i) => {
          const angle = i * pointsStep - Math.PI / 2;
          const labelDist = maxRadius + 14;
          const textX = cx + labelDist * Math.cos(angle);
          const textY = cy + labelDist * Math.sin(angle);

          let anchor: 'middle' | 'start' | 'end' = 'middle';
          if (Math.cos(angle) > 0.1) anchor = 'start';
          if (Math.cos(angle) < -0.1) anchor = 'end';

          return (
            <text
              key={i}
              x={textX}
              y={textY + 3}
              fill="#94A3B8"
              textAnchor={anchor}
              className="text-[9px] font-mono leading-none tracking-tight font-bold"
            >
              {lbl}
            </text>
          );
        })}

        {/* Segment Average Polygon Overlay (Dashed Red Line) */}
        <polygon
          points={clPointsPath}
          fill="none"
          stroke="#FFB800"
          strokeWidth="1.5"
          strokeDasharray="3 2"
        />

        {/* Customer Polygon Overlay (Filled Solid Cyan Line) */}
        <polygon
          points={custPointsPath}
          fill="#00D4FF"
          fillOpacity="0.25"
          stroke="#00D4FF"
          strokeWidth="2.5"
        />
      </svg>

      <div className="flex justify-center gap-4 mt-1 text-[9.5px] font-mono leading-none">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 inline-block bg-cyan-400" /> <span className="text-gray-300">Client</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 inline-block border-b border-dashed border-amber-400" /> <span className="text-gray-300">Moyenne</span></div>
      </div>

      <SimpleExplainer
        title="La Toile de Comparaison de l'Actif"
        explanation="La forme solide bleue est l'empreinte de notre client sénégalais. La ligne dorée en pointillés montre la moyenne générale de son groupe. Si la ligne bleue dépasse, ce client est plus performant que la moyenne !"
        illustration={
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-[#00D4FF] stroke-current fill-[#00D4FF]/20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        }
      />
    </motion.div>
  );
};
