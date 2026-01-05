import React, { useState, useEffect } from 'react';
import { TrendLevel, UniversalNode, YearlyNode, EventType, NodeRecord } from '../types';
import { X, Plus, Trash2, FileSpreadsheet, Sparkles, ArrowRight } from 'lucide-react';
import { analyzeSalesData } from '../services/geminiService';

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (node: Partial<UniversalNode | YearlyNode>) => void;
  isYearly: boolean;
  initialData?: UniversalNode | YearlyNode | null;
}

export const AddNodeModal: React.FC<AddNodeModalProps> = ({ isOpen, onClose, onSave, isYearly, initialData }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'records' | 'analysis'>('basic');
  const [formData, setFormData] = useState<Partial<UniversalNode | YearlyNode>>({
    title: '',
    month: 1,
    description: '',
    salesTrend: TrendLevel.MEDIUM,
    isLunar: false,
    tags: [],
    periodDescription: '',
    records: []
  });

  // State for new record entry
  const [newRecord, setNewRecord] = useState<Partial<NodeRecord>>({
    category: '备注',
    content: ''
  });

  // State for AI Analysis
  const [excelData, setExcelData] = useState('');
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [analysisResults, setAnalysisResults] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        title: '',
        month: 1,
        description: '',
        salesTrend: TrendLevel.MEDIUM,
        isLunar: false,
        tags: [],
        periodDescription: '',
        records: []
      });
    }
    setActiveTab('basic');
    setExcelData('');
    setAnalysisResults([]);
    setAnalysisPrompt('');
  }, [initialData, isOpen]);

  const handleAddRecord = () => {
    if (!newRecord.content) return;
    addRecordToForm(newRecord.category as any || '备注', newRecord.content);
    setNewRecord({ category: '备注', content: '' });
  };

  const addRecordToForm = (category: NodeRecord['category'], content: string) => {
    const record: NodeRecord = {
        id: `r_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category: category,
        content: content,
        createdAt: new Date().toISOString()
      };
      setFormData(prev => ({
        ...prev,
        records: [...(prev.records || []), record]
      }));
  };

  const handleRemoveRecord = (id: string) => {
    setFormData(prev => ({
      ...prev,
      records: prev.records?.filter(r => r.id !== id) || []
    }));
  };

  const handleAnalyzeData = async () => {
      if (!excelData) return;
      setIsAnalyzing(true);
      const results = await analyzeSalesData(excelData, analysisPrompt);
      setAnalysisResults(results);
      setIsAnalyzing(false);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">
            {initialData ? (isYearly ? '管理计划与复盘' : '编辑通用节点') : '添加时间节点'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
            <button 
                onClick={() => setActiveTab('basic')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'basic' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                基本信息
            </button>
            <button 
                onClick={() => setActiveTab('records')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'records' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                {isYearly ? '复盘记录' : '季节特征'} 
                <span className="ml-2 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                    {formData.records?.length || 0}
                </span>
            </button>
            <button 
                onClick={() => setActiveTab('analysis')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'analysis' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Sparkles size={14} /> AI数据分析
            </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          {activeTab === 'basic' && (
              <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                    <input 
                    required
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="例如：春季大促"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">月份 (公历)</label>
                        <select 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            value={formData.month}
                            onChange={e => setFormData({...formData, month: parseInt(e.target.value)})}
                        >
                            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{m}月</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">趋势热度</label>
                        <select 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            value={formData.salesTrend}
                            onChange={e => setFormData({...formData, salesTrend: e.target.value as TrendLevel})}
                        >
                            {Object.values(TrendLevel).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                {!isYearly && (
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox"
                            id="isLunar"
                            checked={formData.isLunar}
                            onChange={e => setFormData({...formData, isLunar: e.target.checked})}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                        />
                        <label htmlFor="isLunar" className="text-sm text-gray-700">农历相关? (如春节、中秋)</label>
                    </div>
                )}

                {isYearly && (
                    <div className="grid grid-cols-2 gap-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div>
                            <label className="block text-xs font-bold text-blue-800 mb-1">销售目标 (¥)</label>
                            <input 
                                type="number"
                                className="w-full px-2 py-1 text-sm border border-blue-200 rounded focus:ring-blue-500"
                                value={(formData as YearlyNode).targetSales || 0}
                                onChange={e => setFormData({...formData, targetSales: parseFloat(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-blue-800 mb-1">实际销售 (¥)</label>
                            <input 
                                type="number"
                                className="w-full px-2 py-1 text-sm border border-blue-200 rounded focus:ring-blue-500"
                                value={(formData as YearlyNode).actualSales || 0}
                                onChange={e => setFormData({...formData, actualSales: parseFloat(e.target.value)})}
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                    <textarea 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="描述该节点的关键活动内容..."
                    ></textarea>
                </div>
              </div>
          )}

          {activeTab === 'records' && (
              <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">添加新记录</h4>
                      <div className="flex gap-2 mb-2">
                          <select 
                            className="px-2 py-1.5 border border-gray-300 rounded text-sm w-1/3"
                            value={newRecord.category}
                            onChange={e => setNewRecord({...newRecord, category: e.target.value as any})}
                          >
                              <option value="趋势分析">趋势分析</option>
                              <option value="节日影响">节日影响</option>
                              <option value="销售特征">销售特征</option>
                              <option value="竞品动作">竞品动作</option>
                              <option value="备注">通用备注</option>
                          </select>
                          <input 
                             type="text"
                             className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                             placeholder="记录详情..."
                             value={newRecord.content}
                             onChange={e => setNewRecord({...newRecord, content: e.target.value})}
                             onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddRecord())}
                          />
                          <button 
                            type="button"
                            onClick={handleAddRecord}
                            className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
                          >
                              <Plus size={16} />
                          </button>
                      </div>
                      <p className="text-xs text-gray-400">添加关键经验、天气影响或特定事件观察。</p>
                  </div>

                  <div className="space-y-2">
                      {formData.records?.map(record => (
                          <div key={record.id} className="flex justify-between items-start bg-white p-3 rounded border border-gray-200 shadow-sm">
                              <div>
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                          {record.category}
                                      </span>
                                      <span className="text-[10px] text-gray-400">
                                          {new Date(record.createdAt).toLocaleDateString()}
                                      </span>
                                  </div>
                                  <p className="text-sm text-gray-700">{record.content}</p>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveRecord(record.id)}
                                className="text-gray-400 hover:text-red-500 p-1"
                              >
                                  <Trash2 size={14} />
                              </button>
                          </div>
                      ))}
                      {(!formData.records || formData.records.length === 0) && (
                          <div className="text-center text-sm text-gray-400 py-4">暂无记录，请在上方添加。</div>
                      )}
                  </div>
              </div>
          )}

          {activeTab === 'analysis' && (
              <div className="space-y-4 h-full flex flex-col">
                  <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-2">
                      <div className="flex items-start gap-2">
                          <FileSpreadsheet className="text-indigo-600 mt-1" size={18} />
                          <div className="text-sm text-indigo-900">
                              <p className="font-semibold">智能数据分析</p>
                              <p className="text-xs opacity-80 mt-1">
                                  直接粘贴 Excel 中的销售数据（如品类、销售额、达成率），AI 将自动提炼关键复盘要点。
                              </p>
                          </div>
                      </div>
                  </div>

                  <div className="flex-1 space-y-3">
                      <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">粘贴 Excel 数据</label>
                          <textarea 
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono h-24 focus:ring-2 focus:ring-indigo-500 resize-none"
                              placeholder={`品类\t销售额\t同比\n外套\t50000\t+12%\n...`}
                              value={excelData}
                              onChange={e => setExcelData(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">补充提示词 (可选)</label>
                          <input 
                              type="text" 
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                              placeholder="例如：重点关注羽绒服的售罄率"
                              value={analysisPrompt}
                              onChange={e => setAnalysisPrompt(e.target.value)}
                          />
                      </div>
                      
                      <button 
                          type="button"
                          onClick={handleAnalyzeData}
                          disabled={isAnalyzing || !excelData}
                          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                          {isAnalyzing ? (
                              <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> 分析中...</span>
                          ) : (
                              <><Sparkles size={16} /> 开始分析</>
                          )}
                      </button>
                  </div>

                  {analysisResults.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                          <h4 className="text-xs font-bold text-gray-600 mb-2">分析结果 (点击添加)</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {analysisResults.map((result, idx) => (
                                  <button
                                      key={idx}
                                      type="button"
                                      onClick={() => addRecordToForm('趋势分析', result)}
                                      className="w-full text-left p-2.5 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-lg group transition-all flex justify-between items-center gap-2"
                                  >
                                      <span className="text-sm text-gray-700">{result}</span>
                                      <div className="opacity-0 group-hover:opacity-100 text-indigo-600 bg-white rounded-full p-1 shadow-sm">
                                          <Plus size={14} />
                                      </div>
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
            <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium"
            >
                取消
            </button>
            <button 
                onClick={handleSubmit}
                className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium shadow-sm"
            >
                保存{isYearly ? '计划' : '节点'}
            </button>
        </div>
      </div>
    </div>
  );
};