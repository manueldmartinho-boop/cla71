'use client';
import {cloneElement,useId,useRef,useState,type ReactElement,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
export default function Tooltip({children,content}:{children:ReactElement<{'aria-describedby'?:string}>;content:ReactNode}){
 const ref=useRef<HTMLSpanElement>(null);const id=useId();const [position,setPosition]=useState<{left:number;top?:number;bottom?:number}|null>(null);
 function open(){const box=ref.current?.getBoundingClientRect();if(!box)return;const left=Math.max(12,Math.min(box.left,window.innerWidth-324));setPosition(box.bottom>window.innerHeight-180?{left,bottom:window.innerHeight-box.top+8}:{left,top:box.bottom+8});}
 return <span ref={ref} className="tooltip-anchor" onMouseEnter={open} onMouseLeave={()=>setPosition(null)} onFocus={open} onBlur={()=>setPosition(null)} onKeyDown={e=>{if(e.key==='Escape')setPosition(null);}}>{cloneElement(children,{'aria-describedby':position?id:undefined})}{position&&createPortal(<span id={id} role="tooltip" className="floating-tooltip" style={position}>{content}</span>,document.body)}</span>;
}
