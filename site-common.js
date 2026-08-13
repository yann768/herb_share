(function () {
  const BLOCK_KEY = 'hogwarts_blocked_posts_v1'

  function params() { return new URLSearchParams(location.search) }
  function blocked() { try { return new Set(JSON.parse(localStorage.getItem(BLOCK_KEY) || '[]')) } catch { return new Set() } }
  function postKey(type, id) { return `${type}:${id}` }

  async function ensureAuth(client) {
    const { data } = await client.auth.getSession()
    if (data.session?.user) return data.session.user
    const result = await client.auth.signInAnonymously()
    if (result.error) {
      const key = 'hogwarts_owner_id'
      let id = localStorage.getItem(key)
      if (!id) {
        id = crypto.randomUUID?.() || ('u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9))
        localStorage.setItem(key, id)
      }
      return { id, isLocalIdentity: true }
    }
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
    const style=document.createElement('style');style.textContent='.mp-fab{position:fixed;z-index:35;right:14px;bottom:84px;display:flex;align-items:center;gap:8px;max-width:190px;border:1px solid rgba(196,147,66,.45);border-radius:15px;background:rgba(255,253,247,.96);color:#193227;padding:8px 10px;box-shadow:0 7px 20px rgba(23,59,43,.16);backdrop-filter:blur(12px);text-align:left}.mp-ad-icon{width:32px;height:32px;flex:none;display:grid;place-items:center;border-radius:10px;background:#275d45;color:#fff;font-size:17px}.mp-ad-copy{min-width:0;line-height:1.15}.mp-ad-label{display:block;margin-bottom:3px;color:#a2732d;font-size:9px;font-weight:800;letter-spacing:1px}.mp-ad-title{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:800}.mp-ad-arrow{color:#8b948e;font-size:15px}.mp-mask{position:fixed;z-index:100;inset:0;background:rgba(13,26,20,.6);display:none;place-items:center;padding:20px}.mp-mask.open{display:grid}.mp-card{width:min(390px,100%);background:#fffdf7;border-radius:22px;padding:22px;text-align:center;color:#193227}.mp-card h2{margin:0 0 8px}.mp-card p{color:#68746d;font-size:13px;line-height:1.6}.mp-qr{width:210px;height:210px;object-fit:contain;margin:10px auto;border-radius:14px;background:#f1ede3}.mp-actions{display:grid;gap:9px;margin-top:14px}.mp-actions button,.mp-actions a{border:0;border-radius:13px;padding:12px;text-decoration:none;font:inherit;font-weight:800}.mp-open{background:#275d45;color:#fff}.mp-copy{background:#eee9df;color:#275d45}.mp-close{background:transparent;color:#777}@media(max-width:380px){.mp-fab{right:10px;max-width:170px}}';document.head.appendChild(style)
    const wrap=document.createElement('div');wrap.id='miniProgramEntry';wrap.innerHTML='<button class="mp-fab" type="button" aria-label="打开一起来玩哈皮吗小程序"><span class="mp-ad-icon">🎮</span><span class="mp-ad-copy"><span class="mp-ad-label">小程序推荐</span><span class="mp-ad-title">一起来玩哈皮吗</span></span><span class="mp-ad-arrow">›</span></button><div class="mp-mask"><div class="mp-card"><h2>一起来玩哈皮吗</h2><p>打开小程序，一起发现更多好玩的内容</p><div class="mp-qr-wrap"></div><div class="mp-actions"></div></div></div>';document.body.appendChild(wrap)
    const mask=wrap.querySelector('.mp-mask'),actions=wrap.querySelector('.mp-actions'),qrWrap=wrap.querySelector('.mp-qr-wrap')
    if(entry&&entry.qr_url){const img=document.createElement('img');img.className='mp-qr';img.alt='一起来玩哈皮吗小程序码';img.src=entry.qr_url;qrWrap.appendChild(img)}else{const p=document.createElement('p');p.textContent='小程序码尚未同步，请在微信搜索“一起来玩哈皮吗”。';qrWrap.appendChild(p)}
    if(entry&&entry.url_link){const a=document.createElement('a');a.className='mp-open';a.href=entry.url_link;a.textContent='打开小程序';actions.appendChild(a)}
    const copy=document.createElement('button');copy.className='mp-copy';copy.textContent='复制小程序名称';copy.onclick=async()=>{try{await navigator.clipboard.writeText('一起来玩哈皮吗');copy.textContent='已复制'}catch(_){prompt('复制小程序名称','一起来玩哈皮吗')}};actions.appendChild(copy)
    const close=document.createElement('button');close.className='mp-close';close.textContent='关闭';close.onclick=()=>mask.classList.remove('open');actions.appendChild(close)
    wrap.querySelector('.mp-fab').onclick=()=>mask.classList.add('open');mask.onclick=e=>{if(e.target===mask)mask.classList.remove('open')}
  }

  window.HW = { params, ensureAuth, isBlocked, block, report, importedItems, shouldPublish, sourceNotice, consumeScene, mountMiniProgramEntry }
})()
