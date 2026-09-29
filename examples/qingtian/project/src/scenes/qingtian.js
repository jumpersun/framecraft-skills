// A paper plane links the school-day memory, the goodbye and a new beginning.
// Scene-local action is retimed to the selected musical phrases below.
(() => {
  const C = { paper: '#F1E5C9', sky: '#B9D4D2', gold: '#E8BF77', wall: '#D7C6A4', leaf: '#829B79', teal: '#526F6B',
    blue: '#667D91', rain: '#BACBD2', ground: '#B8B8AA', pink: '#E4A5A3', dark: '#3E4259' };
  const B = { col: '#CB825C', dk: '#955842', lt: '#E4AD88' }, G = { col: '#E4A5A3', dk: '#AC747D', lt: '#F5CBC0' };
  const box = (x,y,w,h,col,sw=.7) => paint(rectPts(x,y,w,h,1), {wash:col,ink:sw?PAL.ink:null,sw});
  const oval = (x,y,rx,ry,col,sw=0) => paint(ellPts(x,y,rx,ry,24,1),{wash:col,ink:sw?PAL.ink:null,sw});
  const stroke = (pts,sw=.8,col=PAL.ink) => inkLine(pts,sw,col,'inkfine',.25);
  function cloud(x,y,rx,ry,col,t,key) {
    boilSeed(key); const pts=[];
    for(let i=0;i<28;i++){const a=i/28*TAU,r=1+.1*Math.sin(a*5);pts.push([x+Math.cos(a)*rx*r,y+Math.sin(a)*ry*r]);}
    paint(pts,{fill:col,fillOp:145,bleed:.18,tex:.5,ink:null});
  }
  function sky(t,wet=0,day=0) {
    boilSeed('q-sky'); box(-500,-700,3000,2200,mixCol(C.sky,'#748195',wet),0);
    paint(ellPts(1180,600,1500,460,30,4),{fill:mixCol('#F1DCAB','#A3B0B8',wet),fillOp:150,bleed:.18,ink:null});
    for(let i=0;i<3;i++)cloud(160+i*740+Math.sin(t*.15+i)*35,180+i*45,280,52,mixCol(C.paper,'#616F86',wet),t,'q-cloud'+i);
    if(wet<.7){boilSeed('sun');const x=lerp(1450,1680,day),y=lerp(220,680,day);oval(x,y,70,70,'#EBCB85');glow(x,y,150,'#FFE3A0',(1-wet)*.5);}
  }
  function tree(x,y,t,wet=0,s=1) {
    boilSeed('tree'+x);stroke([[x,y],[x+9*s,y-250*s],[x-35*s,y-410*s]],5*s,'#6D6558');
    stroke([[x+4*s,y-220*s],[x+125*s,y-370*s]],3*s,'#6D6558');
    for(let i=0;i<3;i++)cloud(x+(i-1)*120*s+Math.sin(t*.8+i)*8,y-(375+(i%2)*50)*s,175*s,130*s,mixCol(C.leaf,C.teal,wet*.55),t,'leaves'+x+i);
  }
  function campus(t,wet=0,day=0) {
    sky(t,wet,day);boilSeed('campus');
    box(370,350,1150,400,mixCol('#DAC9A9','#8495A0',wet),.8);
    box(345,331,1200,32,mixCol('#AA8070',C.dark,wet*.55),.7);
    for(let r=0;r<2;r++)for(let j=0;j<7;j++){
      const x=410+j*155,y=395+r*165;box(x,y,98,108,mixCol('#8EA8A8','#536A81',wet),.5);
      stroke([[x+48,y+3],[x+48,y+106]],.45,'#D9D3BB');stroke([[x+3,y+52],[x+96,y+52]],.45,'#D9D3BB');
    }
    box(885,637,165,119,'#6E746E',.5);oval(968,289,40,40,C.paper,.8);
    stroke([[969+Math.sin(day*TAU)*26,289-Math.cos(day*TAU)*26],[969,289],[969+Math.cos(day*Math.PI)*20,289+Math.sin(day*Math.PI)*20]],1.2);
    box(-400,748,2700,900,mixCol('#CDC7AD','#889AAA',wet),0);
    stroke([[-200,759],[960,752],[2150,760]],.8,'#7A8278');
    tree(185,790,t,wet,.9);tree(1740,802,t,wet,.95);
    if(wet>.1)for(let i=0;i<5;i++)oval(230+i*345,844+(i%2)*80,100,9,mixCol('#A8C1C7',C.blue,wet*.2));
    if(day>0)paint(rectPts(-100,-100,2200,1300),{fill:'#C98676',fillOp:day*65,ink:null});
  }
  function person(who,x,y,u,t,mood='neutral',pose={}) {
    // Emotion transitions carry default body colours; the two cast colours must stay fixed.
    clawd(x,y,u,{...feel(mood,t),...pose,...(who==='girl'?G:B),tint:null,emote:null,hat:who==='girl'?'flower':null,boilKey:who});
  }
  function hand(x,y,u,a,side=1,sq=0,dy=0) {
    const slide=.55*clamp((Math.abs(a)-.7)/.9);
    return [x+side*(4.9+slide+2.2*Math.cos(a))*u*(1+sq*.6),y+dy*u+(-4.5-2.2*Math.sin(a))*u*(1-sq)];
  }
  function plane(x,y,s=1,rot=0) {
    boilSeed('plane');push();translate(x,y);rotate(rot);scale(s);
    paint([[-85,-24],[94,-8],[-49,53],[-31,12]],{wash:'#FFF0CD',ink:PAL.ink,sw:.75});
    paint([[-85,-24],[-31,12],[94,-8],[-13,-5]],{wash:'#D8D3BE',ink:PAL.ink,sw:.6});
    stroke([[-31,12],[-49,53]],.6);pop();
  }
  function rain(t,amount=1) {
    if(amount<=0)return;
    for(let i=0;i<75*amount;i++){
      boilSeed('rain'+i);const y=(hash(i+9)*1400+t*(530+hash(i+3)*180))%1400-170;
      const x=(hash(i+61)*2400-t*105)%2400;
      stroke([[x,y],[x-12,y+28]],.35+hash(i)*.25,'#D0DBD9');
    }
    for(let i=0;i<5;i++){const k=frac(t*1.2+hash(i));boilSeed('ripple'+i);paint(ellPts(250+i*325,925+(i%2)*44,10+k*40,2+k*6,22),{ink:mixCol(C.blue,C.rain,1-k),sw:.5});}
  }
  function umbrella(x,y,s=1,open=1,pole=255) {
    boilSeed('umbrella');push();translate(x,y);scale(s);
    stroke([[0,0],[0,pole],[8,pole+17],[24,pole+14]],2,'#594D4F');
    const r=225*Math.max(.06,open),pts=[[-r,0]];
    for(let i=0;i<=20;i++){const a=Math.PI+i/20*Math.PI;pts.push([Math.cos(a)*r,Math.sin(a)*125]);}
    for(let i=4;i>=0;i--){const xx=-r+2*r*i/4;pts.push([xx,0],[xx-r/4,15]);}
    paint(pts,{wash:'#B27862',fill:'#D09C7B',fillOp:65,ink:PAL.ink,sw:.9});
    stroke([[0,-123],[-r/2,0]],.6,'#8D635B');stroke([[0,-123],[r/2,0]],.6,'#8D635B');pop();
  }
  function bench(x,y) {
    boilSeed('bench');for(let j=0;j<3;j++)box(x-270,y-195+j*42,540,24,'#94775E',.8);
    box(x-285,y-57,570,24,'#B99C76',.8);
    for(const dx of [-225,225])box(x+dx,y-191,16,191,'#626A62',.65);
  }
  function wipe(lt,dur,palette=[C.paper,C.wall]) {
    boilSeed('seam');if(lt<.28)brushWipe(.5+lt/.56,palette);
    if(lt>dur-.28)brushWipe((lt-dur+.28)/.56,palette);
  }
  function desk(t,lt,dur) {
    boilSeed('desk');box(-100,-100,2200,1300,'#DBCCA9',0);
    box(90,0,1150,610,'#A6C3C0',1);box(130,0,1070,565,'#C8D9CE',.6);
    cloud(850,185,350,90,C.paper,t,'window-cloud');
    for(const x of [90,660,1200])box(x,0,22,610,'#8B8D73',.6);
    box(90,583,1150,38,'#B8AC8E',.8);box(-100,665,2200,620,'#B79C7B',1);
    for(let i=0;i<6;i++)stroke([[-50,710+i*68],[950,720+i*66],[1980,697+i*70]],.5,'#A3886C');
    push();translate(870,800);rotate(-.075);
    paint([[-410,-122],[-10,-145],[22,-115],[415,-94],[405,165],[30,143],[-8,169],[-405,145]],{wash:'#F7EDCE',ink:PAL.ink,sw:.9});
    stroke([[0,-128],[10,153]],.65,'#A19983');
    for(let j=0;j<5;j++)stroke([[-353,-60+j*40],[-60,-63+j*40]],.35,'#B6B7A3');
    pop();
    const k=ease(seg(lt,1.4,4.7));plane(lerp(970,1740,k),lerp(756,160,k)-120*Math.sin(k*Math.PI),1.2-k*.4,-.16-k*.15);
    box(1410,700,220,17,'#708B7F',.6);
    if(lt<.6)flash(1-ease(lt/.6),C.paper);
    if(lt>dur-.28)wipe(lt,dur);
  }
  function meet(t,lt,dur) {
    camBegin(960,535,1.035+lt*.004);campus(t);
    const moodB=emotions(lt,[[0,'shy'],[1.2,'hopeful'],[3,'happy']]);
    const moodG=emotions(lt,[[0,'thinking'],[1.8,'surprised'],[2.7,'happy']]);
    const aB=.2+ease(seg(lt,.8,1.4))*.5,aG=ease(seg(lt,2,2.6))*.5;
    person('boy',625,899,40,t,'shy',{...moodB,aR:aB,lookX:.7,dy:0,dx:0,sq:0,rot:0});
    person('girl',1270,899,38,t,'happy',{...moodG,aL:aG,lookX:-.6,dy:0,dx:0,sq:0,rot:0});
    const k=ease(seg(lt,1.4,2.7)),from=hand(625,899,40,aB),to=hand(1270,899,38,aG,-1);
    plane(lerp(from[0],to[0],k),lerp(from[1],to[1],k)-85*Math.sin(k*Math.PI),.72,-.12+Math.sin(k*Math.PI)*.12);
    camEnd();wipe(lt,dur);
  }
  function wind(t,lt,dur) {
    campus(t,.82+ease(seg(lt,0,5))*.08);
    const k=ease(seg(lt,.3,4.6));
    person('boy',lerp(710,550,k),879,31,t,'sad',{aR:.35,lookX:.8,rot:-.12*k,dy:0});
    person('girl',lerp(1190,1650,k),lerp(879,820,k),lerp(30,24,k),t,'sad',{aL:.4,lookX:-.8,rot:.08*k,dy:0});
    for(let i=0;i<12;i++){
      boilSeed('leaf'+i);const k=seg(lt,1.4+i*.1,4.4+i*.1),x=lerp(1680,-200,k),y=400+i*32+Math.sin(k*TAU+i)*90;
      paint(ellPts(x,y,17,6,10,1,k*8+i),{wash:i%2?C.leaf:C.gold,ink:PAL.ink,sw:.3});
    }
    plane(lerp(965,200,k),660-130*Math.sin(k*Math.PI),.65,-.3-k*.7);
    wipe(lt,dur,[C.blue,C.rain]);
  }
  function shelter(t,lt,dur) {
    campus(t,.9);camBegin(970,640,1.25);
    const k=ease(seg(lt,1,2.4));person('boy',800,894,30,t,'determined',{aR:-.3,aL:-.45,lookX:.5,rot:0,dy:0,sq:0});
    person('girl',lerp(1330,1165,k),894,29,t,'relieved',{view:'q',flip:true,walk:k*3,lookX:-.6});
    const h=hand(800,894,30,-.3);umbrella(h[0],h[1]-300,1.5,ease(seg(lt,.2,1.15)),200);
    camEnd();rain(t,.85);wipe(lt,dur,[C.blue,C.rain]);
  }
  function departure(t,lt,dur) {
    campus(t,.9);boilSeed('stop');box(105,243,31,573,C.teal,.7);box(69,241,108,168,C.paper,.7);
    stroke([[89,280],[155,280]],1.5,C.teal);stroke([[89,307],[155,307]],1.5,C.teal);
    const dx=ease(seg(lt,1.5,4.8))*1650;push();translate(dx,0);boilSeed('bus');
    for(const x of [830,1530])oval(x,812,73,73,C.dark,.8);
    paint(rrPts(580,285,1190,491,35,2),{wash:'#557A78',fill:'#A1B6A7',fillOp:65,ink:PAL.ink,sw:1.1});
    box(639,340,330,276,'#AFC5C4',.7);box(1005,340,325,276,'#AFC5C4',.7);box(1368,340,335,276,'#AFC5C4',.7);
    person('girl',1170,650,32,t,'sad',{aL:.8+.15*Math.sin(lt*4),lookX:-.7});
    box(1004,600,326,60,'#557A78',0);stroke([[1041,374],[1285,562]],.6,C.paper);box(588,689,1170,27,'#D3B37D',.7);
    pop();
    person('boy',358,928,36,t,'sad',{aR:lerp(.95,-.4,ease(seg(lt,2.3,3.7))),aL:-.2,lookX:.9,rot:0,dy:0,sq:0});
    const h=hand(358,928,36,-.2,-1);umbrella(h[0],h[1]-260,1.3,1,200);
    rain(t,.8);wipe(lt,dur,[C.blue,C.rain]);
  }
  function retrieve(t,lt,dur) {
    campus(t,.82);camBegin(1000,775,1.38);
    const p=stroll(lt,0,1.7,360,810,34),bend=ease(seg(lt,1.8,2.6))*(1-ease(seg(lt,2.8,4.2)));
    const aR=lerp(-1.05,.15,ease(seg(lt,2.8,4.2)));
    person('boy',p.x,900,34,t,'sad',{view:lt<1.7?'side':'front',walk:p.walk,rot:0,sq:bend*.25,aR,dy:bend*1.4,lookX:.6,lookY:.8});
    const h=hand(p.x,900,34,aR,1,bend*.25,bend*1.4);
    plane(lt<2.6?1053:h[0],lt<2.6?882:h[1],.7,lerp(.1,-.22,ease(seg(lt,2.8,4.2))));
    camEnd();rain(t,.55);wipe(lt,dur,[C.blue,C.rain]);
  }
  function quiet(t,lt,dur) {
    campus(t,lerp(.8,0,ease(seg(lt,0,2.8))));camBegin(955,669,1.25);bench(1070,921);
    const mood=emotions(lt,[[0,'sad'],[2.2,'thinking'],[3.8,'hopeful']]);
    person('boy',1030,940,38,t,'sad',{...mood,noLegs:true,noShadow:true,dy:0,sq:0,rot:0,lookY:lerp(.7,-.65,ease(seg(lt,2.4,4))),aR:-1.1,aL:-1.1});
    for(const dx of [-114,-48,46,110]){boilSeed('seated-leg'+dx);box(1030+dx,859,30,56+Math.sin(lt*2+dx)*3,B.dk,1);}
    plane(1030,842,.8+ease(seg(lt,.4,2))*.1,-.08+Math.sin(lt*2)*.025);camEnd();rain(t,(1-ease(seg(lt,0,1.7)))*.45);
    if(lt>3)glow(1390,260,500,'#FFE3A0',ease(seg(lt,3,5))*.5);wipe(lt,dur,[C.paper,C.gold]);
  }
  function reunion(t,lt,dur) {
    const day=ease(seg(lt,1.5,4.7));campus(t,0,day);camBegin(940,615,1.1);
    const run=stroll(lt,0,1.8,260,670,31),together=ease(seg(lt,1.6,2.2));
    person('boy',run.x,885,31,t,lt<1.8?'determined':'happy',{view:'front',walk:lt<1.8?run.walk:0,aR:0,aL:-.3,dy:0,dx:0,sq:0,rot:0,lookX:.7});
    person('girl',1110,885,31,t,'happy',{aL:lerp(.75,0,together),aR:.2,dy:0,dx:0,sq:0,rot:0,lookX:-.7});
    const h=hand(run.x,885,31,0);plane(h[0],h[1]-10,.64,-.1);
    if(together>.8){boilSeed('reunion-heart');paint(heartPts(890,590-Math.sin(lt*1.6)*9,28),{wash:C.pink,ink:PAL.ink,sw:.5});}
    camEnd();wipe(lt,dur,[C.paper,C.gold]);
  }
  function farewell(t,lt,dur) {
    campus(t,0,1);camBegin(925,675,1.4);
    const bye=ease(seg(lt,3.2,3.7)),leave=ease(seg(lt,4.35,5));
    const x=lerp(1110,1570,leave),waving=(.72+.14*Math.sin(lt*9))*bye;
    person('boy',670,885,31,t,'sad',{aR:lerp(0,.4,bye),aL:-.45,lookX:.8,rot:0,dy:0,sq:0});
    person('girl',x,885,31,t,'sad',{aL:waving,aR:-.4,lookX:-.7,rot:0,dy:0,sq:0,walk:leave*5});
    const h=hand(670,885,31,lerp(0,.4,bye));plane(h[0],h[1]-10,.64,-.1);
    if(lt>2.8){const k=ease(seg(lt,2.8,5));boilSeed('flower-petal');paint(ellPts(1080-k*230,590+k*290,10,5,12,1,k*8),{wash:'#F7D8A2',ink:PAL.ink,sw:.4});}
    camEnd();wipe(lt,dur,[C.paper,C.gold]);
  }
  function release(t,lt,dur) {
    camBegin(960,lerp(545,405,ease(seg(lt,2,4.5))),1);campus(t,0);
    const aR=lt<2.3?lerp(.2,1.35,ease(seg(lt,.5,1.5))):lerp(1.35,.3,ease(seg(lt,2.3,3.8)));
    person('boy',835,881,38,t,'hopeful',{lookX:.6,lookY:-.8,aR,rot:0,dy:0,sq:0});
    const k=ease(seg(lt,1.5,4.3)),h=hand(835,881,38,lt<1.5?aR:1.35);
    plane(lerp(h[0],1760,k),lerp(h[1],190,k)-140*Math.sin(k*Math.PI),lerp(.82,.38,k),-.22);
    camEnd();wipe(lt,dur,[C.paper,C.gold]);
    if(lt>4.15)flash(ease(seg(lt,4.15,5)),C.paper);
  }
  // Audio 104.590–144.590 s. Phrase boundaries use the supplied lyrics and local audio alignment.
  // Each scene keeps its action proportions while its duration follows the music.
  const onPhrase = fn => (t,lt,dur) => fn(t,lt*5/dur,5);
  // The richer edit reuses the cast, painting helpers and hand contacts from this first cut.
  window.QINGTIAN_ART = { C,B,G,box,oval,stroke,cloud,tree,person,hand,plane,rain,umbrella,bench };
  shots([[0,quiet],[7.87,meet],[10.46,shelter],[13.83,wind],[17.23,departure],
    [21.60,reunion],[28.30,farewell],[35.74,release]].map(([start,fn])=>[start,onPhrase(fn)]));
})();
