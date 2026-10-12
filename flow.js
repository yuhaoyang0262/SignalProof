'use strict';
// Original interactive particle surface; no mathematical data or external assets.
(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const toggle=document.querySelector('.motion-toggle');
 let paused=reduced.matches;
 const surfaces=[];
 class FlowSurface {
  constructor(canvas){
   this.canvas=canvas;this.context=canvas.getContext('2d');if(!this.context)return;
   this.ambient=canvas.dataset.flow==='ambient';this.host=canvas.parentElement;
   this.pointer={x:0,y:0,energy:0};this.target={x:0,y:0,energy:0};this.time=0;this.last=0;this.frame=0;this.visible=false;
   this.tick=this.tick.bind(this);
   this.resize=new ResizeObserver(()=>{this.size();this.draw();});this.resize.observe(this.host);
   this.observer=new IntersectionObserver(([entry])=>{this.visible=entry.isIntersecting;this.sync();},{threshold:0});this.observer.observe(this.host);
   this.host.addEventListener('pointermove',e=>{if(paused||reduced.matches||e.pointerType==='touch')return;const r=this.canvas.getBoundingClientRect();this.target.x=(e.clientX-r.left)/r.width*2-1;this.target.y=(e.clientY-r.top)/r.height*2-1;this.target.energy=1;},{passive:true});
   this.host.addEventListener('pointerleave',()=>{this.target.x=0;this.target.y=0;this.target.energy=0;},{passive:true});
   this.size();this.draw();this.host.classList.add('flow-ready');
  }
  size(){const r=this.ambient?this.canvas.getBoundingClientRect():this.host.getBoundingClientRect();this.width=r.width;this.height=r.height;const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.context.setTransform(dpr,0,0,dpr,0,0);}
  sync(){cancelAnimationFrame(this.frame);this.frame=0;this.last=0;if(this.visible&&!paused&&!document.hidden)this.frame=requestAnimationFrame(this.tick);}
  tick(now){this.frame=0;if(!this.visible||paused||document.hidden)return;if(!this.last)this.last=now;const dt=now-this.last;if(dt>=1000/30){this.time+=Math.min(dt,60)*.00032;this.last=now;this.pointer.x+=(this.target.x-this.pointer.x)*.045;this.pointer.y+=(this.target.y-this.pointer.y)*.065;this.pointer.energy+=(this.target.energy-this.pointer.energy)*.075;this.draw();}this.frame=requestAnimationFrame(this.tick);}
  point(u,v){
   const t=this.time,px=this.pointer.x,py=this.pointer.y;
   const depth=v+.5;
   const crest=Math.sin(u*7.8-t+v*1.3)*.19;
   const fold=Math.cos(u*4.6+t*.45)*v*.23;
   let x=(u*1.14-.07+v*.035*Math.sin(t*.3))*this.width;
   let y=(.51+v*.57+crest+fold+Math.sin(v*5+u*3+t*.6)*.026)*this.height;
   // A local displacement follows the cursor; distant points keep their shape.
   const dx=x-(px+1)*.5*this.width,dy=y-(py+1)*.5*this.height;
   const radius=Math.min(155,this.width*.26),dist=Math.hypot(dx,dy);
   const influence=Math.exp(-(dist*dist)/(radius*radius))*this.pointer.energy;
   const push=24*influence;
   x+=((dx/(dist+14))-.35*dy/(dist+14))*push;
   y+=((dy/(dist+14))+.35*dx/(dist+14))*push-influence*16;
   return {x,y,depth,influence};
  }
  draw(){
   const ctx=this.context,w=this.width,h=this.height;
   if(!w||!h)return;
   ctx.clearRect(0,0,w,h);
   const t=this.time,px=this.pointer.x,py=this.pointer.y;
   // Broad overlapping light fields follow the pointer with inertia.
   const wash=(x,y,r,color,alpha)=>{
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,`rgba(${color},${alpha})`);
    g.addColorStop(.48,`rgba(${color},${alpha*.55})`);
    g.addColorStop(1,`rgba(${color},0)`);
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
   };
   if(this.ambient){
    const r=Math.max(w,h)*.64;
    wash(w*(.17+px*.09+Math.sin(t*.3)*.035),h*(.28+py*.06),r,'189,174,227',.24);
    wash(w*(.83-px*.07),h*(.63+py*.08+Math.cos(t*.24)*.04),r,'243,199,178',.21);
    wash(w*(.55+px*.06),h*(.04-py*.04),r*.7,'175,218,215',.19);
    return;
   }
   // Keep the substrate quiet so the individual grains stay clearly visible.
   wash(w*.08,h*.18,w*.64,'181,170,220',.18);
   wash(w*.92,h*.86,w*.58,'239,191,170',.2);
   const cols=Math.min(180,Math.max(72,Math.round(w/7)));
   const rows=w<500?40:58;
   for(let row=0;row<rows;row++){
    const v=row/(rows-1)-.5;
    // Sparse, hairline connections reveal curvature without filling the surface.
    if(row%5===0){
     ctx.beginPath();
     for(let col=0;col<=cols;col++){
      const p=this.point(col/cols,v);
      if(col===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
     }
     ctx.strokeStyle='rgba(104,80,143,.075)';ctx.lineWidth=.5;ctx.stroke();
    }
    for(let col=0;col<=cols;col++){
     const u=(col+(row%2)*.35)/cols;
     const p=this.point(u,v);
     const edge=Math.pow(Math.max(0,Math.sin(Math.min(1,u)*Math.PI)),.4);
     const grain=.5+.5*Math.sin(col*12.9898+row*78.233);
     const shimmer=.5+.5*Math.sin(u*8-v*4-this.time*.8);
     const alpha=(.26+p.depth*.36+grain*.12+shimmer*.08)*edge;
     const r=.55+p.depth*.56+grain*.26+p.influence*.23;
     ctx.fillStyle=`rgba(${row%7===0?'127,93,145':'93,70,133'},${alpha})`;
     ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
    }
   }
   // A few travelling grains give a visible sense of direction.
   for(let i=0;i<18;i++){
    const u=(i*.137+this.time*.036)%1,p=this.point(u,Math.sin(i*2.4)*.44);
    ctx.fillStyle='rgba(114,81,157,.8)';ctx.beginPath();ctx.arc(p.x,p.y,1.7,0,Math.PI*2);ctx.fill();
   }
  }
 }
 document.querySelectorAll('[data-flow]').forEach(canvas=>{const s=new FlowSurface(canvas);if(s.context)surfaces.push(s);});
 function updateToggle(){if(!toggle)return;toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'播放背景动画':'暂停背景动画');toggle.innerHTML=paused?'播放动画 <span aria-hidden="true">▷</span>':'暂停动画 <span aria-hidden="true">Ⅱ</span>';}
 toggle?.addEventListener('click',()=>{paused=!paused;surfaces.forEach(s=>s.sync());updateToggle();});
 reduced.addEventListener('change',()=>{paused=reduced.matches;surfaces.forEach(s=>s.sync());updateToggle();});
 document.addEventListener('visibilitychange',()=>surfaces.forEach(s=>s.sync()));
 window.addEventListener('resize',()=>surfaces.forEach(s=>{s.size();s.draw();}));
 window.addEventListener('pagehide',()=>surfaces.forEach(s=>{cancelAnimationFrame(s.frame);s.frame=0;}));
 window.addEventListener('pageshow',()=>surfaces.forEach(s=>s.sync()));
 updateToggle();
})();
