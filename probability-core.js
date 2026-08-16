(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ProbabilityCore=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function clamp(value,min,max){return Math.min(max,Math.max(min,Number(value)||0))}
  function calculate({draws=0,startPity=0,baseGoldRate=0,pityMax=0,upRate=0,guaranteedUp=false,pityTargetRate}){
    draws=Math.floor(clamp(draws,0,300));pityMax=Math.max(1,Math.floor(pityMax));startPity=Math.floor(clamp(startPity,0,pityMax-1));baseGoldRate=clamp(baseGoldRate,0,1);upRate=clamp(upRate,0,1);pityTargetRate=pityTargetRate==null?(guaranteedUp?1:upRate):clamp(pityTargetRate,0,1)
    function metricDistribution(kind){
      let states=new Map([[`${startPity}|0`,1]])
      for(let step=0;step<draws;step++){
        const next=new Map(),push=(pity,count,prob)=>{if(prob<=0)return;const key=`${pity}|${count}`;next.set(key,(next.get(key)||0)+prob)}
        states.forEach((prob,key)=>{const [pity,count]=key.split('|').map(Number),hard=pity+1>=pityMax
          if(hard){if(kind==='gold')push(0,count+1,prob);else{push(0,count+1,prob*pityTargetRate);push(0,count,prob*(1-pityTargetRate))};return}
          if(kind==='gold'){push(0,count+1,prob*baseGoldRate);push(pity+1,count,prob*(1-baseGoldRate))}
          else{push(0,count+1,prob*baseGoldRate*upRate);push(0,count,prob*baseGoldRate*(1-upRate));push(pity+1,count,prob*(1-baseGoldRate))}
        });states=next
      }
      const dist={};let expected=0;states.forEach((prob,key)=>{const count=Number(key.split('|')[1]);dist[count]=(dist[count]||0)+prob;expected+=count*prob});return {dist,expected}
    }
    const gold=metricDistribution('gold'),up=metricDistribution('up'),goldDist=gold.dist,upDist=up.dist,expectedGold=gold.expected,expectedUp=up.expected
    const percentile=(dist,p)=>{let sum=0;for(const key of Object.keys(dist).map(Number).sort((a,b)=>a-b)){sum+=dist[key];if(sum>=p)return key}return 0}
    return {draws,expectedGold,expectedUp,atLeastOneGold:1-(goldDist[0]||0),atLeastOneUp:1-(upDist[0]||0),goldDist,upDist,goldRange:[percentile(goldDist,.1),percentile(goldDist,.9)],upRange:[percentile(upDist,.1),percentile(upDist,.9)]}
  }
  return {calculate}
})
