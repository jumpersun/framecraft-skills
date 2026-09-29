// Painted sets are baked once at full resolution. Live layers supply movement and parallax.
(() => {
  const {C,box,oval,stroke,cloud,tree,bench}=QINGTIAN_ART;
  const poly=(pts,col,sw=.6)=>paint(pts,{wash:col,ink:sw?PAL.ink:null,sw});
  const wash=(pts,col,alpha=145)=>paint(pts,{fill:col,fillOp:alpha,bleed:.25,tex:.65,ink:null});
  function sky(top='#A9CBD1',low='#E9DCB9'){
    box(-100,-100,2200,1400,top,0);wash(ellPts(1000,730,1550,430,32,9),low,205);
    for(let i=0;i<4;i++)cloud(120+i*560,150+(i%2)*95,300,68,C.paper,0,'set-cloud'+i);
  }
  function skyline(y=680,col='#9BABA7',scale=1){
    for(let i=0;i<12;i++){
      boilSeed('skyline'+i);const x=i*185-90,h=(95+hash(i+2)*160)*scale;
      box(x,y-h,160,h,col,0);
      if(i%3===0)poly([[x-12,y-h],[x+79,y-h-58*scale],[x+172,y-h]],col,0);
      for(let j=0;j<2;j++)for(let k=0;k<3;k++)box(x+24+k*42,y-h+26+j*48,16,22,'#C9C8AC',0);
    }
  }
  function water(y=650,warm=false){
    box(-100,y,2200,700,warm?'#A9B3A2':'#95B7BE',0);
    for(let i=0;i<40;i++){
      boilSeed('water'+i);const x=hash(i+44)*1950,yy=y+hash(i+61)*420;
      stroke([[x,yy],[x+50+hash(i+23)*110,yy-2]],.4,i%3?'#CCD7C5':'#809FAD');
    }
  }
  function lamp(x,y,s=1,lit=false){
    stroke([[x,y],[x,y-360*s],[x+35*s,y-397*s],[x+80*s,y-390*s]],3*s,C.teal);
    poly([[x+51*s,y-392*s],[x+104*s,y-392*s],[x+97*s,y-359*s],[x+59*s,y-359*s]],lit?'#F1D694':'#BBC5B7',.7);
    if(lit)glow(x+78*s,y-369*s,100*s,'#FFD98C',.65);
  }
  function pot(x,y,s=1){
    poly([[x-45*s,y-75*s],[x+45*s,y-75*s],[x+31*s,y],[x-31*s,y]],'#A57E68',.8);
    for(let i=0;i<6;i++){
      const a=-2.7+i*.46;
      stroke([[x,y-70*s],[x+Math.cos(a)*75*s,y-180*s+Math.sin(a)*55*s]],1.4*s,'#697E69');
      paint(ellPts(x+Math.cos(a)*68*s,y-177*s+Math.sin(a)*45*s,27*s,12*s,14,1,a),{wash:i%2?'#91A784':'#718F78',ink:PAL.ink,sw:.35});
    }
  }
  function room(){
    sky('#BDCFC6','#ECE0B6');skyline(655,'#B2BCAD',.72);
    box(-80,-80,490,1320,'#718B86',0);box(1700,-80,360,1320,'#CDBA9A',0);
    box(390,-30,60,770,'#8C8C72',.7);box(1650,-30,70,790,'#8C8C72',.7);
    box(420,684,1290,40,'#B59E7C',.7);box(990,-10,25,694,'#ACA98B',.5);
    stroke([[427,267],[1660,267]],2,'#8C8C72');
    box(-90,746,2150,410,'#AF9277',.8);
    for(let j=0;j<6;j++)stroke([[-30,790+j*55],[890,792+j*51],[1940,779+j*57]],.45,'#90765F');
    box(82,274,250,34,'#B4A285',.8);
    for(let i=0;i<5;i++){boilSeed('books'+i);box(108+i*34,151-i%2*24,27,121+i%2*24,['#C7A684','#88A59B','#C28F82'][i%3],.5);}
    pot(1550,802,1.25);
    poly([[230,918],[580,884],[1000,924],[970,1080],[290,1080]],'#EBDCBC',.8);
    stroke([[618,912],[628,1070]],1,'#AA9B81');
    for(let j=0;j<4;j++)stroke([[340,962+j*28],[540,943+j*28]],.3,'#B9B6A0');
    box(1045,828,136,45,'#627F7B',.6);box(1056,794,120,32,'#D0B087',.6);
  }
  function windowClose(){
    sky('#879FAA','#C4C8B6');skyline(850,'#758C94',1.3);
    wash(ellPts(1040,500,730,650,35,8),'#BCD7D3',130);
    box(-40,-50,126,1260,'#566F70',0);box(1820,-50,140,1260,'#566F70',0);
    box(1180,-50,38,1300,'#809A95',.7);box(30,773,1850,28,'#879E95',.6);
    stroke([[160,30],[1520,860]],.6,'#DAE5CE');stroke([[350,0],[1690,840]],.45,'#DAE5CE');
  }
  function rainStreet(){
    sky('#8BA3AB','#BDC1AF');skyline(685,'#8F9C9C',1.1);
    box(20,122,648,630,'#C0AC95',.9);box(72,291,252,402,'#527975',.8);
    box(374,289,243,278,'#91ACAA',.7);stroke([[390,312],[580,534]],.5,C.paper);
    box(-30,181,730,54,'#637E73',1);
    for(let i=0;i<9;i++)poly([[-35+i*82,228],[47+i*82,228],[70+i*82,294],[-52+i*82,294]],i%2?'#CAB991':'#8F9E83',.5);
    box(-50,728,2100,460,'#AAB3AF',0);
    for(let j=0;j<5;j++)stroke([[-30,795+j*57],[1970,783+j*62]],.4,'#8A9C9C');
    lamp(1720,820,1.2,true);pot(198,749,1.35);pot(486,743,.92);
    for(let i=0;i<5;i++){boilSeed('street-puddle'+i);oval(200+i*375,899+(i%2)*38,170,13,'#B9D0CE');}
    stroke([[714,100],[1850,262]],1,'#708985');
    for(let i=0;i<7;i++)poly([[812+i*132,119+i*12],[860+i*132,125+i*12],[836+i*132,172+i*12]],'#CDB799',.4);
  }
  function avenue(){
    sky('#8FA5AD','#BCBCA9');skyline(570,'#9FABA6',.9);
    poly([[770,522],[1120,522],[2200,1180],[-300,1180]],'#A8B6AF',0);
    poly([[-150,523],[720,523],[170,1170],[-200,1170]],'#95A08A',0);
    poly([[1180,523],[2100,523],[2200,1170],[1840,1170]],'#96A08B',0);
    for(let i=0;i<5;i++){
      const k=i/4,y=590+k*395;stroke([[950-k*17,y],[986+k*17,y]],4+k*5,'#D8D2B6');
      tree(755-k*730,590+k*480,0,.5,.35+k*.93);tree(1190+k*630,580+k*470,0,.5,.34+k*.93);
    }
    stroke([[0,230],[550,387],[944,445],[1510,351],[1940,210]],1,'#717E79');
    lamp(1530,860,.9);lamp(1290,665,.46);
  }
  function station(){
    sky('#88A0A9','#B7BAB0');skyline(685,'#859B9D',1.05);
    box(-100,710,2200,570,'#889DA4',0);box(-100,697,2200,74,'#C9C6AF',.6);
    for(let i=0;i<9;i++)box(i*260,920,130,14,'#D2C9AB',0);
    poly([[-60,138],[885,138],[1040,246],[-50,246]],'#6B7C72',1.5);
    for(const x of [62,881])box(x,235,33,547,'#627C78',.9);
    box(178,379,185,223,'#B8C4B6',.6);for(let i=0;i<6;i++)stroke([[206,422+i*23],[321,422+i*23]],.5,'#8E9D90');
    bench(560,786);oval(515,196,47,47,'#EBDEC0',1);stroke([[515,164],[515,196],[540,210]],1.5);
    lamp(1730,797,1.2,true);box(228,686,73,108,'#A77E68',.9);stroke([[244,686],[244,670],[282,670],[282,686]],1.2);
  }
  function busInside(){
    sky('#9FB8B9','#C3C5AC');skyline(790,'#809E9E',1.55);
    box(-100,-90,2200,185,'#577A76',0);box(-100,795,2200,405,'#79978A',0);
    box(53,45,70,876,'#476E6D',1);box(1540,45,61,876,'#476E6D',1);
    box(72,78,1510,22,'#D3CDB2',.8);box(70,802,1500,40,'#D3CDB2',.8);
    paint(rrPts(1640,555,400,555,62,1),{wash:'#AA8975',ink:PAL.ink,sw:1.2});
    box(1644,861,360,57,'#715F59',.8);stroke([[1678,910],[1689,1100]],4,'#6C7770');
    stroke([[112,134],[1495,700]],.6,'#CEDBD0');
  }
  function bridge(){
    sky('#B7C9BC','#EDD0A3');oval(1410,344,99,99,'#E8C081');skyline(647,'#B1B5A2',.65);water(650,true);
    wash(ellPts(1440,878,350,165,24,9),'#E8CDA2',110);
    poly([[-70,854],[1980,743],[1980,1000],[-70,1070]],'#B9A581',.9);
    for(let i=0;i<12;i++){
      const x=i*178-40,y=796-x*.055;stroke([[x,y],[x,y+110]],2.4,'#817E68');
    }
    stroke([[-80,799],[2000,685]],4,'#829480');stroke([[-80,916],[2000,803]],3,'#8B8C70');
    tree(-40,882,0,0,1.6);tree(1840,793,0,0,1.05);
    poly([[256,704],[472,704],[422,729],[293,729]],'#93775F',.7);stroke([[354,704],[354,613]],1.1);poly([[359,620],[425,697],[359,697]],'#E7D8B5',.4);
  }
  function picnic(){
    sky('#CDD0B6','#E8C4A1');skyline(625,'#B5B7A4',.62);water(647,true);
    poly([[-100,720],[520,790],[1220,809],[2030,699],[2030,1260],[-100,1260]],'#AAB18C',0);
    tree(110,920,0,0,1.8);tree(1790,935,0,0,1.7);
    poly([[482,812],[1340,788],[1590,1088],[260,1088]],'#D3B08E',1);
    for(let i=0;i<8;i++)stroke([[471+i*121,812],[278+i*180,1090]],1.8,'#E8D6B0');
    for(let i=0;i<6;i++)stroke([[470-i*37,814+i*49],[1347+i*44,789+i*59]],1.8,'#ECE0C0');
    for(let i=0;i<17;i++){boilSeed('picnic-flower'+i);const x=80+hash(i+3)*1770,y=840+hash(i+8)*160;stroke([[x,y],[x,y-24]],.6,'#738A6D');oval(x,y-29,7,7,i%2?'#E6CF8E':'#C89189');}
  }
  function platform(){
    sky('#6D8298','#CAAAA4');skyline(632,'#637C88',.8);
    box(-100,653,2200,530,'#969FA0',0);box(-100,838,2200,75,'#C9B694',0);
    poly([[-130,920],[2030,814],[2030,1140],[-130,1170]],'#747F86',0);
    for(let i=0;i<2;i++)stroke([[-100,980+i*79],[2040,870+i*79]],5,'#B8BFB6');
    poly([[-80,78],[1570,78],[1900,215],[-100,215]],'#57726F',1.3);
    for(const x of [120,1520])box(x,210,31,645,'#526D6B',.8);
    for(const x of [370,850,1280]){
      stroke([[x,177],[x,264]],1.5,'#6A7D72');poly([[x-38,256],[x+38,256],[x+26,299],[x-26,299]],'#D4BD8E',.8);
    }
    bench(385,805);pot(1629,836,.9);
    box(966,339,350,209,'#B5C1B0',.7);for(let j=0;j<4;j++)stroke([[996,391+j*29],[1283,391+j*29]],.55,'#8E9C8D');
    oval(736,209,55,55,'#DECDB1',1);stroke([[736,171],[736,209],[765,227]],1.8);
  }
  function roof(){
    sky('#A8CAD0','#F0DCA7');skyline(840,'#9BB5B2',1.1);
    wash(ellPts(1420,610,500,290,30,5),'#D7E5CE',130);
    poly([[710,774],[1150,774],[1580,1200],[550,1200]],'#92B6B7',0);
    for(let i=0;i<5;i++)stroke([[910+i*53,859],[969+i*52,882]],.8,'#D0D9BD');
    box(-90,883,2120,285,'#B8AF94',0);
    for(let i=0;i<11;i++)box(i*188+5,703,15,209,'#799389',.5);
    box(-70,697,2070,27,'#82988B',.7);box(-70,868,2070,29,'#819489',.7);
    box(1580,862,295,142,'#AD9678',.9);pot(1725,869,.95);
  }
  const envs={window:windowClose,room,street:rainStreet,avenue,station,bus:busInside,bridge,picnic,platform,roof};
  window.QINGTIAN_SETS=envs;
  const images={};
  window.prepareSceneAssets=async()=>{
    if(location.search.includes('bake'))return;
    await Promise.all(Object.keys(envs).map(async key=>{images[key]=await loadImage(`assets/rich/${key}.png`);}));
  };
  window.QINGTIAN_WORLD={...QINGTIAN_ART,poly,wash,sky,water,skyline,lamp,pot,
    background:key=>{if(images[key])image(images[key],0,0,W,H);else envs[key]();}};
})();
