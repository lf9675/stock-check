import {json,tdTimeSeries,smaAt,direction,latest,returnCalendarDays,distance52wLow,breakout,stage2Weeks,pullbackVolume,corr} from './_market-utils.mjs';

function round(v,n=2){return Number.isFinite(v)?Math.round(v*10**n)/10**n:null;}
function historyCalendarDays(rows){if(rows.length<2)return 0;return Math.round((new Date(latest(rows).date+'T00:00:00Z')-new Date(rows[0].date+'T00:00:00Z'))/86400000);}
function trendWeeks(rows,n){
  if(rows.length<n+22)return null;let count=0;
  for(let i=rows.length-1;i>=n+20;i--){const s=smaAt(rows,n,i),p=smaAt(rows,n,i-20);if(s&&p&&rows[i].close>s&&s>p)count++;else break;}
  return Math.floor(count/5);
}

export default async (req)=>{
  try{
    const u=new URL(req.url);const symbol=(u.searchParams.get('symbol')||'').trim().toUpperCase();
    if(!/^[A-Z0-9.\-]{1,12}$/.test(symbol)) return json({error:'股票代码无效'},400);
    const holds=(u.searchParams.get('holdings')||'').split(',').map(x=>x.trim().toUpperCase()).filter(x=>/^[A-Z0-9.\-]{1,12}$/.test(x)&&x!==symbol).slice(0,8);
    const rows=await tdTimeSeries(symbol,400);if(rows.length<35)return json({error:`${symbol} 历史数据少于35个交易日，无法安全建立技术结构`},422);
    const last=latest(rows),histDays=historyCalendarDays(rows),sma50=smaAt(rows,50),sma150=smaAt(rows,150),sma200=smaAt(rows,200);
    const result={symbol,source:'Twelve Data · daily/EOD',asOf:last.date,historyRows:rows.length,historyCalendarDays:histDays,isYoungIssue:rows.length<150,price:last.close,
      sma20:smaAt(rows,20),sma50,sma150,sma200,direction20:direction(rows,20),direction50:direction(rows,50),direction150:direction(rows,150),direction200:direction(rows,200),
      return20d:returnCalendarDays(rows,20),return60d:returnCalendarDays(rows,60),distance52wLow:distance52wLow(rows),lowWindowDays:Math.min(252,rows.length),breakout:breakout(rows),stage2Weeks:stage2Weeks(rows),trend50Weeks:trendWeeks(rows,50),pullbackVolume:pullbackVolume(rows),correlations:{}};
    result.direction=result.direction150||result.direction50||result.direction20;
    for(const h of holds){
      try{const hr=await tdTimeSeries(h,400);const hp=latest(hr);result.correlations[h]={price:hp.close,asOf:hp.date,historyRows:hr.length,sma150:smaAt(hr,150),sma50:smaAt(hr,50),direction150:direction(hr,150),direction200:direction(hr,200),direction50:direction(hr,50),corr60:corr(rows,hr,60),corr120:corr(rows,hr,120),corr252:corr(rows,hr,252)};}
      catch(e){result.correlations[h]={error:e.message,price:null,corr60:null,corr120:null,corr252:null};}
    }
    for(const k of ['price','sma20','sma50','sma150','sma200','return20d','return60d','distance52wLow']) result[k]=round(result[k]);
    return json(result);
  }catch(e){return json({error:e.message||'自动行情抓取失败'},500);}
};
