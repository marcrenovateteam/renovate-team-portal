'use client';
import { useState, type ReactNode } from 'react';
import { submitEntry } from './actions';
export default function ExpenseForm({children}:{children:ReactNode}){
 const [revision,setRevision]=useState(0);
 return <form key={revision} action={submitEntry} className="formCard">{children}<div className="entryFormActions"><button className="primary" type="submit">Submit expense</button><button className="secondary" type="button" onClick={()=>setRevision(n=>n+1)}>Clear entry</button></div></form>;
}
