import React, { useState } from 'react';
import { UniversalNode, YearlyNode, TrendLevel, NodeRecord } from '../types';
import { TREND_COLORS } from '../constants';
import { Sparkles, Edit3, MessageSquareText, TrendingUp, AlertCircle, ShoppingBag } from 'lucide-react';
import { getPlanningAdvice } from '../services/geminiService';

interface TimelineCardProps {
  node: UniversalNode | YearlyNode;
  isYearlyView: boolean;
  onEdit?: (node: UniversalNode | YearlyNode) => void;
}

const CategoryIcon = ({ category }: { category: NodeRecord['category'] }) => {
  switch (category) {
    case '节日影响': return <AlertCircle size={12} className="text-orange-500" />;
    case '销售特征': return <ShoppingBag size={12} className="text-green-500" />;
    case '趋势分析': return <TrendingUp size={12} className="text-blue-500" />;
    default: return <MessageSquareText size={12} className="text-gray-500" />;
  }
};

export const TimelineCard: React.FC<TimelineCardProps> = ({ node, isYearlyView, onEdit }) => {
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const handleGetInsight = async () => {
    setLoadingAi(true);
    // Pass the records to the AI service to base advice on user observations
    const advice = await getPlanningAdvice(
        node.title, 
        node.periodDescription, 
        node.tags, 
        node.records || []
    );
    setAiAdvice(advice);
    setLoadingAi(false);
  };

  const isCompleted = isYearlyView && (node as YearlyNode).status === 'completed';

  return (
    <div className={`relative pl-8 pb-8 border-l-2 ${isCompleted ? 'border-green-500' : 'border-gray-300'} last:border-0`}>
      {/* Connector Dot */}
      <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${isCompleted ? 'bg-green-500' : 'bg-indigo-500'}`}></div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow group">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                {isYearlyView ? (node as YearlyNode).specificDate : `${node.month}月`}
              </span>
              {node.isLunar && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                  农历
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{node.title}</h3>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border ${TREND_COLORS[node.salesTrend]}`}>
            趋势: {node.salesTrend}
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-4">{node.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {node.tags.map(tag => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              #{tag}
            </span>
          ))}
        </div>

        {/* Records / Insights Section */}
        {node.records && node.records.length > 0 && (
          <div className="mb-4 bg-yellow-50/50 rounded-lg p-3 border border-yellow-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
              <MessageSquareText size={12} />
              {isYearlyView ? '复盘记录' : '关键特征'}
            </h4>
            <div className="space-y-2">
              {node.records.map((record) => (
                <div key={record.id} className="text-sm flex gap-2 items-start">
                   <div className="mt-0.5"><CategoryIcon category={record.category} /></div>
                   <div>
                      <span className="text-xs font-medium text-gray-700 mr-1">[{record.category}]:</span>
                      <span className="text-gray-600">{record.content}</span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Yearly View Specifics: Sales Data */}
        {isYearlyView && (
            <div className="bg-slate-50 p-3 rounded-md mb-4 border border-slate-100">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="block text-gray-500 text-xs">目标 (Target)</span>
                        <span className="font-medium text-gray-900">¥{(node as YearlyNode).targetSales?.toLocaleString()}</span>
                    </div>
                    <div>
                        <span className="block text-gray-500 text-xs">实际 (Actual)</span>
                        <span className={`font-medium ${(node as YearlyNode).actualSales! >= (node as YearlyNode).targetSales! ? 'text-green-600' : 'text-amber-600'}`}>
                            ¥{(node as YearlyNode).actualSales?.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        )}

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
            <div className="flex gap-2">
                 <button 
                    onClick={handleGetInsight}
                    disabled={loadingAi}
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50"
                >
                    <Sparkles size={14} />
                    {loadingAi ? 'AI 总结中...' : 'AI 补货建议'}
                </button>
            </div>
          
            {onEdit && (
                <button 
                    onClick={() => onEdit(node)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 bg-white border border-gray-200 px-2 py-1 rounded shadow-sm hover:shadow transition-all"
                >
                    <Edit3 size={12} />
                    {isYearlyView ? '复盘/编辑' : '编辑节点'}
                </button>
            )}
        </div>

        {aiAdvice && (
          <div className="mt-3 p-3 bg-indigo-50 rounded-md text-xs text-indigo-900 border border-indigo-100 animate-fadeIn">
            <div className="font-semibold mb-1 flex items-center gap-1">
                <Sparkles size={10} /> Gemini 智能建议
            </div>
            <div className="whitespace-pre-line leading-relaxed">{aiAdvice}</div>
          </div>
        )}
      </div>
    </div>
  );
};