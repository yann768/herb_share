(function () {
  const BLOCK_KEY = 'hogwarts_blocked_posts_v1'

  function params() { return new URLSearchParams(location.search) }
  function blocked() { try { return new Set(JSON.parse(localStorage.getItem(BLOCK_KEY) || '[]')) } catch { return new Set() } }
  function postKey(type, id) { return `${type}:${id}` }

  async function ensureAuth(client) {
    const { data } = await client.auth.getSession()
    if (data.session?.user) return data.session.user
    const result = await client.auth.signInAnonymously()
    if (result.error) throw new Error('匿名登录失败：' + result.error.message)
    return result.data.user
  }

  function isBlocked(type, id) { return blocked().has(postKey(type, id)) }
  function block(type, id) {
    const list = blocked(); list.add(postKey(type, id))
    localStorage.setItem(BLOCK_KEY, JSON.stringify([...list]))
  }

  async function report(client, type, id) {
    const reason = prompt('举报原因（请勿填写个人隐私）')
    if (!reason?.trim()) return false
    const { error } = await client.from('post_reports').insert({ post_type:type, post_id:String(id), reason:reason.trim().slice(0,200) })
    if (error) throw error
    block(type, id)
    return true
  }

  function importedItems(name) {
    const raw = params().get(name) || ''
    return raw.split(',').map(x => decodeURIComponent(x).trim()).filter(Boolean).slice(0,8)
  }

  function shouldPublish() { return params().get('action') === 'publish' || location.hash === '#publish' }
  function sourceNotice(showToast) {
    if (params().get('source') === 'miniprogram') showToast?.('已从小程序带入发布信息，请确认后发布')
  }

  async function consumeScene(client) {
    const scene = params().get('scene')
    if (!scene) return null
    const clean = new URL(location.href); clean.searchParams.delete('scene')
    history.replaceState(null, '', clean.pathname + clean.search + clean.hash)
    const { data, error } = await client.rpc('consume_web_import', { p_code:scene })
    if (error) throw new Error('导入失败：' + error.message)
    if (!data) throw new Error('导入链接已使用或已过期')
    return data
  }

  async function mountMiniProgramEntry(client, type='home') {
    if (document.getElementById('miniProgramEntry')) return
    let entry=null
    try { entry=(await client.from('mini_program_entries').select('*').eq('entry_type',type).maybeSingle()).data } catch (_) {}
    const style=document.createElement('style');style.textContent='.mp-fab{position:fixed;z-index:35;right:16px;bottom:86px;border:0;border-radius:999px;background:#173b2b;color:#fff;padding:11px 15px;box-shadow:0 8px 22px rgba(23,59,43,.28);font-weight:800}.mp-mask{position:fixed;z-index:100;inset:0;background:rgba(13,26,20,.6);display:none;place-items:center;padding:20px}.mp-mask.open{display:grid}.mp-card{width:min(390px,100%);background:#fffdf7;border-radius:22px;padding:22px;text-align:center;color:#193227}.mp-card h2{margin:0 0 8px}.mp-card p{color:#68746d;font-size:13px;line-height:1.6}.mp-qr{width:210px;height:210px;object-fit:contain;margin:10px auto;border-radius:14px;background:#f1ede3}.mp-actions{display:grid;gap:9px;margin-top:14px}.mp-actions button,.mp-actions a{border:0;border-radius:13px;padding:12px;text-decoration:none;font:inherit;font-weight:800}.mp-open{background:#275d45;color:#fff}.mp-copy{background:#eee9df;color:#275d45}.mp-close{background:transparent;color:#777}';document.head.appendChild(style)
    const wrap=document.createElement('div');wrap.id='miniProgramEntry';wrap.innerHTML='<button class="mp-fab" type="button">📱 小程序工具</button><div class="mp-mask"><div class="mp-card"><h2>在小程序中继续</h2><p>查询资料、使用计算器和规划养成</p><div class="mp-qr-wrap"></div><div class="mp-actions"></div></div></div>';document.body.appendChild(wrap)
    const mask=wrap.querySelector('.mp-mask'),actions=wrap.querySelector('.mp-actions'),qrWrap=wrap.querySelector('.mp-qr-wrap')
    if(entry&&entry.qr_url){const img=document.createElement('img');img.className='mp-qr';img.alt='小程序码';img.src=entry.qr_url;qrWrap.appendChild(img)}else{const p=document.createElement('p');p.textContent='小程序码尚未同步，请在微信搜索“哈利波特魔法觉醒助手”。';qrWrap.appendChild(p)}
    if(entry&&entry.url_link){const a=document.createElement('a');a.className='mp-open';a.href=entry.url_link;a.textContent='打开小程序';actions.appendChild(a)}
    const copy=document.createElement('button');copy.className='mp-copy';copy.textContent='复制小程序名称';copy.onclick=async()=>{try{await navigator.clipboard.writeText('哈利波特魔法觉醒助手');copy.textContent='已复制'}catch(_){prompt('复制小程序名称','哈利波特魔法觉醒助手')}};actions.appendChild(copy)
    const close=document.createElement('button');close.className='mp-close';close.textContent='关闭';close.onclick=()=>mask.classList.remove('open');actions.appendChild(close)
    wrap.querySelector('.mp-fab').onclick=()=>mask.classList.add('open');mask.onclick=e=>{if(e.target===mask)mask.classList.remove('open')}
  }

  window.HW = { params, ensureAuth, isBlocked, block, report, importedItems, shouldPublish, sourceNotice, consumeScene, mountMiniProgramEntry }
})()
