# Decision Terminal V4.2 FINAL

这是可直接部署到 Netlify 的完整版本。不要只上传 `index.html`，因为自动抓数据和 AI 深研依赖 `netlify/functions/`。

## 1. 这版已经做到什么

### 自动数据
- SPY / HYG / VIX
- HY OAS（设置 FRED 后）
- SOFR / IORB 资金压力（设置 FRED 后）
- 个股 EOD / 日线
- 20 / 50 / 150 / 200 日均线
- 均线方向
- 20 / 60 自然日涨幅
- 距 52 周低点（新股则使用上市以来可用区间）
- 突破与量能
- 上升趋势持续周数
- 持仓现价、趋势和 60 / 120 / 252 日收益相关性

### SEC + AI 深研
点击“④ SEC + AI 深研自动填写”后：
- SEC EDGAR / XBRL 先取可验证财务事实
- AI 再联网核实最新公司资料、财报、IR、新闻
- 自动尝试填写：
  - 林奇分类
  - 板块 ETF
  - TTM EPS 状态 / TTM PE
  - 基本面陈述
  - 证伪条件
  - 催化剂、风险、反方观点
  - 目标价（只有至少两个独立依据方向一致时才允许自动填写）
  - SPEC / 新 IPO：现金跑道、稀释、解禁、融资风险等
- 所有 AI 研究都会显示可点击来源供人工复核

### Fail Closed 安全机制
以下任何一项存在问题，最终报告都不能给 BUY：
- 关键数据 UNKNOWN
- 数据过期
- ticker 串台 / 层级 ticker 不一致
- 板块 Top 3 未完整或过期
- 组合层未执行
- 持仓监控未执行或关键字段缺失
- 目标价只有单一依据
- 基本面或证伪条件不完整
- 上层市场 / 组合存在硬否决

## 2. Netlify 必须设置的环境变量

进入：Netlify → Project configuration / Site configuration → Environment variables

### A. 必须：Twelve Data
变量名：

`TWELVE_DATA_API_KEY`

用途：行情、均线、涨幅、突破、相关性。

申请：https://twelvedata.com/

### B. 必须：SEC User-Agent
变量名：

`SEC_USER_AGENT`

值请写成类似：

`DecisionTerminal your-real-email@example.com`

SEC 要求自动程序声明 User-Agent。请填写你自己的真实联系邮箱，不要把邮箱写进 GitHub 源码。

### C. 必须（若要 AI 自动深研）：OpenAI API
变量名：

`OPENAI_API_KEY`

默认模型：`gpt-5.6-terra`

可选变量：

`OPENAI_MODEL`

例如：

`gpt-5.6-terra`

注意：ChatGPT Plus 与 OpenAI API 是两套独立计费系统。Plus 不自动包含 API 用量，需要在 OpenAI API 平台单独开通计费。

### D. 建议：FRED
变量名：

`FRED_API_KEY`

用途：VIX、SOFR、IORB、HY OAS。没有 FRED 时，系统仍能运行，但信用/流动性层的数据会减少。

申请：https://fred.stlouisfed.org/docs/api/api_key.html

## 3. 最简单部署步骤

1. 解压 `decision-terminal-v4.2-final.zip`。
2. 把解压后的全部内容上传到你的 GitHub 仓库根目录。目录结构必须保留：

```text
index.html
netlify.toml
netlify/
  functions/
    _market-utils.mjs
    _sec-utils.mjs
    market-data.mjs
    stock-data.mjs
    ai-research.mjs
README-FIRST.md
TEST-REPORT.md
```

3. 在 Netlify 设置上面的环境变量。
4. 重新 Deploy。
5. 打开网站后先输入 ticker，例如 `NVDA`。
6. 按顺序点击顶部四个按钮：
   - ① 自动抓市场数据
   - ② 自动抓个股数据
   - ③ 自动算持仓相关性
   - ④ SEC + AI 深研自动填写

## 4. 每次分析还需要你做什么

自动化以后，通常只剩少量真正应该由你确认的项目：

1. 每月更新一次板块 Top 3 / 黑名单。
2. 在组合页确认加入候选后板块总敞口 ≤35%。
3. A2 回调买点的“企稳信号”仍建议你看图确认，不让 AI 单独决定。
4. 现有持仓原先写死的止损价要由你保留。系统不能事后替你发明入场止损。
5. 下单前用 moomoo / 券商实时报价复核价格；本系统行情主要用于研究和规则计算，不保证等同于你的实际成交报价。

## 5. 新 IPO / 亏损高成长股（SPEC）

如果 AI 或你把公司分类为“亏损投机型 / SPEC”：

- EPS <0 不再自动淘汰。
- 历史不足 150 日时可使用 50 日趋势作为代理。
- 现金跑道 <9个月：STOP。
- 现金跑道 9–18个月：WAIT。
- 近12月稀释 >50%：STOP。
- 稀释 25–50%：WAIT。
- 30天内存在已知大规模解禁：WAIT。
- 未来12月融资风险高：WAIT。
- SPEC 单仓上限：10%账户。
- SPEC 单笔计划风险上限：1%。

这些规则优先目标是“活下来”，不是预测股价。

## 6. 一个重要原则

页面中的绿色“个股层买入”并不等于可以下单。

只有第⑧页最终报告出现：

- `买入`，或
- `小仓`

才代表所有已要求层级通过。出现 `数据不完整 / 不买 / 观望` 都不能按系统规则执行新开仓。

## 7. API 故障时

如果某个 API 抓取失败：

- 不会使用旧 ticker 的残留数据；
- 不会用成本价冒充现价；
- 不会把 UNKNOWN 当作“正常”；
- 不会自动创造止损；
- 不会因为 AI 没拿到资料而猜一个数字。

这就是 V4.2 的核心设计：**宁可不给答案，也不因为缺数据给错误的 BUY。**
