const fs = require('fs')
const path = require('path')
const vm = require('vm')

const miniFile = path.resolve(__dirname, '..', '..', '..', 'miniprogram-1', 'utils', 'activityData.js')
const output = path.resolve(__dirname, '..', 'planner-data.json')
let exported
vm.runInNewContext(fs.readFileSync(miniFile, 'utf8'), { module: { set exports(value) { exported = value }, get exports() { return exported } }, exports: {} }, { filename: miniFile })
const { GROUPS, LIMITED, FREQ_DAYS, RES_CONFIG } = exported

const activities = []
GROUPS.forEach(group => {
  const rows = group.tiers || group.items || []
  rows.forEach(item => activities.push({
    id: item.id,
    group: group.name,
    name: item.label || group.name,
    frequency: group.freq,
    periodDays: FREQ_DAYS[group.freq] || 1,
    source: group.source || '日常',
    paid: Boolean(group.paid),
    rewards: item.res || {},
    limited: false,
  }))
})
LIMITED.forEach(activity => {
  const rows = activity.tiers || [activity]
  rows.forEach(item => activities.push({
    id: item.id,
    group: activity.name,
    name: item.label || activity.name,
    frequency: '限时',
    periodDays: 0,
    source: '限时活动',
    paid: false,
    rewards: item.res || activity.res || {},
    limited: true,
  }))
})

const resources = [...new Set(activities.flatMap(item => Object.keys(item.rewards)))].map(name => ({ name, ...(RES_CONFIG[name] || {}) }))
fs.writeFileSync(output, JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), source: 'miniprogram/utils/activityData.js', resources, activities }, null, 2))
console.log(`Generated ${activities.length} planner activities -> ${output}`)
