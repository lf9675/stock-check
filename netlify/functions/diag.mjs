import {json} from './_market-utils.mjs';

// 只报告"有没有设"和"长什么样"，绝不返回密钥本身
function peek(name){
  const v=String(process.env[name]||'').trim();
  if(!v) return {set:false};
  return {set:true, length:v.length, prefix:v.slice(0,4)+'…', suffix:'…'+v.slice(-2)};
}

export default async ()=>{
  const t0=Date.now();
  const env={
    AI_PROVIDER:String(process.env.AI_PROVIDER||'(未设置，按 auto 处理)').trim(),
    DEEPSEEK_API_KEY:peek('DEEPSEEK_API_KEY'),
    DEEPSEEK_MODEL:String(process.env.DEEPSEEK_MODEL||'(未设置，默认 deepseek-v4-flash)').trim(),
    OPENAI_API_KEY:peek('OPENAI_API_KEY'),
    OPENAI_MODEL:String(process.env.OPENAI_MODEL||'(未设置)').trim(),
    TWELVE_DATA_API_KEY:peek('TWELVE_DATA_API_KEY'),
    FRED_API_KEY:peek('FRED_API_KEY'),
    SEC_USER_AGENT:String(process.env.SEC_USER_AGENT||'').trim()?'已设置':'未设置'
  };

  const checks=[];
  const dsKey=String(process.env.DEEPSEEK_API_KEY||'').trim();
  const oaKey=String(process.env.OPENAI_API_KEY||'').trim();
  const pref=String(process.env.AI_PROVIDER||'auto').trim().toLowerCase();

  if(!['auto','openai','deepseek'].includes(pref))
    checks.push({level:'error',msg:`AI_PROVIDER 的值是「${pref}」，只能填 auto / openai / deepseek`});
  if(pref==='deepseek'&&!dsKey) checks.push({level:'error',msg:'AI_PROVIDER=deepseek 但 DEEPSEEK_API_KEY 未设置'});
  if(pref==='openai'&&!oaKey)   checks.push({level:'error',msg:'AI_PROVIDER=openai 但 OPENAI_API_KEY 未设置'});
  if(!dsKey&&!oaKey)            checks.push({level:'error',msg:'两个 AI Key 都没设置，第四步无法运行'});
  if(dsKey&&!dsKey.startsWith('sk-'))
    checks.push({level:'warn',msg:'DEEPSEEK_API_KEY 不是 sk- 开头，请确认没有把整行「DEEPSEEK_API_KEY=sk-xxx」连变量名一起粘进去'});
  if(/\s/.test(dsKey)) checks.push({level:'error',msg:'DEEPSEEK_API_KEY 里含有空格或换行，请重新复制'});
  const dsModel=String(process.env.DEEPSEEK_MODEL||'').trim();
  if(dsModel&&['deepseek-chat','deepseek-reasoner'].includes(dsModel))
    checks.push({level:'warn',msg:`DEEPSEEK_MODEL=${dsModel} 是旧模型名，官方已计划下线，建议改为 deepseek-v4-flash 或 deepseek-v4-pro`});
  if(!String(process.env.TWELVE_DATA_API_KEY||'').trim())
    checks.push({level:'error',msg:'TWELVE_DATA_API_KEY 未设置，前三步自动抓取会全部失败'});
  if(!String(process.env.SEC_USER_AGENT||'').trim())
    checks.push({level:'warn',msg:'SEC_USER_AGENT 未设置，SEC 快照会失败（格式：DecisionTerminal your-email@example.com）'});

  // 真打一次 AI，最小 token，确认端点与鉴权是否真的通
  let live=null;
  const useDs=(pref==='deepseek')||(pref==='auto'&&!oaKey&&dsKey);
  if(useDs&&dsKey){
    const endpoint='https://api.deepseek.com/chat/completions';
    const model=dsModel||'deepseek-v4-flash';
    try{
      const ctl=new AbortController();
      const timer=setTimeout(()=>ctl.abort(),20000);
      const r=await fetch(endpoint,{
        method:'POST',signal:ctl.signal,
        headers:{'Authorization':`Bearer ${dsKey}`,'Content-Type':'application/json'},
        body:JSON.stringify({model,messages:[{role:'user',content:'回复两个字：正常'}],max_tokens:16})
      });
      clearTimeout(timer);
      const j=await r.json().catch(()=>({}));
      live={
        provider:'deepseek',endpoint,model,httpStatus:r.status,ok:r.ok,
        reply:r.ok?String(j?.choices?.[0]?.message?.content||'').slice(0,40):null,
        errorMessage:r.ok?null:(j?.error?.message||j?.message||`HTTP ${r.status}`)
      };
      if(!r.ok){
        if(r.status===401) checks.push({level:'error',msg:'DeepSeek 返回 401：Key 无效、已撤销，或账户余额为 0'});
        else if(r.status===402) checks.push({level:'error',msg:'DeepSeek 返回 402：账户余额不足，需要充值'});
        else if(r.status===404) checks.push({level:'error',msg:'DeepSeek 返回 404：端点或模型名不存在，请检查 DEEPSEEK_MODEL'});
        else checks.push({level:'error',msg:`DeepSeek 连通失败：HTTP ${r.status}`});
      }
    }catch(e){
      live={provider:'deepseek',endpoint,model,ok:false,errorMessage:e?.name==='AbortError'?'20 秒超时':(e.message||'请求失败')};
      checks.push({level:'error',msg:'DeepSeek 请求异常：'+live.errorMessage});
    }
  }

  const errors=checks.filter(c=>c.level==='error').length;
  return json({
    verdict:errors?'配置有问题':'配置正常',
    checkedAt:new Date().toISOString(),
    elapsedMs:Date.now()-t0,
    env,checks,live,
    note:'本接口不会返回任何密钥内容，只显示长度与首尾各几位，用于确认是否粘错。'
  });
};
