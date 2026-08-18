import { useEffect, useState } from 'react';
import { BarChart3, BriefcaseBusiness, Clock3, LayoutDashboard, LogOut, ShieldCheck, UsersRound } from 'lucide-react';
import { apiError, authApi } from './api/client';
import { Role, User } from './api/workforce';
import { useAuthStore } from './store/authStore';
import { AssignmentsView, DashboardView, TeamsView, TimesheetsView, WorkersView } from './WorkforceViews';

type Tab = 'dashboard'|'teams'|'workers'|'assignments'|'timesheets';
const nav:{id:Tab; label:string; icon:any; roles:Role[]}[] = [
  {id:'dashboard',label:'Dashboard',icon:LayoutDashboard,roles:['admin','hr','manager','worker']},
  {id:'teams',label:'Teams',icon:UsersRound,roles:['admin','hr','manager']},
  {id:'workers',label:'Workers',icon:ShieldCheck,roles:['admin','hr','manager']},
  {id:'assignments',label:'Assignments',icon:BriefcaseBusiness,roles:['admin','hr','manager','worker']},
  {id:'timesheets',label:'Timesheets',icon:Clock3,roles:['admin','hr','manager','worker']},
];

function Login() {
  const setAuth = useAuthStore(s=>s.setAuth);
  const [email,setEmail]=useState('admin@example.com');
  const [password,setPassword]=useState('Password123!');
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const data=await authApi.login(email,password);setAuth(data.user as any,data.access_token)}catch(err:any){setError(apiError(err))}finally{setBusy(false)}}
  return <div className="login-shell min-h-screen flex items-center justify-center p-6">
    <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[28px] shadow-2xl shadow-blue-950/40 overflow-hidden border border-white/20">
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-900 p-9 text-white overflow-hidden"><div className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-cyan-300/20 blur-2xl"/><div className="absolute right-16 bottom-0 w-24 h-24 rounded-full bg-fuchsia-400/20 blur-xl"/><div className="relative"><div className="w-13 h-13 rounded-2xl bg-white/15 ring-1 ring-white/25 grid place-items-center mb-6 shadow-xl"><BarChart3/></div><p className="text-xs font-bold tracking-[.25em] text-cyan-200 uppercase mb-2">Workforce operations</p><h1 className="text-3xl font-extrabold tracking-tight">Workforce Hub</h1><p className="text-blue-100 mt-2 leading-relaxed">People, assignments and weekly hours in one place.</p></div></div>
      <form onSubmit={submit} className="p-8 space-y-5"><div><label className="label">Work email</label><input className="input" value={email} onChange={e=>setEmail(e.target.value)} type="email" required/></div><div><label className="label">Password</label><input className="input" value={password} onChange={e=>setPassword(e.target.value)} type="password" required/></div>{error&&<p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}<button className="btn-primary w-full" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form>
    </div></div>
}

export default function App(){
  const {user,token,logout}=useAuthStore(); const [tab,setTab]=useState<Tab>('dashboard');
  const [checked,setChecked]=useState(false);
  useEffect(()=>{if(!token){setChecked(true);return}authApi.me().then(()=>setChecked(true)).catch(()=>{logout();setChecked(true)})},[token,logout]);
  if(!checked)return <div className="min-h-screen bg-slate-950 grid place-items-center text-white">Loading…</div>;
  if(!user||!token)return <Login/>;
  const current=user as unknown as User; const allowed=nav.filter(n=>n.roles.includes(current.role));
  return <div className="app-shell min-h-screen flex">
    <aside className="w-72 sidebar text-white fixed inset-y-0 left-0 flex flex-col z-20"><div className="p-6 border-b border-white/10"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 grid place-items-center shadow-lg shadow-blue-500/25"><BarChart3 size={22}/></div><div><div className="text-lg font-extrabold tracking-tight">Workforce Hub</div><div className="text-[11px] text-slate-400 mt-0.5">Operations workspace</div></div></div></div><div className="px-5 pt-6 pb-2 text-[10px] font-bold tracking-[.2em] text-slate-500 uppercase">Main menu</div><nav className="px-3 flex-1 space-y-1.5">{allowed.map(item=><button key={item.id} onClick={()=>setTab(item.id)} className={`nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${tab===item.id?'active':'text-slate-400'}`}><span className={`w-8 h-8 rounded-lg grid place-items-center ${tab===item.id?'bg-white/15':'bg-slate-800/70'}`}><item.icon size={17}/></span>{item.label}</button>)}</nav><div className="p-4 border-t border-white/10"><div className="rounded-2xl bg-white/[.06] border border-white/10 p-3.5 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 grid place-items-center font-bold">{current.name.charAt(0)}</div><div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{current.name}</div><div className="text-[10px] text-cyan-400 uppercase tracking-wider mt-0.5">{current.role}</div></div><button onClick={logout} title="Sign out" className="text-slate-500 hover:text-white p-1"><LogOut size={17}/></button></div></div></aside>
    <main className="ml-72 flex-1 p-8 lg:p-10 max-w-[1700px]"><header className="mb-8 flex items-end justify-between"><div><p className="text-xs font-bold text-blue-600 uppercase tracking-[.2em]">{current.role} workspace</p><h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">{nav.find(n=>n.id===tab)?.label}</h1><p className="text-sm text-slate-500 mt-2">Manage your workforce operations with clarity.</p></div><div className="hidden lg:flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/><span className="text-xs font-semibold text-slate-600">System online</span></div></header>
      {tab==='dashboard'&&<DashboardView user={current}/>} {tab==='teams'&&<TeamsView user={current}/>} {tab==='workers'&&<WorkersView user={current}/>} {tab==='assignments'&&<AssignmentsView user={current}/>} {tab==='timesheets'&&<TimesheetsView user={current}/>} </main>
  </div>
}
