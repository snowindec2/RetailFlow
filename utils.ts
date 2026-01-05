
import { UniversalNode, YearlyNode, SalesDataRow, StoreCountData, Region } from './types';

// --- Constants moved from SalesHeatmapTable ---
export const SIMULATION_TODAY = "2025-01-08"; 
export const DATA_START_DATE = "2024-12-01";
export const DATA_END_DATE = "2025-02-28";

// 3-Level Hierarchy Definition
export const HIERARCHY_CONFIG = [
  {
    id: "fresh_dept",
    name: "生鲜", // Level 2
    children: ["烘焙", "蛋奶", "冷藏", "肉类", "果蔬"] // Level 3
  },
  {
    id: "standard_dept",
    name: "标冻", // Level 2
    children: ["冷冻", "酒饮", "早餐", "米面粮油", "水饮", "零食", "个护", "家清"] // Level 3
  }
];

// --- Helper Functions ---

export const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

export const getWeekday = (dateStr: string): string => {
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  return days[new Date(dateStr).getDay()];
};

// Simplified helper for demo purposes. 
const LUNAR_HOLIDAY_MAPPING: Record<number, Record<string, string>> = {
  2024: {
    '春节': '2024-02-10',
    '元宵节': '2024-02-24',
    '端午节': '2024-06-10',
    '七夕节': '2024-08-10',
    '中秋节': '2024-09-17',
  },
  2025: {
    '春节': '2025-01-29',
    '元宵节': '2025-02-12',
    '端午节': '2025-05-31',
    '七夕节': '2025-08-29',
    '中秋节': '2025-10-06',
  }
};

export const generateYearlyNodes = (universalNodes: UniversalNode[], year: number): YearlyNode[] => {
  return universalNodes.map((node) => {
    let specificDate = '';

    if (node.isLunar) {
        const yearMap = LUNAR_HOLIDAY_MAPPING[year];
        if (yearMap && yearMap[node.title]) {
            specificDate = yearMap[node.title];
        } else {
            specificDate = `${year}-${String(node.month).padStart(2, '0')}-15`;
        }
    } else {
        if (node.title === '元旦') specificDate = `${year}-01-01`;
        else if (node.title === '妇女节') specificDate = `${year}-03-08`;
        else if (node.title === '清明节') specificDate = `${year}-04-04`; 
        else if (node.title === '劳动节') specificDate = `${year}-05-01`;
        else if (node.title === '儿童节') specificDate = `${year}-06-01`;
        else if (node.title === '国庆节') specificDate = `${year}-10-01`;
        else specificDate = `${year}-${String(node.month).padStart(2, '0')}-01`;
    }

    return {
      ...node,
      id: `${node.id}_${year}`,
      year: year,
      specificDate: specificDate,
      status: 'planned' as const,
      actualSales: 0,
      targetSales: 0,
      reviewNotes: '',
      records: [] 
    };
  }).sort((a, b) => new Date(a.specificDate).getTime() - new Date(b.specificDate).getTime());
};

export const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
};

// --- Mock Data Generation Logic ---
const generateMockData = () => {
    const dates: string[] = [];
    const weekdays: string[] = [];
    const weather: { cond: string, temp: string }[] = [];
    let curr = DATA_START_DATE;
    
    const conditions = ["晴", "多云", "阴", "小雨", "雪"];
    
    while (curr <= DATA_END_DATE) {
        dates.push(curr);
        weekdays.push(getWeekday(curr));
        const cond = conditions[Math.floor(Math.random() * conditions.length)];
        const baseTemp = 15 - Math.floor(Math.random() * 20);
        weather.push({ cond, temp: `${baseTemp}℃~${baseTemp + 8}℃` });
        curr = addDays(curr, 1);
    }

    const numDays = dates.length;

    const shCounts = Array(numDays).fill(0).map(() => 80 + Math.floor(Math.random() * 5 - 2)); 
    const jsCounts = Array(numDays).fill(0).map(() => 20 + Math.floor(Math.random() * 3 - 1)); 
    
    const storeCounts: StoreCountData[] = [
        { region: 'SH', counts: shCounts },
        { region: 'JS', counts: jsCounts }
    ];

    const generateRowValues = (base: number, volatility: number) => {
        const values: (number | null)[] = [];
        const planValues: number[] = [];
        dates.forEach(date => {
             let plan = base * (1 + (Math.random() * volatility - volatility/2));
             if (getWeekday(date) === 'Sa' || getWeekday(date) === 'Su') plan *= 1.3;
             plan = parseFloat(plan.toFixed(1));
             planValues.push(plan);

             // CHANGE: Actual values only for dates BEFORE SIMULATION_TODAY (up to yesterday)
             if (date < SIMULATION_TODAY) {
                 const noise = (Math.random() * 0.2 - 0.1);
                 let actual = plan * (1 + noise);
                 if (Math.random() > 0.9) actual *= (Math.random() > 0.5 ? 1.2 : 0.8);
                 values.push(parseFloat(actual.toFixed(1)));
             } else {
                 values.push(null);
             }
        });
        return { values, planValues };
    };

    const tempRows: Record<string, SalesDataRow> = {};
    const regions: Region[] = ['SH', 'JS'];

    regions.forEach(region => {
        HIERARCHY_CONFIG.forEach(group => {
            group.children.forEach(catName => {
                const baseVal = (region === 'SH' ? 40 : 35) + Math.random() * 20; 
                const { values, planValues } = generateRowValues(baseVal, 0.4);
                const id = `${region}_${catName}`;
                tempRows[id] = {
                    name: catName,
                    id: id,
                    parentId: `${region}_${group.id}`,
                    level: 3,
                    region: region,
                    values,
                    planValues
                };
            });
        });
    });

    regions.forEach(region => {
        HIERARCHY_CONFIG.forEach(group => {
            const childrenIds = group.children.map(c => `${region}_${c}`);
            const children = childrenIds.map(id => tempRows[id]).filter(Boolean);
            
            const values = dates.map((_, idx) => {
                if (dates[idx] >= SIMULATION_TODAY) return null; // CHANGE: Up to yesterday
                const sum = children.reduce((acc, c) => acc + (c.values[idx] || 0), 0);
                return parseFloat(sum.toFixed(1));
            });
    
            const planValues = dates.map((_, idx) => {
                const sum = children.reduce((acc, c) => acc + c.planValues[idx], 0);
                return parseFloat(sum.toFixed(1));
            });

            const id = `${region}_${group.id}`;
            tempRows[id] = {
                name: group.name,
                id: id,
                parentId: `${region}_total`,
                level: 2,
                region: region,
                isGroup: true,
                values,
                planValues
            };
        });
    });

    regions.forEach(region => {
        const groupIds = HIERARCHY_CONFIG.map(g => `${region}_${g.id}`);
        const groups = groupIds.map(id => tempRows[id]).filter(Boolean);

        const values = dates.map((_, idx) => {
            if (dates[idx] >= SIMULATION_TODAY) return null; // CHANGE: Up to yesterday
            const sum = groups.reduce((acc, g) => acc + (g.values[idx] || 0), 0);
            return parseFloat(sum.toFixed(1));
        });
    
        const planValues = dates.map((_, idx) => {
            const sum = groups.reduce((acc, g) => acc + g.planValues[idx], 0);
            return parseFloat(sum.toFixed(1));
        });

        const id = `${region}_total`;
        tempRows[id] = {
            name: region === 'SH' ? '上海大区' : '江苏大区',
            id: id,
            parentId: 'root',
            level: 1,
            region: region,
            isTotal: true,
            values,
            planValues
        };
    });

    const calcWeighted = (
        shId: string, 
        jsId: string
    ) => {
        const shRow = tempRows[shId];
        const jsRow = tempRows[jsId];

        const vals = dates.map((_, idx) => {
             if (dates[idx] >= SIMULATION_TODAY) return null; // CHANGE: Up to yesterday
             const s = shRow?.values[idx] || 0;
             const j = jsRow?.values[idx] || 0;
             const sc = shCounts[idx];
             const jc = jsCounts[idx];
             return parseFloat(((s * sc + j * jc) / (sc + jc)).toFixed(1));
        });
        const plans = dates.map((_, idx) => {
             const s = shRow?.planValues[idx] || 0;
             const j = jsRow?.planValues[idx] || 0;
             const sc = shCounts[idx];
             const jc = jsCounts[idx];
             return parseFloat(((s * sc + j * jc) / (sc + jc)).toFixed(1));
        });
        return { values: vals, planValues: plans };
    };

    HIERARCHY_CONFIG.forEach(group => {
        group.children.forEach(catName => {
            const shId = `SH_${catName}`;
            const jsId = `JS_${catName}`;
            const { values, planValues } = calcWeighted(shId, jsId);
            const id = `Total_${catName}`;
            
            tempRows[id] = {
                name: catName,
                id: id,
                parentId: `Total_${group.id}`,
                level: 3,
                region: 'Total',
                values,
                planValues
            };
        });
    });

    HIERARCHY_CONFIG.forEach(group => {
        const shId = `SH_${group.id}`;
        const jsId = `JS_${group.id}`;
        const { values, planValues } = calcWeighted(shId, jsId);
        const id = `Total_${group.id}`;

        tempRows[id] = {
            name: group.name,
            id: id,
            parentId: `Total_total`,
            level: 2,
            region: 'Total',
            isGroup: true,
            values,
            planValues
        };
    });

    {
        const shId = `SH_total`;
        const jsId = `JS_total`;
        const { values, planValues } = calcWeighted(shId, jsId);
        const id = `Total_total`;
        
        tempRows[id] = {
            name: '整体 (加权店均)',
            id: id,
            parentId: null,
            level: 1,
            region: 'Total',
            isTotal: true,
            values,
            planValues
        };
    }

    const finalSalesData: SalesDataRow[] = [];
    const orderedRegions: Region[] = ['Total', 'SH', 'JS'];

    orderedRegions.forEach(region => {
        const root = tempRows[`${region}_total`];
        if(root) finalSalesData.push(root);

        HIERARCHY_CONFIG.forEach(group => {
            const groupRow = tempRows[`${region}_${group.id}`];
            if(groupRow) finalSalesData.push(groupRow);
            
            group.children.forEach(catName => {
                const leaf = tempRows[`${region}_${catName}`];
                if(leaf) finalSalesData.push(leaf);
            });
        });
    });

    return { 
        dates, 
        weekdays, 
        weather, 
        salesData: finalSalesData,
        storeCounts
    };
};

export const MOCK_DATA = generateMockData();
