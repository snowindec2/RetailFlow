import { UniversalNode, EventType, TrendLevel } from './types';

// Initial Universal Template Data - Focused on Calendar & Festivals
export const INITIAL_UNIVERSAL_NODES: UniversalNode[] = [
  {
    id: 'u_1',
    title: '元旦',
    month: 1,
    periodDescription: '1月1日',
    isLunar: false,
    description: '公历新年，新一年的开始。',
    salesTrend: TrendLevel.MEDIUM,
    tags: [EventType.HOLIDAY],
    records: []
  },
  {
    id: 'u_2',
    title: '春节',
    month: 1, // Varies Jan/Feb
    periodDescription: '农历正月初一',
    isLunar: true,
    lunarMonth: 1,
    lunarDay: 1,
    description: '中国最隆重的传统节日，返乡高峰，家庭团聚。',
    salesTrend: TrendLevel.HIGH,
    tags: [EventType.HOLIDAY, '传统节日'],
    records: []
  },
  {
    id: 'u_3',
    title: '元宵节',
    month: 2, // Varies Feb/Mar
    periodDescription: '农历正月十五',
    isLunar: true,
    lunarMonth: 1,
    lunarDay: 15,
    description: '春节活动的尾声，赏灯吃元宵。',
    salesTrend: TrendLevel.MEDIUM,
    tags: [EventType.HOLIDAY, '传统节日'],
    records: []
  },
  {
    id: 'u_4',
    title: '妇女节',
    month: 3,
    periodDescription: '3月8日',
    isLunar: false,
    description: '国际劳动妇女节，关注女性消费需求。',
    salesTrend: TrendLevel.MEDIUM,
    tags: [EventType.HOLIDAY],
    records: []
  },
  {
    id: 'u_5',
    title: '清明节',
    month: 4,
    periodDescription: '4月4日或5日',
    isLunar: false, // Solar term, roughly fixed
    description: '祭祖扫墓，踏青郊游。春季出游高峰。',
    salesTrend: TrendLevel.MEDIUM,
    tags: [EventType.HOLIDAY, '传统节日'],
    records: []
  },
  {
    id: 'u_6',
    title: '劳动节',
    month: 5,
    periodDescription: '5月1日',
    isLunar: false,
    description: '五一小长假，出行与换季消费节点。',
    salesTrend: TrendLevel.HIGH,
    tags: [EventType.HOLIDAY],
    records: []
  },
  {
    id: 'u_7',
    title: '儿童节',
    month: 6,
    periodDescription: '6月1日',
    isLunar: false,
    description: '关注儿童用品、亲子消费。',
    salesTrend: TrendLevel.MEDIUM,
    tags: [EventType.HOLIDAY],
    records: []
  },
  {
    id: 'u_8',
    title: '端午节',
    month: 6, // Varies May/Jun
    periodDescription: '农历五月初五',
    isLunar: true,
    lunarMonth: 5,
    lunarDay: 5,
    description: '赛龙舟，吃粽子。入夏后的重要传统节日。',
    salesTrend: TrendLevel.MEDIUM,
    tags: [EventType.HOLIDAY, '传统节日'],
    records: []
  },
  {
    id: 'u_9',
    title: '七夕节',
    month: 8, // Varies Aug
    periodDescription: '农历七月初七',
    isLunar: true,
    lunarMonth: 7,
    lunarDay: 7,
    description: '中国情人节，礼品馈赠与浪漫经济。',
    salesTrend: TrendLevel.HIGH,
    tags: [EventType.HOLIDAY, '传统节日'],
    records: []
  },
  {
    id: 'u_10',
    title: '中秋节',
    month: 9, // Varies Sep/Oct
    periodDescription: '农历八月十五',
    isLunar: true,
    lunarMonth: 8,
    lunarDay: 15,
    description: '团圆节，月饼与礼品馈赠高峰。',
    salesTrend: TrendLevel.HIGH,
    tags: [EventType.HOLIDAY, '传统节日'],
    records: []
  },
  {
    id: 'u_11',
    title: '国庆节',
    month: 10,
    periodDescription: '10月1日',
    isLunar: false,
    description: '黄金周长假，婚庆、旅游与购物高峰。',
    salesTrend: TrendLevel.HIGH,
    tags: [EventType.HOLIDAY],
    records: []
  },
];

export const TREND_COLORS = {
  [TrendLevel.HIGH]: 'bg-red-100 text-red-800 border-red-200',
  [TrendLevel.MEDIUM]: 'bg-blue-100 text-blue-800 border-blue-200',
  [TrendLevel.LOW]: 'bg-gray-100 text-gray-800 border-gray-200',
};