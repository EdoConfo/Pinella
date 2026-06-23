"use strict";
(function(){
  var KEY="burraco-app-v2";
  function loadRaw(){ try{ var r=localStorage.getItem(KEY); return r?JSON.parse(r):null; }catch(e){ return null; } }
  function persist(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }
  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

  var SYMBOLS=["\u2660","\u2665","\u2666","\u2663","\uD83E\uDD8A","\uD83D\uDC2F","\uD83E\uDD81","\uD83D\uDC3C","\uD83D\uDC38","\uD83E\uDD89","\uD83D\uDC2C","\uD83E\uDD8B","\uD83D\uDD25","\u2B50","\uD83D\uDC51","\uD83C\uDFAF","\uD83C\uDF40","\uD83C\uDFB2","\uD83D\uDE80","\uD83C\uDF55"];
  var COLORS=["#C0463B","#15463B","#A9842F","#3B6FC0","#7A3BC0","#C03B8F","#2E7D5B","#1C1B19"];

  var DEF={players:[],settings:{target:2005,semipulito:true,showTourneys:false,values:{pulito:200,semi:150,sporco:100,chius:100,pozz:100}},casual:{active:false,teams:[],target:2005,rounds:[]},tournaments:[],history:[]};

  var state=loadRaw();
  if(!state){
    state=JSON.parse(JSON.stringify(DEF));
    var old=null; try{ var o=localStorage.getItem("burraco-scorekeeper-v1"); old=o?JSON.parse(o):null; }catch(e){}
    if(old){ state.settings.target=old.target||2005; state.settings.semipulito=!!old.semipulito; if(old.values)state.settings.values=Object.assign(state.settings.values,old.values); }
  }
  // defensive defaults + migrations
  state.players=(state.players||[]).map(function(p){ if(!("avatar" in p))p.avatar=null; return p; });
  state.settings=Object.assign({},DEF.settings,state.settings||{});
  state.settings.values=Object.assign({},DEF.settings.values,state.settings.values||{});
  if(!state.casual){
    // migrate old quick game if present
    var q=state.quick;
    if(q&&Array.isArray(q.rounds)&&q.rounds.length){
      state.casual={active:true,teams:[{members:[{name:(q.names&&q.names[0])||"Squadra A"}]},{members:[{name:(q.names&&q.names[1])||"Squadra B"}]}],target:state.settings.target,rounds:q.rounds};
    } else state.casual={active:false,teams:[],target:state.settings.target,rounds:[]};
  }
  delete state.quick;
  state.tournaments=(state.tournaments||[]).map(function(t){ if(t.target==null)t.target=state.settings.target||2005; return t; });
  state.history=Array.isArray(state.history)?state.history:[];

  var $=function(id){return document.getElementById(id);};
  function fmt(n){return Math.round(n).toLocaleString("it-IT");}
  function esc(s){return String(s).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}
  function blankInput(){return {pulito:0,semi:0,sporco:0,tavolo:0,mano:0,chius:false,pozz:false};}
  function roundScore(inp){var v=state.settings.values;return inp.pulito*v.pulito+inp.semi*v.semi+inp.sporco*v.sporco+inp.tavolo-inp.mano+(inp.chius?v.chius:0)-(inp.pozz?v.pozz:0);}
  function totals(rounds){var a=0,b=0;(rounds||[]).forEach(function(r){a+=roundScore(r.a);b+=roundScore(r.b);});return [a,b];}
  function getPlayer(id){return state.players.find(function(x){return x.id===id;});}
  function playerName(id){var p=getPlayer(id);return p?p.name:"?";}
  function coupleLabel(c){return playerName(c.p1)+" & "+playerName(c.p2);}
  function colorFor(id){var h=0,s=String(id);for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return COLORS[h%COLORS.length];}
  function avatarHTML(p,size,cls){
    size=size||40;var extra=cls?(" "+cls):"";
    var st="width:"+size+"px;height:"+size+"px;font-size:"+Math.round(size*0.42)+"px;";
    if(p&&p.avatar&&p.avatar.photo) return '<span class="av'+extra+'" style="'+st+'background-image:url('+p.avatar.photo+')"></span>';
    var bg=(p&&p.avatar&&p.avatar.color)||colorFor((p&&p.id)||p&&p.name||"x");
    var sym=(p&&p.avatar&&p.avatar.symbol)||(((p&&p.name||"?").trim()[0]||"?").toUpperCase());
    return '<span class="av'+extra+'" style="'+st+'background:'+bg+'">'+esc(sym)+'</span>';
  }
  // member -> pseudo player for avatar (guest has no avatar)
  function memberAvatar(m,size,cls){
    if(m.id){var p=getPlayer(m.id);if(p)return avatarHTML(p,size,cls);}
    return avatarHTML({id:m.id||m.name,name:m.name,avatar:null},size,cls);
  }

  // ===== scorer context =====
  var scorer={mode:"casual",names:["",""],rounds:[],target:2005,members:[[],[]],tId:null,mId:null};
  function casualLabel(i){var t=state.casual.teams[i];if(!t)return i?"Squadra B":"Squadra A";return t.members.map(function(m){return m.name;}).join(" & ")||(i?"Squadra B":"Squadra A");}
  function setCasualScorer(){scorer={mode:"casual",names:[casualLabel(0),casualLabel(1)],rounds:state.casual.rounds,target:state.casual.target,members:[state.casual.teams[0]?state.casual.teams[0].members:[],state.casual.teams[1]?state.casual.teams[1].members:[]],tId:null,mId:null};}

  // ===== navigation =====
  var view="casual-setup",currentTourneyId=null;
  function show(el,on){$(el).hidden=!on;}
  function nav(v){
    view=v;
    show("viewCasualSetup",v==="casual-setup");
    show("viewScorer",v==="casual-play"||v==="match-play");
    show("viewTourneys",v==="tourneys");
    show("viewTourney",v==="tourney");
    show("viewHistory",v==="history");
    show("viewGameDetail",v==="game-detail");
    show("matchNav",v==="match-play");
    show("casualBar",v==="casual-play");
    show("btnFinish",v==="match-play"||v==="casual-play");
    show("footNote",v==="casual-setup"||v==="casual-play");
    setDockActive(v);
    if(v==="casual-setup")renderSetup();
    if(v==="casual-play"||v==="match-play")renderScorer();
    if(v==="tourneys")renderTourneys();
    if(v==="tourney")renderTourney();
    if(v==="history")renderHistory_view();
    if(v==="game-detail")renderGameDetail();
    window.scrollTo(0,0);
  }
  function setDockActive(v){
    var partite=(v==="casual-setup"||v==="casual-play"||v==="match-play");
    var tornei=(v==="tourneys"||v==="tourney");
    $("dockPartite").classList.toggle("on",partite);
    $("dockTornei").classList.toggle("on",tornei);
    $("dockStorico").classList.toggle("on",v==="history"||v==="game-detail");
  }
  function goPartita(){ if(state.casual.active){setCasualScorer();nav("casual-play");} else nav("casual-setup"); }

  // ===== casual setup =====
  var assign={};
  function countTeam(t){var n=0;for(var k in assign)if(assign[k]===t)n++;return n;}
  function allEntries(){return state.players;}
  function membersOf(t){var res=[];allEntries().forEach(function(p){if(assign[p.id]===t)res.push({id:p.id,name:p.name});});return res;}
  function cycle(id){
    var cur=assign[id]||null;
    if(cur===null){ if(countTeam("A")<2)assign[id]="A"; else if(countTeam("B")<2)assign[id]="B"; }
    else if(cur==="A"){ if(countTeam("B")<2)assign[id]="B"; else delete assign[id]; }
    else { delete assign[id]; }
    renderSetup();
  }
  function renderSetup(){
    $("setupTarget").value=state.casual.target||state.settings.target;
    var grid=$("setupGrid"),entries=allEntries();
    if(entries.length===0){ grid.innerHTML='<div class="ref" style="color:var(--muted)">Nessun giocatore salvato. Tocca <b>+ Aggiungi giocatore</b> per crearne uno.</div>'; }
    else{
      grid.innerHTML=entries.map(function(p){
        var a=assign[p.id]||"";
        var badge=a?'<span class="badge '+a+'">'+a+'</span>':"";
        return '<div class="pchip'+(a?(" sel "+a):"")+'" data-id="'+p.id+'">'+avatarHTML(p,48)+badge+'<span class="nm">'+esc(p.name)+'</span></div>';
      }).join("");
      grid.querySelectorAll(".pchip").forEach(function(el){el.addEventListener("click",function(){cycle(el.dataset.id);});});
    }
    var ma=membersOf("A"),mb=membersOf("B");
    $("previewA").textContent=ma.length?ma.map(function(m){return m.name;}).join(" & "):"—";
    $("previewB").textContent=mb.length?mb.map(function(m){return m.name;}).join(" & "):"—";
    $("startCasual").disabled=!(ma.length&&mb.length);
  }
  function startCasual(){
    var ma=membersOf("A"),mb=membersOf("B");
    if(!ma.length||!mb.length)return;
    var tg=parseInt($("setupTarget").value,10);if(isNaN(tg)||tg<100)tg=state.settings.target||2005;
    state.casual={active:true,teams:[{members:ma},{members:mb}],target:tg,rounds:[]};
    persist();setCasualScorer();nav("casual-play");
  }
  function archiveCasual(){
    var c=state.casual;if(!c||!c.rounds||!c.rounds.length)return;
    var tot=totals(c.rounds);
    state.history.push({id:uid(),ts:Date.now(),mode:"casual",target:c.target,teams:[{members:((c.teams[0]||{}).members)||[]},{members:((c.teams[1]||{}).members)||[]}],names:[casualLabel(0),casualLabel(1)],rounds:c.rounds.slice(),totals:tot});
  }
  function newCasual(){
    if(state.casual.rounds.length && !confirm("Iniziare una nuova partita? Quella attuale verrà salvata nello storico."))return;
    archiveCasual();
    state.casual.active=false;assign={};persist();nav("casual-setup");
  }
  function terminateCasual(){
    if(!state.casual.rounds.length)return;
    if(!confirm("Terminare la partita? Verrà salvata nello storico."))return;
    archiveCasual();
    state.casual.active=false;assign={};persist();nav("casual-setup");
    toast("Partita salvata nello storico");
  }

  // ===== scorer render =====
  function renderScorer(){
    var t=totals(scorer.rounds),a=t[0],b=t[1],tg=scorer.target;
    $("nameA").textContent=scorer.names[0];$("nameB").textContent=scorer.names[1];
    $("totalA").textContent=fmt(a);$("totalB").textContent=fmt(b);$("targetLabel").textContent=fmt(tg);
    // avatars
    $("avsA").innerHTML=(scorer.members&&scorer.members[0]||[]).map(function(m){return memberAvatar(m,30);}).join("");
    $("avsB").innerHTML=(scorer.members&&scorer.members[1]||[]).map(function(m){return memberAvatar(m,30);}).join("");
    $("sideA").classList.toggle("lead",a>b&&a>0);$("sideB").classList.toggle("lead",b>a&&b>0);
    $("fillA").style.width=Math.min(100,a/tg*100)+"%";$("fillB").style.width=Math.min(100,b/tg*100)+"%";
    var diff=Math.abs(a-b);
    $("metaA").textContent=a>b&&a>0?"+"+fmt(diff):(tg-a>0?fmt(tg-a)+" al traguardo":"");
    $("metaB").textContent=b>a&&b>0?"+"+fmt(diff):(tg-b>0?fmt(tg-b)+" al traguardo":"");
    var won=(a>=tg||b>=tg)&&a!==b,w=$("winner");
    if(won){var wi=a>b?0:1;$("winnerName").textContent=scorer.names[wi]+" vince!";$("winnerSub").textContent="con "+fmt(Math.max(a,b))+" punti · margine di "+fmt(diff);w.classList.add("show");if(!scorer._won)celebrate();}else w.classList.remove("show");
    scorer._won=won;
    if(scorer.mode==="match"){var m=getMatch(scorer.tId,scorer.mId);$("btnFinish").hidden=false;$("btnFinish").textContent=m&&m.finished?"Riapri partita":"Termina partita";}
    else if(scorer.mode==="casual"){$("btnFinish").hidden=scorer.rounds.length===0;$("btnFinish").textContent="Termina partita";}
    if(scorer.mode==="casual")$("casualTitle").textContent=scorer.names[0]+" vs "+scorer.names[1];
    renderHistory();persist();
  }
  function renderHistory(){
    var area=$("histArea");
    if(scorer.rounds.length===0){area.innerHTML='<div class="empty"><span class="big">Nessuna mano ancora</span>Aggiungi la prima mano per iniziare a contare.</div>';return;}
    var t=totals(scorer.rounds);
    var rows=scorer.rounds.map(function(r,i){var sa=roundScore(r.a),sb=roundScore(r.b);var ca=sa>sb?' class="cell-win"':'',cb=sb>sa?' class="cell-win"':'';return '<tr class="clk" data-i="'+i+'"><td>'+(i+1)+'</td><td'+ca+'>'+fmt(sa)+'</td><td'+cb+'>'+fmt(sb)+'</td></tr>';}).join("");
    var la=t[0]>=t[1]?' class="cell-lead"':'',lb=t[1]>=t[0]?' class="cell-lead"':'';
    area.innerHTML='<table><thead><tr><th>#</th><th>'+esc(scorer.names[0])+'</th><th>'+esc(scorer.names[1])+'</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><td>Totale</td><td'+la+'>'+fmt(t[0])+'</td><td'+lb+'>'+fmt(t[1])+'</td></tr></tfoot></table>';
    area.querySelectorAll("tbody tr").forEach(function(tr){tr.addEventListener("click",function(){openSheet(parseInt(tr.dataset.i,10));});});
  }

  // ===== round sheet =====
  var editIndex=-1,draft={a:blankInput(),b:blankInput()};
  var CARDS=[{k:"jolly",lbl:"Jolly",v:30},{k:"pin",lbl:"Pinella (2)",v:20},{k:"asso",lbl:"Asso",v:15},{k:"fig",lbl:"Dall'8 al K",v:10},{k:"bas",lbl:"Dal 3 al 7",v:5}];
  function paneHTML(side){
    var v=state.settings.values;
    var semiField=state.settings.semipulito?'<div class="field"><label>Burraco semipulito (×'+v.semi+')</label>'+stepper(side,"semi")+'</div>':'';
    return '<div class="pane"><div class="pane-name" id="paneName'+side+'"></div><div class="field"><label>Burraco pulito (×'+v.pulito+')</label>'+stepper(side,"pulito")+'</div>'+semiField+'<div class="field"><label>Burraco sporco (×'+v.sporco+')</label>'+stepper(side,"sporco")+'</div><div class="field"><label>Punti carte sul tavolo</label>'+pointsBox(side,"tavolo")+'</div><div class="field"><label>Punti carte in mano (−)</label>'+pointsBox(side,"mano")+'</div><div class="checks"><label class="check gold"><input type="checkbox" data-side="'+side+'" data-k="chius"><span>Chiusura (+'+v.chius+')</span></label><label class="check"><input type="checkbox" data-side="'+side+'" data-k="pozz"><span>Pozzetto non preso (−'+v.pozz+')</span></label></div><div class="subtotal">Punti mano <b id="sub'+side+'">0</b></div></div>';
  }
  function stepper(side,k){return '<div class="stepper" data-side="'+side+'" data-k="'+k+'"><button type="button" data-d="-1">−</button><span class="val">0</span><button type="button" data-d="1">+</button></div>';}
  function pointsBox(side,k){
    var chips=CARDS.map(function(c){return '<div class="chip" data-val="'+c.v+'"><div class="lbl">'+c.lbl+' <small>'+c.v+'</small></div><div class="ctrl"><button type="button" data-d="-1">−</button><span class="c">0</span><button type="button" data-d="1">+</button></div></div>';}).join("");
    return '<div class="with-calc"><input class="numbox" type="number" inputmode="numeric" data-side="'+side+'" data-k="'+k+'" placeholder="0"><button type="button" class="calc-toggle" data-side="'+side+'" data-k="'+k+'" aria-label="Conta carte">🧮</button></div><div class="counter" data-side="'+side+'" data-k="'+k+'">'+chips+'<div class="sum">Totale carte <b>0</b></div></div>';
  }
  function buildSheet(){$("sheetBody").innerHTML='<div class="teams2">'+paneHTML("a")+paneHTML("b")+'</div>';$("paneNamea").textContent=scorer.names[0];$("paneNameb").textContent=scorer.names[1];wireSheet();syncSheet();}
  function wireSheet(){
    var body=$("sheetBody");
    body.querySelectorAll(".stepper button").forEach(function(btn){btn.addEventListener("click",function(){var st=btn.parentNode;draft[st.dataset.side][st.dataset.k]=Math.max(0,draft[st.dataset.side][st.dataset.k]+parseInt(btn.dataset.d,10));syncSheet();});});
    body.querySelectorAll(".numbox").forEach(function(inp){inp.addEventListener("input",function(){var v=parseInt(inp.value,10);if(isNaN(v))v=0;draft[inp.dataset.side][inp.dataset.k]=v;syncSheet(true);});});
    body.querySelectorAll('.check input').forEach(function(c){c.addEventListener("change",function(){var side=c.dataset.side,k=c.dataset.k;draft[side][k]=c.checked;if(c.checked&&k==="chius")draft[side].pozz=false;if(c.checked&&k==="pozz")draft[side].chius=false;syncSheet();});});
    body.querySelectorAll(".calc-toggle").forEach(function(btn){btn.addEventListener("click",function(){var counter=body.querySelector('.counter[data-side="'+btn.dataset.side+'"][data-k="'+btn.dataset.k+'"]');btn.classList.toggle("active",counter.classList.toggle("open"));});});
    body.querySelectorAll(".counter").forEach(function(counter){var side=counter.dataset.side,k=counter.dataset.k;counter.querySelectorAll(".chip").forEach(function(chip){var cspan=chip.querySelector(".c");chip.querySelectorAll("button").forEach(function(b){b.addEventListener("click",function(){var cur=parseInt(cspan.textContent,10)+parseInt(b.dataset.d,10);if(cur<0)cur=0;cspan.textContent=cur;var sum=0;counter.querySelectorAll(".chip").forEach(function(ch){sum+=parseInt(ch.querySelector(".c").textContent,10)*parseInt(ch.dataset.val,10);});counter.querySelector(".sum b").textContent=sum;draft[side][k]=sum;body.querySelector('.numbox[data-side="'+side+'"][data-k="'+k+'"]').value=sum?sum:"";syncSheet();});});});});
  }
  function syncSheet(skipBoxes){
    ["a","b"].forEach(function(side){var d=draft[side],body=$("sheetBody");
      body.querySelectorAll('.stepper[data-side="'+side+'"]').forEach(function(st){st.querySelector(".val").textContent=d[st.dataset.k];});
      if(!skipBoxes)body.querySelectorAll('.numbox[data-side="'+side+'"]').forEach(function(b){b.value=d[b.dataset.k]?d[b.dataset.k]:"";});
      body.querySelectorAll('.check input[data-side="'+side+'"]').forEach(function(c){c.checked=!!d[c.dataset.k];});
      var s=roundScore(d),el=$("sub"+side);el.textContent=(s<0?"−":"")+fmt(Math.abs(s));el.classList.toggle("neg",s<0);});
  }
  function openSheet(i){
    editIndex=(typeof i==="number")?i:-1;
    if(editIndex>=0){draft={a:Object.assign(blankInput(),scorer.rounds[i].a),b:Object.assign(blankInput(),scorer.rounds[i].b)};$("sheetTitle").textContent="Mano "+(i+1);$("deleteRound").style.display="";$("saveRound").textContent="Aggiorna mano";}
    else{draft={a:blankInput(),b:blankInput()};$("sheetTitle").textContent="Nuova mano";$("deleteRound").style.display="none";$("saveRound").textContent="Salva mano";}
    buildSheet();openOv("sheet","scrim");
  }
  function saveRound(){var r={a:draft.a,b:draft.b};if(editIndex>=0)scorer.rounds[editIndex]=r;else scorer.rounds.push(r);closeOv("sheet","scrim");renderScorer();toast(editIndex>=0?"Mano aggiornata":"Mano aggiunta");}
  function deleteRound(){if(editIndex<0)return;var removed=scorer.rounds.splice(editIndex,1)[0],at=editIndex;closeOv("sheet","scrim");renderScorer();toast("Mano eliminata",function(){scorer.rounds.splice(at,0,removed);renderScorer();});}

  // ===== tournaments =====
  function getTourney(id){return state.tournaments.find(function(t){return t.id===id;});}
  function getMatch(tId,mId){var t=getTourney(tId);if(!t)return null;return t.matches.find(function(m){return m.id===mId;});}
  function tourneyComplete(t){return !!t&&t.matches.length>0&&t.matches.every(function(m){return m.finished;});}
  function renderTourneys(){
    var area=$("tListArea");
    if(state.tournaments.length===0){area.innerHTML='<div class="empty"><span class="big">Nessun torneo</span>Crea un torneo a coppie: ogni coppia incontra tutte le altre, classifica per vittorie e differenza punti.</div>';return;}
    area.innerHTML=state.tournaments.map(function(t){var played=t.matches.filter(function(m){return m.finished;}).length;var st=standings(t);var leader=played>0&&st.length?st[0].label:"—";var complete=tourneyComplete(t);var sub=t.couples.length+' coppie · a '+fmt(t.target)+' · '+(complete?'Concluso · 🏆 '+esc(leader):played+'/'+t.matches.length+' partite'+(played>0?' · 1° '+esc(leader):''));return '<div class="tcard'+(complete?' done':'')+'" data-id="'+t.id+'"><div class="rank">'+t.couples.length+'</div><div class="info"><b>'+esc(t.name)+'</b><span>'+sub+'</span></div><div class="chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></div></div>';}).join("");
    area.querySelectorAll(".tcard").forEach(function(c){c.addEventListener("click",function(){openTourney(c.dataset.id);});});
  }
  function openTourney(id){currentTourneyId=id;nav("tourney");}
  function renderTourney(){
    var t=getTourney(currentTourneyId);if(!t){nav("tourneys");return;}
    $("tourneyTitle").textContent=t.name;
    var st=standings(t),anyPlayed=t.matches.some(function(m){return m.finished;});
    var complete=tourneyComplete(t);
    $("tourneyWinner").innerHTML=complete&&st.length?'<div class="winner show" style="margin-bottom:14px"><div class="cup">&#127942;</div><div class="txt"><b>'+esc(st[0].label)+'</b><span>vince il torneo · '+st[0].w+' vittorie</span></div></div>':'';
    $("standingsArea").innerHTML='<table><thead><tr><th>#</th><th class="lcol">Coppia</th><th>V</th><th>Diff</th><th>PF</th></tr></thead><tbody>'+st.map(function(row,i){var lead=anyPlayed&&i===0?' class="cell-lead"':'';return '<tr><td'+lead+'>'+(i+1)+'</td><td class="lcol"'+lead+'>'+esc(row.label)+'</td><td>'+row.w+'</td><td>'+(row.diff>0?"+":"")+fmt(row.diff)+'</td><td>'+fmt(row.pf)+'</td></tr>';}).join("")+'</tbody></table>';
    var turni={};t.matches.forEach(function(m){(turni[m.turno]=turni[m.turno]||[]).push(m);});
    var html="";Object.keys(turni).sort(function(x,y){return x-y;}).forEach(function(tn){
      var byeLabel=t.byes&&t.byes[tn]!=null?coupleLabel(t.couples[t.byes[tn]]):null;
      html+='<div class="turno-h">Turno '+tn+(byeLabel?'<span class="bye">riposa: '+esc(byeLabel)+'</span>':'')+'</div>';
      turni[tn].forEach(function(m){var ca=t.couples[m.ci],cb=t.couples[m.cj];var tot=totals(m.rounds),sa=tot[0],sb=tot[1];var stat=m.finished?'<span class="stat done">Conclusa</span>':(m.rounds.length>0?'<span class="stat live">In corso</span>':'<span class="stat todo">Da giocare</span>');var showSc=m.finished||m.rounds.length>0;var wa=m.finished&&sa>sb,wb=m.finished&&sb>sa;html+='<div class="match" data-id="'+m.id+'"><div class="pair"><div class="row'+(wa?' w':'')+'"><span class="nm">'+esc(coupleLabel(ca))+'</span>'+(showSc?'<span class="sc">'+fmt(sa)+'</span>':'')+'</div><div class="vs">VS</div><div class="row'+(wb?' w':'')+'"><span class="nm">'+esc(coupleLabel(cb))+'</span>'+(showSc?'<span class="sc">'+fmt(sb)+'</span>':'')+'</div></div>'+stat+'</div>';});
    });
    $("calendarArea").innerHTML=html;
    $("calendarArea").querySelectorAll(".match").forEach(function(el){el.addEventListener("click",function(){openMatch(t.id,el.dataset.id);});});
  }
  function standings(t){
    var rows=t.couples.map(function(c){return {label:coupleLabel(c),w:0,diff:0,pf:0};});
    t.matches.forEach(function(m){if(!m.finished)return;var tot=totals(m.rounds),sa=tot[0],sb=tot[1];rows[m.ci].pf+=sa;rows[m.cj].pf+=sb;rows[m.ci].diff+=(sa-sb);rows[m.cj].diff+=(sb-sa);if(sa>sb)rows[m.ci].w++;else if(sb>sa)rows[m.cj].w++;});
    rows.sort(function(x,y){return y.w-x.w||y.diff-x.diff||y.pf-x.pf;});
    return rows;
  }
  function openMatch(tId,mId){
    var m=getMatch(tId,mId);if(!m)return;var t=getTourney(tId);
    var ca=t.couples[m.ci],cb=t.couples[m.cj];
    scorer={mode:"match",names:[coupleLabel(ca),coupleLabel(cb)],rounds:m.rounds,target:t.target,members:[[{id:ca.p1,name:playerName(ca.p1)},{id:ca.p2,name:playerName(ca.p2)}],[{id:cb.p1,name:playerName(cb.p1)},{id:cb.p2,name:playerName(cb.p2)}]],tId:tId,mId:mId};
    $("matchTitle").textContent=scorer.names[0]+" vs "+scorer.names[1];
    nav("match-play");
  }
  function finishMatch(){var t=getTourney(scorer.tId),m=getMatch(scorer.tId,scorer.mId);if(!m)return;var wasComplete=tourneyComplete(t);m.finished=!m.finished;persist();toast(m.finished?"Partita registrata in classifica":"Partita riaperta");if(!wasComplete&&tourneyComplete(t))celebrate();openTourney(scorer.tId);}
  function renameTourney(){var t=getTourney(currentTourneyId);if(!t)return;var n=prompt("Nome del torneo:",t.name);if(n===null)return;n=n.trim();if(!n)return;t.name=n.slice(0,40);persist();renderTourney();}
  function deleteTourney(){var t=getTourney(currentTourneyId);if(!t)return;if(!confirm("Eliminare il torneo \""+t.name+"\"? L'operazione non si può annullare."))return;state.tournaments=state.tournaments.filter(function(x){return x.id!==t.id;});persist();nav("tourneys");toast("Torneo eliminato");}
  function roundRobin(n){var ids=[];for(var i=0;i<n;i++)ids.push(i);if(n%2===1)ids.push(-1);var m=ids.length,arr=ids.slice(),turni=[],byes={};for(var r=0;r<m-1;r++){var pairs=[],bye=null;for(var k=0;k<m/2;k++){var x=arr[k],y=arr[m-1-k];if(x===-1){bye=y;}else if(y===-1){bye=x;}else pairs.push([x,y]);}turni.push(pairs);if(bye!=null)byes[r+1]=bye;var fixed=arr[0],rest=arr.slice(1);rest.unshift(rest.pop());arr=[fixed].concat(rest);}return {turni:turni,byes:byes};}

  // ===== new tournament =====
  var coupleRows=[];
  function openNewTourney(){$("tName").value="Torneo del "+new Date().toLocaleDateString("it-IT");$("tTarget").value=state.settings.target;coupleRows=[{p1:"",p2:""},{p1:"",p2:""}];$("tErr").textContent="";renderCouples();openOv("tSheet","scrim3");}
  function personOptions(sel){return '<option value="">— scegli —</option>'+state.players.map(function(p){return '<option value="'+p.id+'"'+(p.id===sel?" selected":"")+'>'+esc(p.name)+'</option>';}).join("");}
  function renderCouples(){
    var area=$("couplesArea");
    area.innerHTML=coupleRows.map(function(c,i){return '<div class="couple-row" data-i="'+i+'"><div class="num">'+(i+1)+'</div><div class="sels"><select class="txtbox" data-slot="p1">'+personOptions(c.p1)+'</select><select class="txtbox" data-slot="p2">'+personOptions(c.p2)+'</select></div>'+(coupleRows.length>2?'<button class="rm" data-i="'+i+'">&times;</button>':'<div style="width:26px"></div>')+'</div>';}).join("");
    area.querySelectorAll("select").forEach(function(s){s.addEventListener("change",function(){var row=s.closest(".couple-row");coupleRows[parseInt(row.dataset.i,10)][s.dataset.slot]=s.value;});});
    area.querySelectorAll(".rm").forEach(function(b){b.addEventListener("click",function(){coupleRows.splice(parseInt(b.dataset.i,10),1);renderCouples();});});
  }
  function createTourney(){
    $("tErr").textContent="";
    var name=$("tName").value.trim()||"Torneo";
    var tg=parseInt($("tTarget").value,10);if(isNaN(tg)||tg<100)tg=state.settings.target||2005;
    var used={},valid=[];
    for(var i=0;i<coupleRows.length;i++){var c=coupleRows[i];if(!c.p1||!c.p2){$("tErr").textContent="Completa tutte le coppie (servono due persone ciascuna).";return;}if(c.p1===c.p2){$("tErr").textContent="Coppia "+(i+1)+": scegli due persone diverse.";return;}if(used[c.p1]||used[c.p2]){$("tErr").textContent="Ogni persona può stare in una sola coppia.";return;}used[c.p1]=used[c.p2]=true;valid.push({id:uid(),p1:c.p1,p2:c.p2});}
    if(valid.length<2){$("tErr").textContent="Servono almeno due coppie.";return;}
    var rr=roundRobin(valid.length),matches=[];
    rr.turni.forEach(function(pairs,ti){pairs.forEach(function(pr){matches.push({id:uid(),turno:ti+1,ci:pr[0],cj:pr[1],rounds:[],finished:false});});});
    var t={id:uid(),name:name,target:tg,createdAt:Date.now(),couples:valid,matches:matches,byes:rr.byes};
    state.tournaments.unshift(t);persist();closeOv("tSheet","scrim3");openTourney(t.id);toast("Torneo creato · "+matches.length+" partite");
  }

  // ===== history + stats =====
  function playerStats(){
    var m={};
    function ensure(id){if(!m[id])m[id]={games:0,wins:0,pf:0,pa:0};return m[id];}
    function record(idsA,idsB,sa,sb){
      var wa=sa>sb,wb=sb>sa;
      idsA.forEach(function(id){if(!id)return;var s=ensure(id);s.games++;s.pf+=sa;s.pa+=sb;if(wa)s.wins++;});
      idsB.forEach(function(id){if(!id)return;var s=ensure(id);s.games++;s.pf+=sb;s.pa+=sa;if(wb)s.wins++;});
    }
    (state.history||[]).forEach(function(g){
      record((g.teams[0].members||[]).map(function(x){return x.id;}),(g.teams[1].members||[]).map(function(x){return x.id;}),g.totals[0],g.totals[1]);
    });
    (state.tournaments||[]).forEach(function(t){
      t.matches.forEach(function(mt){if(!mt.finished)return;var tot=totals(mt.rounds),ca=t.couples[mt.ci],cb=t.couples[mt.cj];record([ca.p1,ca.p2],[cb.p1,cb.p2],tot[0],tot[1]);});
    });
    return m;
  }
  function renderHistory_view(){
    var stats=playerStats(),area=$("statsArea");
    var rows=state.players.map(function(p){var s=stats[p.id]||{games:0,wins:0,pf:0,pa:0};return {p:p,games:s.games,wins:s.wins,pct:s.games?Math.round(s.wins/s.games*100):0,pf:s.pf};}).filter(function(r){return r.games>0;});
    rows.sort(function(a,b){return b.wins-a.wins||b.pct-a.pct||b.games-a.games||b.pf-a.pf;});
    if(rows.length===0){area.innerHTML='<div class="empty"><span class="big">Classifica vuota</span>Nessun giocatore ha ancora giocato una partita.</div>';}
    else{area.innerHTML='<table><thead><tr><th>#</th><th class="lcol">Giocatore</th><th>G</th><th>V</th><th>%</th></tr></thead><tbody>'+rows.map(function(r,i){return '<tr><td>'+(i+1)+'</td><td class="lcol">'+esc(r.p.name)+'</td><td>'+r.games+'</td><td>'+r.wins+'</td><td>'+r.pct+'%</td></tr>';}).join("")+'</tbody></table>';}
    var list=$("historyListArea"),games=(state.history||[]).slice().reverse();
    if(games.length===0){list.innerHTML='<div class="empty"><span class="big">Ancora nessuna partita</span>Le partite casual concluse compariranno qui quando inizi una nuova partita.</div>';return;}
    list.innerHTML=games.map(function(g){
      var sa=g.totals[0],sb=g.totals[1],wa=sa>sb,wb=sb>sa,d=new Date(g.ts);
      var dstr=d.toLocaleDateString("it-IT",{day:"numeric",month:"short"})+" · "+("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2)+" · a "+fmt(g.target);
      return '<div class="hgame clk" data-id="'+g.id+'"><div class="hg-top"><span>'+dstr+'</span><button class="hg-rm" data-id="'+g.id+'" aria-label="Elimina">&times;</button></div><div class="hg-row'+(wa?' w':'')+'"><span class="nm">'+esc(g.names[0])+'</span><span class="sc">'+fmt(sa)+'</span></div><div class="hg-row'+(wb?' w':'')+'"><span class="nm">'+esc(g.names[1])+'</span><span class="sc">'+fmt(sb)+'</span></div></div>';
    }).join("");
    list.querySelectorAll(".hgame").forEach(function(el){el.addEventListener("click",function(){openGameDetail(el.dataset.id);});});
    list.querySelectorAll(".hg-rm").forEach(function(b){b.addEventListener("click",function(e){e.stopPropagation();deleteHistoryGame(b.dataset.id);});});
  }
  function deleteHistoryGame(id){
    if(!confirm("Eliminare questa partita dallo storico?"))return;
    state.history=(state.history||[]).filter(function(g){return g.id!==id;});
    persist();renderHistory_view();
  }
  var currentGameId=null;
  function openGameDetail(id){currentGameId=id;nav("game-detail");}
  function renderGameDetail(){
    var g=(state.history||[]).filter(function(x){return x.id===currentGameId;})[0];
    if(!g){nav("history");return;}
    $("gameDetailTitle").textContent=g.names[0]+" vs "+g.names[1];
    var rounds=g.rounds||[],ta=totals(rounds),sa=g.totals[0],sb=g.totals[1],wa=sa>sb,wb=sb>sa,d=new Date(g.ts);
    var dstr=d.toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"})+" · "+("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
    var head='<div class="gd-card"><div class="gd-row'+(wa?' w':'')+'"><span class="nm">'+esc(g.names[0])+'</span><span class="sc">'+fmt(sa)+'</span></div><div class="gd-row'+(wb?' w':'')+'"><span class="nm">'+esc(g.names[1])+'</span><span class="sc">'+fmt(sb)+'</span></div></div><div class="ref" style="text-align:center">'+dstr+' · corsa a '+fmt(g.target)+'</div>';
    var body;
    if(rounds.length){
      body='<h2 class="sec" style="margin-top:16px">Mani giocate</h2><table><thead><tr><th>#</th><th>'+esc(g.names[0])+'</th><th>'+esc(g.names[1])+'</th></tr></thead><tbody>'+rounds.map(function(r,i){var ra=roundScore(r.a),rb=roundScore(r.b),ca=ra>rb?' class="cell-win"':'',cb=rb>ra?' class="cell-win"':'';return '<tr><td>'+(i+1)+'</td><td'+ca+'>'+fmt(ra)+'</td><td'+cb+'>'+fmt(rb)+'</td></tr>';}).join("")+'</tbody><tfoot><tr><td>Totale</td><td>'+fmt(ta[0])+'</td><td>'+fmt(ta[1])+'</td></tr></tfoot></table>';
    } else {
      body='<div class="empty" style="margin-top:16px"><span class="big">Dettaglio non disponibile</span>Le mani di questa partita non sono state salvate.</div>';
    }
    $("gameDetailArea").innerHTML=head+body;
  }

  // ===== player profile / stats =====
  function playerProfile(id){
    var games=0,wins=0,pf=0,pa=0,partners={},opponents={},recent=[];
    function acc(myIds,oppIds,sa,sb,ts,myLbl,oppLbl){
      var won=sa>sb;games++;if(won)wins++;pf+=sa;pa+=sb;
      myIds.forEach(function(pid){if(pid&&pid!==id){partners[pid]=partners[pid]||{g:0,w:0};partners[pid].g++;if(won)partners[pid].w++;}});
      oppIds.forEach(function(oid){if(oid){opponents[oid]=opponents[oid]||{g:0,beat:0};opponents[oid].g++;if(won)opponents[oid].beat++;}});
      recent.push({ts:ts||0,opp:oppLbl,sa:sa,sb:sb,won:won});
    }
    (state.history||[]).forEach(function(g){
      var idsA=(g.teams[0].members||[]).map(function(x){return x.id;}),idsB=(g.teams[1].members||[]).map(function(x){return x.id;});
      var inA=idsA.indexOf(id)>-1,inB=idsB.indexOf(id)>-1;if(!inA&&!inB)return;
      if(inA)acc(idsA,idsB,g.totals[0],g.totals[1],g.ts,g.names[0],g.names[1]);
      else acc(idsB,idsA,g.totals[1],g.totals[0],g.ts,g.names[1],g.names[0]);
    });
    (state.tournaments||[]).forEach(function(t){
      t.matches.forEach(function(m){if(!m.finished)return;var ca=t.couples[m.ci],cb=t.couples[m.cj],idsA=[ca.p1,ca.p2],idsB=[cb.p1,cb.p2];
        var inA=idsA.indexOf(id)>-1,inB=idsB.indexOf(id)>-1;if(!inA&&!inB)return;var tot=totals(m.rounds);
        if(inA)acc(idsA,idsB,tot[0],tot[1],t.createdAt,coupleLabel(ca),coupleLabel(cb));
        else acc(idsB,idsA,tot[1],tot[0],t.createdAt,coupleLabel(cb),coupleLabel(ca));});
    });
    recent.sort(function(a,b){return b.ts-a.ts;});
    var bp=null;Object.keys(partners).forEach(function(pid){var p=partners[pid];if(!bp||p.w>bp.w||(p.w===bp.w&&p.g>bp.g))bp={id:pid,w:p.w,g:p.g};});
    var to=null;Object.keys(opponents).forEach(function(oid){var o=opponents[oid];if(!to||o.beat>to.beat)to={id:oid,beat:o.beat,g:o.g};});
    return {games:games,wins:wins,pct:games?Math.round(wins/games*100):0,pf:pf,pa:pa,bestPartner:bp,topOpp:to,recent:recent.slice(0,5)};
  }
  function renderPlayerStats(id){
    var box=$("pStats");if(!box)return;
    if(!id){box.style.display="none";box.innerHTML="";return;}
    box.style.display="";
    var s=playerProfile(id);
    if(s.games===0){box.innerHTML='<div class="ref" style="text-align:center;padding:4px 0 2px">Nessuna partita giocata.</div>';return;}
    var html='<h2 class="sec" style="color:rgba(28,27,25,.5);margin-bottom:8px">Statistiche</h2>';
    html+='<div class="pstat-tiles"><div class="pstat"><b>'+s.games+'</b><span>Partite</span></div><div class="pstat"><b>'+s.wins+'</b><span>Vittorie</span></div><div class="pstat"><b>'+s.pct+'%</b><span>Vinte</span></div></div>';
    var extra=[];
    if(s.bestPartner&&s.bestPartner.w>0)extra.push('Miglior compagno: <b>'+esc(playerName(s.bestPartner.id))+'</b> ('+s.bestPartner.w+'V)');
    if(s.topOpp&&s.topOpp.beat>0)extra.push('Più battuto: <b>'+esc(playerName(s.topOpp.id))+'</b> ('+s.topOpp.beat+')');
    if(extra.length)html+='<div class="ref" style="padding:6px 2px 2px">'+extra.join(' · ')+'</div>';
    if(s.recent.length)html+='<div class="pstat-recent">'+s.recent.map(function(r){return '<div class="pr-row"><span class="r-res '+(r.won?'w':'l')+'">'+(r.won?'V':'P')+'</span><span class="r-lbl">'+esc(r.opp)+'</span><span class="r-sc">'+fmt(r.sa)+'–'+fmt(r.sb)+'</span></div>';}).join("")+'</div>';
    box.innerHTML=html;
  }

  // ===== roster + player editor =====
  function renderRoster(){
    var html=state.players.length===0
      ? '<div class="ref" style="text-align:center">Nessun giocatore. Aggiungine per usarli nelle partite e nei tornei.</div>'
      : state.players.map(function(p){return '<div class="person" data-id="'+p.id+'">'+avatarHTML(p,34)+'<div class="pn">'+esc(p.name)+'</div><span class="edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></span></div>';}).join("");
    ["rosterList","rosterList2"].forEach(function(id){
      var list=$(id);if(!list)return;
      list.innerHTML=html;
      list.querySelectorAll(".person").forEach(function(el){el.addEventListener("click",function(){openPlayer(el.dataset.id);});});
    });
  }
  function openPlayers(){renderRoster();openOv("playersSheet","scrim5");}
  var editingPlayerId=null,draftAvatar={symbol:null,color:null,photo:null};
  function renderAvatarPicker(){
    var fake={id:editingPlayerId||"new",name:$("pName").value||"?",avatar:{symbol:draftAvatar.symbol,color:draftAvatar.color,photo:draftAvatar.photo}};
    $("pPreview").outerHTML=avatarHTML(fake,84,"av-big").replace('class="av av-big"','class="av av-big" id="pPreview"');
    $("pRemovePhoto").style.display=draftAvatar.photo?"":"none";
    $("symGrid").querySelectorAll(".sym").forEach(function(s){s.classList.toggle("on",!draftAvatar.photo&&s.dataset.sym===draftAvatar.symbol);});
    $("colRow").querySelectorAll(".col").forEach(function(c){c.classList.toggle("on",c.dataset.col===draftAvatar.color);});
  }
  function buildPickers(){
    $("symGrid").innerHTML=SYMBOLS.map(function(s){return '<div class="sym" data-sym="'+s+'">'+s+'</div>';}).join("");
    $("colRow").innerHTML=COLORS.map(function(c){return '<div class="col" data-col="'+c+'" style="background:'+c+'"></div>';}).join("");
    $("symGrid").querySelectorAll(".sym").forEach(function(s){s.addEventListener("click",function(){draftAvatar.symbol=s.dataset.sym;draftAvatar.photo=null;if(!draftAvatar.color)draftAvatar.color=COLORS[1];renderAvatarPicker();});});
    $("colRow").querySelectorAll(".col").forEach(function(c){c.addEventListener("click",function(){draftAvatar.color=c.dataset.col;renderAvatarPicker();});});
  }
  function openPlayer(id){
    editingPlayerId=id||null;
    var p=id?getPlayer(id):null;
    $("pTitle").textContent=id?"Modifica giocatore":"Nuovo giocatore";
    $("pName").value=p?p.name:"";
    draftAvatar=p&&p.avatar?{symbol:p.avatar.symbol||null,color:p.avatar.color||null,photo:p.avatar.photo||null}:{symbol:null,color:null,photo:null};
    $("pDelete").style.display=id?"":"none";
    renderPlayerStats(id);
    renderAvatarPicker();openOv("pSheet","scrim4");
  }
  function savePlayer(){
    var name=$("pName").value.trim();if(!name){toast("Serve un nome");return;}
    var avatar=(draftAvatar.symbol||draftAvatar.color||draftAvatar.photo)?{symbol:draftAvatar.symbol||null,color:draftAvatar.color||null,photo:draftAvatar.photo||null}:null;
    if(editingPlayerId){var p=getPlayer(editingPlayerId);if(p){p.name=name.slice(0,22);p.avatar=avatar;}}
    else state.players.push({id:uid(),name:name.slice(0,22),avatar:avatar});
    persist();closeOv("pSheet","scrim4");renderRoster();
    if(view==="casual-setup")renderSetup();
  }
  function deletePlayer(){
    if(!editingPlayerId)return;
    var inUse=state.tournaments.some(function(t){return t.couples.some(function(c){return c.p1===editingPlayerId||c.p2===editingPlayerId;});});
    if(inUse){toast("Persona in uso in un torneo");return;}
    if(!confirm("Eliminare questo partecipante?"))return;
    state.players=state.players.filter(function(p){return p.id!==editingPlayerId;});
    persist();closeOv("pSheet","scrim4");renderRoster();if(view==="casual-setup")renderSetup();
  }
  function fileToAvatar(file,cb){
    var url=URL.createObjectURL(file),img=new Image();
    img.onload=function(){var s=Math.min(img.width,img.height),c=document.createElement("canvas");c.width=c.height=128;var ctx=c.getContext("2d");ctx.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,128,128);URL.revokeObjectURL(url);try{cb(c.toDataURL("image/jpeg",0.82));}catch(e){cb(null);}};
    img.onerror=function(){URL.revokeObjectURL(url);cb(null);};img.src=url;
  }

  // ===== settings =====
  function applyTourneysVisibility(){var show=state.settings.showTourneys!==false;$("dockTornei").hidden=!show;if(!show&&(view==="tourneys"||view==="tourney"))nav("casual-setup");}
  function openSettings(){var s=state.settings;$("setTarget").value=s.target;$("setSemi").checked=s.semipulito;$("setShowTourneys").checked=s.showTourneys!==false;$("vPulito").value=s.values.pulito;$("vSemi").value=s.values.semi;$("vSporco").value=s.values.sporco;$("vChius").value=s.values.chius;$("vPozz").value=s.values.pozz;openOv("setSheet","scrim2");}
  function saveSettings(){var s=state.settings;var tg=parseInt($("setTarget").value,10);s.target=isNaN(tg)||tg<100?2005:tg;s.semipulito=$("setSemi").checked;s.showTourneys=$("setShowTourneys").checked;function num(id,d){var v=parseInt($(id).value,10);return isNaN(v)?d:v;}s.values={pulito:num("vPulito",200),semi:num("vSemi",150),sporco:num("vSporco",100),chius:num("vChius",100),pozz:num("vPozz",100)};persist();applyTourneysVisibility();closeOv("setSheet","scrim2");if(view==="casual-play"||view==="match-play")renderScorer();else if(view==="tourney")renderTourney();else if(view==="casual-setup")renderSetup();}

  // ===== backup / restore =====
  function backupName(){var d=new Date();function p(n){return("0"+n).slice(-2);}return "pinella-backup-"+d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+".json";}
  function exportData(){
    var json=JSON.stringify(state,null,2),fname=backupName(),file=null;
    try{file=new File([json],fname,{type:"application/json"});}catch(e){}
    if(file&&navigator.canShare&&navigator.canShare({files:[file]})){
      navigator.share({files:[file],title:"Backup Pinella"}).then(function(){toast("Backup condiviso");}).catch(function(){});
      return;
    }
    try{
      var url=URL.createObjectURL(new Blob([json],{type:"application/json"})),a=document.createElement("a");
      a.href=url;a.download=fname;document.body.appendChild(a);a.click();a.remove();
      setTimeout(function(){URL.revokeObjectURL(url);},1000);
      toast("Backup esportato");
    }catch(e){toast("Esportazione non riuscita");}
  }
  function importData(file){
    var r=new FileReader();
    r.onload=function(){
      var obj;try{obj=JSON.parse(r.result);}catch(e){toast("File non valido");return;}
      if(!obj||typeof obj!=="object"||!("players" in obj||"settings" in obj||"tournaments" in obj)){toast("Non sembra un backup di Pinella");return;}
      if(!confirm("Importare questo backup? I dati attuali verranno sostituiti."))return;
      try{localStorage.setItem(KEY,JSON.stringify(obj));location.reload();}catch(e){toast("Importazione non riuscita");}
    };
    r.onerror=function(){toast("Errore nella lettura del file");};
    r.readAsText(file);
  }

  // ===== overlays / toast =====
  function openOv(sheet,scrim){$(scrim).classList.add("open");requestAnimationFrame(function(){$(sheet).classList.add("open");});}
  function closeOv(sheet,scrim){$(sheet).classList.remove("open");$(scrim).classList.remove("open");}
  var toastTimer=null;
  function toast(msg,undo){var t=$("toast");$("toastMsg").textContent=msg;var old=t.querySelector(".undo");if(old)old.remove();if(undo){var u=document.createElement("span");u.className="undo";u.textContent="Annulla";u.addEventListener("click",function(){undo();t.classList.remove("show");});t.appendChild(u);}t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.remove("show");},undo?4500:2200);}

  // ===== celebration + share =====
  function confetti(){
    var c=document.createElement("canvas");c.className="confetti-c";var ctx=c.getContext("2d");
    c.width=window.innerWidth;c.height=window.innerHeight;document.body.appendChild(c);
    var cols=["#CBA14C","#E6CD86","#C0463B","#2E7D5B","#3B6FC0","#F4EFE2"],P=[];
    for(var i=0;i<130;i++)P.push({x:Math.random()*c.width,y:-20-Math.random()*c.height*0.4,r:4+Math.random()*6,col:cols[(Math.random()*cols.length)|0],vy:2.5+Math.random()*4,vx:-2.5+Math.random()*5,rot:Math.random()*6.28,vr:-0.25+Math.random()*0.5});
    var t0=Date.now();
    (function frame(){var el=Date.now()-t0;ctx.clearRect(0,0,c.width,c.height);for(var i=0;i<P.length;i++){var p=P[i];p.x+=p.vx;p.y+=p.vy;p.vy+=0.06;p.rot+=p.vr;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=el<2200?1:Math.max(0,1-(el-2200)/600);ctx.fillStyle=p.col;ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*0.6);ctx.restore();}if(el<2800)requestAnimationFrame(frame);else c.remove();})();
  }
  function celebrate(){
    if(navigator.vibrate){try{navigator.vibrate([40,40,90]);}catch(e){}}
    if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    confetti();
  }
  function shareResult(){
    var t=totals(scorer.rounds),a=t[0],b=t[1];if(a===b){toast("Nessun vincitore ancora");return;}
    var wi=a>b?0:1,li=wi?0:1,txt="🏆 "+scorer.names[wi]+" batte "+scorer.names[li]+" "+fmt(Math.max(a,b))+"–"+fmt(Math.min(a,b))+" · Pinella";
    if(navigator.share){navigator.share({text:txt}).catch(function(){});}
    else if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){toast("Risultato copiato");},function(){toast("Copia non riuscita");});}
    else toast("Condivisione non supportata");
  }

  // ===== events =====
  $("dockPartite").addEventListener("click",goPartita);
  $("dockTornei").addEventListener("click",function(){nav("tourneys");});
  $("dockStorico").addEventListener("click",function(){nav("history");});
  $("dockGiocatori").addEventListener("click",openPlayers);
  $("dockImpostazioni").addEventListener("click",openSettings);
  $("playersClose").addEventListener("click",function(){closeOv("playersSheet","scrim5");});
  $("scrim5").addEventListener("click",function(){closeOv("playersSheet","scrim5");});
  $("openAddPerson2").addEventListener("click",function(){openPlayer(null);});
  $("startCasual").addEventListener("click",startCasual);
  $("newCasual").addEventListener("click",newCasual);
  $("addGuest").addEventListener("click",function(){openPlayers();});
  $("setupTarget").addEventListener("change",function(){var v=parseInt($("setupTarget").value,10);if(!isNaN(v)&&v>=100)state.casual.target=v;});
  $("btnAdd").addEventListener("click",function(){openSheet();});
  $("btnFinish").addEventListener("click",function(){if(scorer.mode==="match")finishMatch();else terminateCasual();});
  $("winShare").addEventListener("click",shareResult);
  $("matchBack").addEventListener("click",function(){openTourney(scorer.tId);});
  $("tourneyBack").addEventListener("click",function(){nav("tourneys");});
  $("gameBack").addEventListener("click",function(){nav("history");});
  $("tRename").addEventListener("click",renameTourney);
  $("tDelete").addEventListener("click",deleteTourney);
  $("btnNewTourney").addEventListener("click",openNewTourney);
  $("sheetClose").addEventListener("click",function(){closeOv("sheet","scrim");});
  $("scrim").addEventListener("click",function(){closeOv("sheet","scrim");});
  $("saveRound").addEventListener("click",saveRound);
  $("deleteRound").addEventListener("click",deleteRound);
  $("setClose").addEventListener("click",function(){closeOv("setSheet","scrim2");});
  $("scrim2").addEventListener("click",function(){closeOv("setSheet","scrim2");});
  $("saveSettings").addEventListener("click",saveSettings);
  $("exportData").addEventListener("click",exportData);
  $("importData").addEventListener("click",function(){$("importFile").click();});
  $("importFile").addEventListener("change",function(e){var f=e.target.files&&e.target.files[0];if(f)importData(f);e.target.value="";});
  $("pClose").addEventListener("click",function(){closeOv("pSheet","scrim4");});
  $("scrim4").addEventListener("click",function(){closeOv("pSheet","scrim4");});
  $("pSave").addEventListener("click",savePlayer);
  $("pDelete").addEventListener("click",deletePlayer);
  $("pName").addEventListener("input",renderAvatarPicker);
  $("pUpload").addEventListener("click",function(){$("photoInput").click();});
  $("photoInput").addEventListener("change",function(e){var f=e.target.files&&e.target.files[0];if(!f)return;fileToAvatar(f,function(data){if(data){draftAvatar.photo=data;renderAvatarPicker();}else toast("Immagine non valida");});e.target.value="";});
  $("pRemovePhoto").addEventListener("click",function(){draftAvatar.photo=null;renderAvatarPicker();});
  $("tClose").addEventListener("click",function(){closeOv("tSheet","scrim3");});
  $("scrim3").addEventListener("click",function(){closeOv("tSheet","scrim3");});
  $("addCouple").addEventListener("click",function(){coupleRows.push({p1:"",p2:""});renderCouples();});
  $("createTourney").addEventListener("click",createTourney);
  $("tAddPerson").addEventListener("click",function(){var n=$("tNewPerson").value.trim();if(!n)return;state.players.push({id:uid(),name:n.slice(0,22),avatar:null});persist();$("tNewPerson").value="";renderCouples();toast(n+" aggiunto");});
  $("tNewPerson").addEventListener("keydown",function(e){if(e.key==="Enter"){$("tAddPerson").click();}});
  buildPickers();
  applyTourneysVisibility();
  document.addEventListener("keydown",function(e){if(e.key==="Escape"){["sheet","setSheet","tSheet","pSheet","playersSheet"].forEach(function(s){$(s).classList.remove("open");});["scrim","scrim2","scrim3","scrim4","scrim5"].forEach(function(s){$(s).classList.remove("open");});}});

  goPartita();

  if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){});});}
})();
