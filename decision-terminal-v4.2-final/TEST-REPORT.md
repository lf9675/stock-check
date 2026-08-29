# V4.2 FINAL 验收记录

生成日期：2026-08-30

## 静态检查
- HTML ID 重复检查：PASS（0 个重复）
- onclick 按钮函数存在性：PASS
- 主页面 JavaScript `node --check`：PASS
- 所有 Netlify `.mjs` Functions `node --check`：PASS

## 模拟集成测试
使用 mock 数据实际调用 Netlify Functions：

1. 成熟股票行情：PASS
   - 400 日历史
   - SMA150 / SMA200
   - 120日相关性
2. 新 IPO / 短历史：PASS
   - 80 日历史
   - `isYoungIssue=true`
   - SMA50 可用
   - SMA150 保持 null，不伪造长期均线
3. 市场数据：PASS
   - SPY / HYG
   - VIX
   - SOFR / IORB
   - HY OAS
4. SEC → AI 深研：PASS
   - ticker→CIK
   - companyfacts
   - 近似 TTM EPS
   - OpenAI Responses 输出解析
   - 研究结果与来源返回

## 尚需部署后的真实联网验收
由于本地测试未使用你的真实密钥，部署后需用真实：
- TWELVE_DATA_API_KEY
- FRED_API_KEY
- SEC_USER_AGENT
- OPENAI_API_KEY

各测试一次 NVDA/AAPL 等成熟股，以及一只短历史或亏损高成长股。

真实 API 若返回计划限制、速率限制或字段差异，页面会 Fail Closed，不应产生 BUY。
