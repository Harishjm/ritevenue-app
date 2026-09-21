'use client';
/* eslint-disable @next/next/no-img-element -- Private, pre-optimized photos must retain authenticated no-store requests. */
import {useEffect,useState} from 'react';
type Intake={id:string;createdAt:string;status:string;convertedDraftId:string|null;reviewNote:string;reviewedAt:string|null;photos?:{id:string;url:string;description:string;width:number;height:number;bytes:number}[];data:{venueName:string;locality:string;contactName:string;email:string;phone:string;capacity:number;notes:string}};

export default function VenueIntakeReview(){
	const [rows,setRows]=useState<Intake[]>([]),[state,setState]=useState('Loading applications…');
	async function load(){
		try{const r=await fetch('/api/venue-applications',{cache:'no-store'});if(!r.ok)throw new Error();const data=await r.json() as {applications:Intake[]};setRows(data.applications);setState(data.applications.length?'':'No public applications yet.');}catch{setState('Could not load applications. Try refreshing.');}
	}
	useEffect(()=>{
		const controller=new AbortController();
		fetch('/api/venue-applications',{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();return response.json() as Promise<{applications:Intake[]}>;}).then(data=>{if(controller.signal.aborted)return;setRows(data.applications);setState(data.applications.length?'':'No public applications yet.');}).catch(()=>{if(!controller.signal.aborted)setState('Could not load applications. Try refreshing.');});
		return ()=>controller.abort();
	},[]);

	async function convertIntake(id:string){
		if(!confirm('Create a draft from this application and assign it to your account?'))return;
		setState('Processing…');
		try{
			const r=await fetch('/api/demo/convert_intake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
			const j=await r.json() as {error?:string;id?:string};
			if(!r.ok)throw new Error(j?.error||'Request failed');
			if(!j.id)throw new Error('Draft reference missing');
			alert('Draft created: '+j.id);
			await load();
		}catch(e:unknown){
			alert('Error: '+(e instanceof Error?e.message:String(e)));
		}finally{setState('');}
	}
	async function reviewIntake(row:Intake,status:'new'|'rejected'){
		const note=prompt(status==='rejected'?'Why is this application being rejected?':'Why is this application being reopened?');
		if(note===null)return;
		if(note.trim().length<5){alert('Add a review note of at least 5 characters.');return;}
		setState('Processing…');
		try{const r=await fetch('/api/demo/review_intake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:row.id,status,note,expectedStatus:row.status})});const j=await r.json() as {error?:string};if(!r.ok)throw new Error(j.error||'Request failed');await load();}catch(e:unknown){alert('Error: '+(e instanceof Error?e.message:String(e)));}finally{setState('');}
	}

	return (
		<section className="intake-review">
			<h2>Public venue applications</h2>
			<p>Unverified contact submissions. Contact the representative and confirm authority, photos and public-display permission before preparing a listing. These applications never publish automatically.</p>
			<button className="filter-button" onClick={()=>void load()}>Refresh applications</button>
			<p role="status">{state}</p>
			{rows.map(r=>
				<article className="intake-review-card" key={r.id}>
					<span className="tag">{r.status.replaceAll('_',' ')}</span>
					<h3>{r.data.venueName}</h3>
					<p>{r.data.locality} · {r.data.capacity} guests</p>
					<p>{r.data.contactName} · {r.data.email} · {r.data.phone}</p>
					<p className="intake-notes">{r.data.notes}</p>
					<div className="intake-photo-grid">{r.photos?.map(photo=><figure className="intake-photo-card" key={photo.id}><a href={photo.url} target="_blank" rel="noopener noreferrer"><img src={photo.url} alt={photo.description} width={photo.width} height={photo.height} loading="lazy"/></a><figcaption>{photo.description} · {Math.ceil(photo.bytes/1024)} KB</figcaption></figure>)}</div>
					{r.reviewNote&&<p className="notice">Review: {r.reviewNote}{r.reviewedAt?` · ${new Date(r.reviewedAt).toLocaleString()}`:''}</p>}
					<div className="workspace-actions" style={{marginTop:8}}>
						{r.convertedDraftId?<span className="tag">Draft created · {r.convertedDraftId.slice(0,8)}</span>:r.status==='new'?<><button onClick={()=>void convertIntake(r.id)} className="primary">Create draft</button><button onClick={()=>void reviewIntake(r,'rejected')} className="filter-button">Reject application</button></>:<button onClick={()=>void reviewIntake(r,'new')} className="filter-button">Reopen application</button>}
					</div>
					<small>Received {r.createdAt.slice(0,10)} · {r.id}</small>
				</article>
			)}
		</section>
	);
}
