const assert=require('assert')
const core=require('../planner-core.js')
const activities=[
  {id:'daily',frequency:'每日',periodDays:1,rewards:{宝石:10}},
  {id:'weekly',frequency:'每周',periodDays:7,rewards:{金币:100}},
  {id:'once',frequency:'限时',limited:true,rewards:{宝石:50}},
]
assert.equal(core.inclusiveDays('2026-08-01','2026-08-07'),7)
assert.equal(core.occurrences(activities[0],7),7)
assert.equal(core.occurrences(activities[1],13),1)
assert.equal(core.occurrences(activities[1],14),2)
const result=core.calculate({startDate:'2026-08-01',endDate:'2026-08-14',balances:{宝石:20},activityIds:['daily','weekly','once'],expenses:[{date:'2026-08-10',resources:{宝石:30}}],goals:[{resource:'宝石',amount:200}]},activities)
assert.deepEqual(result.income,{宝石:190,金币:200})
assert.equal(result.final.宝石,180)
assert.equal(result.goals[0].gap,20)
const timeline=core.timeline({startDate:'2026-08-01',endDate:'2026-08-14',balances:{宝石:20},activityIds:['daily','weekly','once'],expenses:[{date:'2026-08-10',resources:{宝石:30}}],goals:[{resource:'宝石',amount:100}]},[
  {id:'daily',frequency:'每日',periodDays:1,rewards:{宝石:10}},
  {id:'weekly',frequency:'每周',periodDays:7,rewards:{金币:100}},
  {id:'once',frequency:'限时',limited:true,rewards:{宝石:50}},
])
assert.equal(timeline.rows.length,14)
assert.equal(timeline.rows[0].balances.宝石,80)
assert.equal(timeline.rows[6].balances.金币,100)
assert.equal(timeline.goals[0].estimatedDate,'2026-08-03')
console.log('planner-core tests passed')
