'use client';
import { useEffect, useState } from 'react';
import type { entries } from '@/db/schema';
function submissionDay(timestamp:number){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(timestamp));const part=(key:string)=>parts.find(p=>p.type===key)?.value||'';return `${part('year')}-${part('month')}-${part('day')}`}
function displayDate(date:string){return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'}).format(new Date(`${date}T12:00:00Z`))}
export default function ExpenseHistory({rows,today}:{rows:(typeof entries.$inferSelect)[];today:string}){
 const [currentDay,setCurrentDay]=useState(today),[selected,setSelected]=useState(today);
 useEffect(()=>{const check=()=>{const next=submissionDay(Date.now());if(next!==currentDay){setSelected(previous=>previous===currentDay?next:previous);setCurrentDay(next)}};check();const timer=setInterval(check,30000);return()=>clearInterval(timer)},[currentDay]);
 const visible=rows.filter(row=>submissionDay(row.createdAt)===selected);
 return <section className="panel records expenseHistory"><div className="expenseHistoryHeader"><h2>{selected===currentDay?"Today's submissions":selected?`Submissions for ${displayDate(selected)}`:'Expense submissions'}</h2><label>Review submission date<input type="date" value={selected} max={currentDay} onChange={e=>setSelected(e.target.value)}/></label></div>{selected&&visible.length>0?visible.map(e=><div className="activity" key={e.id}><div><strong>${e.amount?.toFixed(2)} · {e.project||'Expense'}</strong><small>Purchased {e.date}{e.merchant&&<> · {e.merchant}</>}{e.companyCharge&&<> · Company charge account · Bill needs to be entered</>}{e.reimbursement&&<> · Reimbursement requested</>}{e.fileKey&&<> · <a href={`/api/receipt?id=${e.id}`}>Receipt</a></>}</small></div><em>{e.status}</em></div>):<p className="empty">{!selected?'Select a date to review your submissions.':selected===currentDay?'No expenses submitted today.':'No expenses submitted on this date.'}</p>}</section>
}
