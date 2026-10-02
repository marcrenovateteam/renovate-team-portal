import { authenticatedMember } from '@/lib/auth';
export const currentMember=authenticatedMember;
export async function notifyAdmin(subject:string,body:string) {
  const key=process.env.RESEND_API_KEY;
  if(!key) return;
  try { await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:'Team Member Portal <notifications@renovateteam.com>',to:['marc@renovateteam.com'],subject,text:body})}); } catch(e){console.error('Email notification failed',e)}
}
