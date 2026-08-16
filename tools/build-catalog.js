const fs = require('fs')
const path = require('path')
const vm = require('vm')

const miniRoot = path.resolve(__dirname, '..', '..', '..', 'miniprogram-1')
const output = path.resolve(__dirname, '..', 'catalog-data.json')
const sourceLabels = { gacha: '转盘', season: '赛季', luxury: '臻藏', flip: '翻牌', gift: '直售/赠礼', direct: '直售', free: '免费获取', activity: '活动', shop: '商店', none: '未注明' }

function loadPage(name) {
  let page
  const filename = path.join(miniRoot, 'pages', name, `${name}.js`)
  const sandbox = {
    require: () => ({ getModule: async () => ({ items: [] }), getMap: async () => ({ value: {} }) }),
    Page: config => { page = config },
    wx: { cloud: { callFunction() {} } },
    console,
  }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename })
  return page.data
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(miniRoot, filename), 'utf8').replace(/^\uFEFF/, ''))
}

function hash(value) {
  let result = 2166136261
  for (const char of String(value)) {
    result ^= char.charCodeAt(0)
    result = Math.imul(result, 16777619)
  }
  return (result >>> 0).toString(36)
}

const collectibleDefinitions = [
  { key: 'outfit', label: '服饰', icon: '🧥', data: loadPage('outfit').groups },
  { key: 'cardskin', label: '卡牌皮肤', icon: '🃏', data: loadPage('cardskin').groups },
  { key: 'wand', label: '魔杖', icon: '🪄', data: loadPage('wand').groups },
  { key: 'animal', label: '动物', icon: '🦉', data: loadPage('animal').animalGroups },
]

const collectibleItems = collectibleDefinitions.flatMap(category => category.data.flatMap(group => (group.items || []).map(item => ({
  id: `${category.key}-${item.id}`,
  category: category.key,
  categoryLabel: category.label,
  icon: category.icon,
  collectible: true,
  year: group.year || item.year || '',
  date: item.date || '',
  name: item.name || '',
  alternateName: item.femaleName && item.femaleName !== item.name ? item.femaleName : '',
  aliases: [item.femaleName, item.category].filter(Boolean),
  source: item.source || '',
  sourceLabel: sourceLabels[item.source] || item.source || '',
  image: item.iconUrl || item.maleIconUrl || item.femaleIconUrl || '',
  imageAlt: item.femaleIconUrl && item.femaleIconUrl !== item.maleIconUrl ? item.femaleIconUrl : '',
  categoryDetail: item.category || '',
  rarity: item.rarity || (item.isRare ? '稀有' : ''),
  rare: Boolean(item.isRare),
  new: Boolean(item.isNew),
  details: [],
  flipEvent: item.flipEvent || null,
}))))

const timeline = loadPage('new')
function timelineItems(groups, kind) {
  const label = kind === 'new' ? '上新档案' : '返场档案'
  const icon = kind === 'new' ? '✨' : '↩️'
  return (groups || []).flatMap(group => (group.cards || []).flatMap(month => {
    const entries = []
    ;(month.items || []).forEach(item => entries.push({ name: item.name, subtype: item.type, rarity: item.rarity }))
    ;(month.skins || []).forEach(name => entries.push({ name, subtype: '卡牌皮肤' }))
    ;(month.echoes || []).forEach(name => entries.push({ name, subtype: '回响' }))
    if (month.special) entries.push({ name: month.special, subtype: '特殊活动' })
    return entries.map((entry, index) => ({
      id: `${kind}-${hash([group.year, month.id, month.date, entry.name, index].join('|'))}`,
      category: kind,
      categoryLabel: label,
      icon,
      collectible: false,
      year: group.year || '',
      date: month.date || '',
      name: entry.name,
      alternateName: '',
      aliases: [entry.subtype, kind === 'new' ? '首次上线' : '再次返场'].filter(Boolean),
      source: kind,
      sourceLabel: kind === 'new' ? '首次上线' : '历史返场',
      image: '',
      categoryDetail: entry.subtype || '',
      rarity: entry.rarity || '',
      details: [],
    }))
  }))
}

const balanceData = readJson('balance-adjustments-all.json')
const balanceItems = (balanceData.records || []).flatMap(record => (record.changes || []).map((change, index) => ({
  id: `balance-${hash([record.effectiveDate, change.category, change.name, index].join('|'))}`,
  category: 'balance',
  categoryLabel: '平衡档案',
  icon: '⚖️',
  collectible: false,
  year: String(record.effectiveDate || '').slice(0, 4) + '年',
  date: record.effectiveDate || '',
  name: change.name || '未命名调整',
  alternateName: '',
  aliases: [record.season, record.seasonName, change.category, change.rarity].filter(Boolean),
  source: 'balance',
  sourceLabel: record.status === 'image_verified' ? '公告图片核验' : '文字资料整理',
  image: '',
  categoryDetail: [change.category, change.rarity].filter(Boolean).join(' · '),
  rarity: change.rarity || '',
  details: change.details || [],
  season: record.season || '',
  seasonName: record.seasonName || '',
})))

const seasonMap = new Map()
;(balanceData.records || []).forEach(record => {
  if (!record.season) return
  const current = seasonMap.get(record.season) || {
    id: `season-${String(record.season).toLowerCase()}`,
    category: 'season', categoryLabel: '赛季索引', icon: '🏆', collectible: false,
    year: String(record.effectiveDate || '').slice(0, 4) + '年', date: record.effectiveDate || '',
    name: record.seasonName || record.season, alternateName: record.season,
    aliases: [record.season, record.seasonName].filter(Boolean), source: 'season', sourceLabel: '平衡档案索引',
    image: '', categoryDetail: record.season, rarity: '', details: [], adjustmentCount: 0,
  }
  current.adjustmentCount += (record.changes || []).length
  if (record.effectiveDate && (!current.date || record.effectiveDate < current.date)) current.date = record.effectiveDate
  seasonMap.set(record.season, current)
})
const seasonItems = [...seasonMap.values()].map(item => ({ ...item, details: [`已收录 ${item.adjustmentCount} 条平衡调整；完整赛季奖励资料等待云端数据导出后接入。`] }))

const items = [
  ...collectibleItems,
  ...timelineItems(timeline.groups, 'new'),
  ...timelineItems(timeline.restockGroups, 'restock'),
  ...seasonItems,
  ...balanceItems,
]

const categoryDefinitions = [
  ...collectibleDefinitions.map(({ data, ...rest }) => ({ ...rest, collectible: true })),
  { key: 'new', label: '上新档案', icon: '✨', collectible: false },
  { key: 'restock', label: '返场档案', icon: '↩️', collectible: false },
  { key: 'season', label: '赛季索引', icon: '🏆', collectible: false },
  { key: 'balance', label: '平衡档案', icon: '⚖️', collectible: false },
]
const categories = categoryDefinitions.map(category => ({
  ...category,
  count: items.filter(item => item.category === category.key).length,
}))
const years = [...new Set(items.map(item => String(item.year || '').replace('年', '')).filter(Boolean))].sort((a, b) => Number(b) - Number(a))
const sources = [...new Set(items.map(item => item.source).filter(Boolean))].sort().map(key => ({ key, label: items.find(item => item.source === key).sourceLabel || key }))

const ids = new Set()
for (const item of items) {
  if (ids.has(item.id)) throw new Error(`Duplicate catalog id: ${item.id}`)
  ids.add(item.id)
}

fs.writeFileSync(output, JSON.stringify({ schemaVersion: 2, generatedAt: new Date().toISOString(), categories, years, sources, items }, null, 2))
console.log(`Generated ${items.length} items (${collectibleItems.length} collectible) -> ${output}`)
