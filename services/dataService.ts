import { MOCK_DATA, SIMULATION_TODAY } from '../utils';
import { SalesDataRow, StoreCountData, UniversalNode, YearlyNode } from '../types';

// --- In-Memory Database Simulation ---
// In a real app, this state resides in your database (MySQL/Mongo).
// Here we initialize it from our mock generator.
let DB = {
    salesData: JSON.parse(JSON.stringify(MOCK_DATA.salesData)) as SalesDataRow[],
    storeCounts: JSON.parse(JSON.stringify(MOCK_DATA.storeCounts)) as StoreCountData[],
    universalNodes: [] as UniversalNode[], // Will be populated if needed or kept separate
    yearlyNodes: [] as YearlyNode[]
};

// Helper to simulate network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Calculation Logic (Business Logic that usually lives on the server)
const calculateWeightedTotal = (valSH: number, valJS: number, countSH: number, countJS: number) => {
    const totalCount = countSH + countJS;
    if (totalCount === 0) return 0;
    return parseFloat(((valSH * countSH + valJS * countJS) / totalCount).toFixed(1));
};

export const dataService = {
    /**
     * Initialize or Reset Data (Simulate connecting to DB)
     */
    connect: async () => {
        await delay(500); // Simulate connection time
        return true;
    },

    /**
     * Get Sales Data (Heatmap)
     */
    getSalesData: async (): Promise<SalesDataRow[]> => {
        await delay(300);
        // Return a copy to prevent mutation bugs
        return JSON.parse(JSON.stringify(DB.salesData)); 
    },

    /**
     * Get Store Counts
     */
    getStoreCounts: async (): Promise<StoreCountData[]> => {
        await delay(200);
        return JSON.parse(JSON.stringify(DB.storeCounts));
    },

    /**
     * Update a specific plan value and recalculate all hierarchies.
     * This simulates a complex Backend POST/PUT request.
     */
    updateSalesPlan: async (rowId: string, dateIndex: number, newValue: number): Promise<SalesDataRow[]> => {
        await delay(200); // Simulate network

        const newData = DB.salesData; // Reference to "DB"
        const targetRow = newData.find(r => r.id === rowId);
        
        if (!targetRow) throw new Error("Row not found");

        // 1. Update target
        targetRow.planValues[dateIndex] = newValue;

        // If editing 'Total' directly, we assume manual override and don't back-propagate to SH/JS for now
        // to keep logic manageable.
        if (targetRow.region === 'Total') {
            return JSON.parse(JSON.stringify(newData));
        }

        const region = targetRow.region;

        // Helper to sum plan values
        const sumPlanAtIndex = (rows: SalesDataRow[], idx: number) => {
            return rows.reduce((acc, r) => acc + (r.planValues[idx] || 0), 0);
        };

        // 2. Recalculate Region Hierarchy (Bottom-Up)
        
        // 2.1 Update L2 (Group) if target is L3
        if (targetRow.level === 3 && targetRow.parentId) {
            const parentRow = newData.find(r => r.id === targetRow.parentId);
            if (parentRow) {
                const siblings = newData.filter(r => r.parentId === parentRow.id);
                parentRow.planValues[dateIndex] = parseFloat(sumPlanAtIndex(siblings, dateIndex).toFixed(1));
            }
        }

        // 2.2 Update L1 (Region Total)
        const regionTotalRow = newData.find(r => r.region === region && r.level === 1);
        const regionL2Rows = newData.filter(r => r.region === region && r.level === 2);
        if (regionTotalRow) {
            regionTotalRow.planValues[dateIndex] = parseFloat(sumPlanAtIndex(regionL2Rows, dateIndex).toFixed(1));
        }

        // 3. Recalculate 'Total' Region (Weighted Averages)
        // We need store counts for weighting
        const shCounts = DB.storeCounts.find(s => s.region === 'SH')?.counts || [];
        const jsCounts = DB.storeCounts.find(s => s.region === 'JS')?.counts || [];
        const countSH = shCounts[dateIndex] || 0;
        const countJS = jsCounts[dateIndex] || 0;

        // 3.1 Sync Corresponding Total Row
        const catName = targetRow.name;
        const totalCorrespondingRow = newData.find(r => r.region === 'Total' && r.name === catName);
        if (totalCorrespondingRow) {
             const shRow = newData.find(r => r.region === 'SH' && r.name === catName);
             const jsRow = newData.find(r => r.region === 'JS' && r.name === catName);
             if (shRow && jsRow) {
                 totalCorrespondingRow.planValues[dateIndex] = calculateWeightedTotal(
                     shRow.planValues[dateIndex], 
                     jsRow.planValues[dateIndex], 
                     countSH, 
                     countJS
                 );
             }
        }

        // 3.2 Sync Total Parent Group
        if (targetRow.level === 3 && targetRow.parentId) {
             const shParent = newData.find(r => r.id === targetRow.parentId);
             if (shParent) {
                 const groupName = shParent.name;
                 const totalGroupRow = newData.find(r => r.region === 'Total' && r.name === groupName);
                 const jsGroupRow = newData.find(r => r.region === 'JS' && r.name === groupName);
                 
                 if (totalGroupRow && shParent && jsGroupRow) {
                     totalGroupRow.planValues[dateIndex] = calculateWeightedTotal(
                        shParent.planValues[dateIndex],
                        jsGroupRow.planValues[dateIndex],
                        countSH,
                        countJS
                     );
                 }
             }
        }

        // 3.3 Sync Grand Total
        const totalRoot = newData.find(r => r.region === 'Total' && r.level === 1);
        const shRoot = newData.find(r => r.region === 'SH' && r.level === 1);
        const jsRoot = newData.find(r => r.region === 'JS' && r.level === 1);
        
        if (totalRoot && shRoot && jsRoot) {
            totalRoot.planValues[dateIndex] = calculateWeightedTotal(
                shRoot.planValues[dateIndex],
                jsRoot.planValues[dateIndex],
                countSH,
                countJS
            );
        }

        return JSON.parse(JSON.stringify(newData));
    },

    /**
     * Update Store Counts
     */
    updateStoreCount: async (region: 'SH' | 'JS', dateIndex: number, newCount: number): Promise<{ storeCounts: StoreCountData[], salesData: SalesDataRow[] }> => {
        await delay(200);

        // 1. Update Count in DB
        const targetRegion = DB.storeCounts.find(s => s.region === region);
        if (targetRegion) {
            targetRegion.counts[dateIndex] = newCount;
        }

        // 2. Massive Recalculation of weighted averages
        const newData = DB.salesData;
        const shCountsArr = DB.storeCounts.find(s => s.region === 'SH')?.counts || [];
        const jsCountsArr = DB.storeCounts.find(s => s.region === 'JS')?.counts || [];
        const cSH = shCountsArr[dateIndex] || 0;
        const cJS = jsCountsArr[dateIndex] || 0;

        // Iterate all rows in 'Total' region
        newData.filter(r => r.region === 'Total').forEach(totalRow => {
            const catName = totalRow.name;
            const shRow = newData.find(r => r.region === 'SH' && r.name === catName);
            const jsRow = newData.find(r => r.region === 'JS' && r.name === catName);

            if (shRow && jsRow) {
                // Update Plan
                totalRow.planValues[dateIndex] = calculateWeightedTotal(
                    shRow.planValues[dateIndex],
                    jsRow.planValues[dateIndex],
                    cSH,
                    cJS
                );
                // Update Actuals
                if (shRow.values[dateIndex] !== null && jsRow.values[dateIndex] !== null) {
                        totalRow.values[dateIndex] = calculateWeightedTotal(
                        shRow.values[dateIndex] as number,
                        jsRow.values[dateIndex] as number,
                        cSH,
                        cJS
                        );
                }
            }
        });

        return {
            storeCounts: JSON.parse(JSON.stringify(DB.storeCounts)),
            salesData: JSON.parse(JSON.stringify(newData))
        };
    }
};