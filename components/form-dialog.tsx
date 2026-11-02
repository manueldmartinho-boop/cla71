'use client';
import {useEffect,useRef,type ReactNode} from 'react';
export default function FormDialog({open,title,onClose,children}:{open:boolean;title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(open){if(!ref.current?.open)ref.current?.showModal();}else ref.current?.close();},[open]);
 return <dialog ref={ref} className="form-dialog" aria-label={title} onCancel={onClose}>{open&&children}</dialog>;
}
