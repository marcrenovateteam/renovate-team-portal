'use server';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import {bucket} from '@/lib/storage';
import { getDb } from '@/db';
import { entries, posts, members, comments, reactions } from '@/db/schema';
import { currentMember, notifyAdmin } from '@/lib/portal';
import { JOB_TASK_TYPES, billingForTask } from '@/lib/job-task-types';
const clean=(v:FormDataEntryValue|null,max=1000)=>String(v||'').trim().slice(0,max);
function ready(m:Awaited<ReturnType<typeof currentMember>>) {if(!m||!['employee','admin'].includes(m.role)) throw new Error('Access denied'); return m}
export async function submitEntry(form:FormData) {
 const m=ready(await currentMember()); const kind=clean(form.get('kind'),20);
 if(!['time','pto','expense','complaint'].includes(kind)) throw new Error('Invalid form');
 const date=clean(form.get('date'),20); const note=clean(form.get('note'),2000);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Choose a date');
 if(kind==='expense'&&form.get('companyCharge')==='yes'&&form.get('reimbursement')==='yes')throw new Error('Choose either personal reimbursement or a company charge account.');
 const hours=Number(form.get('hours')); const amount=Number(form.get('amount'));
 if(kind==='time'&&(!Number.isFinite(hours)||hours<=0||hours>24)) throw new Error('Enter valid hours');
 if(kind==='expense'&&(!Number.isFinite(amount)||amount<=0||amount>100000)) throw new Error('Enter a valid amount');
 let ptoMode:null|string=null,startTime:null|string=null,endTime:null|string=null,ptoHours:null|number=null;
 let endDate=clean(form.get('endDate'),20);
 if(kind==='pto'){
  ptoMode=clean(form.get('ptoMode'),20)||'full-day';
  const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T12:00:00Z`))&&new Date(`${value}T12:00:00Z`).toISOString().slice(0,10)===value;
  if(!validDate(date))throw new Error('Choose a valid date.');
  if(ptoMode==='hourly'){
   startTime=clean(form.get('startTime'),5);endTime=clean(form.get('endTime'),5);
   const validTime=(value:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
   if(!validTime(startTime)||!validTime(endTime))throw new Error('Choose a start and end time.');
   const minutes=(value:string)=>Number(value.slice(0,2))*60+Number(value.slice(3));
   const duration=minutes(endTime)-minutes(startTime);if(duration<=0)throw new Error('End time must be after start time on the same day.');
   ptoHours=duration/60;endDate=date;
  }else if(ptoMode==='full-day'){
   if(!validDate(endDate)||endDate<date)throw new Error('Last day must be on or after the first day.');
  }else throw new Error('Choose full days or part of a day.');
 }
 let fileKey:null|string=null, fileName:null|string=null;
 const file=form.get('receipt');
 if(kind==='expense'&&file instanceof File&&file.size){if(file.size>10*1024*1024||!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))throw new Error('Receipt must be PDF or image under 10 MB'); fileKey=`receipts/${m.id}/${crypto.randomUUID()}`; fileName=file.name.slice(0,180); if(!bucket) throw new Error('Receipt storage unavailable'); await bucket.put(fileKey,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}})}
 await getDb().insert(entries).values({id:crypto.randomUUID(),ownerId:m.id,kind,date,project:clean(form.get('project'),150),hours:kind==='time'?hours:kind==='pto'?ptoHours:null,amount:kind==='expense'?amount:null,companyCharge:kind==='expense'&&form.get('companyCharge')==='yes',merchant:kind==='expense'?clean(form.get('merchant'),200):null,reimbursement:kind==='expense'&&form.get('reimbursement')==='yes',endDate,ptoMode,startTime,endTime,note,status:'submitted',fileKey,fileName,createdAt:Date.now()});
 if(['time','pto','complaint'].includes(kind)) await notifyAdmin(`${kind==='time'?'Timesheet':kind==='pto'?'PTO request':'Confidential HR report'} submitted`,`${m.name} submitted a ${kind} entry. Review it in the team member portal. No private details are included in this email.`);
 revalidatePath('/');
}
export async function submitTimesheet(form:FormData){
 const m=ready(await currentMember());const date=clean(form.get('date'),20);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(`${date}T12:00:00Z`)))throw new Error('Choose a valid date');
 const raw=String(form.get('rows')||'');if(raw.length>20000)throw new Error('Too many entries');
 let rows:unknown;try{rows=JSON.parse(raw)}catch{throw new Error('Invalid timesheet')}
 if(!Array.isArray(rows)||rows.length<1||rows.length>20)throw new Error('Add 1 to 20 job entries');
 const valid=rows.map((item:unknown)=>{
  if(!item||typeof item!=='object')throw new Error('Invalid job entry');
  const r=item as Record<string,unknown>;
  const project=String(r.project||'').trim().slice(0,150),taskType=String(r.taskType||'').trim().slice(0,150);
  const hours=Number(r.hours),billingType=billingForTask(taskType);
  if(!project||!JOB_TASK_TYPES.some(task=>task===taskType)||!Number.isFinite(hours)||hours<=0||hours>24)throw new Error('Complete every job entry');
  if(Math.round(hours*100)!==hours*100)throw new Error('Use no more than two decimal places for hours');
  return {id:crypto.randomUUID(),ownerId:m.id,kind:'time',date,project,taskType,billingType,hours,status:'submitted',createdAt:Date.now()};
 });
 const total=valid.reduce((sum,row)=>sum+row.hours,0);
 const db=getDb();const previous=await db.select({hours:entries.hours}).from(entries).where(and(eq(entries.ownerId,m.id),eq(entries.kind,'time'),eq(entries.date,date)));
 if(total+previous.reduce((sum,row)=>sum+(row.hours||0),0)>24)throw new Error('Daily total cannot exceed 24 hours');
 await db.insert(entries).values(valid);
 await notifyAdmin('Timesheet submitted',`${m.name} submitted ${valid.length} time entries for ${date}, totaling ${total.toFixed(2)} hours. Review them in the team member portal.`);
 revalidatePath('/');
}
const allowedEmoji=['👍','❤️','👏','🎉','😂'];
export async function addPost(form:FormData){
 const m=ready(await currentMember()); const body=clean(form.get('body'),2000); const image=form.get('photo');
 const hasImage=image instanceof File&&image.size>0;
 if(!body&&!hasImage) throw new Error('Write an update or choose a photo');
 let imageKey:null|string=null;
 if(hasImage){
  if(image.size>8*1024*1024||!['image/jpeg','image/png','image/webp'].includes(image.type)) throw new Error('Photo must be JPG, PNG or WebP under 8 MB');
  if(!bucket) throw new Error('Photo storage unavailable');
  imageKey=`board/${m.id}/${crypto.randomUUID()}`;
  await bucket.put(imageKey,await image.arrayBuffer(),{httpMetadata:{contentType:image.type}});
 }
 try {await getDb().insert(posts).values({id:crypto.randomUUID(),ownerId:m.id,author:m.name,body,imageKey,createdAt:Date.now()})}
 catch(error){if(imageKey)await bucket?.delete(imageKey);throw error}
 revalidatePath('/');
}
export async function addComment(form:FormData){
 const m=ready(await currentMember()); const postId=clean(form.get('postId'),80),body=clean(form.get('body'),1000);
 if(!body) return;
 const post=await getDb().select({id:posts.id}).from(posts).where(eq(posts.id,postId)).get();if(!post)throw new Error('Post unavailable');
 await getDb().insert(comments).values({id:crypto.randomUUID(),postId,ownerId:m.id,author:m.name,body,createdAt:Date.now()});revalidatePath('/');
}
export async function reactToPost(form:FormData){
 const m=ready(await currentMember());const postId=clean(form.get('postId'),80),emoji=clean(form.get('emoji'),8);
 if(!allowedEmoji.includes(emoji))throw new Error('Invalid reaction');
 const db=getDb();const post=await db.select({id:posts.id}).from(posts).where(eq(posts.id,postId)).get();if(!post)throw new Error('Post unavailable');
 const existing=await db.select().from(reactions).where(and(eq(reactions.postId,postId),eq(reactions.ownerId,m.id))).get();
 if(existing?.emoji===emoji)await db.delete(reactions).where(eq(reactions.id,existing.id));
 else await db.insert(reactions).values({id:existing?.id||crypto.randomUUID(),postId,ownerId:m.id,emoji,createdAt:Date.now()}).onConflictDoUpdate({target:[reactions.postId,reactions.ownerId],set:{emoji,createdAt:Date.now()}});
 revalidatePath('/');
}
export async function sharePost(form:FormData){
 const m=ready(await currentMember());const id=clean(form.get('postId'),80),db=getDb();
 const original=await db.select().from(posts).where(eq(posts.id,id)).get();if(!original)throw new Error('Post unavailable');
 await db.insert(posts).values({id:crypto.randomUUID(),ownerId:m.id,author:m.name,body:clean(form.get('body'),500),sharedPostId:id,createdAt:Date.now()});revalidatePath('/');
}
export async function deleteComment(form:FormData){
 const m=ready(await currentMember());const id=clean(form.get('id'),80),db=getDb();const comment=await db.select().from(comments).where(eq(comments.id,id)).get();
 if(!comment||m.role!=='admin'&&comment.ownerId!==m.id)throw new Error('Access denied');
 await db.delete(comments).where(eq(comments.id,id));revalidatePath('/');
}
export async function deletePost(form:FormData){
 const m=ready(await currentMember());if(m.role!=='admin')throw new Error('Access denied');const id=clean(form.get('id'),80),db=getDb();
 const post=await db.select().from(posts).where(eq(posts.id,id)).get();if(!post)return;
 await db.delete(comments).where(eq(comments.postId,id));await db.delete(reactions).where(eq(reactions.postId,id));await db.delete(posts).where(eq(posts.id,id));
 if(post.imageKey)await bucket?.delete(post.imageKey);revalidatePath('/');
}
export async function decidePtoRequest(previous:{error:string},form:FormData):Promise<{error:string}>{
 try {
  const m=ready(await currentMember());if(m.role!=='admin')throw new Error('Access denied');
  const status=clean(form.get('status'),20),id=clean(form.get('id'),80),denialReason=clean(form.get('denialReason'),2000);
  if(!['approved','declined'].includes(status))throw new Error('Invalid status');
  if(status==='declined'&&!denialReason)throw new Error('Enter a reason for denying this request.');
  const db=getDb(),request=await db.select().from(entries).where(and(eq(entries.id,id),eq(entries.kind,'pto'))).get();
  if(!request||request.status!=='submitted')throw new Error('This request has already been reviewed or is unavailable.');
  await db.update(entries).set({status,denialReason:status==='declined'?denialReason:null}).where(and(eq(entries.id,id),eq(entries.kind,'pto'),eq(entries.status,'submitted')));
  revalidatePath('/');return {error:''};
 }catch(error){return {error:error instanceof Error?error.message:'Could not update the request.'}}
}
export async function updateTimeEntry(previous:{error:string;success:boolean},form:FormData):Promise<{error:string;success:boolean}>{
 try {
  const m=ready(await currentMember()),db=getDb();const id=clean(form.get('id'),100);
  const record=await db.select().from(entries).where(and(eq(entries.id,id),eq(entries.ownerId,m.id),eq(entries.kind,'time'))).get();
  if(!record)return {error:'This time entry is unavailable.',success:false};
  const date=clean(form.get('date'),20),project=clean(form.get('project'),150),taskType=clean(form.get('taskType'),150),billingType=billingForTask(taskType),hours=Number(form.get('hours'));
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(`${date}T12:00:00Z`).toISOString().slice(0,10)!==date||!project||!JOB_TASK_TYPES.some(task=>task===taskType)||!Number.isFinite(hours)||hours<=0||hours>24)return {error:'Complete all fields with a valid date and hours.',success:false};
  const day=await db.select({id:entries.id,hours:entries.hours}).from(entries).where(and(eq(entries.ownerId,m.id),eq(entries.kind,'time'),eq(entries.date,date)));
  if(day.filter(row=>row.id!==id).reduce((sum,row)=>sum+(row.hours||0),0)+hours>24)return {error:'The daily total cannot exceed 24 hours.',success:false};
  await db.update(entries).set({date,project,taskType,billingType,hours,status:'submitted'}).where(and(eq(entries.id,id),eq(entries.ownerId,m.id),eq(entries.kind,'time')));
  await notifyAdmin('Timesheet correction submitted',`${m.name} corrected a time entry for ${date}. Review the updated record in the team member portal.`);
  revalidatePath('/');return {error:'',success:true};
 }catch(error){console.error('Time correction failed',error);return {error:'Unable to save the correction. Please try again.',success:false}}
}
export async function deleteTimeEntry(previous:{error:string},form:FormData):Promise<{error:string}>{
 try {
  const m=ready(await currentMember()),db=getDb();const id=clean(form.get('id'),100);
  const record=await db.select().from(entries).where(and(eq(entries.id,id),eq(entries.ownerId,m.id),eq(entries.kind,'time'))).get();
  if(!record)return {error:'This time entry is unavailable.'};
  await db.delete(entries).where(and(eq(entries.id,id),eq(entries.ownerId,m.id),eq(entries.kind,'time')));
  await notifyAdmin('Timesheet entry deleted',`${m.name} deleted their ${record.hours} hour entry for ${record.date} (${record.project||'Work'}). Review the updated daily total in the team member portal.`);
  revalidatePath('/');return {error:''};
 }catch(error){console.error('Time deletion failed',error);return {error:'Unable to delete this entry. Please try again.'}}
}

export async function submitPtoRequest(previous:{error:string;success:boolean},form:FormData):Promise<{error:string;success:boolean}>{
 try {form.set('kind','pto');await submitEntry(form);return {error:'',success:true}}
 catch(error){return {error:error instanceof Error?error.message:'Unable to submit your request. Please try again.',success:false}}
}
