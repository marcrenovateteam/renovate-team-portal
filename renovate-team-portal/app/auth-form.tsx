'use client';
import {useActionState,useEffect,useState} from 'react';
import {login,setPassword,changePassword} from './auth-actions';
export default function AuthForm({mode}:{mode:'login'|'setup'|'change'}){
 const action=mode==='login'?login:mode==='setup'?setPassword:changePassword;
 const [state,submit,pending]=useActionState(action,{error:''});const [token,setToken]=useState('');
 useEffect(()=>{if(mode==='setup'){setToken(window.location.hash.slice(1));window.history.replaceState(null,'','/set-password');}},[mode]);
 if(state.success)return <div role="status"><p>{state.success}</p><a className="primary" href="/login">Sign in</a></div>;
 return <form action={submit} className="formGrid"><input type="hidden" name="token" value={token}/>
 {mode==='login'?<><label className="wide">Username<input required name="username" autoComplete="username" maxLength={40} autoCapitalize="none" spellCheck={false}/></label><label className="wide">Password<input required name="password" type="password" autoComplete="current-password" maxLength={128}/></label></>:<>
 {mode==='change'&&<label className="wide">Current password<input required name="current" type="password" autoComplete="current-password" maxLength={128}/></label>}
 <label className="wide">New password<input required name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128}/></label><label className="wide">Confirm new password<input required name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128}/></label><small className="wide">Use at least 12 characters. A phrase of several words works well.</small></>}
 {state.error&&<p className="wide ptoDenied" role="alert">{state.error}</p>}
 <button className="primary wide" disabled={pending||(mode==='setup'&&!token)}>{pending?'Please wait…':mode==='login'?'Sign in':'Save password'}</button>
 </form>
}
