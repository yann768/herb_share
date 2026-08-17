const fs = require('fs')
const path = require('path')
const vm = require('vm')

const miniRoot = path.resolve(__dirname, '..', '..', '..', 'miniprogram-1')
const output = path.resolve(__dirname, '..', 'catalog-data.json')
const sourceLabels = { gacha: '转盘', season: '赛季／卡池', luxury: '作业礼盒', flip: '翻牌活动', gift: '礼包赠送', direct: '直售', free: '免费获取', activity: '活动获取', shop: '商店兑换', none: '获取方式待补充' }
const acquisitionSources = ['gacha', 'luxury', 'flip', 'direct', 'gift', 'season', 'free', 'activity', 'shop']

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

function loadCbgDex() {
  const filename = path.join(miniRoot, 'pages', 'cbg', 'cbg.js')
  const sandbox = { Page() {}, getApp: () => ({}), wx: {}, console }
  const expose = `;globalThis.__catalogDex={
    clothes:DEX_CLOTHES,wands:DEX_WANDS,skins:DEX_CARDSKINS,faces:DEX_FACES,
    icons:{clothes:Object.assign({},DEX_CLOTHES_ICON,DEX_GIFT_CLOTHES_ICON),wands:DEX_WAND_ICON,skins:DEX_CARDSKIN_ICON,faces:DEX_FACE_ICON}
  }`
  vm.runInNewContext(fs.readFileSync(filename, 'utf8') + expose, sandbox, { filename })
  return sandbox.__catalogDex
}

function loadCbgFurniture() {
  const filename = path.join(miniRoot, 'cloudfunctions', 'cbgParse', 'game_auto_config.js')
  const sandbox = {}
  vm.runInNewContext(fs.readFileSync(filename, 'utf8') + ';globalThis.__gameConfig=CBG_GAME_CONFIG', sandbox, { filename })
  const decorations = sandbox.__gameConfig.decoration || {}
  const furnitureByName = new Map()
  Object.entries(decorations).forEach(([configId, meta]) => {
    const type = meta.type
    const subType = meta.sub_type
    const icon = meta.icon || ''
    const name = String(meta.name || '').trim()
    if (!name) return
    const explicitFurniture = type === 205 || (type === 800 && (
      ['sushe', 'jiaju', 'furniture', 'chuang', 'guizi', 'zhuozi', 'yizi'].some(word => icon.includes(word)) || subType === 15
    ))
    const sculptureFurniture = type === 800 && ['石雕', '食槽', '雕像', '雕塑'].some(word => name.includes(word))
    if (!explicitFurniture && !sculptureFurniture) return
    const current = furnitureByName.get(name)
    if (!current || (!current.icon && icon)) furnitureByName.set(name, { configId, name, icon })
  })
  return [...furnitureByName.values()]
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

const curatedCollectibleItems = collectibleDefinitions.flatMap(category => category.data.flatMap(group => (group.items || []).map(item => ({
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

const cbgDex = loadCbgDex()
const cbgFurniture = loadCbgFurniture()
const cbgDefinitions = [
  { key: 'outfit', label: '服饰', icon: '🧥', names: cbgDex.clothes, images: cbgDex.icons.clothes },
  { key: 'wand', label: '魔杖', icon: '🪄', names: cbgDex.wands, images: cbgDex.icons.wands },
  { key: 'cardskin', label: '卡牌皮肤', icon: '🃏', names: cbgDex.skins, images: cbgDex.icons.skins },
  { key: 'face', label: '脸型', icon: '🎭', names: cbgDex.faces, images: cbgDex.icons.faces },
  { key: 'furniture', label: '家具', icon: '🛋️', names: cbgFurniture.map(item => item.name), images: Object.fromEntries(cbgFurniture.map(item => [item.name, `https://cbg-hp.res.netease.com/game_res/${item.icon.replace(/^\/+/, '')}`])) },
]

function normalizedName(value) {
  return String(value || '').trim().replace(/[·•]/g, '·').replace(/\s+/g, '')
}

function furnitureDetail(name) {
  const value = String(name || '')
  const prefix = value.split(/[·—-]/)[0].trim()
  const known = ['床品', '柜饰', '摆件', '帷幔', '地毯', '墙饰', '桌椅', '灯具', '雕像', '植物']
  if (known.includes(prefix)) return prefix
  const rules = [
    ['床品', /床|枕|被|床幔/], ['柜饰', /柜|书架|衣橱/], ['桌椅', /桌|椅|凳|沙发/],
    ['灯具', /灯|烛台/], ['地毯', /毯/], ['墙饰', /壁画|挂画|墙饰/], ['帷幔', /帷幔|窗帘/],
    ['植物', /花盆|盆栽|植物/], ['雕像', /雕像|雕塑|石雕/],
  ]
  return rules.find(([, pattern]) => pattern.test(value))?.[0] || '其他家具'
}

const collectibleItems = [...curatedCollectibleItems]
const knownNames = new Map()
collectibleItems.forEach(item => {
  const names = [item.name, item.alternateName, ...(item.aliases || [])].filter(Boolean)
  if (item.category === 'cardskin' && item.name.includes('·')) {
    const skinName = item.name.split('·')[0].trim()
    names.push(skinName)
    if (!item.aliases.includes(skinName)) item.aliases.push(skinName)
  }
  names.forEach(name => knownNames.set(`${item.category}:${normalizedName(name)}`, item))
})
cbgDefinitions.forEach(category => {
  ;[...new Set(category.names)].forEach(name => {
    const key = `${category.key}:${normalizedName(name)}`
    const existing = knownNames.get(key)
    if (existing) {
      existing.cbgVerified = true
      if (!existing.image && category.images[name]) existing.image = category.images[name]
      return
    }
    const item = {
      id: `${category.key}-cbg-${hash(normalizedName(name))}`,
      category: category.key, categoryLabel: category.label, icon: category.icon, collectible: true,
      year: '', date: '', name, alternateName: '', aliases: [], source: 'cbg', sourceLabel: '藏宝阁全图鉴',
      image: category.images[name] || '', imageAlt: '', categoryDetail: category.key === 'furniture' ? furnitureDetail(name) : '', rarity: '', rare: false, new: false,
      details: ['该物品的获取方式和时间等待资料库后续补充。'], flipEvent: null, cbgVerified: true,
    }
    collectibleItems.push(item)
    knownNames.set(key, item)
  })
})

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
  sourceLabel: record.status === 'image_verified' ? '官方公告' : '资料整理',
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
  { key: 'face', label: '脸型', icon: '🎭', collectible: true },
  { key: 'furniture', label: '家具', icon: '🛋️', collectible: true },
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
const sources = acquisitionSources
  .filter(key => items.some(item => item.collectible !== false && item.source === key))
  .map(key => ({ key, label: sourceLabels[key] }))

const ids = new Set()
for (const item of items) {
  if (ids.has(item.id)) throw new Error(`Duplicate catalog id: ${item.id}`)
  ids.add(item.id)
}

fs.writeFileSync(output, JSON.stringify({ schemaVersion: 2, generatedAt: new Date().toISOString(), categories, years, sources, items }, null, 2))
console.log(`Generated ${items.length} items (${collectibleItems.length} collectible) -> ${output}`)
