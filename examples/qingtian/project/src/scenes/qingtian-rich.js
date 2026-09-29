// The second cut changes places, shot sizes and points of view while keeping the same song segment.
(() => {
  const {C,B,G,box,oval,stroke,cloud,person,hand,plane,rain,umbrella,poly,wash,background,pot}=QINGTIAN_WORLD;
  function stage(key,t,z=1.06,cx=960,cy=540){camBegin(cx,cy,z);background(key);}
  function drops(t,amount=1,count=18){
    for(let i=0;i<count;i++){
      const x=110+hash(i+143)*1700,y=frac(hash(i+31)+t*(.036+hash(i+74)*.014))*1000-60;
      boilSeed('glass-drop'+i);const r=10+hash(i+35)*15;
      paint(ellPts(x,y,r,r*(1.5+hash(i)*2),18,.5),{fill:'#D4E2D7',fillOp:65*amount,ink:null});
      stroke([[x-r*.45,y-r],[x-r*.65,y+r*.2]],.6*amount,'#E3EACF');
      stroke([[x,y-r*3.5],[x+2,y-r*2]],.25*amount,'#B9CEC9');
    }
  }
  function leaves(t,strong=false){
    const n=strong?22:9;
    for(let i=0;i<n;i++){
      boilSeed('loose-leaf'+i);const k=frac(t*(strong?.27:.045)+hash(i+76));
      const x=2050-k*2250,y=190+hash(i+14)*640+Math.sin(k*TAU*2+i)*80;
      paint(ellPts(x,y,15+hash(i)*16,5+hash(i+1)*5,12,1,k*8+i),{wash:i%3?'#A9A372':'#C5A06F',ink:PAL.ink,sw:.4});
    }
  }
  function lightBeam(k){
    if(k<.01)return;boilSeed('sun-beam');
    paint([[1220,-100],[1430,-100],[660,960],[100,1080]],{fill:'#EAD7A2',fillOp:85*k,bleed:.2,tex:.35,ink:null});
    glow(1320,250,420,'#FFE3AC',k*.3);
  }
  function curtain(t,opening=1){
    boilSeed('curtain');const edge=1390+opening*260;
    const pts=[[1770,-60],[1950,-60],[1950,935],[edge+50,867],[edge-45+Math.sin(t)*30,489],[edge,120]];
    paint(pts,{wash:'#E1D1AD',fill:'#F0DFC2',fillOp:75,ink:PAL.ink,sw:.7});
    for(let i=0;i<4;i++)stroke([[1803+i*43,-20],[edge+60+i*48,770]],.4,'#B6B093');
  }
  function ripple(t,y=760){
    for(let i=0;i<7;i++){
      boilSeed('river-ripple'+i);const x=450+i*170+Math.sin(t+i)*12;
      stroke([[x,y+i%3*27],[x+80+Math.sin(t*1.3+i)*22,y+i%3*27]],.5,'#E4DCBD');
    }
  }
  function windowRain(t,lt,dur){
    stage('window',t,1.03+.015*lt,958,535);drops(t,1-ease(seg(lt,1.35,2.3))*.7,28);
    const k=ease(seg(lt,.35,2.1));glow(1460,270,530,'#F9DBA3',k*.72);
    // One large moving droplet leads the eye toward the window opening.
    boilSeed('hero-drop');const y=290+ease(seg(lt,.2,2.2))*350;
    paint([[1150,y-114],[1126,y-52],[1093,y+21],[1106,y+70],[1150,y+93],[1196,y+66],[1208,y+20],[1175,y-52]],
      {fill:'#BCD8CF',fillOp:115,ink:'#DCE7D3',sw:.65});
    stroke([[1126,y-21],[1114,y+22],[1121,y+50]],1.1,'#F2E8CA');camEnd();
    if(lt<.4)flash(1-ease(lt/.4),C.paper);
  }
  function roomWide(t,lt,dur){
    stage('room',t,1.025+lt*.012,940+lt*9,540);curtain(t,ease(lt/dur));
    const mood=emotions(lt,[[0,'sad'],[.65,'thinking'],[1.5,'hopeful']]);
    person('boy',755,844,38,t,'sad',{...mood,rot:0,sq:0,dy:0,noLegs:true,noShadow:true,lookY:lerp(.5,-.7,ease(seg(lt,.5,1.6))),aR:-.35,aL:-.6});
    // The desk edge masks the lower torso, so the character reads as seated at the window.
    box(370,786,790,49,'#B49878',.7);plane(979,784,.9,-.12);
    lightBeam(.45+.45*lt/dur);camEnd();
  }
  function faceHope(t,lt,dur){
    stage('room',t,1.09,970,542);curtain(t,1);
    const mood=emotions(lt,[[0,'thinking'],[1.15,'hopeful'],[2.25,'happy']]);
    person('boy',815,1000,70,t,'hopeful',{...mood,rot:0,sq:0,dy:0,aR:-.15,aL:-.55,lookY:lerp(-.65,-.1,ease(seg(lt,1,2))),lookX:.45,noShadow:true});
    const h=hand(815,1000,70,-.15);plane(h[0]-15,h[1],1.13,-.18);
    lightBeam(.8);glow(1330,310,390,'#FFE4AB',.37);camEnd();
  }
  function photo(x,y,w,h,rot,kind,age,t){
    push();translate(x,y);rotate(rot);boilSeed('photo'+kind);
    paint(rectPts(-w/2+13,-h/2+20,w,h,3),{fill:'#8D826F',fillOp:50,ink:null});
    box(-w/2,-h/2,w,h,C.paper,.75);box(-w/2+24,-h/2+24,w-48,h-91,kind===1?'#A5BBB9':'#BDCEB0',0);
    oval(w*.22,-h*.21,35,35,'#E4CB8B');
    stroke([[-w/2+30,h*.09],[w/2-30,h*.09]],.6,'#91A28D');
    if(kind===0){
      person('boy',-100,h*.22,15,t,'shy',{aR:.4,lookX:.8});person('girl',103,h*.22,15,t,'happy',{aL:.4,lookX:-.8});
      plane(0,h*.11,.37,-.1);
    }else if(kind===1){
      person('boy',-95,h*.22,17,t,'happy',{aR:.4});person('girl',100,h*.22,16,t,'happy',{aL:.4});
      umbrella(0,-h*.11,.75,1,140);
    }else{
      person('boy',-80,h*.22,15,t,'happy',{view:'side',walk:age*1.1});person('girl',70,h*.22,15,t,'happy',{view:'q',walk:age*1.1+.5});
    }
    box(-w*.17,-h*.55,w*.33,39,'#D1BA8E',0);
    paint(heartPts(0,h*.405,16),{wash:'#C48C7B',ink:null});pop();
  }
  function memories(t,lt,dur){
    boilSeed('album-table');box(-100,-100,2200,1400,'#B59B7C',0);
    for(let i=0;i<6;i++)stroke([[-50,100+i*190],[2000,80+i*187]],.4,'#947D66');
    camBegin(960,550,1+lt*.024,-.012);
    poly([[190,178],[937,132],[984,159],[1770,194],[1725,964],[977,929],[928,958],[174,922]],'#E8D9B4',.9);
    stroke([[952,178],[958,915]],1,'#B0A086');
    const a=easeOut(seg(lt,0,.5)),b=easeOut(seg(lt,.35,.95)),c=easeOut(seg(lt,.7,1.3));
    photo(469,590+(1-a)*360,445,520,-.14,0,lt,t);
    photo(984,476+(1-b)*440,492,571,.055,1,lt,t);
    photo(1480,592+(1-c)*490,431,500,.16,2,lt,t);
    // A pressed flower and loose string make the memory table feel handled and lived in.
    boilSeed('pressed-flower');stroke([[173,740],[265,450]],1.5,'#879075');
    for(let i=0;i<5;i++)oval(261+Math.cos(i*TAU/5)*24,457+Math.sin(i*TAU/5)*24,22,13,'#D5B18E',.35);
    oval(261,457,13,13,'#BB9770');camEnd();
  }
  function streetCare(t,lt,dur){
    stage('street',t,1.04+lt*.008,976,542);
    const k=ease(seg(lt,.4,1.8)),x=lerp(1410,1294,k);
    person('boy',825,918,39,t,'determined',{aR:-.28,aL:-.6,lookX:.7,dy:0,sq:0,rot:0});
    person('girl',x,918,36,t,'relieved',{view:'q',flip:true,walk:k*2.6,lookX:-.8});
    const h=hand(825,918,39,-.28);umbrella(h[0],h[1]-333,1.8,ease(seg(lt,.05,.75)),185);
    camEnd();rain(t,.85);drops(t,.6,8);
  }
  function windDistance(t,lt,dur){
    stage('avenue',t,1.09-lt*.012,960,526);
    const k=ease(seg(lt,.3,dur-.3));
    person('boy',lerp(727,559,k),936,39,t,'sad',{lookX:.8,aR:.4,rot:-.1*k,dy:0});
    person('girl',lerp(1190,1590,k),lerp(903,707,k),lerp(36,20,k),t,'sad',{aL:.6,lookX:-.8,rot:.09*k,dy:0});
    plane(lerp(980,264,k),677-120*Math.sin(k*Math.PI),.8-k*.22,-k*.7);leaves(t,true);camEnd();
    for(let i=0;i<3;i++){boilSeed('gust'+i);stroke([[200,310+i*180],[800+Math.sin(lt+i)*60,240+i*170],[1720,279+i*175]],.5,'#D4D4B7');}
  }
  function busBody(x,y,s,t){
    push();translate(x,y);scale(s);boilSeed('rich-bus');
    for(const xx of [120,760])oval(xx,465,65,65,C.dark,.8);
    paint(rrPts(0,0,990,440,35,2),{wash:'#617F77',fill:'#A4B59E',fillOp:55,ink:PAL.ink,sw:1.1});
    for(let j=0;j<3;j++)box(50+j*306,48,262,238,'#ACC3BE',.7);
    person('girl',494,301,25,t,'sad',{aL:.78+.12*Math.sin(t*4),lookX:-.8});
    box(355,264,263,29,'#6F8C7B',0);box(6,359,977,24,'#D8BD82',.6);
    stroke([[395,74],[572,241]],.5,'#D4DDC6');pop();
  }
  function stationDeparture(t,lt,dur){
    stage('station',t,1.025,960+lt*14,547);
    const k=ease(seg(lt,.25,dur));busBody(760+k*1140,290,1.12,t);
    person('boy',477,842,35,t,'sad',{aR:lerp(.75,-.4,k),aL:-.35,lookX:.9,rot:0,dy:0,sq:0});
    const h=hand(477,842,35,-.35,-1);plane(h[0],h[1],.7,-.1);camEnd();rain(t,.55);
  }
  function busWindow(t,lt,dur){
    stage('bus',t,1.04,974,533);
    for(let i=0;i<5;i++){
      const x=(((i*470-lt*410)%2300)+2300)%2300-190;
      boilSeed('passing-tree'+i);stroke([[x,781],[x,222]],5,'#76928C');
      cloud(x,263,165,162,'#92A894',t,'passing-tree-top'+i);
    }
    // Looking out through the glass changes whose separation the viewer experiences.
    person('boy',lerp(408,74,ease(lt/dur)),763,lerp(20,9,ease(lt/dur)),t,'sad',{aR:.7,lookX:.6});
    person('girl',1130,960,67,t,'sad',{view:'q',flip:true,aL:.95,aR:-.6,lookX:-.7,rot:0,dy:0,sq:0,noShadow:true,noLegs:true});
    box(72,802,1500,43,'#B9B998',.7);camEnd();drops(t,.9,22);
    box(49,0,62,1080,'#527B75',.8);box(1575,0,62,1080,'#527B75',.8);
  }
  function bridgeMeeting(t,lt,dur){
    stage('bridge',t,1.045+lt*.013,944+lt*13,553);
    const k=ease(seg(lt,.1,1.9)),x=lerp(236,758,k);
    person('boy',x,907,34,t,lt<1.65?'determined':'happy',{aR:0,aL:-.35,walk:lt<1.85?lt*1.7:0,rot:0,dy:0,sq:0,lookX:.7});
    person('girl',1241,907,34,t,'happy',{aL:lerp(.65,0,ease(seg(lt,1.3,2.1))),aR:-.3,rot:0,dy:0,sq:0,lookX:-.7});
    const h=hand(x,907,34,0);plane(h[0],h[1]-8,.73,-.1);ripple(t,701);camEnd();
    leaves(t,false);
  }
  function cup(x,y,t,col){
    boilSeed('cup'+col);poly([[x-32,y-80],[x+32,y-80],[x+25,y],[x-24,y]],col,.8);
    oval(x,y-79,34,8,'#E3D7B7',.7);stroke([[x+7,y-70],[x+13,y-128]],1.5,'#C1B184');
  }
  function picnicDay(t,lt,dur){
    stage('picnic',t,1.055,956+Math.sin(lt*.35)*14,545);
    const day=ease(seg(lt,.5,dur));
    boilSeed('picnic-sunset');oval(1220,180+day*440,77,77,'#E9BB7D');
    glow(1220,180+day*440,205,'#F4C27F',.55);
    for(const [who,x,u] of [['boy',610,38],['girl',1280,37]]){
      person(who,x,936,u,t,'happy',{aR:who==='boy'?.35:-.5,aL:who==='girl'?.35:-.5,noLegs:true,noShadow:true,rot:0,dy:0,sq:0,lookX:who==='boy'?.6:-.6});
      for(const dx of [-u*2.8,u*2.1]){boilSeed(who+'picnic-foot'+dx);poly([[x+dx,860],[x+dx+36,860],[x+dx+48,917],[x+dx+2,921]],who==='boy'?B.dk:G.dk,.8);}
    }
    const hb=hand(610,936,38,.35),hg=hand(1280,936,37,.35,-1);
    cup(hb[0],hb[1]+40,t,'#B89472');cup(hg[0],hg[1]+40,t,'#C6988A');
    plane(963,864,.71,-.06);box(1018,858,91,57,'#738B7E',.9);oval(1063,885,19,19,'#C6C7AD',.8);
    ripple(t,702);camEnd();
    if(day>.1){boilSeed('evening-glaze');paint(rectPts(-10,-10,1940,1100),{fill:'#CE9A83',fillOp:day*34,ink:null});}
    leaves(t,false);
  }
  function handsApart(t,lt,dur){
    stage('picnic',t,1.13,960,490);glow(1240,312,560,'#F5CEA3',.4);
    const k=ease(seg(lt,.4,2.7));
    // Crop both torsos out so the hands and the widening gap carry this close-up.
    boilSeed('macro-bodies');
    poly([[-100,506],[865,531],[965,591],[925,676],[-100,634]],B.col,1.7);
    poly([[2020,530],[lerp(1080,1450,k),546],[lerp(1010,1430,k),617],[lerp(1060,1460,k),679],[2020,665]],G.col,1.7);
    plane(965,558,1.57,-.08);
    const p=ease(seg(lt,.9,2.9));boilSeed('macro-petal');paint(ellPts(1151-p*102,485+p*366,25,13,16,1,p*6),{wash:'#ECCFA0',ink:PAL.ink,sw:.55});
    camEnd();
  }
  function platformGoodbye(t,lt,dur){
    stage('platform',t,1.06+lt*.009,944,548);
    for(const [i,x] of [370,850,1280].entries())glow(x,291,130,'#FFD99A',ease(seg(lt,i*.32,.75+i*.32))*.65);
    const bye=ease(seg(t,33.8,34.5)),leave=ease(seg(t,35,35.8));
    person('boy',735,836,43,t,'sad',{aR:.1,aL:-.5,lookX:.75,rot:0,sq:0,dy:0});
    person('girl',lerp(1328,1650,leave),836,43,t,'sad',{aL:.05+bye*(.8+.16*Math.sin(t*10)),aR:-.5,lookX:-.75,walk:leave*3,rot:0,sq:0,dy:0});
    const h=hand(735,836,43,.1);plane(h[0],h[1],.88,-.1);
    camEnd();
    // A near platform post passes independently of the characters and the far skyline.
    const x=-70+lt*24;box(x,0,48,953,'#5F7671',.8);
  }
  function roofRelease(t,lt,dur){
    const k=ease(seg(lt,1.0,3.2));stage('roof',t,1.09+lt*.012,960+lt*7,550-k*47);
    const a=lt<1.5?lerp(.05,1.25,ease(seg(lt,.3,1.2))):lerp(1.25,.4,ease(seg(lt,1.8,3.1)));
    person('boy',548,928,40,t,'hopeful',{aR:a,lookX:.8,lookY:-.7,rot:0,dy:0,sq:0});
    const h=hand(548,928,40,lt<1.2?a:1.25),fly=ease(seg(lt,1.2,3.7));
    plane(lerp(h[0],1680,fly),lerp(h[1],118,fly)-142*Math.sin(fly*Math.PI),lerp(1,.35,fly),-.23);
    glow(1455,235,340,'#FFE7AF',.4);camEnd();
    for(let i=0;i<3;i++){boilSeed('birds'+i);const x=1420+i*140+lt*17,y=246+i*56;stroke([[x-12,y],[x,y-9],[x+12,y]],.75,'#829A95');}
  }
  const transitions=[[2.4,'light'],[4.7,'match'],[7.87,'page'],[10.46,'light'],[13.83,'page'],
    [17.23,'post'],[19.48,'post'],[21.6,'light'],[24.4,'light'],[28.3,'match'],[31.3,'light'],[35.74,'light']];
  function transition(t){
    for(const [at,kind] of transitions){
      const d=t-at;if(Math.abs(d)>.16||kind==='match')continue;
      boilSeed('rich-transition'+at);
      if(kind==='light')flash(1-Math.abs(d)/.16,C.paper);
      else if(kind==='page')brushWipe(seg(t,at-.16,at+.16),[C.paper,C.wall]);
      else {const x=lerp(-2100,1950,seg(t,at-.16,at+.16));box(x,-90,2130,1260,'#627E74',0);}
    }
  }
  const film=[[0,windowRain],[2.4,roomWide],[4.7,faceHope],[7.87,memories],[10.46,streetCare],
    [13.83,windDistance],[17.23,stationDeparture],[19.48,busWindow],[21.6,bridgeMeeting],
    [24.4,picnicDay],[28.3,handsApart],[31.3,platformGoodbye],[35.74,roofRelease]];
  SHOTS.length=0;
  shots(film.map(([start,fn])=>[start,(t,lt,dur)=>{fn(t,lt,dur);transition(t);} ]));
})();
