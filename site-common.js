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

  window.HW = { params, ensureAuth, isBlocked, block, report, importedItems, shouldPublish, sourceNotice }
})()
