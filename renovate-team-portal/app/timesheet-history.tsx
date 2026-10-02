import { entries } from '@/db/schema';
import EditTimeEntry from './edit-time-entry';
import { JOB_TASK_TYPES, billingForTask } from '@/lib/job-task-types';
type Entry=typeof entries.$inferSelect;
const hours=(rows:Entry[])=>rows.reduce((sum,row)=>sum+(row.hours||0),0);
function dayLabel(date:string){const [y,m,d]=date.split('-').map(Number);return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(new Date(Date.UTC(y,m-1,d)))}
export default function TimesheetHistory({rows,today,employee}:{rows:Entry[];today:string;employee:string}){
 const classified=rows.map(row=>JOB_TASK_TYPES.some(task=>task===row.taskType)?{...row,billingType:billingForTask(row.taskType!)}:row);
 const groups=new Map<string,Entry[]>();for(const row of classified){const day=groups.get(row.date)||[];day.push(row);groups.set(row.date,day)}
 return <section className="timeHistory"><div className="timeHistoryHead"><h2>My timesheets</h2><p>Open a day to review its locations, tasks, and hours.</p></div>{groups.size===0&&<div className="timeEmpty">No hours submitted yet. Your daily log will appear here.</div>}
 {[...groups].map(([date,items])=><details className="dayGroup" key={date} open={date===today?true:undefined}><summary><span className="dayChevron" aria-hidden="true">⌄</span><span className="dayName">{date===today?'Today · ':''}{dayLabel(date)}<small>{items.length} {items.length===1?'entry':'entries'}</small></span><strong>{hours(items).toFixed(2)} <small>hours</small></strong></summary><div className="dayDetails"><div className="historyHead"><span>Date</span><span>Team Member</span><span>Project / client / location</span><span>Job / task type</span><span>Hours</span><span>Billing</span></div>{items.map(item=><div className="timeRecord" key={item.id}><div className="historyRow"><span data-label="Date">{date.slice(5)}</span><span data-label="Team Member">{employee}</span><span data-label="Project / location">{item.project||'—'}</span><span data-label="Job / task">{item.taskType||item.note||'—'}</span><strong data-label="Hours">{item.hours?.toFixed(2)||'0.00'}</strong><span data-label="Billing" className={item.billingType==='non-billable'?'billing muted':'billing'}>{item.billingType==='billable'?'Billable':item.billingType==='non-billable'?'Non-Billable':'Not marked'}</span></div><EditTimeEntry entry={item}/></div>)}<div className="historyTotal"><span>Daily total</span><strong>{hours(items).toFixed(2)} hours</strong></div></div></details>)}
 </section>
}
