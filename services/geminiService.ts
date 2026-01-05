import { GoogleGenAI } from "@google/genai";
import { NodeRecord } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getPlanningAdvice = async (
  title: string,
  period: string,
  tags: string[],
  records: NodeRecord[]
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "请配置 API Key 以获取 AI 洞察。";

  const recordsText = records && records.length > 0
    ? records.map(r => `- [${r.category}] ${r.content}`).join('\n')
    : "（用户暂无详细记录，请基于通用行业经验分析）";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        你是一位资深的零售商品企划与门店补货专家。
        用户的目标是根据过往的历史记录（复盘数据）来制定更精准的补货计划。
        
        请结合该时间节点的**基本信息**以及用户记录的**历史关键特征**，进行深度的总结与补货建议。
        
        基本信息:
        - 事件节点: ${title}
        - 时间段: ${period}
        - 类型标签: ${tags.join(', ')}
        
        用户记录的历史特征/复盘数据:
        """
        ${recordsText}
        """
        
        任务要求：
        1. **复盘总结**：如果用户有记录，请综合多条记录提炼出核心的销售规律、痛点或机会（例如：记录提到“羽绒服断货”，总结应指出“冬装备货深度不足”）。
        2. **补货建议**：基于上述总结（或通用经验），给出具体的行动指南。重点关注：首单深度、补货频次、尺码配比或物流截单时间。
        
        输出格式：
        **【复盘总结】**
        ...（简练概括，如无记录则省略此标题）
        
        **【补货建议】**
        ...（具体的行动点）
        
        请保持总字数在 150 字以内，使用中文，条理清晰。
      `,
    });

    return response.text || "暂无洞察生成。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "暂时无法获取 AI 建议，请稍后再试。";
  }
};

export const analyzeSalesData = async (
  dataString: string,
  userPrompt: string
): Promise<string[]> => {
  const ai = getClient();
  if (!ai) return ["请配置 API Key 以使用分析功能。"];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        你是一位数据分析师。用户将从 Excel 中复制了一段销售数据粘贴在下方。
        
        任务：
        1. 识别数据中的关键指标（如：总销售额、同比涨幅、环比涨幅、售罄率、各品类表现等）。
        2. 计算或提取出显著的趋势（如：某品类暴涨、整体未达标等）。
        3. 结合用户的额外提示词进行针对性分析。
        
        用户提示词: "${userPrompt}"
        
        Excel 原始数据:
        """
        ${dataString}
        """
        
        要求：
        - 请输出一个 JSON 字符串数组 (Array of Strings)。
        - 每一条字符串是一个简练的复盘要点（不超过 30 字）。
        - 只要输出 JSON，不要 Markdown 格式，不要其他废话。
        
        示例格式:
        ["整体销售同比增长 15%，达成率 102%", "女装品类表现优异，售罄率达 80%", "受天气影响，羽绒服启动较慢"]
      `,
      config: {
        responseMimeType: "application/json"
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return [];
    
    // Clean up if markdown code blocks are present despite instructions
    const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return ["数据解析失败，请检查数据格式或重试。"];
  }
};