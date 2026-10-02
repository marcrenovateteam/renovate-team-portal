import {redirect} from 'next/navigation';
import {authenticatedMember} from '@/lib/auth';
import AuthForm from '../auth-form';
export const dynamic='force-dynamic';
export default async function Login(){if(await authenticatedMember())redirect('/');return <main className="welcome"><div className="wordmark"><img className="brandLogo" src="/renovate-team-logo.png" alt="" width={48} height={48}/><span>THE RENOVATE TEAM<small>TEAM MEMBER PORTAL</small></span></div><section className="loginCard"><span className="eyebrow">TEAM WORKSPACE</span><h1>Welcome back.</h1><AuthForm mode="login"/><p>Need an account or forgot your password? Contact Marc for a private password setup link.</p></section></main>;}
