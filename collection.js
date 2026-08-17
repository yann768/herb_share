const OWNED_KEY='hogwarts_catalog_owned_v1'
const SUPABASE_URL='https://ygslzwiznvcfujonvblq.supabase.co'
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlnc2x6d2l6bnZjZnVqb252YmxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDM4NjksImV4cCI6MjA5NTYxOTg2OX0.J9P1NyK5tiSzPZgDeLpwfS2eRaFrP5Gb4fgpmA258vA'
let catalog={categories:[],items:[]},owned=readOwned(),category='all',state='all',query='',year='all',view='all'
fetch('catalog-data.json?v=20260817-1').then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(data=>{catalog=data;owned=new Set([...owned].filter(id=>catalog.items.some(x=>x.id===id&&x.collectible!==false)));build();render()}).catch(()=>{document.getElementById('collectionGrid').innerHTML='<div class="empty">资料加载失败，请稍后刷新</div>'})
function items(){return catalog.items.filter(x=>x.collectible!==false)}
function readOwned(){try{return new Set(JSON.parse(localStorage.getItem(OWNED_KEY)||'[]'))}catch{return new Set()}}
function saveOwned(){localStorage.setItem(OWNED_KEY,JSON.stringify([...owned]))}
function build(){const all=items(),total=all.length,count=all.filter(x=>owned.has(x.id)).length,rate=total?Math.round(count/total*100):0;document.getElementById('ownedTotal').textContent=count;document.getElementById('itemTotal').textContent=total;document.getElementById('totalRate').textContent=rate+'%';document.getElementById('totalRing').style.setProperty('--rate',rate*3.6+'deg');document.getElementById('overviewTip').textContent=count?`还差 ${total-count} 件即可完成全部收藏`:'从资料检索中标记你已拥有的内容';document.getElementById('categoryStats').innerHTML=catalog.categories.filter(c=>c.collectible!==false).map(c=>{const cat=all.filter(x=>x.category===c.key),n=cat.filter(x=>owned.has(x.id)).length,r=cat.length?Math.round(n/cat.length*100):0;return `<div class="stat-card"><div class="stat-top"><span>${c.icon} ${c.label}</span><b>${r}%</b></div><small>${n} / ${cat.length}</small><div class="progress"><i style="width:${r}%"></i></div></div>`}).join('');document.getElementById('categoryFilters').innerHTML=[{key:'all',label:'全部',icon:'✦'},...catalog.categories.filter(c=>c.collectible!==false)].map(c=>`<button class="chip ${c.key===category?'active':''}" data-category="${c.key}">${c.icon} ${c.label}</button>`).join('');const years=[...new Set(all.map(x=>String(x.year||'').replace('年','')).filter(Boolean))].sort((a,b)=>Number(b)-Number(a));document.getElementById('collectionYear').innerHTML='<option value="all">全部年份</option>'+years.map(x=>`<option value="${esc(x)}">${esc(x)}年</option>`).join('');document.getElementById('collectionYear').value=years.includes(year)?year:'all';year=document.getElementById('collectionYear').value}
function timestamp(x){const y=Number(String(x.year||'').match(/\d{4}/)?.[0]||0),m=Number(String(x.date||'').match(/\d{1,2}/)?.[0]||0);return y*100+m}
function list(){const q=query.toLowerCase();let result=items().filter(x=>(category==='all'||x.category===category)&&(state==='all'||(state==='owned')===owned.has(x.id))&&(year==='all'||String(x.year).includes(year))&&(!q||[x.name,x.alternateName,...(x.aliases||[]),x.year,x.date].join(' ').toLowerCase().includes(q)));if(view==='recent')result=result.sort((a,b)=>timestamp(b)-timestamp(a)).slice(0,24);return result}
function render(){const rows=list(),cat=catalog.categories.find(x=>x.key===category);document.getElementById('listTitle').textContent=view==='recent'?'最近新增':(cat?cat.label:'全部')+(state==='owned'?' · 已拥有':state==='missing'?' · 未拥有':'');document.getElementById('listCount').textContent=`共 ${rows.length} 条`;document.getElementById('collectionGrid').innerHTML=rows.length?rows.map(item).join(''):'<div class="empty"><b>这里暂时没有内容</b><br>调整分类或收藏状态试试</div>'}
function item(x){const has=owned.has(x.id);return `<button class="collection-item ${has?'owned':''}" data-id="${esc(x.id)}"><span class="check">✓</span><span class="collection-thumb">${x.image?`<img src="${esc(x.image)}" alt="" loading="lazy" onerror="this.parentNode.textContent='${x.icon}'">`:x.icon}</span><span class="collection-name">${esc(x.name)}</span><span class="collection-meta">${x.categoryLabel} · ${esc([x.year,x.date].filter(Boolean).join(' '))}</span></button>`}
document.getElementById('categoryFilters').onclick=e=>{const b=e.target.closest('[data-category]');if(!b)return;category=b.dataset.category;view='all';document.querySelectorAll('[data-category]').forEach(x=>x.classList.toggle('active',x===b));render()}
document.querySelector('.state-tabs').onclick=e=>{const b=e.target.closest('[data-state]');if(!b)return;state=b.dataset.state;view=b.dataset.state==='recent'?'recent':'all';if(view==='recent')state='all';document.querySelectorAll('[data-state]').forEach(x=>x.classList.toggle('active',x===b));render()}
document.getElementById('collectionSearch').oninput=e=>{query=e.target.value.trim();render()};document.getElementById('collectionYear').onchange=e=>{year=e.target.value;view='all';render()}
document.getElementById('collectionGrid').onclick=e=>{const b=e.target.closest('[data-id]');if(!b)return;owned.has(b.dataset.id)?owned.delete(b.dataset.id):owned.add(b.dataset.id);saveOwned();build();render()}
document.getElementById('exportBtn').onclick=()=>download(`hogwarts-collection-${today()}.json`,JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),owned:[...owned]},null,2),'application/json')
document.getElementById('missingBtn').onclick=()=>{const missing=items().filter(x=>!owned.has(x.id)&&(category==='all'||x.category===category));download(`hogwarts-missing-${today()}.txt`,missing.map(x=>`${x.categoryLabel}\t${x.name}\t${[x.year,x.date].filter(Boolean).join(' ')}`).join('\n'),'text/plain;charset=utf-8')}
document.getElementById('importBtn').onclick=()=>document.getElementById('importFile').click()
document.getElementById('importFile').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{const data=JSON.parse(await file.text()),ids=Array.isArray(data)?data:data.owned;if(!Array.isArray(ids))throw Error('备份中没有 owned 数组');const valid=[...new Set(ids.filter(id=>items().some(x=>x.id===id)))];if(!confirm(`备份中有 ${valid.length} 条有效收藏。\n确定与本机现有 ${owned.size} 条记录合并吗？`))return;valid.forEach(id=>owned.add(id));saveOwned();build();render();alert(`已恢复收藏，共 ${owned.size} 条。`)}catch(err){alert('导入失败：'+err.message)}}
document.getElementById('cbgImportBtn').onclick=importFromCbg
document.getElementById('cbgUrl').onkeydown=e=>{if(e.key==='Enter')importFromCbg()}
async function importFromCbg(){
  const input=document.getElementById('cbgUrl'),button=document.getElementById('cbgImportBtn'),url=input.value.trim()
  if(!url)return setCbgStatus('请先粘贴藏宝阁角色商品链接。','error')
  if(!/https?:\/\/[^\s]*cbg\.163\.com\/[^\s]*equip\/\d+\/[a-zA-Z0-9_-]+/i.test(url))return setCbgStatus('链接格式不正确，请粘贴包含 /equip/ 的藏宝阁角色商品链接。','error')
  button.disabled=true;button.textContent='解析中…';setCbgStatus('正在读取藏宝阁展示资料，请稍候。','')
  try{
    const response=await fetch(`${SUPABASE_URL}/functions/v1/cbg-collection-import`,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':`Bearer ${SUPABASE_ANON_KEY}`},body:JSON.stringify({url})})
    const result=await response.json().catch(()=>({}))
    if(!response.ok||!result.ok)throw Error(result.message||`解析服务返回 ${response.status}`)
    const accountIds=new Set((result.decorationIds||[]).map(String)),matched=items().filter(item=>(item.cbgIds||[]).some(id=>accountIds.has(String(id)))),newItems=matched.filter(item=>!owned.has(item.id))
    if(!matched.length)throw Error('账号资料已读取，但暂未匹配到收藏库物品')
    setCbgStatus(`识别到 ${accountIds.size} 条装饰记录，匹配收藏库 ${matched.length} 件。`,'success')
    if(!confirm(`藏宝阁账号中识别到 ${accountIds.size} 条装饰记录，匹配收藏库 ${matched.length} 件，其中 ${newItems.length} 件尚未收藏。\n\n确定合并到“我的收藏”吗？`))return
    matched.forEach(item=>owned.add(item.id));saveOwned();build();render()
    setCbgStatus(`导入完成：新增 ${newItems.length} 件，当前共收藏 ${owned.size} 件。`,'success')
  }catch(error){setCbgStatus('导入失败：'+friendlyCbgError(error.message),'error')}
  finally{button.disabled=false;button.textContent='开始解析'}
}
function setCbgStatus(message,type){const el=document.getElementById('cbgStatus');el.textContent=message;el.className='cbg-status'+(type?' '+type:'')}
function friendlyCbgError(message){if(/Failed to fetch|fetch/i.test(message))return '暂时无法连接解析服务，请稍后重试';if(/NOT_FOUND|404/i.test(message))return '商品资料不存在或已下架，请换一个仍在公示中的链接';return message}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function today(){return new Date().toISOString().slice(0,10)}
function esc(s){return String(s??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}
