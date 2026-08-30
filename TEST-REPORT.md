# Decision Terminal V4.3 — 验收报告

## 静态检查
- HTML 主脚本 JavaScript 语法：PASS
- Netlify `ai-research.mjs` JavaScript 语法：PASS
- `netlify.toml` 目录结构：PASS

## 模拟集成测试
- 成熟股 400 日行情：PASS
- 150 日 SMA：PASS
- 新 IPO 80 日路径 / 50 日趋势代理：PASS
- 120 日持仓收益相关性：PASS
- 市场 SPY / HYG / VIX：PASS
- FRED SOFR / IORB / HY OAS：PASS
- SEC ticker → CIK → companyfacts：PASS
- OpenAI Responses + web-search 兼容调用路径：PASS（模拟）
- DeepSeek Responses + web-search 兼容调用路径：PASS（模拟）
- `AI_PROVIDER=openai`：PASS
- `AI_PROVIDER=deepseek`：PASS
- `AI_PROVIDER=auto`：PASS

## 仍需部署后的真实验收
本地测试没有使用用户真实 API Key，因此部署后还应做一次真实联网验收：Twelve Data、FRED、SEC、所选 AI provider。
