const TD_BASE='https://api.twelvedata.com';

export function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}
export function apiKey(){
  const k=process.env.TWELVE_DATA_API_KEY;
  if(!k) throw new Error('Netlify 尚未设置 TWELVE_DATA_API_KEY');
  return k;
}
export async function tdTimeSeries(symbol, outputsize=400){
  const u=new URL(TD_BASE+'/time_series');
  u.searchParams.set('symbol',symbol);u.searchParams.set('interval','1day');u.searchParams.set('outputsize',String(outputsize));u.searchParams.set('apikey',apiKey());u.searchParams.set('format','JSON');
  const r=await fetch(u,{headers:{accept:'application/json'}});const j=await r.json();
  if(!r.ok||j.status==='error'||!Array.isArray(j.values)) throw new Error(`${symbol}: ${j.message||j.code||'行情接口失败'}`);
  return j.values.map(v=>({date:v.datetime,open:+v.open,high:+v.high,low:+v.low,close:+v.close,volume:v.volume==null?null:+v.volume})).filter(x=>Number.isFinite(x.close)).sort((a,b)=>a.date.localeCompare(b.date));
}
export async function tdPrice(symbol){
  const u=new URL(TD_BASE+'/price');u.searchParams.set('symbol',symbol);u.searchParams.set('apikey',apiKey());
  const r=await fetch(u);const j=await r.json();if(!r.ok||j.status==='error'||!j.price) throw new Error(`${symbol}: ${j.message||'价格接口失败'}`);return +j.price;
}
export function mean(a){const x=a.filter(Number.isFinite);return x.length?x.reduce((s,v)=>s+v,0)/x.length:null;}
export function smaAt(rows,n,i=rows.length-1){if(i<n-1)return null;return mean(rows.slice(i-n+1,i+1).map(x=>x.close));}
export function direction(rows,n){const now=smaAt(rows,n),prev=smaAt(rows,n,rows.length-21);if(now==null||prev==null)return '';const p=(now-prev)/prev*100;return p>0.3?'up':p<-0.3?'down':'flat';}
export function latest(rows){return rows[rows.length-1];}
export function returnCalendarDays(rows,days){
  if(rows.length<2)return null;const last=latest(rows),target=new Date(last.date+'T00:00:00Z');target.setUTCDate(target.getUTCDate()-days);let base=null;
  for(const r of rows){if(new Date(r.date+'T00:00:00Z')<=target)base=r;else break;}return base&&base.close>0?(last.close-base.close)/base.close*100:null;
}
export function distance52wLow(rows){const w=rows.slice(-252);const lo=Math.min(...w.map(x=>x.low).filter(Number.isFinite));const p=latest(rows).close;return lo>0?(p-lo)/lo*100:null;}
export function breakout(rows){
  if(rows.length<25)return null;
  const lookback=Math.min(100,Math.max(20,Math.floor(rows.length*0.45)));
  const start=Math.max(lookback,rows.length-45);let hit=null;
  for(let i=start;i<rows.length;i++){
    const prior=rows.slice(Math.max(0,i-lookback),i), resistance=Math.max(...prior.map(x=>x.high));const av=mean(prior.map(x=>x.volume));const vr=(av&&rows[i].volume)?rows[i].volume/av:null;
    if(rows[i].close>resistance&&vr!=null&&vr>=1.5)hit={i,price:resistance,volumeRatio:vr,date:rows[i].date,lookbackDays:lookback};
  }
  if(!hit)return null;const a=new Date(hit.date+'T00:00:00Z'),b=new Date(latest(rows).date+'T00:00:00Z');return {date:hit.date,weeksAgo:Math.round(((b-a)/86400000/7)*10)/10,price:Math.round(hit.price*100)/100,volumeRatio:Math.round(hit.volumeRatio*100)/100,lookbackDays:hit.lookbackDays};
}
export function stage2Weeks(rows){
  if(rows.length<190)return null;let count=0;
  for(let i=rows.length-1;i>=170;i--){const s=smaAt(rows,150,i),p=smaAt(rows,150,i-20);if(s&&p&&rows[i].close>s&&s>p)count++;else break;}return Math.floor(count/5);
}
export function pullbackVolume(rows){
  if(rows.length<30)return null;const a=mean(rows.slice(-5).map(x=>x.volume)),b=mean(rows.slice(-25,-5).map(x=>x.volume));if(!a||!b)return null;const r=a/b;return r<0.75?'shrink':r>1.25?'expand':'normal';
}
export function returnsMap(rows){const m=new Map();for(let i=1;i<rows.length;i++){if(rows[i-1].close>0)m.set(rows[i].date,rows[i].close/rows[i-1].close-1);}return m;}
export function corr(a,b,n){
  const A=returnsMap(a),B=returnsMap(b),dates=[...A.keys()].filter(d=>B.has(d)).sort().slice(-n);if(dates.length<Math.min(40,n*0.6))return null;
  const x=dates.map(d=>A.get(d)),y=dates.map(d=>B.get(d)),mx=mean(x),my=mean(y);let num=0,dx=0,dy=0;for(let i=0;i<x.length;i++){const ax=x[i]-mx,ay=y[i]-my;num+=ax*ay;dx+=ax*ax;dy+=ay*ay;}return dx&&dy?num/Math.sqrt(dx*dy):null;
}
export async function fredSeries(id,limit=10){
  const key=process.env.FRED_API_KEY;if(!key)return null;const u=new URL('https://api.stlouisfed.org/fred/series/observations');u.searchParams.set('series_id',id);u.searchParams.set('api_key',key);u.searchParams.set('file_type','json');u.searchParams.set('sort_order','desc');u.searchParams.set('limit',String(limit));
  const r=await fetch(u);const j=await r.json();if(!r.ok||!j.observations)return null;return j.observations.filter(x=>x.value!=='.'&&Number.isFinite(+x.value)).map(x=>({date:x.date,value:+x.value}));
}
