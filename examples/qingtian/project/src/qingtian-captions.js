// Text comes from the user's lyrics. Character timings are derived from the supplied FLAC.
const QFONT = '"Qingtian Brush", "Kaiti SC", serif';
window.EXTRA_FONTS = [[`58px ${QFONT}`, QINGTIAN_LYRICS.map(l=>l.text).join('')+'晴天周杰伦把回忆折成纸飞机']];

window.overlayHook = (c,t) => {
  const line=QINGTIAN_LYRICS.find(l=>t>=l.start-.08&&t<l.end+.07);
  if(line){
    const alpha=ease(seg(t,line.start-.08,line.start+.12))*(1-ease(seg(t,line.end-.03,line.end+.07)));
    c.save();c.globalAlpha=alpha;c.font=`58px ${QFONT}`;c.textAlign='left';c.textBaseline='middle';
    const w=c.measureText(line.text).width,x=(1920-w)/2,y=1010;
    // A warm paper ribbon keeps the lyrics readable without hiding the acting above it.
    c.fillStyle='rgba(244,235,213,.92)';c.beginPath();c.moveTo(x-54,966);c.lineTo(x+w+42,969);
    c.lineTo(x+w+54,1055);c.lineTo(x-45,1050);c.closePath();c.fill();
    c.fillStyle='#4B4B51';c.fillText(line.text,x,y);
    let fill=0;
    for(let i=0;i<line.chars.length;i++){
      const ch=line.chars[i],left=c.measureText(line.text.slice(0,i)).width;
      if(t>=ch.start)fill=left+c.measureText(ch.text).width*clamp((t-ch.start)/Math.max(.05,ch.end-ch.start));
    }
    c.save();c.beginPath();c.rect(x-2,965,fill+2,95);c.clip();c.fillStyle='#A7583B';c.fillText(line.text,x,y);c.restore();c.restore();
  }
  if(t<3.4){
    const a=ease(seg(t,.15,.65))*(1-ease(seg(t,2.7,3.4)));
    title(c,232,230,a,108,false);
  }
  if(t>38.6){
    c.save();c.globalAlpha=ease(seg(t,38.6,39.65));c.fillStyle='#F1E5C9';c.fillRect(0,0,1920,1080);c.restore();
    title(c,960,464,ease(seg(t,38.6,39.4)),140,true);
  }
};
function title(c,x,y,a,size,ending){
  c.save();c.globalAlpha=a;c.textAlign='center';c.textBaseline='middle';c.fillStyle=ending?'#596D66':'#F1E5C9';
  c.font=`${size}px ${QFONT}`;c.fillText('晴天',x,y);
  c.font=`${ending?34:27}px ${QFONT}`;c.fillStyle=ending?'#796F60':'#F1E5C9';
  c.fillText(ending?'把回忆折成纸飞机':'周杰伦',x,y+size*.68);c.restore();
}
