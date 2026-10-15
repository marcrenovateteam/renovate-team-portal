'use client';
import { useActionState, useState } from 'react';
import { reviewSubmission } from './admin-review-actions';
import PtoDecision from './pto-decision';
type Entry={id:string;ownerId:string;kind:string;date:string;endDate:string|null;status:string;hours:number|null;project:string|null;taskType:string|null;billingType:string|null;amount:number|null;merchant:string|null;note:string|null;fileKey:string|null;reimbursement:boolean;companyCharge:boolean};
type Group={key:string;ownerId:string;employee:string;kind:string;date:string;status:string;rows:Entry[]};
function Controls({ids,status,kind}:{ids:string[];status:string;kind:string}){
 const [state,action,pending]=useActionState(reviewSubmission,{error:''});
 const [confirm,setConfirm]=useState(false);
 return <div><form action={action} className="entryFormActions"><input type="hidden" name="ids" value={ids.join(',')}/>
 {status==='submitted'&&kind!=='pto'&&<button className="secondary" name="action" value="approve" disabled={pending}>Approve & archive</button>}
 {status==='archived'&&<button className="secondary" name="action" value="reopen" disabled={pending}>Reopen for correction</button>}
 {status==='deleted'?<button className="secondary" name="action" value="restore" disabled={pending}>Restore</button>:confirm?<><button name="action" value="delete" disabled={pending}>Confirm delete</button><button type="button" onClick={()=>setConfirm(false)}>Cancel</button></>:<button type="button" className="textButton" onClick={()=>setConfirm(true)}>Delete…</button>}
 </form>{state.error&&<p role="alert" className="timeWarning">{state.error}</p>}</div>;
}
export default function AdminSubmissions({groups}:{groups:Group[]}){
 const [tab,setTab]=useState('submitted');const [employee,setEmployee]=useState('all');
 const employees=Array.from(new Set(groups.map(g=>g.employee))).sort();const filtered=groups.filter(g=>g.status===tab&&(employee==='all'||g.employee===employee));
 return <section className="panel adminPanel"><h2>Submissions</h2><div className="entryFormActions">{[['submitted','Pending review'],['archived','Employee archives'],['deleted','Deleted records'],['declined','Denied PTO']].map(([value,label])=><button type="button" key={value} className={tab===value?'primary':'secondary'} onClick={()=>setTab(value)}>{label} ({groups.filter(g=>g.status===value).length})</button>)}</div>
 <label>Employee <select value={employee} onChange={e=>setEmployee(e.target.value)}><option value="all">All employees</option>{employees.map(name=><option key={name}>{name}</option>)}</select></label>
 {filtered.map(g=><div className="adminEntry" key={g.key}><div className="adminRow"><div><strong>{g.employee} · {g.kind==='time'?'Daily timesheet':g.kind}</strong><small>{g.date} · {g.status}</small></div></div>
 {g.kind==='time'?<><div>{g.rows.map(r=><p key={r.id}>{r.project||'Unassigned'} · {r.taskType||'Task not specified'} · {r.hours||0} hours · {r.billingType||'Unmarked'}</p>)}</div><strong>Total: {g.rows.reduce((s,r)=>s+(r.hours||0),0).toFixed(2)} hours</strong></>:g.rows.map(r=><div key={r.id}><p>{r.kind==='expense'?`$${(r.amount||0).toFixed(2)} · ${r.project||'Company expense'} · ${r.merchant||''}`:r.kind==='pto'?`Time off: ${r.date} – ${r.endDate||r.date}`:r.note||r.kind}</p>{r.kind==='expense'&&r.fileKey&&<a href={`/api/receipt?id=${r.id}`}>View receipt</a>}{r.kind==='expense'&&r.reimbursement&&<p>Reimbursement requested</p>}{r.kind==='expense'&&r.companyCharge&&<p>Company charge account</p>}</div>)}
 {g.kind==='pto'&&g.status==='submitted'?<PtoDecision id={g.rows[0].id}/>:<Controls ids={g.rows.map(r=>r.id)} status={g.status} kind={g.kind}/>}
 </div>)}{!filtered.length&&<p className="empty">No records in this section.</p>}</section>;
}
