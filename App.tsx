
import React, { useState, useEffect, useMemo } from 'react';
import { UniversalNode, YearlyNode, TrendLevel, SalesDataRow, StoreCountData } from './types';
import { INITIAL_UNIVERSAL_NODES } from './constants';
import { TimelineCard } from './components/TimelineCard';
import { AddNodeModal } from './components/AddNodeModal';
import { SalesHeatmapTable } from './components/SalesHeatmapTable';
import { generateYearlyNodes, MOCK_DATA, SIMULATION_TODAY, addDays, DATA_START_DATE, DATA_END_DATE } from './utils';
import { dataService } from './services/dataService'; 
import { 
  LayoutDashboard, 
  CalendarDays, 
  Plus, 
  BarChart3, 
  Settings2,
  ChevronRight,
  TrendingUp,
  History,
  Calendar,
  Target,
  Percent,
  ArrowRight,
  Filter,
  Layers,
  Table2,
  Loader2
} from 'lucide-react';

function App() {
  const [view, setView] = useState<'universal' | 'yearly'>('universal');
  const [currentYear, setCurrentYear] = useState(2025);
  
  const [universalNodes, setUniversalNodes] = useState<UniversalNode[]>(INITIAL_UNIVERSAL_NODES);
  const [yearlyNodes, setYearlyNodes] = useState<YearlyNode[]>([]);
  const [salesData, setSalesData] = useState<SalesDataRow[]>([]); 
  const [storeCounts, setStoreCounts] = useState<StoreCountData[]>([]); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<UniversalNode | YearlyNode | null>(null);

  const [startDate, setStartDate] = useState(addDays(SIMULATION_TODAY, -7));
  const [endDate, setEndDate] = useState(addDays(SIMULATION_TODAY, 14));

  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Total_total']);

  useEffect(() => {
    const initData = async () => {
        try {
            setIsLoading(true);
            await dataService.connect();
            const [sales, stores] = await Promise.all([
                dataService.getSalesData(),
                dataService.getStoreCounts()
            ]);
            setSalesData(sales);
            setStoreCounts(stores);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    };
    initData();
  }, []);

  useEffect(() => {
    const generated = generateYearlyNodes(universalNodes, currentYear);
    setYearlyNodes(generated);
  }, [currentYear, universalNodes]);

  const handleSaveNode = (data: Partial<UniversalNode | YearlyNode>) => {
    if (view === 'universal') {
        if (editingNode) {
            setUniversalNodes(prev => prev.map(n => n.id === editingNode.id ? { ...n, ...data } as UniversalNode : n));
        } else {
            const newNode: UniversalNode = {
                id: `u_${Date.now()}`,
                title: data.title || '新事件',
                month: data.month || 1,
                periodDescription: data.periodDescription || '自定义时间段',
                isLunar: !!data.isLunar,
                description: data.description || '',
                salesTrend: data.salesTrend || TrendLevel.MEDIUM,
                tags: data.tags || [],
                records: data.records || [],
            };
            setUniversalNodes(prev => [...prev, newNode].sort((a, b) => a.month - b.month));
        }
    } 
    setEditingNode(null);
  };

  const handlePlanUpdate = async (rowId: string, dateIndex: number, newValue: number) => {
    try {
        const updatedSalesData = await dataService.updateSalesPlan(rowId, dateIndex, newValue);
        setSalesData(updatedSalesData);
    } catch (err) {
        console.error("Failed to update plan", err);
        alert("更新失败，请重试");
    }
  };

  const handleStoreCountUpdate = async (region: 'SH' | 'JS', dateIndex: number, newCount: number) => {
      try {
          const result = await dataService.updateStoreCount(region, dateIndex, newCount);
          setStoreCounts(result.storeCounts);
          setSalesData(result.salesData);
      } catch (err) {
          console.error("Failed to update store count", err);
          alert("更新失败，请重试");
      }
  };

  const calculateStats = (rowIds: string[]) => {
    const targetRows = salesData.filter(row => rowIds.includes(row.id));
    
    if (targetRows.length === 0) return { avgActual: 0, avgPlanPast: 0, avgPlanFuture: 0, rate: 0, diffPercent: 0, diffValue: 0, hasFuture: false, hasPast: false, totalPlanFuture: 0 };

    let actualSum = 0;
    let pastCount = 0;
    let pastPlanSum = 0;

    let futurePlanSum = 0;
    let futureCount = 0;

    MOCK_DATA.dates.forEach((date, idx) => {
        if (date >= startDate && date <= endDate) {
            const dailyPlan = targetRows.reduce((acc, row) => acc + (row.planValues[idx] || 0), 0);
            
            // CHANGE: Only count as "Past" if date is STRICTLY BEFORE today (up to yesterday)
            if (date < SIMULATION_TODAY) {
                const dailyActual = targetRows.reduce((acc, row) => acc + (row.values[idx] || 0), 0);
                actualSum += dailyActual;
                pastPlanSum += dailyPlan;
                pastCount++;
            } else {
                // Today and Future dates
                futurePlanSum += dailyPlan;
                futureCount++;
            }
        }
    });

    const avgActual = pastCount > 0 ? actualSum / pastCount : 0;
    const avgPlanPast = pastCount > 0 ? pastPlanSum / pastCount : 0;
    const avgPlanFuture = futureCount > 0 ? futurePlanSum / futureCount : 0;

    const rate = pastPlanSum > 0 ? (actualSum / pastPlanSum) * 100 : 0;
    const diffPercent = pastPlanSum > 0 ? ((actualSum - pastPlanSum) / pastPlanSum) * 100 : 0;
    const diffValue = avgActual - avgPlanPast;

    return { 
        avgActual, 
        avgPlanPast, 
        avgPlanFuture, 
        rate, 
        diffPercent, 
        diffValue,
        hasPast: pastCount > 0,
        hasFuture: futureCount > 0,
        totalPlanFuture: futurePlanSum 
    };
  };

  const summaryStats = useMemo(() => calculateStats(['Total_total']), [startDate, endDate, salesData]);

  const isTotalSelected = selectedCategories.length === 1 && selectedCategories[0] === 'Total_total';

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full z-10 hidden md:block">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <LayoutDashboard className="text-indigo-600" />
            RetailFlow
          </h1>
          <p className="text-xs text-gray-500 mt-1">计划 · 复盘 · 增长</p>
        </div>
        
        <nav className="p-4 space-y-2">
          <button 
            onClick={() => setView('universal')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              view === 'universal' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Settings2 size={18} />
            通用规划模板
          </button>
          
          <button 
            onClick={() => setView('yearly')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              view === 'yearly' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={18} />
            订货/销售计划
          </button>
        </nav>
      </aside>

      <main className="flex-1 md:ml-64 p-4 md:p-8 w-full flex flex-col h-screen overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {view === 'universal' ? '通用订货规划时间轴' : '订货与销售追踪'}
              </h2>
              {view === 'yearly' && (
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm ml-2">
                      <button onClick={() => setCurrentYear(y => y-1)} className="hover:bg-gray-50 p-1 rounded text-gray-500"><ChevronRight size={16} className="rotate-180"/></button>
                      <span className="text-sm font-bold text-indigo-600 min-w-[3rem] text-center">{currentYear}年</span>
                      <button onClick={() => setCurrentYear(y => y+1)} className="hover:bg-gray-50 p-1 rounded text-gray-500"><ChevronRight size={16}/></button>
                  </div>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-1">
              {view === 'universal' 
                ? '管理通用的季节性节点和节日规则库，用于指导未来的订货策略。' 
                : '实时追踪实际销售与订货计划的偏差，及时调整补货策略。'}
            </p>
          </div>
          
          {view === 'yearly' && (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                  <Calendar size={16} className="text-indigo-500" />
                  <div className="flex items-center gap-2 text-sm">
                      <input 
                          type="date" 
                          value={startDate}
                          min={DATA_START_DATE}
                          max={DATA_END_DATE}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-gray-700 p-0 font-medium cursor-pointer outline-none"
                      />
                      <span className="text-gray-400">-</span>
                      <input 
                          type="date" 
                          value={endDate}
                          min={DATA_START_DATE}
                          max={DATA_END_DATE}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-gray-700 p-0 font-medium cursor-pointer outline-none"
                      />
                  </div>
              </div>
          )}

          {view === 'universal' && (
            <button 
                onClick={() => { setEditingNode(null); setIsModalOpen(true); }}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg shadow-sm font-medium transition-all"
            >
                <Plus size={18} />
                添加节点
            </button>
          )}
        </header>

        {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                <p>正在连接数据仓库...</p>
            </div>
        ) : (
            <>
                {view === 'yearly' && (
                    <div className="flex flex-col flex-1 gap-6 pb-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <TrendingUp className="text-blue-600" size={60}/>
                                </div>
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="bg-blue-50 p-2 rounded-lg"><TrendingUp className="text-blue-600" size={20}/></div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${summaryStats.rate >= 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        达成率 {summaryStats.rate.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="text-gray-500 text-xs uppercase font-semibold relative z-10">截至昨日日均实销</div>
                                <div className="text-2xl font-bold text-gray-900 mt-1 relative z-10">
                                    {summaryStats.hasPast ? `¥${summaryStats.avgActual.toLocaleString(undefined, {maximumFractionDigits: 0})}` : '--'}
                                </div>
                                <div className="text-xs text-gray-400 mt-2">基于已发生的销售记录</div>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Target className="text-purple-600" size={60}/>
                                </div>
                                <div className="flex justify-between items-start mb-2 relative z-10">
                                    <div className="bg-purple-50 p-2 rounded-lg"><Target className="text-purple-600" size={20}/></div>
                                </div>
                                <div className="text-gray-500 text-xs uppercase font-semibold relative z-10 mb-2">日均计划值比较</div>
                                
                                <div className="space-y-2 relative z-10">
                                    <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                                        <span className="text-xs text-gray-400">历史已发生:</span>
                                        <span className="text-lg font-bold text-gray-800">
                                            {summaryStats.hasPast ? `¥${summaryStats.avgPlanPast.toLocaleString(undefined, {maximumFractionDigits: 0})}` : '--'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-400">今日及未来:</span>
                                        <span className="text-lg font-bold text-purple-600">
                                            {summaryStats.hasFuture ? `¥${summaryStats.avgPlanFuture.toLocaleString(undefined, {maximumFractionDigits: 0})}` : '--'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Percent className="text-orange-600" size={60}/>
                                </div>
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="bg-orange-50 p-2 rounded-lg"><Percent className="text-orange-600" size={20}/></div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${summaryStats.diffPercent > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {summaryStats.diffPercent > 0 ? '+' : ''}{summaryStats.diffPercent.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="text-gray-500 text-xs uppercase font-semibold relative z-10">昨日累计偏差</div>
                                <div className="text-sm mt-1 text-gray-600 relative z-10 font-medium">
                                    {summaryStats.hasPast ? (
                                        <>
                                            {summaryStats.diffValue > 0 ? '+' : ''}{summaryStats.diffValue.toLocaleString(undefined, {maximumFractionDigits: 0})} (日均差值)
                                        </>
                                    ) : '--'}
                                </div>
                                <div className="text-xs text-gray-400 mt-2">不含今日预测</div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm shrink-0 overflow-hidden transition-all duration-500 ease-in-out">
                            <div className="px-5 py-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="bg-indigo-600 p-1.5 rounded-md text-white">
                                        <Table2 size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                            分类复盘详情 <span className="font-normal text-gray-400">|</span> <span className="text-indigo-600">{selectedCategories.length} 个选定</span>
                                        </h3>
                                    </div>
                                </div>
                                {!isTotalSelected && (
                                    <button 
                                        onClick={() => setSelectedCategories(['Total_total'])}
                                        className="text-xs text-slate-500 hover:text-indigo-600 underline"
                                    >
                                        返回整体
                                    </button>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-2 text-left w-1/5">品类/区域</th>
                                            <th className="px-4 py-2 text-right">日均实销<span className="text-[10px] font-normal block text-gray-400">截至昨日</span></th>
                                            <th className="px-4 py-2 text-right">日均计划<span className="text-[10px] font-normal block text-gray-400">历史期间</span></th>
                                            <th className="px-4 py-2 text-right">偏差值</th>
                                            <th className="px-4 py-2 text-right">达成率</th>
                                            <th className="px-4 py-2 text-right bg-purple-50/50 text-purple-900 border-l border-purple-100">未来计划<span className="text-[10px] font-normal block text-purple-400">今日起</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {selectedCategories.map((id) => {
                                            const stats = calculateStats([id]);
                                            const row = salesData.find(r => r.id === id);
                                            const name = row ? `${row.region === 'Total' ? '' : `[${row.region}] `}${row.name}` : id;
                                            
                                            return (
                                                <tr key={id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-4 py-2 font-semibold text-gray-800">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${id === 'Total_total' ? 'bg-indigo-500' : 'bg-gray-300 group-hover:bg-indigo-400'}`}></div>
                                                            {name}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                                                        {stats.hasPast ? `¥${stats.avgActual.toLocaleString(undefined, {maximumFractionDigits: 0})}` : '--'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-gray-500">
                                                        {stats.hasPast ? `¥${stats.avgPlanPast.toLocaleString(undefined, {maximumFractionDigits: 0})}` : '--'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        {stats.hasPast ? (
                                                            <span className={`font-bold ${stats.diffValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {stats.diffValue > 0 ? '+' : ''}{stats.diffValue.toLocaleString(undefined, {maximumFractionDigits: 0})}
                                                            </span>
                                                        ) : '--'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        {stats.hasPast ? (
                                                            <span className={`text-xs font-bold ${stats.rate >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {stats.rate.toFixed(1)}%
                                                            </span>
                                                        ) : '--'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right bg-purple-50/30 border-l border-purple-50">
                                                        <span className="font-bold text-purple-700">
                                                            {stats.hasFuture ? `¥${stats.avgPlanFuture.toLocaleString(undefined, {maximumFractionDigits: 0})}` : '--'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="w-full h-[800px]">
                            <SalesHeatmapTable 
                                data={salesData}
                                storeCounts={storeCounts}
                                startDate={startDate} 
                                endDate={endDate}
                                selectedCategories={selectedCategories}
                                onToggleCategory={(id) => {
                                    setSelectedCategories(prev => {
                                        let next;
                                        if (prev.includes(id)) {
                                            next = prev.filter(c => c !== id);
                                        } else {
                                            next = [...prev, id];
                                        }
                                        if (next.length === 0) return ['Total_total'];
                                        
                                        return next;
                                    });
                                }}
                                onUpdatePlan={handlePlanUpdate}
                                onUpdateStoreCount={handleStoreCountUpdate}
                            />
                        </div>
                    </div>
                )}

                {view === 'universal' && (
                    <div className="max-w-4xl overflow-y-auto">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                            <div className="space-y-0">
                                {universalNodes.map((node) => (
                                    <TimelineCard 
                                        key={node.id} 
                                        node={node} 
                                        isYearlyView={false}
                                        onEdit={(n) => { setEditingNode(n); setIsModalOpen(true); }}
                                    />
                                ))}
                                
                                {universalNodes.length === 0 && (
                                    <div className="text-center py-12 text-gray-400">
                                        <p>暂无规划节点。请点击右上角添加。</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </>
        )}
      </main>

      <AddNodeModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingNode(null); }}
        onSave={handleSaveNode}
        isYearly={view === 'yearly'}
        initialData={editingNode}
      />
    </div>
  );
}

export default App;
