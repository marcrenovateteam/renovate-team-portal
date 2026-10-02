'use client';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { submitTimesheet } from './actions';
import { JOB_TASK_TYPES, billingForTask } from '@/lib/job-task-types';
type Row={id:number;project:string;taskType:string;hours:string};
let nextId=1;
function newRow():Row{return {id:nextId++,project:'',taskType:'',hours:''}}
export default function TimesheetForm({today,totalsByDate}:{today:string;totalsByDate:Record<string,number>}){
 const [date,setDate]=useState(today);const [rows,setRows]=useState<Row[]>(()=>[newRow()]);
 const draft=rows.reduce((sum,row)=>sum+(Number(row.hours)||0),0);
 const submitted=totalsByDate[date]||0;const total=submitted+draft;
 function update(id:number,key:keyof Omit<Row,'id'>,value:string){setRows(all=>all.map(row=>row.id===id?{...row,[key]:value}:row))}
 return <form action={submitTimesheet} className="timeCard"><div className="timeCardTop"><div><span className="eyebrow">NEW TIME ENTRY</span><h2>Log your day</h2></div><label>Work date<input type="date" name="date" required value={date} onChange={e=>setDate(e.target.value)}/></label></div>
 <div className="timeTable"><div className="timeTableHead"><span>Project / client / location</span><span>Job / task type</span><span>Hours</span><span>Billing</span><span></span></div>{rows.map((row,i)=><div className="timeRow" key={row.id}><label><span className="timeMobileLabel">Project / client / location</span><input required maxLength={150} placeholder="e.g. Olson residence" value={row.project} onChange={e=>update(row.id,'project',e.target.value)}/></label><label><span className="timeMobileLabel">Job / task type</span><select required aria-label={`Job / task type for entry ${i+1}`} value={row.taskType} onChange={e=>update(row.id,'taskType',e.target.value)}><option value="" disabled>Select a task type</option>{JOB_TASK_TYPES.map(task=><option key={task} value={task}>{task}</option>)}</select></label><label><span className="timeMobileLabel">Hours</span><input required type="number" min="0.01" max="24" step="0.01" placeholder="0.00" value={row.hours} onChange={e=>update(row.id,'hours',e.target.value)}/></label><div className="automaticBilling"><span className="timeMobileLabel">Billing</span><span className={row.taskType==='Administrative'?'billing muted':'billing'}>{!row.taskType?'Select a task':billingForTask(row.taskType)==='non-billable'?'Non-billable':'Billable'}</span></div><button type="button" className="removeTime" aria-label={`Remove job entry ${i+1}`} disabled={rows.length===1} onClick={()=>setRows(all=>all.filter(r=>r.id!==row.id))}><Trash2 size={17}/></button></div>)}</div>
 <div className="timeCardBottom"><button type="button" className="addTime" disabled={rows.length>=20} onClick={()=>setRows(all=>[...all,newRow()])}><Plus size={18}/> Add another location or task</button><div className="timeTotals"><span>{`${submitted.toFixed(2)} h already submitted ${date===today?'today':'on this date'}`}</span><strong>{total.toFixed(2)} <small>hours {date===today?'today':'on this date'}</small></strong></div></div>
 <input type="hidden" name="rows" value={JSON.stringify(rows.map(({project,taskType,hours})=>({project,taskType,hours})))}/>{total>24&&<p className="timeWarning">A day cannot exceed 24 hours.</p>}<div className="entryFormActions"><button className="primary" disabled={total>24}>Submit {rows.length} {rows.length===1?'entry':'entries'}</button><button className="secondary" type="button" onClick={()=>{setDate(today);setRows([newRow()])}}>Clear entry</button></div></form>
}
