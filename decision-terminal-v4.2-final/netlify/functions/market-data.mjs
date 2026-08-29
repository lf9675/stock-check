import {json,tdTimeSeries,tdPrice,smaAt,direction,latest,fredSeries} from './_market-utils.mjs';

function round(v,n=2){return Number.isFinite(v)?Math.round(v*10**n)/10**n:null;}
function changeBp(series,lookback){if(!series||series.length<2)return null;const newest=series[0];const base=series[Math.min(lookback,series.length-1)];return round((newest.value-base.value)*100,1);}

export default async ()=>{
  try{
    const [spy,hyg]=await Promise.all([tdTimeSeries('SPY',320),tdTimeSeries('HYG',320)]);
    const asOf=[latest(spy).date,latest(hyg).date].sort()[0];
    let vix=null,sofrState=null,hyOas=null,note='SPY/HYG 为 Twelve Data 日线/EOD；下单前请用券商实时报价复核。';
    const fv=await fredSeries('VIXCLS',5);
    if(fv&&fv.length)vix={price:fv[0].value,asOf:fv[0].date,source:'FRED VIXCLS'};
    else{try{vix={price:await tdPrice('VIX'),asOf,source:'Twelve Data fallback'};}catch(e){note+=' VIX 自动抓取失败，请手工补。';}}
    const [sofr,iorb,oas]=await Promise.all([fredSeries('SOFR',10),fredSeries('IORB',10),fredSeries('BAMLH0A0HYM2',70)]);
    if(sofr&&iorb){const im=new Map(iorb.map(x=>[x.date,x.value]));const pairs=sofr.filter(x=>im.has(x.date)).slice(0,3).map(x=>({date:x.date,spreadBp:(x.value-im.get(x.date))*100}));if(pairs.length>=3)sofrState=pairs.every(x=>x.spreadBp>15)?'tight':'ok';}
    if(oas&&oas.length){hyOas={value:round(oas[0].value,2),asOf:oas[0].date,change20Bp:changeBp(oas,20),change60Bp:changeBp(oas,60),source:'FRED BAMLH0A0HYM2'};}
    else note+=' 未设置 FRED_API_KEY 时 HY OAS 保持 UNKNOWN，信用层退回 HYG 代理。';
    const out={source:'Twelve Data + optional FRED',asOf,spy:{price:latest(spy).close,sma150:smaAt(spy,150),direction:direction(spy,150)},hyg:{price:latest(hyg).close,sma250:smaAt(hyg,250),direction:direction(hyg,250)},hyOas,vix,usdjpy:null,sofrState,note};
    for(const o of [out.spy,out.hyg])for(const k of Object.keys(o))if(typeof o[k]==='number')o[k]=round(o[k]);
    return json(out);
  }catch(e){return json({error:e.message||'自动市场数据抓取失败'},500);}
};
