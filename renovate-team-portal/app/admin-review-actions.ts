'use server';
import { revalidatePath } from 'next/cache';
import { currentMember } from '@/lib/portal';
import { database } from '@/lib/database.mjs';

export async function reviewSubmission(previous:{error:string}, form:FormData):Promise<{error:string}> {
 try {
  const admin=await currentMember();if(!admin||admin.role!=='admin')throw new Error('Administrator access required');
  const action=String(form.get('action')||'');const ids=String(form.get('ids')||'').split(',').filter(Boolean);
  if(!['approve','delete','restore','reopen'].includes(action)||!ids.length||ids.length>100||ids.some(id=>!/^[a-zA-Z0-9-]{1,100}$/.test(id)))throw new Error('Invalid request');
  const db=database();const now=Date.now();
  db.transaction(()=>{
   const get=db.prepare('SELECT id,owner_id,kind,date,status FROM entries WHERE id=?');
   const update=db.prepare('UPDATE entries SET status=? WHERE id=?');
   const audit=db.prepare('INSERT INTO submission_audit(id,entry_id,actor_id,action,occurred_at,details) VALUES (?,?,?,?,?,?)');
   const previous=db.prepare("SELECT details FROM submission_audit WHERE entry_id=? AND action='delete' ORDER BY occurred_at DESC, rowid DESC LIMIT 1");
   const records=ids.map(id=>get.get(id) as {id:string;owner_id:string;kind:string;date:string;status:string}|undefined);
   if(records.some(r=>!r))throw new Error('One or more submissions no longer exist');
   const first=records[0]!;
   if(records.some(r=>r!.owner_id!==first.owner_id||r!.kind!==first.kind||(first.kind==='time'&&r!.date!==first.date)))throw new Error('Entries must belong to the same employee and daily report');
   for(const record of records){const r=record!;
    const allowed=action==='approve'?r.status==='submitted':action==='delete'?r.status!=='deleted':action==='restore'?r.status==='deleted':(r.status==='archived'||r.status==='approved');
    if(!allowed)throw new Error('Submission status changed. Refresh and try again.');
    if(action==='approve'&&r.kind==='pto')throw new Error('Use the PTO approval form for time off requests.');
    let next=action==='approve'?'archived':action==='delete'?'deleted':'submitted';
    if(action==='restore'){
     const prior=previous.get(r.id) as {details:string|null}|undefined;
     let oldStatus='submitted';
     try {const parsed=JSON.parse(prior?.details||'{}');if(typeof parsed.previousStatus==='string'&&['submitted','archived','approved','declined'].includes(parsed.previousStatus))oldStatus=parsed.previousStatus;}catch{}
     next=oldStatus;
    }
    update.run(next,r.id);audit.run(crypto.randomUUID(),r.id,admin.id,action,now,JSON.stringify({previousStatus:r.status,newStatus:next}));
   }
  })();revalidatePath('/');return {error:''};
 }catch(e){return {error:e instanceof Error?e.message:'Unable to update submission'}}
}
