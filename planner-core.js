(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PlannerCore=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const DAY=86400000
  function dateValue(value){const date=new Date(String(value)+'T00:00:00');return Number.isNaN(date.getTime())?null:date}
  function inclusiveDays(start,end){const a=dateValue(start),b=dateValue(end);if(!a||!b)return 0;return Math.round((b-a)/DAY)+1}
  function occurrences(activity,days){if(days<1)return 0;if(activity.limited)return 1;return activity.frequency==='每日'?days:Math.floor(days/(Number(activity.periodDays)||1))}
  function add(target,values,multiplier=1){Object.entries(values||{}).forEach(([key,value])=>{target[key]=(target[key]||0)+(Number(value)||0)*multiplier})}
  function calculate(plan,activityCatalog){
    const days=inclusiveDays(plan.startDate,plan.endDate)
    if(days<1)throw new Error('结束日期不能早于开始日期')
    const selected=new Set(plan.activityIds||[]),income={},expenses={},balances={...(plan.balances||{})},details=[]
    ;(activityCatalog||[]).forEach(activity=>{if(!selected.has(activity.id))return;const times=occurrences(activity,days);add(income,activity.rewards,times);details.push({id:activity.id,name:activity.name,times,rewards:activity.rewards})})
    ;(plan.expenses||[]).forEach(expense=>{if(expense.date&&expense.date>=plan.startDate&&expense.date<=plan.endDate)add(expenses,expense.resources,1)})
    const names=new Set([...Object.keys(balances),...Object.keys(income),...Object.keys(expenses),...(plan.goals||[]).map(goal=>goal.resource)])
    const final={};names.forEach(name=>{final[name]=(Number(balances[name])||0)+(income[name]||0)-(expenses[name]||0)})
    const goals=(plan.goals||[]).map(goal=>{const target=Number(goal.amount)||0,current=final[goal.resource]||0;return {...goal,current,gap:Math.max(0,target-current),achieved:current>=target}})
    return {days,income,expenses,final,goals,details,paidActivities:details.filter(row=>(activityCatalog.find(x=>x.id===row.id)||{}).paid).length}
  }
  function compare(plans,activities){return (plans||[]).map(plan=>({plan,result:calculate(plan,activities)}))}
  function timeline(plan,activityCatalog){
    const days=inclusiveDays(plan.startDate,plan.endDate)
    if(days<1)throw new Error('结束日期不能早于开始日期')
    const selected=new Set(plan.activityIds||[]),running={...(plan.balances||{})},rows=[]
    for(let index=0;index<days;index++){
      const date=new Date(String(plan.startDate)+'T00:00:00');date.setDate(date.getDate()+index)
      const dateText=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-'),changes={}
      ;(activityCatalog||[]).forEach(activity=>{
        if(!selected.has(activity.id))return
        const occurs=activity.limited?index===0:(activity.frequency==='每日'||activity.frequency==='姣忔棩')?true:(index+1)%(Number(activity.periodDays)||1)===0
        if(occurs)add(changes,activity.rewards,1)
      })
      ;(plan.expenses||[]).forEach(expense=>{if(expense.date===dateText)add(changes,expense.resources,-1)})
      add(running,changes,1);rows.push({date:dateText,changes:{...changes},balances:{...running}})
    }
    const goals=(plan.goals||[]).map(goal=>{const found=rows.find(row=>(row.balances[goal.resource]||0)>=(Number(goal.amount)||0));return {...goal,estimatedDate:found?.date||'',achievable:Boolean(found)}})
    return {rows,goals}
  }
  return {inclusiveDays,occurrences,calculate,timeline,compare}
})
