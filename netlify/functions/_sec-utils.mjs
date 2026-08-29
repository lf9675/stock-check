const TICKERS_URL='https://www.sec.gov/files/company_tickers.json';
const DATA_SEC='https://data.sec.gov';
let tickerCache=null;

function ua(){
  const v=(process.env.SEC_USER_AGENT||'').trim();
  if(!v) throw new Error('Netlify 尚未设置 SEC_USER_AGENT（格式示例：DecisionTerminal your-email@example.com）');
  return v;
}

async function secJson(url){
  const r=await fetch(url,{headers:{'User-Agent':ua(),'Accept':'application/json','Accept-Encoding':'gzip, deflate'}});
  if(!r.ok) throw new Error(`SEC HTTP ${r.status}`);
  return r.json();
}

async function tickerTable(){
  if(tickerCache) return tickerCache;
  const j=await secJson(TICKERS_URL);
  tickerCache=Object.values(j).map(x=>({ticker:String(x.ticker||'').toUpperCase(),title:x.title||'',cik:String(x.cik_str||'').padStart(10,'0')}));
  return tickerCache;
}

export async function tickerToCik(symbol){
  const rows=await tickerTable();
  return rows.find(x=>x.ticker===String(symbol).toUpperCase())||null;
}

function unitsOf(facts,concept,unit){
  const f=facts?.facts?.['us-gaap']?.[concept];
  if(!f||!f.units) return [];
  if(unit&&Array.isArray(f.units[unit])) return f.units[unit];
  const keys=Object.keys(f.units);
  for(const k of keys){ if(Array.isArray(f.units[k])&&f.units[k].length) return f.units[k]; }
  return [];
}

function dedupeFrame(entries,re){
  const m=new Map();
  for(const e of entries||[]){
    if(!e.frame||!re.test(e.frame)||!Number.isFinite(+e.val)) continue;
    const cur=m.get(e.frame);
    if(!cur || String(e.filed||'')>String(cur.filed||'')) m.set(e.frame,e);
  }
  return [...m.values()].sort((a,b)=>String(a.frame).localeCompare(String(b.frame)));
}

function latestEntry(entries){
  const x=(entries||[]).filter(e=>Number.isFinite(+e.val)).sort((a,b)=>String(a.end||'').localeCompare(String(b.end||''))||String(a.filed||'').localeCompare(String(b.filed||'')));
  return x.length?x[x.length-1]:null;
}

function deriveTtmEps(facts){
  const entries=unitsOf(facts,'EarningsPerShareDiluted','USD/shares');
  if(!entries.length) return null;
  const annual=dedupeFrame(entries,/^CY\d{4}$/);
  const qs=dedupeFrame(entries,/^CY\d{4}Q[1-4]$/);
  if(!annual.length) return null;
  const a=annual[annual.length-1], ay=+(a.frame.match(/CY(\d{4})/)||[])[1];
  const q=qs.length?qs[qs.length-1]:null;
  if(!q) return {value:+a.val,asOf:a.end||a.filed,method:'latest annual diluted EPS'};
  const qm=q.frame.match(/^CY(\d{4})Q([1-4])$/), qy=+qm[1], qn=+qm[2];
  if(ay>=qy) return {value:+a.val,asOf:a.end||a.filed,method:'latest annual diluted EPS'};
  if(qy!==ay+1) return null;
  const qmap=new Map(qs.map(e=>[e.frame,+e.val]));
  let add=0,sub=0;
  for(let i=1;i<=qn;i++){
    const cur=qmap.get(`CY${qy}Q${i}`), prev=qmap.get(`CY${ay}Q${i}`);
    if(!Number.isFinite(cur)||!Number.isFinite(prev)) return null;
    add+=cur; sub+=prev;
  }
  return {value:+a.val+add-sub,asOf:q.end||q.filed,method:'approx TTM = latest annual + current YTD quarters - prior-year matching quarters'};
}

function latestFact(facts,concept,unit){
  const e=latestEntry(unitsOf(facts,concept,unit));
  return e?{value:+e.val,end:e.end||null,filed:e.filed||null,form:e.form||null,frame:e.frame||null}:null;
}

function recentFilings(sub){
  const r=sub?.filings?.recent||{}; const out=[];
  const n=(r.form||[]).length;
  for(let i=0;i<n&&out.length<10;i++){
    const form=r.form[i]; if(!['10-K','10-Q','8-K','20-F','6-K'].includes(form)) continue;
    const accession=r.accessionNumber?.[i], primary=r.primaryDocument?.[i];
    let url=null;
    if(accession&&primary){const cikNo=String(sub.cik||'').replace(/^0+/,'');url=`https://www.sec.gov/Archives/edgar/data/${cikNo}/${accession.replace(/-/g,'')}/${primary}`;}
    out.push({form,filingDate:r.filingDate?.[i]||null,reportDate:r.reportDate?.[i]||null,accessionNumber:accession||null,url});
  }
  return out;
}

export async function getSecSnapshot(symbol){
  const row=await tickerToCik(symbol);
  if(!row) return {available:false,symbol,reason:'SEC ticker mapping not found（可能是 ETF、外国发行人代码差异或非 SEC 普通股）'};
  const [sub,facts]=await Promise.all([
    secJson(`${DATA_SEC}/submissions/CIK${row.cik}.json`),
    secJson(`${DATA_SEC}/api/xbrl/companyfacts/CIK${row.cik}.json`)
  ]);
  const ttm=deriveTtmEps(facts);
  const snap={
    available:true,symbol,title:sub.name||row.title,cik:row.cik,
    tickers:sub.tickers||[],exchanges:sub.exchanges||[],sic:sub.sic||null,sicDescription:sub.sicDescription||null,
    ttmDilutedEpsApprox:ttm,
    latest:{
      revenue:latestFact(facts,'RevenueFromContractWithCustomerExcludingAssessedTax','USD')||latestFact(facts,'SalesRevenueNet','USD'),
      netIncome:latestFact(facts,'NetIncomeLoss','USD'),
      grossProfit:latestFact(facts,'GrossProfit','USD'),
      cash:latestFact(facts,'CashAndCashEquivalentsAtCarryingValue','USD'),
      operatingCashFlow:latestFact(facts,'NetCashProvidedByUsedInOperatingActivities','USD'),
      capex:latestFact(facts,'PaymentsToAcquirePropertyPlantAndEquipment','USD')
    },
    recentFilings:recentFilings(sub),
    source:'SEC EDGAR data.sec.gov'
  };
  return snap;
}
