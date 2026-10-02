export function ptoDescription(entry:{date:string;endDate:string|null;ptoMode:string|null;startTime:string|null;endTime:string|null;hours:number|null}){
 const time=(value:string|null)=>{if(!value)return '';const [h,m]=value.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`};
 return entry.ptoMode==='hourly'?`${entry.date} · ${time(entry.startTime)} – ${time(entry.endTime)} · ${(entry.hours||0).toFixed(2)} hours`:`${entry.date}${entry.endDate&&entry.endDate!==entry.date?` – ${entry.endDate}`:''} · Full day(s)`;
}

export function ptoHoursInYear(entry:{date:string;endDate:string|null;ptoMode:string|null;hours:number|null},year:number){
 const first=`${year}-01-01`,last=`${year}-12-31`;
 if(entry.ptoMode==='hourly')return entry.date>=first&&entry.date<=last?entry.hours||0:0;
 const start=entry.date>first?entry.date:first;
 const end=(entry.endDate||entry.date)<last?(entry.endDate||entry.date):last;
 if(start>end)return 0;
 const day=new Date(`${start}T00:00:00Z`),final=new Date(`${end}T00:00:00Z`);
 let hours=0;
 for(;day<=final;day.setUTCDate(day.getUTCDate()+1))if(day.getUTCDay()!==0&&day.getUTCDay()!==6)hours+=8;
 return hours;
}
