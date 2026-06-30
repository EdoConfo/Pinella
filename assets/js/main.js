"use strict";
(function(){
  var KEY="burraco-app-v2";
  function loadRaw(){ try{ var r=localStorage.getItem(KEY); return r?JSON.parse(r):null; }catch(e){ return null; } }
  function persist(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }
  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

  var SYMBOLS=["\u2660","\u2665","\u2666","\u2663","\uD83E\uDD8A","\uD83D\uDC2F","\uD83E\uDD81","\uD83D\uDC3C","\uD83D\uDC38","\uD83E\uDD89","\uD83D\uDC2C","\uD83E\uDD8B","\uD83D\uDD25","\u2B50","\uD83D\uDC51","\uD83C\uDFAF","\uD83C\uDF40","\uD83C\uDFB2","\uD83D\uDE80","\uD83C\uDF55"];
  var COLORS=["#C0463B","#15463B","#A9842F","#3B6FC0","#7A3BC0","#C03B8F","#2E7D5B","#1C1B19"];

  var DEF={players:[],settings:{target:2005,semipulito:true,showTourneys:false,haptic:true,dealer:true,tallyCards:false,bigTeams:false,values:{pulito:200,semi:150,sporco:100,chius:100,pozz:100}},casual:{active:false,teams:[],target:2005,rounds:[]},tournaments:[],history:[]};

  var state=loadRaw();
  if(!state){
    state=JSON.parse(JSON.stringify(DEF));
    var old=null; try{ var o=localStorage.getItem("burraco-scorekeeper-v1"); old=o?JSON.parse(o):null; }catch(e){}
    if(old){ state.settings.target=old.target||2005; state.settings.semipulito=!!old.semipulito; if(old.values)state.settings.values=Object.assign(state.settings.values,old.values); }
  }
  // defensive defaults + migrations
  state.players=(state.players||[]).map(function(p){ if(!("avatar" in p))p.avatar=null; return p; });
  state.settings=Object.assign({},DEF.settings,state.settings||{});
  state.settings.haptic = false;
  state.settings.values=Object.assign({},DEF.settings.values,state.settings.values||{});
  delete state.quick;
  delete state.casual;
  state.tournaments=(state.tournaments||[]).map(function(t){ if(t.target==null)t.target=state.settings.target||2005; if(!t.matches)t.matches=[]; if(!t.couples)t.couples=[]; return t; });
  state.history=Array.isArray(state.history)?state.history:[];

  var $=function(id){return document.getElementById(id);};
  function fmt(n){return Math.round(n).toLocaleString("it-IT");}
  function esc(s){return String(s).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}
  function blankInput(){return {pulito:0,semi:0,sporco:0,tavolo:0,mano:0,chius:false,pozz:false};}
  function roundScore(inp){var v=state.settings.values;return inp.pulito*v.pulito+inp.semi*v.semi+inp.sporco*v.sporco+inp.tavolo-inp.mano+(inp.chius?v.chius:0)-(inp.pozz?v.pozz:0);}
  function totals(rounds, teamCount){
    var a=0,b=0,c=0,hasC=false;
    (rounds||[]).forEach(function(r){a+=roundScore(r.a);b+=roundScore(r.b);if(r.c!==undefined){c+=roundScore(r.c);hasC=true;}});
    if(teamCount !== undefined) {
      hasC = (teamCount > 2);
    } else if(typeof scorer!=="undefined" && scorer && scorer.names && scorer.names.length>2) {
      hasC = true;
    }
    return hasC ? [a,b,c] : [a,b];
  }
  function getPlayer(id){return state.players.find(function(x){return x.id===id;});}
  function playerName(id){var p=getPlayer(id);return p?p.name:"?";}
  function playerNameShort(id){var p=getPlayer(id);return p?p.name.split(' ')[0]:"?";}
  function coupleLabel(c){return playerName(c.p1)+" & "+playerName(c.p2);}
  function coupleLabelShort(c){return playerNameShort(c.p1)+" & "+playerNameShort(c.p2);}
  function firstName(n){return String(n||"").trim().split(/\s+/)[0]||String(n||"");}
  function boardLabel(arr){if(!arr||!arr.length)return "";return arr.map(function(m){return "<div>"+esc(firstName(m.name))+"</div>";}).join("");}
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
  var scorer={mode:"casual",hId:null,names:["",""],rounds:[],target:2005,members:[[],[]],tId:null,mId:null};

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
    setDockActive(v);
    if(v==="casual-setup")renderSetup();
    if(v==="casual-play"||v==="match-play")renderScorer();
    if(v==="tourneys")renderTourneys();
    if(v==="tourney")renderTourney();
    if(v==="history")renderHistory_view();
    window.scrollTo(0,0);
  }
  function setDockActive(v){
    var partite=(v==="casual-setup"||v==="casual-play"||v==="match-play");
    var tornei=(v==="tourneys"||v==="tourney");
    $("dockPartite").classList.toggle("on",partite);
    $("dockTornei").classList.toggle("on",tornei);
    $("dockStorico").classList.toggle("on",v==="history");
  }
  function goPartita(){ nav("casual-setup"); }

  // ===== casual setup =====
  var assign={};
  function countTeam(t){var n=0;for(var k in assign)if(assign[k]===t)n++;return n;}
  function allEntries(){return state.players;}
  function membersOf(t){var res=[];allEntries().forEach(function(p){if(assign[p.id]===t)res.push({id:p.id,name:p.name});});return res;}
  function teamCap(){return state.settings.bigTeams?3:2;}
  function pchipHTML(p){var a=assign[p.id]||"",badge=a?'<span class="badge '+a+'">'+a+'</span>':"";return '<div class="pchip'+(a?(" sel "+a):"")+'" data-id="'+p.id+'">'+avatarHTML(p,46)+badge+'<span class="nm">'+esc(p.name)+'</span></div>';}
  function wirePchips(container){container.querySelectorAll(".pchip[data-id]").forEach(function(el){el.addEventListener("click",function(){
    if(playersMode==="pick-tourney") {
      if(window.pendingTournamentSlot) {
        coupleRows[window.pendingTournamentSlot.row][window.pendingTournamentSlot.slot] = el.dataset.id;
        window.pendingTournamentSlot = null;
        closeOv("playersSheet", "scrim5");
        renderCouples();
      }
      return;
    }
    cycle(el.dataset.id);
  });});}
  function moreChipHTML(label){return '<div class="pchip more" id="moreChip"><span class="av av-more"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></span><span class="nm">'+label+'</span></div>';}
  function playerLastTs(){
    var m={};function bump(id,ts){if(id&&(!(id in m)||ts>m[id]))m[id]=ts;}
    (state.history||[]).forEach(function(g){[0,1].forEach(function(si){((g.teams[si]||{}).members||[]).forEach(function(x){bump(x.id,g.ts||0);});});});
    (state.tournaments||[]).forEach(function(t){t.matches.forEach(function(mt){if(!mt.finished)return;var ca=t.couples[mt.ci],cb=t.couples[mt.cj];[ca.p1,ca.p2,cb.p1,cb.p2].forEach(function(id){bump(id,t.createdAt||0);});});});
    return m;
  }
  function recentPlayers(limit){
    limit=limit||15;
    var ts=playerLastTs();
    var played=state.players.filter(function(p){return ts[p.id]>0;});
    var unplayed=state.players.filter(function(p){return !(ts[p.id]>0);});
    played.sort(function(a,b){return (ts[b.id]||0)-(ts[a.id]||0);});
    var list = played.concat(unplayed).slice(0, limit);
    state.players.forEach(function(p){if(assign[p.id]&&list.indexOf(p)<0)list.push(p);});
    return list;
  }
  function refreshAssign(){if(view==="casual-setup")renderSetup();if(playersMode==="pick"&&$("playersSheet").classList.contains("open"))renderPickGrid();}
  function cycle(id){
    var cap=teamCap(),cur=assign[id]||null;
    var maxT=state.settings.bigTeams?3:2;
    if(cur===null){ if(countTeam("A")<cap)assign[id]="A"; else if(countTeam("B")<cap)assign[id]="B"; else if(maxT===3&&countTeam("C")<cap)assign[id]="C"; }
    else if(cur==="A"){ if(countTeam("B")<cap)assign[id]="B"; else if(maxT===3&&countTeam("C")<cap)assign[id]="C"; else delete assign[id]; }
    else if(cur==="B"){ if(maxT===3&&countTeam("C")<cap)assign[id]="C"; else delete assign[id]; }
    else { delete assign[id]; }
    refreshAssign();
  }
  function renderSetup(){
    $("setupTarget").value=state.settings.target;
    var hint = $("setupAssignHint");
    if(hint) {
      if(state.settings.bigTeams) {
        hint.innerHTML = 'Tocca un avatar per assegnarlo: <b style="color:var(--oro-soft)">A</b> &rarr; <b style="color:#9FD3C0">B</b> &rarr; <b style="color:#3B6FC0">C</b> &rarr; Rimuovi. Max <span id="capMax">3</span> per squadra.';
      } else {
        hint.innerHTML = 'Tocca un avatar per assegnarlo: <b style="color:var(--oro-soft)">A</b> &rarr; <b style="color:#9FD3C0">B</b> &rarr; Rimuovi. Max <span id="capMax">2</span> per squadra.';
      }
    }
    if($("capMax"))$("capMax").textContent=teamCap();
    var grid=$("setupGrid");
    if(state.players.length===0){ grid.innerHTML='<div class="ref" style="grid-column: 1 / -1; color:var(--muted)">Nessun giocatore salvato. Tocca <b>+ Aggiungi giocatore</b> per crearne uno.</div>'; }
    else{
      if(state.players.length<=15){
        grid.innerHTML=recentPlayers(15).map(pchipHTML).join("");
      } else {
        grid.innerHTML=recentPlayers(14).map(pchipHTML).join("") + moreChipHTML("Altro"); 
      }
      wirePchips(grid); 
      var mc = grid.querySelector("#moreChip");
      if(mc) mc.addEventListener("click", function(){ openPlayers("pick"); });
    }
    var ma=membersOf("A"),mb=membersOf("B"),mc=membersOf("C");
    function prevHTML(mArr){
      if(!mArr.length) return '<div class="t-name"><div>—</div></div>';
      var avs = '<div class="t-avs">' + mArr.map(function(m){return memberAvatar(m,30);}).join("") + '</div>';
      var nms = '<div class="t-name">' + mArr.map(function(m){return '<div>' + esc(firstName(m.name)) + '</div>';}).join("") + '</div>';
      return avs + nms;
    }
    $("previewA").innerHTML=prevHTML(ma);
    $("previewB").innerHTML=prevHTML(mb);
    $("previewC").innerHTML=prevHTML(mc);
    var hasC = mc.length || $("previewC").innerHTML.indexOf("avs") > -1;
    if(hasC){$("vsC").style.display="";$("teamC").style.display="";}
    else{$("vsC").style.display="none";$("teamC").style.display="none";}
    $("startCasual").disabled=!(ma.length&&mb.length);
  }
  function startCasual(){
    var ma=membersOf("A"),mb=membersOf("B"),mc=membersOf("C");
    if(!ma.length||!mb.length)return;
    var tg=parseInt($("setupTarget").value,10);if(isNaN(tg)||tg<100)tg=state.settings.target||2005;
    var tms = [{members:ma},{members:mb}];
    if(mc.length)tms.push({members:mc});
    
    var gid = uid();
    var namesArr = tms.map(function(t, i){
        var def = i===2?"Squadra C":i===1?"Squadra B":"Squadra A";
        return t.members.map(function(m){return m.name;}).join(" & ")||def;
    });
    var teamsArr = tms.map(function(t){return {members:t.members};});
    
    state.history.unshift({id:gid, ts:Date.now(), mode:"casual", target:tg, teams:teamsArr, names:namesArr, rounds:[], totals:[0,0,0].slice(0,tms.length)});
    assign={};
    persist();
    openHistoryGame(gid);
  }
  function openHistoryGame(id) {
    var g = (state.history||[]).filter(function(x){return x.id===id;})[0];
    if(!g) return;
    scorer = {
       mode: "casual",
       hId: id,
       names: g.names,
       rounds: g.rounds,
       target: g.target,
       members: g.teams.map(function(t){return t.members;}),
       tId: null,
       mId: null
    };
    nav("casual-play");
  }

  // ===== dealer (mazziere) =====
  function seatKey(side,mi,m){return (m&&m.id)||("s"+side+"m"+mi);}
  function baseSeats(){
    var out=[], membersList = scorer.members||[], n = 0;
    membersList.forEach(function(m){if(m&&m.length>n)n=m.length;});
    for(var i=0;i<n;i++){
      membersList.forEach(function(team, side){
        if(team&&team[i]) out.push({side:side,mi:i,m:team[i],key:seatKey(side,i,team[i])});
      });
    }
    return out;
  }
  function seating(){
    var base=baseSeats(),st=dealerStore(),order=st&&st.seatOrder;
    if(!order||!order.length)return base;
    var byKey={};base.forEach(function(s){byKey[s.key]=s;});
    var out=[];order.forEach(function(k){if(byKey[k]){out.push(byKey[k]);delete byKey[k];}});
    base.forEach(function(s){if(byKey[s.key])out.push(s);});
    return out;
  }
  function ensureOrder(){var st=dealerStore();if(!st)return[];if(!st.seatOrder||!st.seatOrder.length)st.seatOrder=baseSeats().map(function(s){return s.key;});return st.seatOrder;}
  function dealerStore(){return scorer.mode==="match"?getMatch(scorer.tId,scorer.mId):(state.history||[]).find(function(h){return h.id===scorer.hId;});}
  function currentDealer(){
    var seats=seating();if(!seats.length)return null;
    var st=dealerStore(),start=(st&&st.dealerStart)||0;
    var idx=((start+scorer.rounds.length)%seats.length+seats.length)%seats.length;
    return {idx:idx,seat:seats[idx]};
  }
  function advanceDealer(){
    var seats=seating();if(seats.length<2)return;
    var st=dealerStore();if(!st)return;
    st.dealerStart=(((st.dealerStart||0)+1)%seats.length+seats.length)%seats.length;
    persist();renderScorer();
  }
  function dealerIdxNow(){var seats=seating(),N=seats.length;if(!N)return 0;var st=dealerStore();return((((st&&st.dealerStart)||0)+scorer.rounds.length)%N+N)%N;}
  function openTable(){ if(!seating().length)return; renderTable(); openOv("tableSheet","scrim9"); }
  function renderTable(){
    var seats=seating(),N=seats.length,wrap=$("tableArea");if(!wrap)return;
    var dIdx=dealerIdxNow();
    var W=wrap.clientWidth||320,cx=W/2,cy=160,rx=Math.max(64,W/2-50),ry=118;
    var html='<div class="table-felt"><span>Giro di gioco</span></div>';
    seats.forEach(function(s,i){
      var ang=Math.PI/2+i*2*Math.PI/N,x=cx+rx*Math.cos(ang),y=cy+ry*Math.sin(ang),isD=(i===dIdx);
      html+='<div class="seat s'+(s.side)+(isD?" dealer":"")+'" data-key="'+s.key+'" data-side="'+s.side+'" style="left:'+Math.round(x)+'px;top:'+Math.round(y)+'px">'+(isD?'<span class="seat-d">🃏</span>':'')+memberAvatar(s.m,46)+'<span class="snm">'+esc(s.m.name)+'</span></div>';
    });
    wrap.innerHTML=html;
    wireTable(wrap);
  }
  function tableSetDealer(key){
    var seats=seating(),N=seats.length,st=dealerStore();if(!st||!N)return;
    var idx=-1;seats.forEach(function(s,i){if(s.key===key)idx=i;});if(idx<0)return;
    st.dealerStart=((idx-(scorer.rounds.length%N)+N)%N);
    persist();renderTable();renderScorer();
  }
  function tableSwap(keyA,keyB){
    var seats=seating();
    var sa,sb;seats.forEach(function(s){if(s.key===keyA)sa=s;if(s.key===keyB)sb=s;});
    if(!sa||!sb) return;
    if(keyA===keyB)return;var order=ensureOrder(),ia=order.indexOf(keyA),ib=order.indexOf(keyB);if(ia<0||ib<0)return;
    var N=seats.length,curKey=seats[dealerIdxNow()].key;
    var tmp=order[ia];order[ia]=order[ib];order[ib]=tmp;
    if(sa.side !== sb.side && N % 2 === 0 && N > 2) {
      var iaOp = (ia + N/2) % N, ibOp = (ib + N/2) % N;
      var tmpOp = order[iaOp]; order[iaOp] = order[ibOp]; order[ibOp] = tmpOp;
    }
    var ns=seating(),ci=-1;ns.forEach(function(s,i){if(s.key===curKey)ci=i;});
    var st=dealerStore();if(ci>=0)st.dealerStart=((ci-(scorer.rounds.length%N)+N)%N);
    persist();renderTable();renderScorer();
  }
  function wireTable(wrap){
    wrap.querySelectorAll(".seat").forEach(function(el){
      var moved=false,sx=0,sy=0,pid=null;
      el.addEventListener("pointerdown",function(e){moved=false;sx=e.clientX;sy=e.clientY;pid=e.pointerId;try{el.setPointerCapture(pid);}catch(_){}el.classList.add("grab");});
      el.addEventListener("pointermove",function(e){if(pid===null)return;var dx=e.clientX-sx,dy=e.clientY-sy;if(!moved&&dx*dx+dy*dy>49)moved=true;if(moved){var r=wrap.getBoundingClientRect();el.classList.add("dragging");el.style.left=(e.clientX-r.left)+"px";el.style.top=(e.clientY-r.top)+"px";}});
      el.addEventListener("pointerup",function(e){if(pid===null)return;pid=null;el.classList.remove("grab");
        if(scorer.rounds.length > 0) {
          renderTable();
          toast("Le posizioni sono bloccate dopo la prima mano");
          return;
        }
        if(!moved){tableSetDealer(el.dataset.key);return;}
        var r=wrap.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top,best=null,bd=1e9;
        wrap.querySelectorAll(".seat").forEach(function(o){if(o===el)return;var ox=parseFloat(o.style.left),oy=parseFloat(o.style.top),d=(ox-px)*(ox-px)+(oy-py)*(oy-py);if(d<bd){bd=d;best=o;}});
        if(best&&bd<6400)tableSwap(el.dataset.key,best.dataset.key);else{renderTable();}
      });
      el.addEventListener("pointercancel",function(){pid=null;moved=false;renderTable();});
    });
  }

  // ===== scorer render =====
  function renderScorer(){
    var isMatch = scorer.mode==="match";
    $("btnScorerDelete").style.display = isMatch ? "none" : "";
    var timeStr = "", targetStr = " · target " + fmt(scorer.target);
    if (scorer.hId) {
      var g = (state.history||[]).find(function(x){return x.id===scorer.hId;});
      if(g) timeStr = new Date(g.ts).toLocaleDateString("it-IT",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
    } else if (scorer.tId && scorer.mId) {
      var t = getTourney(scorer.tId);
      var m = getMatch(scorer.tId, scorer.mId);
      if(t) {
        timeStr = new Date(t.createdAt).toLocaleDateString("it-IT",{day:"2-digit",month:"short"});
        if (m) timeStr = "Turno " + m.turno + " · " + timeStr;
      }
    }

    if(isMatch){
      var t=getTourney(scorer.tId);
      $("scorerBackLabel").textContent="Torneo";
      $("scorerCtxSub").textContent=(timeStr || "Incontro") + targetStr;
      $("scorerCtxTitle").textContent=t?t.name:scorer.names.join(" vs ");
    } else {
      $("scorerBackLabel").textContent="Storico";
      $("scorerCtxSub").textContent=(timeStr || "Partita") + targetStr;
      $("scorerCtxTitle").textContent="Partita libera";
    }

    var t=totals(scorer.rounds), tg=scorer.target;
    var maxT=Math.max.apply(null,t), won=(maxT>=tg);
    var teamsCount = scorer.names.length;
    var cLetters = ["A","B","C"];
    
    // Check if there is a unique winner
    if(won){
      var overTg = t.filter(function(sc){return sc>=tg;});
      if(overTg.length>1 && overTg[0]===overTg[1]) won=false; // Tie
    }
    
    var matchTourney = null, wasComplete = false;
    if(scorer.mode==="match"){
      matchTourney=getTourney(scorer.tId);
      var matchObj=getMatch(scorer.tId,scorer.mId);
      if(matchObj && matchTourney) {
        wasComplete = tourneyComplete(matchTourney);
        matchObj.finished = won;
      }
    }
    
    $("btnAdd").style.display = won ? "none" : "";

    cLetters.forEach(function(L, i){
      var elS=$("side"+L), elN=$("name"+L), elT=$("total"+L), elM=$("meta"+L), elF=$("fill"+L), elA=$("avs"+L), elD=$("dealer"+L);
      if(!elS) return;
      if(i>=teamsCount) { elS.style.display="none"; if($("div"+L))$("div"+L).style.display="none"; return; }
      elS.style.display=""; if($("div"+L))$("div"+L).style.display="";
      
      var sc = t[i];
      elN.innerHTML='<span>'+(boardLabel(scorer.members&&scorer.members[i])||("<div>"+esc(scorer.names[i])+"</div>"))+'</span>';
      elT.textContent=fmt(sc);
      elA.innerHTML=avsHTML((scorer.members&&scorer.members[i])||[], i);
      elD.hidden=true;
      
      var isLead = sc===maxT && maxT>0;
      elS.classList.toggle("lead", isLead);
      elF.style.width=Math.min(100,sc/tg*100)+"%";
      
      var diff = maxT - sc;
      if(isLead) elM.textContent = "+"+fmt(Math.max.apply(null, t.filter(function(_, idx){return idx!==i;}).map(function(val){return maxT-val;}))); // Actually lead margin is diff vs second best
      else elM.textContent = "";
    });

    // Fix lead margin for actual leaders
    var sortedT = t.slice().sort(function(a,b){return b-a;});
    cLetters.forEach(function(L, i){
      if(i>=teamsCount) return;
      if(t[i]===maxT && maxT>0) {
        var diff = maxT - (sortedT[1]||0);
        $("meta"+L).textContent = "+"+fmt(diff);
      }
    });

    // dealer
    var cd=(state.settings.dealer!==false && !won)?currentDealer():null;
    var db=$("dealerBar");
    if(cd){var seats=seating(),nx=seats[(cd.idx+1)%seats.length];db.hidden=false;db.innerHTML='<span class="dz-ic">🃏</span> Mazziere: <b>'+esc(cd.seat.m.name)+'</b>'+(seats.length>1?'<span class="dz-hint"> · poi '+esc(nx.m.name)+' · tocca per il tavolo</span>':'');
      var ds=cd.seat.side; if(ds===0) $("dealerA").hidden=false; else if(ds===1) $("dealerB").hidden=false; else if(ds===2) $("dealerC").hidden=false;
    } else db.hidden=true;

    var w=$("winner");
    if(won){
      var wi=t.indexOf(maxT);
      var diff = maxT - (sortedT[1]||0);
      $("winnerName").textContent=scorer.names[wi]+" vince!";
      $("winnerSub").textContent="con "+fmt(maxT)+" punti · margine di "+fmt(diff);
      w.classList.add("show");
      if(!scorer._won)celebrate();
    } else w.classList.remove("show");
    
    scorer._won=won;
    if(scorer.mode==="match" && matchTourney) {
      if(!wasComplete && tourneyComplete(matchTourney)) celebrate();
    }
    if($("btnAlleanza")) {
      var is3Singles = scorer.mode==="casual" && scorer.names.length===3 && scorer.members.every(function(m){return m.length===1;});
      $("btnAlleanza").style.display = is3Singles ? "inline-flex" : "none";
    }
    renderHistory();persist();
  }
  function avsHTML(arr,sn){var cd=(state.settings.dealer!==false && !scorer._won)?currentDealer():null; return arr.map(function(m,i){return memberAvatar(m,30,(cd&&cd.seat.side===sn&&cd.seat.mi===i)?"dealer":"");}).join("");}
  function renderHistory(){
    var area=$("histArea");
    if(scorer.rounds.length===0){area.innerHTML='<div class="empty"><span class="big">Nessuna mano ancora</span>Aggiungi la prima mano per iniziare a contare.</div>';return;}
    var t=totals(scorer.rounds);
    var cols = scorer.names.length;
    var maxT=Math.max.apply(null,t);
    var heads = scorer.names.map(function(n){return '<th>'+esc(n)+'</th>';}).join("");
    var rows=scorer.rounds.map(function(r,i){
      var scs = [roundScore(r.a), roundScore(r.b)];
      if(cols>2) scs.push(roundScore(r.c));
      var rMax = Math.max.apply(null,scs);
      var tds = scs.map(function(sc){return '<td'+(sc===rMax&&rMax>0?' class="cell-win"':'')+'>'+fmt(sc)+'</td>';}).join("");
      return '<tr class="clk" data-i="'+i+'"><td>'+(i+1)+'</td>'+tds+'</tr>';
    }).join("");
    var footTds = t.map(function(tot){return '<td'+(tot===maxT&&maxT>0?' class="cell-lead"':'')+'>'+fmt(tot)+'</td>';}).join("");
    area.innerHTML='<table><thead><tr><th>#</th>'+heads+'</tr></thead><tbody>'+rows+'</tbody><tfoot><tr><td>Totale</td>'+footTds+'</tr></tfoot></table>';
    area.querySelectorAll("tbody tr").forEach(function(tr){tr.addEventListener("click",function(){openSheet(parseInt(tr.getAttribute("data-i"),10));});});
  }

  // ===== round sheet =====
  var editIndex=-1,draft={a:blankInput(),b:blankInput(),c:blankInput()};
  var CARDS=[{k:"jolly",lbl:"Jolly",v:30},{k:"pin",lbl:"Pinella (2)",v:20},{k:"asso",lbl:"Asso",v:15},{k:"fig",lbl:"Dall'8 al K",v:10},{k:"bas",lbl:"Dal 3 al 7",v:5}];
  function paneHTML(side){
    var v=state.settings.values;
    var semiField=state.settings.semipulito?'<div class="field"><label>Burraco semipulito (×'+v.semi+')</label>'+stepper(side,"semi")+'</div>':'';
    return '<div class="pane"><div class="pane-name" id="paneName'+side+'"></div><div class="field"><label>Burraco pulito (×'+v.pulito+')</label>'+stepper(side,"pulito")+'</div>'+semiField+'<div class="field"><label>Burraco sporco (×'+v.sporco+')</label>'+stepper(side,"sporco")+'</div><div class="field"><label>Punti carte sul tavolo</label>'+pointsBox(side,"tavolo")+'</div><div class="field"><label>Punti carte in mano (−)</label>'+pointsBox(side,"mano")+'</div><div class="checks"><label class="check gold"><input type="checkbox" data-side="'+side+'" data-k="chius"><span>Chiusura (+'+v.chius+')</span></label><label class="check"><input type="checkbox" data-side="'+side+'" data-k="pozz"><span>Pozzetto non preso (−'+v.pozz+')</span></label></div><div class="subtotal">Punti mano <b id="sub'+side+'">0</b></div></div>';
  }
  function stepper(side,k){return '<div class="stepper" data-side="'+side+'" data-k="'+k+'"><button type="button" data-d="-1">−</button><span class="val">0</span><button type="button" data-d="1">+</button></div>';}
  function pointsBox(side,k){
    if(state.settings.tallyCards){
      return '<div class="with-calc"><input class="numbox" type="number" inputmode="numeric" data-side="'+side+'" data-k="'+k+'" placeholder="0"><button type="button" class="cards-btn" data-side="'+side+'" data-k="'+k+'" aria-label="Conta carte"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="7" width="10.5" height="13.5" rx="2"/><path d="M9 7.2V6.2a2 2 0 0 1 2.35-1.97l5.7.9a2 2 0 0 1 1.66 2.3l-1.55 10"/></svg></button></div>';
    }
    return '<input class="numbox" type="number" inputmode="numeric" data-side="'+side+'" data-k="'+k+'" placeholder="0">';
  }
  function buildSheet(){
    var panes = "", cLetters = ["a","b","c"];
    cLetters.forEach(function(l, idx){ if(idx<scorer.names.length) panes += paneHTML(l); });
    $("sheetBody").innerHTML='<div class="'+(scorer.names.length>2?'teams-stack':'teams2')+'">'+panes+'</div>';
    cLetters.forEach(function(l, idx){ if(idx<scorer.names.length && $("paneName"+l)) $("paneName"+l).textContent=scorer.names[idx]; });
    wireSheet();syncSheet();
  }
  function wireSheet(){
    var body=$("sheetBody");
    body.querySelectorAll(".stepper button").forEach(function(btn){btn.addEventListener("click",function(){var st=btn.parentNode;draft[st.dataset.side][st.dataset.k]=Math.max(0,draft[st.dataset.side][st.dataset.k]+parseInt(btn.dataset.d,10));syncSheet();});});
    body.querySelectorAll(".numbox").forEach(function(inp){inp.addEventListener("input",function(){var v=parseInt(inp.value,10);if(isNaN(v))v=0;var sd=inp.dataset.side,kk=inp.dataset.k;draft[sd][kk]=v;if(state.settings.tallyCards)delete draft[sd][kk+"Cards"];syncSheet(true);});});
    body.querySelectorAll(".cards-btn").forEach(function(btn){btn.addEventListener("click",function(){openCardsPopup(btn.dataset.side,btn.dataset.k);});});
    body.querySelectorAll('.check input').forEach(function(c){c.addEventListener("change",function(){var side=c.dataset.side,k=c.dataset.k;draft[side][k]=c.checked;if(c.checked&&k==="chius")draft[side].pozz=false;if(c.checked&&k==="pozz")draft[side].chius=false;syncSheet();});});
  }
  function syncSheet(skipBoxes){
    var cLetters = ["a","b","c"];
    cLetters.forEach(function(side, idx){
      if(idx>=scorer.names.length) return;
      var d=draft[side],body=$("sheetBody");
      body.querySelectorAll('.stepper[data-side="'+side+'"]').forEach(function(st){st.querySelector(".val").textContent=d[st.dataset.k];});
      if(!skipBoxes)body.querySelectorAll('.numbox[data-side="'+side+'"]').forEach(function(b){b.value=d[b.dataset.k]?d[b.dataset.k]:"";});
      body.querySelectorAll('.check input[data-side="'+side+'"]').forEach(function(c){c.checked=!!d[c.dataset.k];});
      var s=roundScore(d),el=$("sub"+side);if(el){el.textContent=(s<0?"−":"")+fmt(Math.abs(s));el.classList.toggle("neg",s<0);}
    });
  }
  function openSheet(i){
    editIndex=(typeof i==="number" && !isNaN(i))?i:-1;
    draft = {};
    var cLetters = ["a","b","c"];
    if(editIndex>=0){
      cLetters.forEach(function(l, idx){ if(idx<scorer.names.length) draft[l] = Object.assign(blankInput(), scorer.rounds[i][l]||{}); });
      $("sheetTitle").textContent="Mano "+(i+1);$("deleteRound").style.display="";$("saveRound").textContent="Aggiorna mano";
    } else{
      cLetters.forEach(function(l, idx){ if(idx<scorer.names.length) draft[l] = blankInput(); });
      $("sheetTitle").textContent="Nuova mano";$("deleteRound").style.display="none";$("saveRound").textContent="Salva mano";
    }
    buildSheet();openOv("sheet","scrim");
  }
  function saveRound(){
    var r={};
    var cLetters = ["a","b","c"];
    cLetters.forEach(function(l, idx){ if(idx<scorer.names.length) r[l] = draft[l]; });
    if(editIndex>=0)scorer.rounds[editIndex]=r;else scorer.rounds.push(r);
    updateCasualHistoryTotals();
    closeOv("sheet","scrim");renderScorer();toast(editIndex>=0?"Mano aggiornata":"Mano aggiunta");
  }
  function updateCasualHistoryTotals(){
    if(scorer.mode==="casual" && scorer.hId) {
      var g = (state.history||[]).find(function(x){return x.id===scorer.hId;});
      if(g) g.totals = totals(scorer.rounds, scorer.names.length);
    }
  }

  // ===== card-tally popup =====
  var cardSide=null,cardK=null;
  var CARD_LIMITS={jolly:4,pin:8,asso:8,fig:48,bas:40};
  function getCardLimit(k){
    var b=CARD_LIMITS[k], tot=0;
    if(scorer&&scorer.members){scorer.members.forEach(function(m){tot+=m.length;});}
    return tot===6 ? Math.floor(b*1.5) : b;
  }
  function getOtherCounts(side,k,cardKey){
    var sum=0;
    var cLetters = ["a","b","c"];
    cLetters.forEach(function(s, idx){
      if(idx>=scorer.names.length) return;
      ["tavolo","mano"].forEach(function(c){
        if(s===side&&c===k)return;
        var counts=(draft[s]&&draft[s][c+"Cards"])||{};
        sum+=(counts[cardKey]||0);
      });
    });
    return sum;
  }
  function cardsTotalNow(){var sum=0;$("cardsBody").querySelectorAll(".chip").forEach(function(ch){sum+=(parseInt(ch.querySelector(".c").value,10)||0)*parseInt(ch.dataset.val,10);});return sum;}
  function updateCardsTotal(){$("cardsTotal").textContent=fmt(cardsTotalNow());}
  function buildCardsBody(){
    var counts=(draft[cardSide]&&draft[cardSide][cardK+"Cards"])||{};
    var rows=CARDS.map(function(c){var n=counts[c.k]||0;return '<div class="chip" data-k="'+c.k+'" data-val="'+c.v+'"><div class="lbl">'+c.lbl+' <small>'+c.v+'</small></div><div class="ctrl"><button type="button" data-d="-1">−</button><input type="number" class="c" value="'+n+'" min="0" max="'+getCardLimit(c.k)+'"><button type="button" data-d="1">+</button></div></div>';}).join("");
    $("cardsBody").innerHTML='<div class="cards-list">'+rows+'<div class="sum">Totale <b id="cardsTotal">0</b></div></div>';
    $("cardsBody").querySelectorAll(".chip").forEach(function(chip){
      var cspan=chip.querySelector(".c");
      var key=chip.dataset.k;
      cspan.addEventListener("input", function() {
        var v = parseInt(cspan.value, 10) || 0;
        if(v < 0) v = 0;
        var maxAllowed = getCardLimit(key) - getOtherCounts(cardSide, cardK, key);
        if(v > maxAllowed) v = maxAllowed;
        cspan.value = v;
        updateCardsTotal();
      });
      chip.querySelectorAll("button").forEach(function(b){
        b.addEventListener("click",function(){
          var d=parseInt(b.dataset.d,10);
          var cur=parseInt(cspan.value,10)||0;
          if(d>0){
            var other=getOtherCounts(cardSide,cardK,key);
            if(cur+other>=getCardLimit(key)){
              toast("Limite raggiunto per questa carta ("+getCardLimit(key)+" max)");
              return;
            }
          }
          var next=cur+d;
          if(next<0)next=0;
          cspan.value=next;
          updateCardsTotal();
        });
      });
    });
    updateCardsTotal();
  }
  function openCardsPopup(side,k){cardSide=side;cardK=k;$("cardsTitle").textContent=(k==="mano"?"Carte in mano":"Carte sul tavolo");buildCardsBody();openOv("cardsSheet","scrim8");}
  function applyCards(){
    var counts={},sum=0;
    $("cardsBody").querySelectorAll(".chip").forEach(function(ch){var n=parseInt(ch.querySelector(".c").value,10)||0;counts[ch.dataset.k]=n;sum+=n*parseInt(ch.dataset.val,10);});
    draft[cardSide][cardK]=sum;draft[cardSide][cardK+"Cards"]=counts;
    closeOv("cardsSheet","scrim8");syncSheet();
  }
  function deleteRound(){if(editIndex<0)return;var removed=scorer.rounds.splice(editIndex,1)[0],at=editIndex;updateCasualHistoryTotals();closeOv("sheet","scrim");renderScorer();toast("Mano eliminata",function(){scorer.rounds.splice(at,0,removed);updateCasualHistoryTotals();renderScorer();});}

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
    var t=getTourney(currentTourneyId);
    if(!t){nav("tourneys");return;}
    $("tourneyTitle").textContent=t.name;
    var tDate = new Date(t.createdAt).toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"});
    $("tourneySub").textContent = tDate + " · target " + fmt(t.target);
    var st=standings(t),anyPlayed=t.matches.some(function(m){return m.finished;});
    var complete=tourneyComplete(t);
    $("tourneyWinner").innerHTML=complete&&st.length?'<div class="winner show" style="margin-bottom:14px"><div class="cup">&#127942;</div><div class="txt"><b>'+esc(st[0].label)+'</b><span>vince il torneo · '+st[0].w+' vittorie</span></div></div>':'';
    $("standingsArea").innerHTML='<table><thead><tr><th>#</th><th class="lcol">Coppia</th><th>V</th><th>Diff</th><th>PF</th></tr></thead><tbody>'+st.map(function(row,i){var lead=anyPlayed&&i===0?' class="cell-lead"':'';return '<tr><td'+lead+'>'+(i+1)+'</td><td class="lcol"'+lead+'>'+esc(row.label)+'</td><td>'+row.w+'</td><td>'+(row.diff>0?"+":"")+fmt(row.diff)+'</td><td>'+fmt(row.pf)+'</td></tr>';}).join("")+'</tbody></table>';
    var turni={};t.matches.forEach(function(m){(turni[m.turno]=turni[m.turno]||[]).push(m);});
    var html="";Object.keys(turni).sort(function(x,y){return x-y;}).forEach(function(tn){
      var byeLabel=t.byes&&t.byes[tn]!=null?coupleLabel(t.couples[t.byes[tn]]):null;
      html+='<div class="turno-h">Turno '+tn+(byeLabel?'<span class="bye">Riposa: '+esc(byeLabel)+'</span>':'')+'</div>';
      turni[tn].forEach(function(m){var ca=t.couples[m.ci],cb=t.couples[m.cj];var tot=totals(m.rounds),sa=tot[0],sb=tot[1];var stat=m.finished?'<span class="stat done">Conclusa</span>':(m.rounds.length>0?'<span class="stat live">In corso</span>':'<span class="stat todo">Da giocare</span>');var showSc=m.finished||m.rounds.length>0;var wa=m.finished&&sa>sb,wb=m.finished&&sb>sa;var avA = '<div class="avs-mini">'+memberAvatar({id:ca.p1},24) + memberAvatar({id:ca.p2},24)+'</div>';var avB = '<div class="avs-mini">'+memberAvatar({id:cb.p1},24) + memberAvatar({id:cb.p2},24)+'</div>';html+='<div class="match" data-id="'+m.id+'"><div class="pair"><div class="row'+(wa?' w':'')+'"><div class="nm-wrap">'+avA+'<span class="nm">'+esc(coupleLabelShort(ca))+'</span></div>'+(showSc?'<span class="sc">'+fmt(sa)+'</span>':'')+'</div><div class="row'+(wb?' w':'')+'"><div class="nm-wrap">'+avB+'<span class="nm">'+esc(coupleLabelShort(cb))+'</span></div>'+(showSc?'<span class="sc">'+fmt(sb)+'</span>':'')+'</div></div><div class="match-right">'+stat+'</div></div>';});
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
    nav("match-play");
  }

  function renameTourney(){
    var t=getTourney(currentTourneyId);
    if(!t)return;
    askPrompt("Nome del torneo", t.name, "Rinomina", function(n){
      t.name=n.slice(0,40);persist();renderTourney();
    });
  }
  function deleteTourney(){var t=getTourney(currentTourneyId);if(!t)return;askConfirm("Elimina torneo", "Eliminare il torneo \""+t.name+"\"? L'operazione non si può annullare.", "Elimina", function(){state.tournaments=state.tournaments.filter(function(x){return x.id!==t.id;});persist();nav("tourneys");toast("Torneo eliminato");});}
  function roundRobin(n){var ids=[];for(var i=0;i<n;i++)ids.push(i);if(n%2===1)ids.push(-1);var m=ids.length,arr=ids.slice(),turni=[],byes={};for(var r=0;r<m-1;r++){var pairs=[],bye=null;for(var k=0;k<m/2;k++){var x=arr[k],y=arr[m-1-k];if(x===-1){bye=y;}else if(y===-1){bye=x;}else pairs.push([x,y]);}turni.push(pairs);if(bye!=null)byes[r+1]=bye;var fixed=arr[0],rest=arr.slice(1);rest.unshift(rest.pop());arr=[fixed].concat(rest);}return {turni:turni,byes:byes};}

  // ===== new tournament =====
  var coupleRows=[];
  function openNewTourney(){$("tName").value="Torneo del "+new Date().toLocaleDateString("it-IT");$("tTarget").value=state.settings.target;coupleRows=[{p1:"",p2:""},{p1:"",p2:""}];$("tErr").textContent="";renderCouples();openOv("tSheet","scrim3");}
  function slotHTML(playerId, slotName) {
    if(!playerId) return '<button type="button" class="p-slot-btn empty" data-slot="'+slotName+'">— scegli —</button>';
    var p = getPlayer(playerId);
    if(!p) return '<button type="button" class="p-slot-btn empty" data-slot="'+slotName+'">— scegli —</button>';
    return '<button type="button" class="p-slot-btn" data-slot="'+slotName+'">' + memberAvatar(p, 24) + '<span class="nm">' + esc(p.name) + '</span></button>';
  }
  function renderCouples(){
    var area=$("couplesArea");
    area.innerHTML=coupleRows.map(function(c,i){return '<div class="couple-row" data-i="'+i+'"><div class="num">'+(i+1)+'</div><div class="sels">'+slotHTML(c.p1,'p1')+slotHTML(c.p2,'p2')+'</div>'+(coupleRows.length>2?'<button class="rm" data-i="'+i+'">&times;</button>':'<div style="width:26px"></div>')+'</div>';}).join("");
    area.querySelectorAll(".p-slot-btn").forEach(function(b){b.addEventListener("click",function(){
      var row=b.closest(".couple-row");
      window.pendingTournamentSlot = { row: parseInt(row.dataset.i,10), slot: b.dataset.slot };
      openPlayers("pick-tourney");
    });});
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
    (state.history||[]).forEach(function(g){
      var maxSc = Math.max.apply(null, g.totals);
      if(maxSc < g.target) return;
      var tms = g.teams||[], tots = g.totals||[];
      tms.forEach(function(tm, i){
        var sc = tots[i]||0;
        var isWin = (sc === maxSc);
        var pa = 0; tots.forEach(function(other, j){ if(i!==j) pa += other; });
        (tm.members||[]).forEach(function(mbr){
          if(!mbr.id) return;
          var s = ensure(mbr.id);
          s.games++; s.pf += sc; s.pa += pa; if(isWin) s.wins++;
        });
      });
    });
    return m;
  }
  function renderHistory_view(){
    var stats=playerStats(),area=$("statsArea");
    var rows=state.players.map(function(p){var s=stats[p.id]||{games:0,wins:0,pf:0,pa:0};return {p:p,games:s.games,wins:s.wins,pct:s.games?Math.round(s.wins/s.games*100):0,pf:s.pf};}).filter(function(r){return r.games>0;});
    rows.sort(function(a,b){return b.wins-a.wins||b.pct-a.pct||b.games-a.games||b.pf-a.pf;});
    if(rows.length===0){area.innerHTML='<div class="empty"><span class="big">Classifica vuota</span>Nessun giocatore ha ancora giocato una partita.</div>';}
    else{var top=rows.slice(0,5);area.innerHTML='<div style="font-size:.76rem;color:var(--muted);padding:0 2px 9px;line-height:1.5">Prime 5 per <b style="color:var(--txt)">vittorie</b> (V) · G = partite · % = vinte su giocate.</div><table><thead><tr><th>#</th><th class="lcol">Giocatore</th><th>G</th><th>V</th><th>%</th></tr></thead><tbody>'+top.map(function(r,i){return '<tr><td>'+(i+1)+'</td><td class="lcol">'+esc(r.p.name)+'</td><td>'+r.games+'</td><td>'+r.wins+'</td><td>'+r.pct+'%</td></tr>';}).join("")+'</tbody></table>';}
    var list=$("historyListArea"),games=(state.history||[]).slice();
    if(games.length===0){list.innerHTML='<div class="empty"><span class="big">Ancora nessuna partita</span>Le partite casual compariranno qui quando ne inizi una.</div>';return;}
    
    var ongoing = games.filter(function(g){ return Math.max.apply(null, g.totals) < g.target; });
    var finished = games.filter(function(g){ return Math.max.apply(null, g.totals) >= g.target; });
    
    function renderBlock(gamesArr) {
      return gamesArr.map(function(g){
        var d=new Date(g.ts);
        var maxSc = Math.max.apply(null, g.totals);
        var isFinished = maxSc >= g.target;
        var stat = isFinished ? '<span class="stat done">Conclusa</span>' : '<span class="stat live">In corso</span>';
        var dstr=d.toLocaleDateString("it-IT",{day:"numeric",month:"short"})+" · "+("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2)+" · a "+fmt(g.target);
        
        var rowsHtml = g.totals.map(function(sc, i) {
          var isWinner = isFinished && sc === maxSc;
          var mList = (g.teams && g.teams[i]) ? g.teams[i].members : [];
          var avHtml = '<div class="avs-mini">' + mList.map(function(m){return memberAvatar(m,24);}).join("") + '</div>';
          var nm = mList.length > 0 ? mList.map(function(m){return m.name.split(' ')[0];}).join(" & ") : (g.names[i]?esc(g.names[i].split(' ')[0]):"?");
          return '<div class="row'+(isWinner?' w':'')+'"><div class="nm-wrap">'+avHtml+'<span class="nm">'+nm+'</span></div><span class="sc">'+fmt(sc)+'</span></div>';
        }).join("");
        
        return '<div class="match clk" data-id="'+g.id+'"><div class="pair">'+rowsHtml+'</div><div class="match-right"><div style="display:flex;align-items:center;gap:6px">'+stat+'<button class="hg-rm" data-id="'+g.id+'" aria-label="Elimina">&times;</button></div><div class="match-date">'+dstr+'</div></div></div>';
      }).join("");
    }
    
    var html = "";
    if(ongoing.length > 0) html += '<h3 class="sec" style="font-size:0.75rem;margin:16px 2px 10px;border:none">In corso</h3>' + renderBlock(ongoing);
    if(finished.length > 0) html += '<h3 class="sec" style="font-size:0.75rem;margin:16px 2px 10px;border:none">Concluse</h3>' + renderBlock(finished);
    list.innerHTML = html;
    
    list.querySelectorAll(".match").forEach(function(el){el.addEventListener("click",function(){openHistoryGame(el.dataset.id);});});
    list.querySelectorAll(".hg-rm").forEach(function(b){b.addEventListener("click",function(e){e.stopPropagation();deleteHistoryGame(b.dataset.id);});});
  }
  function deleteHistoryGame(id){
    askConfirm("Elimina partita", "Eliminare questa partita dallo storico?", "Elimina", function(){
      state.history=(state.history||[]).filter(function(g){return g.id!==id;});
      persist();
      if(view==="casual-play" && scorer.mode==="casual" && scorer.hId===id){
        nav("history");
      }else{
        renderHistory_view();
      }
    });
  }
  
  // ===== player profile / stats =====
  function playerProfile(id){
    var games=0,wins=0,pf=0,pa=0,partners={},opponents={},recent=[];
    (state.history||[]).forEach(function(g){
      var t=g.totals||totals(g.rounds||[], (g.teams||[]).length);
      var maxT=Math.max.apply(null,t);
      if(maxT < g.target) return;
      var myIdx=-1, teamsIds=(g.teams||[]).map(function(tm,i){var ids=(tm.members||[]).map(function(x){return x.id;});if(ids.indexOf(id)>-1)myIdx=i;return ids;});
      if(myIdx===-1)return;
      var myScore=t[myIdx];
      var won=(myScore===maxT && maxT>0 && t.filter(function(x){return x===maxT;}).length===1);
      games++; if(won)wins++; pf+=myScore;
      var oppIds=[], oppLbls=[], bestOppScore=0;
      teamsIds.forEach(function(ids,i){
        if(i===myIdx)return;
        oppIds=oppIds.concat(ids);
        if(g.names&&g.names[i])oppLbls.push(g.names[i]);
        if(t[i]>bestOppScore)bestOppScore=t[i];
      });
      pa+=bestOppScore;
      teamsIds[myIdx].forEach(function(pid){if(pid&&pid!==id){partners[pid]=partners[pid]||{g:0,w:0};partners[pid].g++;if(won)partners[pid].w++;}});
      oppIds.forEach(function(oid){if(oid){opponents[oid]=opponents[oid]||{g:0,beat:0};opponents[oid].g++;if(won)opponents[oid].beat++;}});
      recent.push({ts:g.ts||g.date||0,opp:oppLbls.join(" / "),sa:myScore,sb:bestOppScore,won:won});
    });
    (state.tournaments||[]).forEach(function(t){
      t.matches.forEach(function(m){if(!m.finished)return;
        var ca=t.couples[m.ci],cb=t.couples[m.cj],idsA=[ca.p1,ca.p2],idsB=[cb.p1,cb.p2];
        var inA=idsA.indexOf(id)>-1,inB=idsB.indexOf(id)>-1;if(!inA&&!inB)return;
        var tot=totals(m.rounds, 2), sa=inA?tot[0]:tot[1], sb=inA?tot[1]:tot[0], won=sa>sb;
        games++; if(won)wins++; pf+=sa; pa+=sb;
        var myIds=inA?idsA:idsB, oppIds=inA?idsB:idsA;
        myIds.forEach(function(pid){if(pid&&pid!==id){partners[pid]=partners[pid]||{g:0,w:0};partners[pid].g++;if(won)partners[pid].w++;}});
        oppIds.forEach(function(oid){if(oid){opponents[oid]=opponents[oid]||{g:0,beat:0};opponents[oid].g++;if(won)opponents[oid].beat++;}});
        recent.push({ts:t.createdAt||0,opp:coupleLabel(inA?cb:ca),sa:sa,sb:sb,won:won});
      });
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
  var playersMode="manage";
  function openPlayers(mode){
    playersMode=typeof mode === "string" ? mode : "";
    var pick=playersMode.startsWith("pick");
    show("playersPickWrap",pick);show("rosterList2",!pick);
    $("playersTitle").textContent=pick?"Scegli i giocatori":"Giocatori";
    if(pick)renderPickGrid();else renderRoster();
    openOv("playersSheet","scrim5");
  }
  function renderPickGrid(){
    var hint=$("playersPickHint");
    if(hint){
      if(playersMode==="pick-tourney"){
        hint.innerHTML = 'Tocca un giocatore per assegnarlo al torneo.';
        $("playersPickPrev").style.display="none";
      }else{
        $("playersPickPrev").style.display="block";
        if(state.settings.bigTeams) {
          hint.innerHTML = 'Tocca un giocatore per assegnarlo: <b style="color:var(--oro-soft)">1° tocco → Squadra A</b>, <b style="color:#9FD3C0">2° → Squadra B</b>, <b style="color:#3B6FC0">3° → Squadra C</b>, 4° lo togli.';
        } else {
          hint.innerHTML = 'Tocca un giocatore per assegnarlo: <b style="color:var(--oro-soft)">1° tocco → Squadra A</b>, <b style="color:#9FD3C0">2° → Squadra B</b>, 3° lo togli.';
        }
      }
    }
    var g=$("playersPick");
    if(state.players.length===0){g.innerHTML='<div class="ref" style="grid-column: 1 / -1; text-align:center;color:rgba(28,27,25,.6)">Nessun giocatore. Crealo qui sotto.</div>';}
    else{g.innerHTML=state.players.map(pchipHTML).join("");wirePchips(g);}
    var ma=membersOf("A"),mb=membersOf("B"),mc=membersOf("C");
    var prevHTML='<b>A:</b> '+(ma.length?esc(ma.map(function(m){return m.name;}).join(" & ")):"—")+' &nbsp;·&nbsp; <b>B:</b> '+(mb.length?esc(mb.map(function(m){return m.name;}).join(" & ")):"—");
    if(state.settings.bigTeams) prevHTML+=' &nbsp;·&nbsp; <b>C:</b> '+(mc.length?esc(mc.map(function(m){return m.name;}).join(" & ")):"—");
    $("playersPickPrev").innerHTML=prevHTML;
  }
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
    var newP = null;
    if(editingPlayerId){var p=getPlayer(editingPlayerId);if(p){p.name=name.slice(0,22);p.avatar=avatar;}}
    else { newP = {id:uid(),name:name.slice(0,22),avatar:avatar}; state.players.push(newP); }
    persist();closeOv("pSheet","scrim4");renderRoster();refreshAssign();
    if(newP && window.pendingTournamentSlot) {
      coupleRows[window.pendingTournamentSlot.row][window.pendingTournamentSlot.slot] = newP.id;
      window.pendingTournamentSlot = null;
      if($("tSheet").classList.contains("open")) renderCouples();
    }
  }
  function deletePlayer(){
    if(!editingPlayerId)return;
    var inUse=state.tournaments.some(function(t){return t.couples.some(function(c){return c.p1===editingPlayerId||c.p2===editingPlayerId;});});
    if(inUse){toast("Persona in uso in un torneo");return;}
    askConfirm("Elimina giocatore", "Eliminare questo partecipante?", "Elimina", function(){
      state.players=state.players.filter(function(p){return p.id!==editingPlayerId;});
      persist();closeOv("pSheet","scrim4");renderRoster();if(view==="casual-setup")renderSetup();
    });
  }
  function fileToAvatar(file,cb){
    var url=URL.createObjectURL(file),img=new Image();
    img.onload=function(){var s=Math.min(img.width,img.height),c=document.createElement("canvas");c.width=c.height=128;var ctx=c.getContext("2d");ctx.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,128,128);URL.revokeObjectURL(url);try{cb(c.toDataURL("image/jpeg",0.82));}catch(e){cb(null);}};
    img.onerror=function(){URL.revokeObjectURL(url);cb(null);};img.src=url;
  }

  // ===== settings =====
  function applyTourneysVisibility(){var show=state.settings.showTourneys!==false;$("dockTornei").hidden=!show;if(!show&&(view==="tourneys"||view==="tourney"))nav("casual-setup");}

  function updateRulesUI(){
    var v=state.settings.values;
    $("semiHint").textContent="Bonus intermedio da "+v.semi+" punti";
    $("rulesChiusTxt").textContent="+"+v.chius;
    $("rulesPulitoTxt").textContent="+"+v.pulito;
    $("rulesSemiTxt").textContent="+"+v.semi;
    $("rulesSporcoTxt").textContent="+"+v.sporco;
    $("rulesChiusTxt2").textContent="+"+v.chius;
    $("rulesPozzTxt").textContent="−"+v.pozz;
  }

  function openSettings(){var s=state.settings;$("setTarget").value=s.target;$("setSemi").checked=s.semipulito;$("setShowTourneys").checked=s.showTourneys!==false;$("setHaptic").checked=s.haptic!==false;$("setDealer").checked=s.dealer!==false;$("setTally").checked=s.tallyCards===true;$("setBigTeams").checked=s.bigTeams===true;$("vPulito").value=s.values.pulito;$("vSemi").value=s.values.semi;$("vSporco").value=s.values.sporco;$("vChius").value=s.values.chius;$("vPozz").value=s.values.pozz;openOv("setSheet","scrim2");}
  function saveSettings(){var s=state.settings;var tg=parseInt($("setTarget").value,10);var newTg=isNaN(tg)||tg<100?2005:tg;s.target=newTg;s.semipulito=$("setSemi").checked;s.showTourneys=$("setShowTourneys").checked;s.haptic=$("setHaptic").checked;s.dealer=$("setDealer").checked;s.tallyCards=$("setTally").checked;s.bigTeams=$("setBigTeams").checked;function num(id,d){var v=parseInt($(id).value,10);return isNaN(v)?d:v;}s.values={pulito:num("vPulito",200),semi:num("vSemi",150),sporco:num("vSporco",100),chius:num("vChius",100),pozz:num("vPozz",100)};persist();applyTourneysVisibility();updateRulesUI();closeOv("setSheet","scrim2");if(view==="casual-play"||view==="match-play")renderScorer();else if(view==="tourney")renderTourney();else if(view==="casual-setup")renderSetup();}

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
  var draftImport = null;
  function importData(file){
    var r=new FileReader();
    r.onload=function(){
      var obj;try{obj=JSON.parse(r.result);}catch(e){toast("File non valido");return;}
      if(!obj||typeof obj!=="object"||!("players" in obj||"settings" in obj||"tournaments" in obj)){toast("Non sembra un backup di Pinella");return;}
      draftImport = obj;
      openOv("importSheet","scrimImport");
    };
    r.onerror=function(){toast("Errore nella lettura del file");};
    r.readAsText(file);
  }

  // ===== overlays / toast =====
  function openOv(sheet,scrim){$(scrim).classList.add("open");requestAnimationFrame(function(){$(sheet).classList.add("open");});}
  function closeOv(sheet,scrim){$(sheet).classList.remove("open");$(scrim).classList.remove("open");}
  var toastTimer=null;
  function vib(){ if(state.settings.haptic!==false && navigator.vibrate) navigator.vibrate(12); }
  function toast(msg,undo){var t=$("toast");$("toastMsg").textContent=msg;var old=t.querySelector(".undo");if(old)old.remove();if(undo){var u=document.createElement("span");u.className="undo";u.textContent="Annulla";u.addEventListener("click",function(){vib();undo();t.classList.remove("show");});t.appendChild(u);}t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.remove("show");},undo?4500:2200);}
  
  var confirmCallback = null;
  function askConfirm(title, message, okText, callback) {
    $("confirmTitle").textContent = title;
    $("confirmMessage").textContent = message;
    $("btnConfirmOk").textContent = okText || "Conferma";
    confirmCallback = callback;
    openOv("confirmSheet", "scrimConfirm");
  }

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
    if(state.settings.haptic!==false && navigator.vibrate){try{navigator.vibrate([40,40,90]);}catch(e){}}
    if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    confetti();
  }

  // ===== events =====
  $("dockPartite").addEventListener("click",goPartita);
  $("dockTornei").addEventListener("click",function(){nav("tourneys");});
  $("dockStorico").addEventListener("click",function(){nav("history");});
  $("dockGiocatori").addEventListener("click",openPlayers);
  $("dockImpostazioni").addEventListener("click",openSettings);
  
  var selectedMergePlayers = [];
  function openMergeSheet() {
    selectedMergePlayers = [];
    var html = scorer.names.map(function(n, i){
      return '<div class="merge-opt" data-idx="'+i+'" style="display:flex; align-items:center; gap:12px; padding:12px; background:var(--bg-elevated); border:2px solid transparent; border-radius:12px; cursor:pointer;">' + 
             memberAvatar(scorer.members[i][0], 40) + 
             '<span style="font-size:1.1rem; font-weight:600;">' + esc(n) + '</span></div>';
    }).join("");
    $("mergePlayersList").innerHTML = html;
    $("mergePlayersList").querySelectorAll(".merge-opt").forEach(function(el){
      el.addEventListener("click", function(){
        var idx = parseInt(el.dataset.idx, 10);
        var pos = selectedMergePlayers.indexOf(idx);
        if(pos > -1) {
          selectedMergePlayers.splice(pos, 1);
          el.style.borderColor = "transparent";
          el.style.background = "var(--bg-elevated)";
        } else {
          if(selectedMergePlayers.length >= 2) return;
          selectedMergePlayers.push(idx);
          el.style.borderColor = "var(--oro)";
          el.style.background = "rgba(244,239,226,0.1)";
        }
        $("btnMergeConfirm").disabled = selectedMergePlayers.length !== 2;
      });
    });
    $("btnMergeConfirm").disabled = true;
    openOv("mergeSheet", "scrimMerge");
  }
  
  function confirmMerge(){
    if(selectedMergePlayers.length !== 2) return;
    var a = selectedMergePlayers[0], b = selectedMergePlayers[1];
    var soloIdx = [0,1,2].find(function(x){return x!==a && x!==b;});
    
    var g = (state.history||[]).find(function(x){return x.id===scorer.hId;});
    if(!g) return;
    
    var tSolo = g.teams[soloIdx];
    var tMerge1 = g.teams[a];
    var tMerge2 = g.teams[b];
    
    g.teams = [
      tSolo,
      {members: [tMerge1.members[0], tMerge2.members[0]]}
    ];
    g.names = [
      g.names[soloIdx],
      (tMerge1.members||[]).map(function(m){return m.name;}).concat((tMerge2.members||[]).map(function(m){return m.name;})).join(" & ")
    ];
    
    if(g.rounds && g.rounds.length > 0) {
      g.rounds.forEach(function(r){
        var cLetters = ["a","b","c"];
        var pSolo = r[cLetters[soloIdx]];
        var p1 = r[cLetters[a]];
        var p2 = r[cLetters[b]];
        r.a = pSolo;
        var mergedPoints = {pulito: (p1?p1.pulito:0)+(p2?p2.pulito:0), semi: (p1?p1.semi:0)+(p2?p2.semi:0), sporco: (p1?p1.sporco:0)+(p2?p2.sporco:0), tavolo: (p1?p1.tavolo:0)+(p2?p2.tavolo:0), mano: (p1?p1.mano:0)+(p2?p2.mano:0), chius: (p1&&p1.chius)||(p2&&p2.chius), pozz: (p1&&p1.pozz)||(p2&&p2.pozz)};
        r.b = mergedPoints;
        delete r.c;
      });
      g.totals = totals(g.rounds, 2);
    } else {
      g.totals = [0, 0];
    }
    
    closeOv("mergeSheet", "scrimMerge");
    persist();
    openHistoryGame(g.id);
    toast("Squadre unite con successo!");
  }
  
  function openRules(){openOv("rulesSheet","scrim7");}
  $("openRules").addEventListener("click",openRules);
  $("openRules2").addEventListener("click",openRules);
  $("openCreditsHome").addEventListener("click",function(){openOv("creditsSheet","scrim10");});
  $("creditsClose").addEventListener("click",function(){closeOv("creditsSheet","scrim10");});
  $("scrim10").addEventListener("click",function(){closeOv("creditsSheet","scrim10");});
  
  $("rulesClose").addEventListener("click",function(){closeOv("rulesSheet","scrim7");});
  $("scrim7").addEventListener("click",function(){closeOv("rulesSheet","scrim7");});
  $("cardsDone").addEventListener("click",applyCards);
  $("cardsClose").addEventListener("click",function(){closeOv("cardsSheet","scrim8");});
  $("scrim8").addEventListener("click",function(){closeOv("cardsSheet","scrim8");});
  $("playersClose").addEventListener("click",function(){closeOv("playersSheet","scrim5");});
  $("scrim5").addEventListener("click",function(){closeOv("playersSheet","scrim5");});
  $("openAddPerson2").addEventListener("click",function(){openPlayer(null);});
  $("startCasual").addEventListener("click",startCasual);
  $("addGuest").addEventListener("click",function(){openPlayers("pick");});

  $("btnAdd").addEventListener("click",function(){openSheet();});
  if($("btnAlleanza")){
    $("btnAlleanza").addEventListener("click",openMergeSheet);
    $("mergeClose").addEventListener("click",function(){closeOv("mergeSheet","scrimMerge");});
    $("scrimMerge").addEventListener("click",function(){closeOv("mergeSheet","scrimMerge");});
    $("btnMergeConfirm").addEventListener("click",confirmMerge);
  }
  $("dealerBar").addEventListener("click",openTable);
  $("tableClose").addEventListener("click",function(){closeOv("tableSheet","scrim9");});
  $("scrim9").addEventListener("click",function(){closeOv("tableSheet","scrim9");});

  $("scorerBack").addEventListener("click",function(){
    if(scorer.mode==="match") openTourney(scorer.tId);
    else nav("history");
  });
  $("tourneyBack").addEventListener("click",function(){nav("tourneys");});
  $("tRename").addEventListener("click",renameTourney);
  $("tDelete").addEventListener("click",deleteTourney);
  $("btnScorerDelete").addEventListener("click", function(){
    if(scorer.mode==="casual"){
      deleteHistoryGame(scorer.hId);
    }
  });
  $("btnNewTourney").addEventListener("click",openNewTourney);
  $("sheetClose").addEventListener("click",function(){closeOv("sheet","scrim");});
  $("scrim").addEventListener("click",function(){closeOv("sheet","scrim");});
  $("saveRound").addEventListener("click",saveRound);
  $("deleteRound").addEventListener("click",deleteRound);
  $("setClose").addEventListener("click",saveSettings);
  $("scrim2").addEventListener("click",saveSettings);
  $("saveSettings").addEventListener("click",saveSettings);
  $("exportData").addEventListener("click",exportData);
  $("btnNukeData").addEventListener("click", function() {
    askConfirm("Elimina tutti i dati", "Sei sicuro di voler eliminare TUTTI i dati? L'operazione è irreversibile e perderai giocatori, partite, tornei e impostazioni.", "Elimina tutto", function() {
      localStorage.removeItem(KEY);
      location.reload();
    });
  });
  $("importData").addEventListener("click",function(){$("importFile").click();});
  $("importFile").addEventListener("change",function(e){var f=e.target.files&&e.target.files[0];if(f)importData(f);e.target.value="";});
  $("importClose").addEventListener("click",function(){closeOv("importSheet","scrimImport");});
  $("scrimImport").addEventListener("click",function(){closeOv("importSheet","scrimImport");});
  $("btnImportReplace").addEventListener("click",function(){
    try{localStorage.setItem(KEY,JSON.stringify(draftImport));location.reload();}catch(e){toast("Importazione non riuscita");}
  });
  $("btnImportMerge").addEventListener("click",function(){
    var tp=state.players.reduce(function(a,p){a[p.id]=true;return a;},{});
    (draftImport.players||[]).forEach(function(p){if(!tp[p.id]){state.players.push(p);tp[p.id]=true;}});
    var tt=state.tournaments.reduce(function(a,t){a[t.id]=true;return a;},{});
    (draftImport.tournaments||[]).forEach(function(t){if(!tt[t.id]){state.tournaments.push(t);tt[t.id]=true;}});
    var th=state.history.reduce(function(a,h){a[h.id]=true;return a;},{});
    (draftImport.history||[]).forEach(function(h){if(!th[h.id]){state.history.push(h);th[h.id]=true;}});
    persist();
    location.reload();
  });
  $("btnConfirmCancel").addEventListener("click", function(){ closeOv("confirmSheet", "scrimConfirm"); });
  $("confirmClose").addEventListener("click", function(){ closeOv("confirmSheet", "scrimConfirm"); });
  $("scrimConfirm").addEventListener("click", function(){ closeOv("confirmSheet", "scrimConfirm"); });
  $("btnConfirmOk").addEventListener("click", function(){
    closeOv("confirmSheet", "scrimConfirm");
    if(confirmCallback) confirmCallback();
  });

  var promptCb=null;
  function askPrompt(title,val,btn,cb){$("promptTitle").textContent=title;$("promptInput").value=val;$("btnPromptOk").textContent=btn;promptCb=cb;openOv("promptSheet","scrimPrompt");setTimeout(function(){$("promptInput").focus();},50);}
  $("btnPromptCancel").addEventListener("click",function(){closeOv("promptSheet","scrimPrompt");});
  $("promptClose").addEventListener("click",function(){closeOv("promptSheet","scrimPrompt");});
  $("scrimPrompt").addEventListener("click",function(){closeOv("promptSheet","scrimPrompt");});
  $("btnPromptOk").addEventListener("click",function(){var v=$("promptInput").value.trim();if(!v)return;if(promptCb)promptCb(v);closeOv("promptSheet","scrimPrompt");});
  $("promptInput").addEventListener("keydown",function(e){if(e.key==="Enter"){$("btnPromptOk").click();}});

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
  buildPickers();
  applyTourneysVisibility();
  updateRulesUI();
  document.addEventListener("keydown",function(e){if(e.key==="Escape"){["sheet","setSheet","tSheet","pSheet","playersSheet","rulesSheet","cardsSheet","tableSheet","importSheet","confirmSheet","promptSheet"].forEach(function(s){$(s).classList.remove("open");});["scrim","scrim2","scrim3","scrim4","scrim5","scrim7","scrim8","scrim9","scrimImport","scrimConfirm","scrimPrompt"].forEach(function(s){$(s).classList.remove("open");});}});

  document.addEventListener("click", function(e) {
    if (e.target.closest("button, .clk, .dock-btn, .pchip, .person, .tcard, .match, .sym, .col, .check input, .switch input, select, .close-x, .hg-rm, .rm, .undo")) {
      vib();
    }
  });

  function wireSheetsDrag() {
    document.querySelectorAll(".sheet").forEach(function(sheet) {
      var handles = sheet.querySelectorAll(".sheet-head, .grabber");
      if (!handles.length) return;
      var startY = 0, dragging = false, pid = null;
      handles.forEach(function(handle) {
        handle.style.touchAction = "none"; // prevent browser pull-to-refresh / pointercancel
        handle.addEventListener("pointerdown", function(e) {
          if(e.target.closest("button, input, select")) return;
          startY = e.clientY;
          dragging = true;
          pid = e.pointerId;
          sheet.style.transition = "none";
          try{handle.setPointerCapture(pid);}catch(_){}
        });
        handle.addEventListener("pointermove", function(e) {
          if (!dragging) return;
          var dy = e.clientY - startY;
          if (dy > 0) sheet.style.transform = "translateY(" + dy + "px)";
        });
        function endDrag(e) {
          if (!dragging) return;
          dragging = false;
          try{handle.releasePointerCapture(pid);}catch(_){}
          sheet.style.transition = "";
          var dy = e.clientY - startY;
          sheet.style.transform = "";
          if (dy > 80) {
            var btn = sheet.querySelector(".close-x");
            if (btn) btn.click();
          }
        }
        handle.addEventListener("pointerup", endDrag);
        handle.addEventListener("pointercancel", endDrag);
      });
    });
  }
  wireSheetsDrag();

  goPartita();
  if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){});});}
})();
