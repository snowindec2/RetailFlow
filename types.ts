
export enum EventType {
  HOLIDAY = '节假日', // e.g., Spring Festival
  SEASONAL = '季节性', // e.g., Summer Start
  PROMOTION = '大促活动', // e.g., 618, 11.11
  REVIEW = '复盘总结', // Monthly Review
}

export enum TrendLevel {
  HIGH = '高',
  MEDIUM = '中',
  LOW = '低',
}

export interface NodeRecord {
  id: string;
  category: '趋势分析' | '节日影响' | '销售特征' | '竞品动作' | '备注';
  content: string;
  createdAt: string;
}

// Data structure for the Universal Timeline (Generic)
export interface UniversalNode {
  id: string;
  title: string;
  month: number; // 1-12
  periodDescription: string; // e.g., "Early Jan", "Late Dec"
  isLunar: boolean; // Does this depend on the lunar calendar?
  lunarMonth?: number;
  lunarDay?: number;
  description: string;
  salesTrend: TrendLevel;
  tags: string[];
  records: NodeRecord[]; // Universal characteristics/trends
}

// Data structure for the Specific Year Timeline (Concrete)
export interface YearlyNode extends UniversalNode {
  specificDate: string; // ISO Date String YYYY-MM-DD
  year: number;
  actualSales?: number;
  targetSales?: number;
  reviewNotes?: string;
  status: 'planned' | 'active' | 'completed';
  // Yearly nodes inherit 'records' from UniversalNode, 
  // but conceptually these will be specific reviews/observations for that year.
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export type Region = 'Total' | 'SH' | 'JS';

export interface SalesDataRow {
  name: string;
  id: string;
  parentId: string | null;
  level: number;
  region: Region; // New field
  values: (number | null)[];
  planValues: number[];
  isTotal?: boolean;
  isGroup?: boolean;
}

export interface StoreCountData {
    region: 'SH' | 'JS';
    counts: number[]; // Maps to the date indices
}
