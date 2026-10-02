'use client';
import { useActionState, useState } from 'react';
import { decidePtoRequest } from './actions';
export default function PtoDecision({id}:{id:string}){
 const [deny,setDeny]=useState(false);
 const [state,action,pending]=useActionState(decidePtoRequest,{error:''});
 return <form action={action} className="ptoDecision"><input type="hidden" name="id" value={id}/><input type="hidden" name="status" value={deny?'declined':'approved'}/>{deny&&<label>Reason for denial<textarea required name="denialReason" maxLength={2000} rows={3} placeholder="Explain why this request is denied"/></label>}<div className="entryFormActions">{deny?<><button type="submit" className="secondary" disabled={pending}>Deny request</button><button type="button" className="textButton" onClick={()=>setDeny(false)}>Cancel</button></>:<><button type="submit" className="secondary" disabled={pending}>Approve</button><button type="button" className="textButton" onClick={()=>setDeny(true)}>Deny</button></>}</div>{state.error&&<p className="timeWarning" role="alert">{state.error}</p>}</form>;
}
