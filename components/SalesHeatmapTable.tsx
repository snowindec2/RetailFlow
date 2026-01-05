
import React, { useState, useMemo } from 'react';
import { Cloud, CloudRain, Sun, CloudSun, Snowflake, Check, TrendingUp, Calendar, Target, ArrowLeftRight, Layers, BarChart3, Info, ChevronRight, ChevronDown, Edit2, X, Tag, Store, Filter, Sparkles } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, Cell, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, ComposedChart } from 'recharts';
import { HIERARCHY_CONFIG, MOCK_DATA, SIMULATION_TODAY } from '../utils';
import { SalesDataRow, StoreCountData, Region } from '../types';

const CHART_COLORS = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', 
  '#3b82f6', '#14b8a6', '#f97316', '#64748b', '#84cc16', '#d946ef',
];

interface SalesHeatmapTableProps {
    data: SalesDataRow[];
    storeCounts?: StoreCountData[];
    startDate: string;
    endDate: string;
    selectedCategories: string[];
    onToggleCategory: (id: string) => void;
    onUpdatePlan?: (rowId: string, dateIndex: number, newValue: number) => void;
    onUpdateStoreCount?: (region: 'SH' | 'JS', dateIndex: number, newCount: number) => void;
}

const getHeatmapStyles = (
    value: number | null, 
    rowValues: (number | null)[], 
    level: number, 
    mode: 'actual' | 'plan' | 'diff' | 'smart'
) => {
  if (value === null) return { background: 'transparent', colorClass: 'text-gray-300', isDarkBg: false };

  if (mode === 'diff') {
      if (Math.abs(value) < 0.1) return { background: 'rgba(243, 244, 246, 0.5)', colorClass: 'text-gray-400', isDarkBg: false };
      const absVal = Math.abs(value);
      const opacity = Math.min(absVal / 30, 0.9) + 0.1; 
      const isDarkBg = opacity > 0.5;

      if (value > 0) {
          return {
              background: `rgba(16, 185, 129, ${opacity})`, 
              colorClass: isDarkBg ? 'text-white font-bold drop-shadow-sm' : 'text-emerald-700 font-medium',
              isDarkBg
          };
      } else {
          return {
              background: `rgba(239, 68, 68, ${opacity})`, 
              colorClass: isDarkBg ? 'text-white font-bold drop-shadow-sm' : 'text-red-700 font-medium',
              isDarkBg
          };
      }
  }

  const validValues = rowValues.filter(v => v !== null) as number[];
  const max = Math.max(...validValues);
  const min = Math.min(...validValues);
  const range = max - min || 1;
  const percentage = (value - min) / range;
  const opacity = 0.1 + (percentage * 0.9);
  const isDarkBg = opacity > 0.6;
  
  let bg = `rgba(99, 102, 241, ${opacity})`; 
  if (mode === 'plan') {
     bg = level === 1 ? `rgba(71, 85, 105, ${opacity})` : `rgba(148, 163, 184, ${opacity})`;
  } else if (level === 1) {
     bg = `rgba(16, 185, 129, ${opacity})`;
  } else if (level === 2) {
     bg = `rgba(59, 130, 246, ${opacity})`;
  }

  return { background: bg, colorClass: isDarkBg ? 'text-white font-medium drop-shadow-sm' : 'text-gray-800', isDarkBg };
};

const CustomXAxisTick = (props: any) => {
  const { x, y, payload, weekdays, dates } = props;
  const dateStr = payload.value;
  const idx = dates.indexOf(dateStr);
  const weekday = idx !== -1 ? weekdays[idx] : '';
  
  const parts = dateStr.split('-');
  const displayDate = parts.length === 3 ? `${parseInt(parts[1])}/${parseInt(parts[2])}` : dateStr;
  const isWeekend = weekday === 'Sa' || weekday === 'Su';

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#64748b" fontSize={9} fontWeight="bold">
        {displayDate}
      </text>
      <text x={0} y={0} dy={26} textAnchor="middle" fill={isWeekend ? "#ef4444" : "#94a3b8"} fontSize={8}>
        {weekday}
      </text>
    </g>
  );
};

const HaloText = ({ x, y, fill, children, dy = 0, fontSize = 9 }: any) => (
    <g style={{ pointerEvents: 'none' }}>
        <text x={x} y={y} dy={dy} textAnchor="middle" stroke="white" strokeWidth={3} strokeLinejoin="round" fontSize={fontSize} fontWeight="bold" fill="none">
            {children}
        </text>
        <text x={x} y={y} dy={dy} textAnchor="middle" fill={fill} fontSize={fontSize} fontWeight="bold">
            {children}
        </text>
    </g>
);

const shouldShowLabel = (index: number, total: number, weekday: string) => {
    if (total <= 31) return true;
    if (index === 0 || index === total - 1) return true; 
    if (weekday === 'Sa' || weekday === 'Su') return true; 
    
    if (total > 60) return index % 6 === 0;
    if (total > 45) return index % 4 === 0;
    return index % 2 === 0;
};

const CustomLineLabel = (props: any) => {
    const { x, y, stroke, value, index, weekdays, dates } = props;
    if (value === null || value === undefined) return null;
    
    const weekday = weekdays[index] || '';
    if (!shouldShowLabel(index, dates.length, weekday)) return null;

    return <HaloText x={x} y={y - 8} fill={stroke}>{value}</HaloText>;
};

const SmartPlanLabel = (props: any) => {
    const { x, y, value, color, index, weekdays, dates } = props;
    if (value === null || value === undefined) return null;
    
    const weekday = weekdays[index] || '';
    if (!shouldShowLabel(index, dates.length, weekday)) return null;
    
    return <HaloText x={x} y={y - 8} fill={color}>{value}</HaloText>;
};

const CustomBarLabel = (props: any) => {
    const { x, y, width, height, value, index, dates, weekdays } = props;
    if (value === null || value === undefined) return null;
    
    const weekday = weekdays[index] || '';
    if (dates.length > 31 && !shouldShowLabel(index, dates.length, weekday)) return null;

    const isPositive = value > 0;
    const yPos = isPositive ? y - 10 : y + height + 10;
    
    return (
        <HaloText x={x + width / 2} y={yPos} fill={isPositive ? '#10b981' : '#ef4444'} fontSize={8} dy={3}>
            {isPositive ? '+' : ''}{value}%
        </HaloText>
    );
};

interface EditValueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (val: number) => void;
    currentValue: number;
    title: string;
    subTitle: string;
}

const EditValueModal: React.FC<EditValueModalProps> = ({ isOpen, onClose, onSave, currentValue, title, subTitle }) => {
    const [val, setVal] = useState(currentValue.toString());
    React.useEffect(() => { setVal(currentValue.toString()); }, [currentValue, isOpen]);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
            <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 w-80 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800">修改数值</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
                </div>
                <div className="bg-indigo-50 p-3 rounded-md mb-4 text-sm">
                    <div className="flex flex-col gap-1">
                        <span className="text-indigo-900 font-bold">{title}</span>
                        <span className="text-indigo-800/60 font-medium text-xs">{subTitle}</span>
                    </div>
                </div>
                <div className="mb-6">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">新数值</label>
                    <input type="number" autoFocus className="w-full text-lg font-mono font-bold border-b-2 border-indigo-500 focus:outline-none py-1 text-gray-900" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { onSave(parseFloat(val)); onClose(); } }} />
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">取消</button>
                    <button onClick={() => { onSave(parseFloat(val)); onClose(); }} className="px-4 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded shadow-sm font-medium">确认</button>
                </div>
            </div>
        </div>
    );
};

export const SalesHeatmapTable: React.FC<SalesHeatmapTableProps> = ({ 
    data, storeCounts, startDate, endDate, selectedCategories, onToggleCategory, onUpdatePlan, onUpdateStoreCount
}) => {
  const [viewMode, setViewMode] = useState<'actual' | 'plan' | 'diff' | 'smart'>('smart');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showDeviation, setShowDeviation] = useState(false);
  const [showPlanLine, setShowPlanLine] = useState(false);
  const [showDataLabels, setShowDataLabels] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set([...HIERARCHY_CONFIG.map(g => `SH_${g.id}`), ...HIERARCHY_CONFIG.map(g => `JS_${g.id}`), ...HIERARCHY_CONFIG.map(g => `Total_${g.id}`)]));
  const [collapsedRegions, setCollapsedRegions] = useState<Set<Region>>(new Set());
  const [isStoreCountCollapsed, setIsStoreCountCollapsed] = useState(false);
  const [editModal, setEditModal] = useState<{ isOpen: boolean, type: 'plan' | 'storeCount', id: string, dateIndex: number, val: number, title: string, subTitle: string } | null>(null);

  const filteredIndices = useMemo(() => {
      const indices: number[] = [];
      MOCK_DATA.dates.forEach((date, idx) => { if (date >= startDate && date <= endDate) indices.push(idx); });
      return indices;
  }, [startDate, endDate]);

  const filteredData = useMemo(() => {
      const dates = filteredIndices.map(i => MOCK_DATA.dates[i]);
      const weekdays = filteredIndices.map(i => MOCK_DATA.weekdays[i]);
      const filteredStoreCounts = storeCounts ? storeCounts.map(sc => ({ region: sc.region, counts: filteredIndices.map(i => sc.counts[i]) })) : [];
      let processedRows = data;
      if (categoryFilter !== 'ALL') {
          const [type, value] = categoryFilter.split(':');
          if (type === 'GROUP') {
              const groupConfig = HIERARCHY_CONFIG.find(g => g.id === value);
              if (groupConfig) processedRows = processedRows.filter(row => [groupConfig.name, ...groupConfig.children].includes(row.name));
          } else if (type === 'CHILD') processedRows = processedRows.filter(row => row.name === value);
      }
      const salesData = processedRows.map(row => ({ ...row, values: filteredIndices.map(i => row.values[i]), planValues: filteredIndices.map(i => row.planValues[i]), originalIndices: filteredIndices }));
      return { dates, weekdays, salesData, filteredStoreCounts };
  }, [filteredIndices, data, storeCounts, categoryFilter]);

  const chartData = useMemo(() => {
    return filteredData.dates.map((date, idx) => {
        const point: any = { date };
        filteredData.salesData.forEach(row => {
            const actual = row.values[idx];
            const plan = row.planValues[idx];
            point[`${row.id}_plan`] = plan;
            
            if (date >= SIMULATION_TODAY) {
                point[`${row.id}_plan_show`] = plan;
                point[row.id] = null; 
                point[`${row.id}_diff`] = null;
            } else {
                point[`${row.id}_plan_show`] = null;
                point[row.id] = actual;
                point[`${row.id}_diff`] = (actual !== null && plan !== 0) ? parseFloat((((actual - plan) / plan) * 100).toFixed(1)) : null;
            }
        });
        return point;
    });
  }, [filteredData]);

  const xAxisInterval = useMemo(() => {
      const count = filteredData.dates.length;
      if (count > 60) return 6;
      if (count > 45) return 4;
      if (count > 31) return 2;
      return 0;
  }, [filteredData.dates.length]);

  const handleCellClick = (row: any, colIdx: number, planVal: number, date: string) => {
      if ((viewMode === 'plan' || (viewMode === 'smart' && date >= SIMULATION_TODAY)) && onUpdatePlan) {
          setEditModal({ isOpen: true, type: 'plan', id: row.id, dateIndex: row.originalIndices[colIdx], val: planVal, title: `${row.name} (${row.region === 'Total' ? '整体' : row.region})`, subTitle: date });
      }
  };

  const handleStoreCountClick = (region: 'SH' | 'JS', colIdx: number, count: number, date: string) => {
      if (onUpdateStoreCount) setEditModal({ isOpen: true, type: 'storeCount', id: region, dateIndex: filteredIndices[colIdx], val: count, title: `${region}区 有效门店数`, subTitle: date });
  };

  return (
    <div className="flex flex-col gap-6 h-full w-full">
      {editModal && <EditValueModal isOpen={editModal.isOpen} onClose={() => setEditModal(null)} currentValue={editModal.val} title={editModal.title} subTitle={editModal.subTitle} onSave={(newVal) => { if (editModal.type === 'plan' && onUpdatePlan) onUpdatePlan(editModal.id, editModal.dateIndex, newVal); else if (editModal.type === 'storeCount' && onUpdateStoreCount) onUpdateStoreCount(editModal.id as 'SH' | 'JS', editModal.dateIndex, newVal); }} />}
      
      {/* 调整高度逻辑：380px (开启偏差) vs 260px (关闭偏差)，更紧凑 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col relative transition-all duration-300 shrink-0" style={{ height: `${showDeviation ? 380 : 260}px` }}>
         <div className="p-4 h-full flex flex-col">
             <div className="flex justify-between items-center mb-1 shrink-0">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2"><TrendingUp size={14} className="text-indigo-500"/><span>趋势复盘 (今日: {SIMULATION_TODAY})</span></h3>
                <div className="flex items-center gap-1.5">
                     <button onClick={() => setShowDataLabels(!showDataLabels)} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-white border-gray-200 text-gray-500 hover:border-gray-300"><Tag size={10}/> {showDataLabels ? '隐藏数值' : '数值'}</button>
                     <button onClick={() => setShowPlanLine(!showPlanLine)} className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-white border-gray-200 text-gray-500 hover:border-gray-300 ${showPlanLine ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : ''}`}><Target size={10}/> {showPlanLine ? '隐藏计划' : '计划线'}</button>
                     <button onClick={() => setShowDeviation(!showDeviation)} className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-white border-gray-200 text-gray-500 hover:border-gray-300 ${showDeviation ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : ''}`}>{showDeviation ? <BarChart3 size={10}/> : <Layers size={10} />} {showDeviation ? '隐藏偏差' : '显示偏差'}</button>
                </div>
             </div>
             
             <div className="flex-1 w-full min-h-0 flex flex-col">
                 <div className={`${showDeviation ? 'h-[65%]' : 'h-full'} w-full transition-all duration-300`}>
                    <ResponsiveContainer width="100%" height="100%">
                        {/* 压缩 margin-bottom 并调整 XAxis 高度 */}
                        <LineChart data={chartData} margin={{ top: 20, right: 15, left: -20, bottom: 5 }} syncId="salesSync">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" height={35} tick={<CustomXAxisTick weekdays={filteredData.weekdays} dates={filteredData.dates} />} tickLine={false} axisLine={{stroke: '#e2e8f0'}} interval={xAxisInterval} hide={showDeviation} />
                            <YAxis tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} />
                            <ReferenceLine x={SIMULATION_TODAY} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: '今日', fill: '#ef4444', fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} itemStyle={{ fontSize: '11px', padding: 0 }} labelStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '0px' }} iconType="circle" />
                            {selectedCategories.map((id, idx) => {
                                const row = filteredData.salesData.find(r => r.id === id);
                                const name = row ? (row.region === 'Total' && row.level === 1 ? row.name : `${row.region === 'Total' ? '整体' : row.region} ${row.name}`) : id;
                                const color = CHART_COLORS[idx % CHART_COLORS.length] || '#000';
                                return (
                                    <React.Fragment key={id}>
                                        <Line type="monotone" dataKey={id} name={name} stroke={color} strokeWidth={2} dot={{ r: 2.5, strokeWidth: 0 }} activeDot={{ r: 4, strokeWidth: 0 }} animationDuration={500} connectNulls={false}>
                                            {(selectedCategories.length === 1 || showDataLabels) && <LabelList content={<CustomLineLabel weekdays={filteredData.weekdays} dates={filteredData.dates} />} />}
                                        </Line>
                                        {showPlanLine && (
                                            <Line type="monotone" dataKey={`${id}_plan`} name={`${name} (计划)`} stroke={color} strokeWidth={1.5} strokeDasharray="5 5" strokeOpacity={0.4} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} animationDuration={500}>
                                                <LabelList dataKey={`${id}_plan_show`} content={(props) => <SmartPlanLabel {...props} color={color} weekdays={filteredData.weekdays} dates={filteredData.dates} />} />
                                            </Line>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                 </div>
                 {showDeviation && (
                     <div className="h-[35%] w-full mt-1 border-t border-gray-100 pt-1">
                         <ResponsiveContainer width="100%" height="100%">
                             {/* 压缩偏差图 margin */}
                             <BarChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }} syncId="salesSync">
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                 <XAxis dataKey="date" height={35} tick={<CustomXAxisTick weekdays={filteredData.weekdays} dates={filteredData.dates} />} tickLine={false} axisLine={false} interval={xAxisInterval} />
                                 <YAxis tick={{fontSize: 9, fill: '#94a3b8'}} tickLine={false} axisLine={false} unit="%" />
                                 <ReferenceLine y={0} stroke="#cbd5e1" />
                                 <Tooltip cursor={{fill: 'rgba(0,0,0,0.03)'}} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} itemStyle={{ fontSize: '10px', padding: 0 }} labelStyle={{ fontSize: '10px', fontWeight: 'bold' }} formatter={(value: number) => [`${value > 0 ? '+' : ''}${value}%`, '偏差']} />
                                 {selectedCategories.map((id, idx) => {
                                     const isMultiSelect = selectedCategories.length > 1;
                                     const baseColor = CHART_COLORS[idx % CHART_COLORS.length];
                                     return (
                                         <Bar key={`${id}_diff`} dataKey={`${id}_diff`} name="偏差 %" fill={baseColor} barSize={isMultiSelect ? undefined : 12} radius={[2, 2, 0, 0]}>
                                             <LabelList dataKey={`${id}_diff`} content={<CustomBarLabel dates={filteredData.dates} weekdays={filteredData.weekdays} />} />
                                             {!isMultiSelect && chartData.map((entry: any, index: number) => { const val = entry[`${id}_diff`]; return <Cell key={`cell-${index}`} fill={val > 0 ? '#10b981' : '#ef4444'} opacity={0.8} />; })}
                                         </Bar>
                                     );
                                 })}
                             </BarChart>
                         </ResponsiveContainer>
                     </div>
                 )}
             </div>
         </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0 relative">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
            <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2"><span>📅 销售热力图</span></h3>
                <div className="relative ml-2">
                    <Filter className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="pl-8 pr-8 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-700 shadow-sm appearance-none cursor-pointer hover:border-gray-400 transition-colors font-medium outline-none">
                        <option value="ALL">全部品类</option>
                        {HIERARCHY_CONFIG.map(group => (
                            <optgroup key={group.id} label={group.name}>
                                <option value={`GROUP:${group.id}`}>{group.name} (全部)</option>
                                {group.children.map(child => <option key={child} value={`CHILD:${child}`}>{child}</option>)}
                            </optgroup>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                </div>
                {viewMode === 'plan' && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded flex items-center gap-1 animate-pulse ml-2"><Edit2 size={10} /> 计划模式</span>}
                {viewMode === 'smart' && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded flex items-center gap-1 ml-2"><Sparkles size={10} /> 综合模式</span>}
            </div>
            <div className="flex bg-gray-200/50 p-1 rounded-lg">
                <button onClick={() => setViewMode('actual')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'actual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>实绩</button>
                <button onClick={() => setViewMode('plan')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'plan' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>计划</button>
                <button onClick={() => setViewMode('diff')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'diff' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>偏差</button>
                <button onClick={() => setViewMode('smart')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'smart' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>综合</button>
            </div>
          </div>
          <div className="overflow-auto flex-1 custom-scrollbar w-full min-h-0">
            <table className="w-full border-collapse text-xs relative">
                <thead>
                    <tr>
                      <th className="sticky left-0 top-0 z-50 bg-gray-50 px-2 py-0.5 h-5 min-w-[140px] border-r border-gray-200 text-left font-semibold text-gray-600 pl-4">部门 / 品类</th>
                      {filteredData.dates.map((date, i) => (
                        <th key={i} className={`sticky top-0 z-40 px-1 py-0.5 h-5 min-w-[60px] text-center font-medium border-b border-gray-100 ${date === SIMULATION_TODAY ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : (['Sa', 'Su'].includes(filteredData.weekdays[i]) ? 'bg-red-50/95' : 'bg-white/95')}`}>
                          <div className="flex flex-col items-center"><span>{date.slice(5)}</span>{date === SIMULATION_TODAY && <span className="text-[9px] leading-none mt-0.5 font-bold">Today</span>}</div>
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <th className="sticky left-0 top-5 z-50 bg-gray-50 px-2 py-0 h-4 border-r border-gray-200 text-left font-semibold text-gray-600 pl-4">星期</th>
                      {filteredData.weekdays.map((day, i) => <th key={i} className={`sticky top-5 z-40 px-1 py-0 h-4 text-center text-[10px] ${['Sa', 'Su'].includes(day) ? 'bg-red-50/95 text-red-500 font-bold' : 'bg-white/95 text-gray-400'}`}>{day}</th>)}
                    </tr>
                </thead>
                <tbody>
                    <tr className="bg-slate-100 border-y border-slate-200">
                        <td className="sticky left-0 z-30 py-0.5 px-4 font-bold text-slate-700 bg-slate-100 text-xs uppercase flex items-center gap-2">
                            <button onClick={() => setIsStoreCountCollapsed(!isStoreCountCollapsed)} className="hover:bg-slate-200 rounded p-0.5">{isStoreCountCollapsed ? <ChevronRight size={14}/> : <ChevronDown size={14}/>}</button><Store size={14} className="text-slate-500"/>门店基础信息
                        </td>
                    </tr>
                     {!isStoreCountCollapsed && filteredData.filteredStoreCounts.map((sc) => (
                        <tr key={`sc_${sc.region}`} className="bg-amber-50 border-b border-amber-100 hover:bg-amber-50/50">
                            <td className="sticky left-0 z-30 py-0.5 border-r border-amber-100 text-xs bg-amber-50 font-medium text-amber-900 pl-8 flex items-center gap-2"><Store size={14} />{sc.region === 'SH' ? '上海' : '江苏'}有效门店数</td>
                            {sc.counts.map((count, i) => <td key={i} onClick={() => handleStoreCountClick(sc.region as 'SH'|'JS', i, count, filteredData.dates[i])} className={`text-center text-amber-800 font-mono cursor-pointer hover:bg-amber-100 hover:font-bold`}>{count}</td>)}
                        </tr>
                    ))}
                     {['Total', 'SH', 'JS'].map(region => {
                        const regionRows = filteredData.salesData.filter(r => r.region === region);
                        if (regionRows.length === 0) return null;
                        const isCollapsed = collapsedRegions.has(region as Region);
                        return (
                            <React.Fragment key={region}>
                                <tr className="bg-slate-100 border-y border-slate-200"><td className="sticky left-0 z-30 py-0.5 px-4 font-bold text-slate-700 bg-slate-100 text-xs uppercase flex items-center gap-2"><button onClick={() => { setCollapsedRegions(prev => { const n = new Set(prev); if (n.has(region as Region)) n.delete(region as Region); else n.add(region as Region); return n; }); }} className="hover:bg-slate-200 rounded p-0.5">{isCollapsed ? <ChevronRight size={14}/> : <ChevronDown size={14}/>}</button>{region === 'Total' ? '整体 (加权合成)' : `${region} 大区`}</td></tr>
                                {!isCollapsed && regionRows.map(row => {
                                     if (categoryFilter === 'ALL' && row.level === 3 && row.parentId && !expandedGroups.has(row.parentId)) return null;
                                    const isSelected = selectedCategories.includes(row.id);
                                    const indent = row.level === 3 ? 'pl-8' : (row.level === 2 ? 'pl-4' : 'pl-2');
                                    return (
                                        <tr key={row.id} className="hover:bg-gray-50 transition-colors group/row">
                                            <td onClick={() => onToggleCategory(row.id)} className={`sticky left-0 z-30 py-0.5 border-r border-gray-100 text-xs bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover/row:bg-gray-50 transition-colors cursor-pointer select-none ${row.level === 1 ? 'bg-indigo-50 text-indigo-900 font-bold border-t border-indigo-100' : ''} ${row.level === 2 ? 'bg-gray-50 text-gray-800 font-semibold border-t border-gray-200' : ''}`}>
                                                <div className={`flex items-center gap-2 ${indent}`}>
                                                    {row.level === 2 && <button onClick={(e) => { e.stopPropagation(); setExpandedGroups(prev => { const n = new Set(prev); if (n.has(row.id)) n.delete(row.id); else n.add(row.id); return n; }); }} className="p-0.5 hover:bg-gray-200 rounded text-gray-500">{expandedGroups.has(row.id) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button>}
                                                    {row.level !== 2 && <div className="w-4" />} 
                                                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500' : 'border border-gray-300 bg-white'}`}>{isSelected && <Check size={10} className="text-white" strokeWidth={3} />}</div>
                                                    <span className="truncate">{row.name}</span>
                                                </div>
                                            </td>
                                            {row.values.map((actualVal, colIdx) => {
                                                const planVal = row.planValues[colIdx];
                                                const date = filteredData.dates[colIdx];
                                                const isFuture = date >= SIMULATION_TODAY;
                                                
                                                let displayVal: any = actualVal;
                                                let cellValForColor: any = actualVal;
                                                let modeForStyle = viewMode;
                                                let diff = 0;
                                                if (viewMode === 'smart') { 
                                                    if (isFuture) { 
                                                        displayVal = planVal; 
                                                        cellValForColor = planVal; 
                                                        modeForStyle = 'plan'; 
                                                    } else { 
                                                        displayVal = actualVal; 
                                                        diff = planVal !== 0 ? ((actualVal! - planVal) / planVal) * 100 : 0; 
                                                        cellValForColor = actualVal; 
                                                        modeForStyle = 'actual'; 
                                                    } 
                                                } 
                                                else if (viewMode === 'plan') { displayVal = planVal; cellValForColor = planVal; } 
                                                else if (viewMode === 'diff') { if (isFuture) { displayVal = '--'; cellValForColor = null; } else { const dp = planVal !== 0 ? ((actualVal! - planVal) / planVal) * 100 : 0; displayVal = `${dp > 0 ? '+' : ''}${dp.toFixed(1)}%`; cellValForColor = dp; } } 
                                                else { if (isFuture) { displayVal = '--'; cellValForColor = null; } }
                                                const { background, colorClass, isDarkBg } = getHeatmapStyles(cellValForColor, modeForStyle === 'plan' ? row.planValues : (modeForStyle === 'diff' ? [] : row.values), row.level, modeForStyle as any);
                                                return (
                                                    <td key={colIdx} onClick={() => handleCellClick(row, colIdx, planVal, date)} className={`p-0 relative border border-gray-50 h-4 ${isFuture && !['plan', 'smart'].includes(viewMode) ? 'bg-gray-50/50' : ''}`}>
                                                        <div className={`w-full h-full flex items-center justify-center text-[10px] group relative ${colorClass} ${((viewMode === 'plan' || (viewMode === 'smart' && isFuture)) && row.region !== 'Total') ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:z-10' : ''}`} style={{ backgroundColor: background }}>
                                                             {viewMode === 'smart' && !isFuture && actualVal !== null ? <span className={`${row.level < 3 ? 'font-bold' : ''} flex items-baseline justify-center gap-0.5`}>{actualVal}<span className={`text-[8px] font-normal ${isDarkBg ? (diff >= 0 ? 'text-emerald-200' : 'text-red-200') : (diff >= 0 ? 'text-emerald-600' : 'text-red-600')}`}>({diff > 0 ? '+' : ''}{diff.toFixed(0)}%)</span></span> : <span className={`${row.level < 3 ? 'font-bold' : ''}`}>{displayVal}</span>}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};
