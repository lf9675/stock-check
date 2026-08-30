# Decision Terminal V4.3 FINAL — 双 AI 兼容版

本版保留 V4.2 的 Fail Closed 安全机制，并把 AI 深研改成 OpenAI / DeepSeek 双兼容。以后切换 AI 不需要改代码，只改 Netlify 环境变量。

## 一、你截图里的 Netlify Build settings 怎么填

前提：仓库根目录就是本 ZIP 解压后的这些文件：`index.html`、`netlify.toml`、`netlify/functions/...`。

请填写：

- Base directory：**留空**
- Build command：**留空**
- Publish directory：`.`
- Functions directory：`netlify/functions`

本项目是纯静态 HTML + Netlify Functions，不需要 npm build。仓库根目录就是发布目录。

项目根目录的 `netlify.toml` 已写好：

```toml
[build]
  publish = "."

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

因此即使 Netlify UI 与这里不同，根目录的 `netlify.toml` 会作为项目配置生效。为了减少混乱，建议 UI 也按上面填写。

## 二、环境变量怎么填

### 1. 必须：Twelve Data

Key：

`TWELVE_DATA_API_KEY`

Value：你的 Twelve Data API Key。

用途：个股、SPY/HYG、均线、涨幅、突破和持仓相关性。

### 2. 必须：SEC User-Agent

Key 必须一字不差：

`SEC_USER_AGENT`

Value 例如：

`DecisionTerminal your-real-email@example.com`

不要写 `SEC User-Agent`，也不要写 `SEC-USER-AGENT`。

### 3. AI 选择器

Key：

`AI_PROVIDER`

Value 只能是：

- `deepseek`：使用 DeepSeek
- `openai`：使用 OpenAI
- `auto`：自动选择；如果两个 Key 都有，V4.3 默认优先 OpenAI；只有 DeepSeek Key 时自动用 DeepSeek

如果你主要想用 DeepSeek，建议直接填：

`deepseek`

### 4A. 使用 DeepSeek

Key：

`DEEPSEEK_API_KEY`

Value：你的 DeepSeek API Key。

可选模型变量：

`DEEPSEEK_MODEL`

默认值：

`deepseek-v4-flash`

如果只使用 DeepSeek，`OPENAI_API_KEY` 可以完全不填。

### 4B. 使用 OpenAI

Key：

`OPENAI_API_KEY`

Value：你的 OpenAI API Key。

可选模型变量：

`OPENAI_MODEL`

默认值：

`gpt-5.6-terra`

如果只使用 OpenAI，`DEEPSEEK_API_KEY` 可以不填。

### 5. 建议：FRED

Key：

`FRED_API_KEY`

Value：你的 FRED API Key。

用途：VIX、SOFR、IORB、HY OAS 等宏观数据。

## 三、最省钱的推荐填写法

如果你决定用 DeepSeek：

```text
TWELVE_DATA_API_KEY = 你的 Twelve Data key
SEC_USER_AGENT      = DecisionTerminal 你的真实邮箱
AI_PROVIDER         = deepseek
DEEPSEEK_API_KEY    = 你的 DeepSeek key
FRED_API_KEY        = 你的 FRED key（建议）
```

这种情况下不需要 `OPENAI_API_KEY`。

## 四、以后想换 OpenAI 怎么办

不用改 GitHub，不用改 HTML。

Netlify 把：

`AI_PROVIDER = deepseek`

改为：

`AI_PROVIDER = openai`

并增加 `OPENAI_API_KEY`，重新 Deploy 即可。

## 五、V4.3 AI 接口逻辑

- OpenAI：`https://api.openai.com/v1/responses`
- DeepSeek：`https://api.deepseek.com/responses`
- 两者都使用 Responses API + `web_search`
- 前端永远拿不到 API Key；Key 只存在 Netlify Functions 环境变量中
- AI 研究失败时保持 UNKNOWN，不自动放行
- AI 返回结果会显示实际 provider / model，方便你确认当前到底用了哪一家

## 六、部署后第一次测试

1. 打开网站。
2. 输入 `NVDA`。
3. 点击“① 自动抓市场数据”。
4. 点击“② 自动抓个股数据”。
5. 点击“④ SEC + AI 深研自动填写”。
6. 页面成功时会显示类似：

`AI 提供商：deepseek / deepseek-v4-flash`

或：

`AI 提供商：openai / gpt-5.6-terra`

如果这里显示错误，把错误文字或截图发给 ChatGPT 做真实联网验收。
