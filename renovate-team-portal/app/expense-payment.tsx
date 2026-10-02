'use client';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
export default function ExpensePayment(){
 const [payment,setPayment]=useState<'personal'|'charge'|null>(null);
 return <div className="wide expensePayment"><label className="reimbursementChoice"><Checkbox name="companyCharge" value="yes" checked={payment==='charge'} onCheckedChange={checked=>setPayment(checked?'charge':null)}/><span>Purchased on a company charge account</span></label><label className="reimbursementChoice"><Checkbox name="reimbursement" value="yes" checked={payment==='personal'} onCheckedChange={checked=>setPayment(checked?'personal':null)}/><span>I paid with my own funds—request reimbursement</span></label></div>
}
