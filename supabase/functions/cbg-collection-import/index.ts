const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function productIdFrom(value: string) {
  const match = value.match(/https?:\/\/[^\s"'<>]*cbg\.163\.com\/[^\s"'<>]*\/equip\/\d+\/([a-zA-Z0-9_-]+)/i)
  return match && match[1]
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ ok: false, message: '仅支持 POST 请求' }, 405)

  try {
    const body = await request.json().catch(() => null)
    const input = String(body && body.url || '').trim()
    const productId = productIdFrom(input)
    if (!productId) return json({ ok: false, message: '藏宝阁链接格式不正确' }, 400)

    const equipUrl = `https://cbg-other-desc.res.netease.com/hp/static/equipdesc/${productId}.json`
    const response = await fetch(equipUrl, {
      headers: {
        'Accept': 'application/json,text/plain,*/*',
        'Referer': 'https://cbg.163.com/',
        'User-Agent': 'Mozilla/5.0 (compatible; HogwartsCollectionImporter/1.0)',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (response.status === 404) return json({ ok: false, message: 'NOT_FOUND' }, 404)
    if (!response.ok) return json({ ok: false, message: `藏宝阁返回 HTTP ${response.status}` }, 502)
    const text = await response.text()
    if (text.length > 8_000_000) return json({ ok: false, message: '账号资料过大，暂时无法解析' }, 413)

    const top = JSON.parse(text)
    const equip = typeof top.equip_desc === 'string' ? JSON.parse(top.equip_desc) : top.equip_desc
    const tabs = Array.isArray(equip && equip.display_content) ? equip.display_content : []
    const decorationTab = tabs.find((tab: Record<string, unknown>) => tab && tab.tab_name === '装饰')
    const contents = decorationTab && Array.isArray(decorationTab.contents) ? decorationTab.contents : []
    const decorations = contents[0] && Array.isArray(contents[0].contents) ? contents[0].contents : []
    const decorationIds = [...new Set(decorations.map((item: Record<string, unknown>) => item && item.id).filter((id: unknown) => id != null).map(String))]
    if (!decorationIds.length) return json({ ok: false, message: '账号资料中没有可识别的装饰数据' }, 422)

    return json({ ok: true, decorationIds })
  } catch (error) {
    const timeout = error instanceof DOMException && error.name === 'TimeoutError'
    return json({ ok: false, message: timeout ? '藏宝阁响应超时，请稍后重试' : '藏宝阁资料解析失败' }, 500)
  }
})
