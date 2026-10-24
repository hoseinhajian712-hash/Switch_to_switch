import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "npm:@simplewebauthn/server@13.2.2";
const url=Deno.env.get("SUPABASE_URL")!, key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, db=createClient(url,key);
// Staff access is granted only through short-lived, hashed staff_sessions tokens.
const J={"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type,authorization,apikey,x-client-info,prefer,accept,origin"};
const order=["new","booking_confirmed","expert_visit_confirmed","awaiting_expert_confirmation","refer","inspection","review","auction-ready","auction","auction-end","awaiting_negotiation","negotiation","customer","disagreement","awaiting_docs","docs","legal_review","awaiting_legal_inquiries","prepayment","awaiting_prepayment","deposit","ready_to_sign","contract_approved","contract","awaiting_custody_receipt","deductions_review","awaiting_buyer_settlement","buyer_settlement_review","awaiting_seller_settlement_confirmation","awaiting_transfer_method_confirmation","awaiting_buyer_confirmation","awaiting_seller_confirmation","awaiting_notary","awaiting_power_of_attorney_signature","seller_final_payout_pending","settled","awaiting_plate_release","vehicle_delivery","done","cancelled"];
const statusFa:any={"new":"درخواست جدید","booking_confirmed":"تأیید رزرو","expert_visit_confirmed":"تأیید مراجعه کارشناس","awaiting_expert_confirmation":"در انتظار تأیید کارشناس","refer":"ارجاع به کارشناس","inspection":"در حال کارشناسی","review":"پایان کارشناسی","auction-ready":"آماده ورود به مزایده","auction":"در حال مزایده","auction-end":"پایان مزایده","awaiting_negotiation":"در انتظار شروع مذاکره","negotiation":"شروع مذاکره","customer":"شروع مذاکره","disagreement":"عدم توافق","awaiting_docs":"در انتظار تکمیل مدارک","docs":"تکمیل مدارک","legal_review":"کنترل حقوقی","awaiting_legal_inquiries":"در انتظار استعلام حقوقی","prepayment":"تعیین پیش‌پرداخت","awaiting_prepayment":"در انتظار پرداخت پیش‌پرداخت","deposit":"دریافت پیش‌پرداخت","ready_to_sign":"آماده امضا","contract_approved":"تأیید نهایی قرارداد","contract":"قرارداد","awaiting_custody_receipt":"در انتظار رسید امانت خودرو","deductions_review":"محاسبه کسورات","awaiting_buyer_settlement":"در انتظار تسویه خریدار","buyer_settlement_review":"کنترل تسویه خریدار","awaiting_seller_settlement_confirmation":"در انتظار تأیید تسویه فروشنده","awaiting_transfer_method_confirmation":"در انتظار تأیید شیوه انتقال","awaiting_buyer_confirmation":"در انتظار تأیید خریدار","awaiting_seller_confirmation":"در انتظار تأیید فروشنده","awaiting_notary":"در انتظار مراجعه به دفترخانه","settled":"تسویه شد","awaiting_power_of_attorney_signature":"در انتظار تأیید امضای وکالت‌نامه","seller_final_payout_pending":"در انتظار واریز مانده فروشنده","awaiting_plate_release":"منتظر فک پلاک","vehicle_delivery":"دفترخانه و تحویل خودرو","done":"معامله تکمیل شد","cancelled":"انصراف"};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:J});
function auth(_u:URL){return null}
async function listCases(role:string,staffMemberId:string=""){
 const cq=db.from("cases").select("*").order("created_at",{ascending:false});
 let {data,error}=await cq;
 if(error)return json({error:error.message},500);
 const roleStatuses:any={intake:["new","booking_confirmed","expert_visit_confirmed"],sales:["review","auction-ready","auction","auction-end","awaiting_negotiation","negotiation","customer","selling","disagreement","awaiting_docs","docs","legal_review","prepayment","deposit","ready_to_sign","contract_approved","contract","awaiting_custody_receipt","deductions_review","awaiting_buyer_settlement","buyer_settlement_review","awaiting_seller_settlement_confirmation","awaiting_transfer_method_confirmation","awaiting_buyer_confirmation","awaiting_seller_confirmation","awaiting_notary","settled","awaiting_power_of_attorney_signature","seller_final_payout_pending","awaiting_plate_release","vehicle_delivery","done"],followup:["awaiting_negotiation","negotiation","customer","disagreement","awaiting_docs","buyer_settlement_review"],legal:["legal_review","awaiting_transfer_method_confirmation","awaiting_notary","awaiting_power_of_attorney_signature"],finance:["awaiting_guarantee_deposit","prepayment","awaiting_prepayment","deposit","deductions_review","awaiting_buyer_settlement","buyer_settlement_review","awaiting_seller_settlement_confirmation","seller_final_payout_pending","settled"],contracts:["ready_to_sign","contract_approved","awaiting_custody_receipt","deductions_review","awaiting_buyer_settlement","awaiting_transfer_method_confirmation","awaiting_buyer_confirmation","awaiting_seller_confirmation","awaiting_notary","settled","awaiting_power_of_attorney_signature","awaiting_plate_release","vehicle_delivery","done"]};
 if(role==="dealer")data=[];
 const ids=(data||[]).map((x:any)=>x.id); let vehicles:any[]=[];
 if(ids.length){const r=await db.from("vehicles").select("*").in("case_id",ids);if(r.error)return json({error:r.error.message},500);vehicles=r.data||[]}
 let inspections:any[]=[]; let defects:any[]=[]; let documents:any[]=[]; let photos:any[]=[]; let history:any[]=[]; let auctions:any[]=[]; let teamUpdates:any[]=[]; let financialEntries:any[]=[]; let contractRecords:any[]=[];
 if(ids.length){
  const ir=await db.from("inspections").select("*").in("case_id",ids).order("finished_at",{ascending:false});
  if(ir.error)return json({error:ir.error.message},500); inspections=ir.data||[];
  const ii=inspections.map((x:any)=>x.id);
  if(ii.length){const dr=await db.from("inspection_defects").select("*").in("inspection_id",ii);if(dr.error)return json({error:dr.error.message},500);defects=dr.data||[];const pr=await db.from("inspection_photos").select("*").in("inspection_id",ii);if(pr.error)return json({error:pr.error.message},500);photos=pr.data||[];}
  const xr=await db.from("documents").select("*").in("case_id",ids);if(xr.error)return json({error:xr.error.message},500);documents=xr.data||[];const hr=await db.from("case_history").select("*").in("case_id",ids).order("created_at",{ascending:false});if(hr.error)return json({error:hr.error.message},500);history=hr.data||[];const ar=await db.from("auctions").select("*").in("case_id",ids).order("created_at",{ascending:false});if(ar.error)return json({error:ar.error.message},500);auctions=ar.data||[];const tr=await db.from("case_team_updates").select("*").in("case_id",ids).order("created_at",{ascending:false});if(tr.error)return json({error:tr.error.message},500);teamUpdates=tr.data||[];const fr=await db.from("case_financial_entries").select("*").in("case_id",ids).order("created_at",{ascending:false});if(fr.error)return json({error:fr.error.message},500);financialEntries=fr.data||[];const rr=await db.from("case_contract_records").select("*").in("case_id",ids).order("created_at",{ascending:false});if(rr.error)return json({error:rr.error.message},500);contractRecords=rr.data||[];
 }
 let legalBuyerById:any={};
 if(["sales","legal","contracts"].includes(role)){
  const winnerIds=[...new Set(auctions.map((a:any)=>a.winner_id).filter(Boolean))] as string[];
  if(winnerIds.length){const bm=await db.from("auction_members").select("id,full_name,mobile,national_id,address").in("id",winnerIds);if(bm.error)return json({error:"دریافت مشخصات خریدار برای تیم حقوقی ناموفق بود: "+bm.error.message},500);legalBuyerById=Object.fromEntries((bm.data||[]).map((m:any)=>[m.id,m]));}
 }
 const mediaRows=[...documents,...photos]; const paths=mediaRows.map((x:any)=>x.storage_path).filter(Boolean); const signed=paths.length?(await db.storage.from("s2s-documents").createSignedUrls(paths,3600)).data||[]:[]; const mediaUrl=(p:string)=>signed.find((x:any)=>x.path===p)?.signedUrl||null;
 return json({cases:(data||[]).map((c:any)=>{const cd=documents.filter((d:any)=>d.case_id===c.id).map((d:any)=>({...d,url:mediaUrl(d.storage_path)}));const cp=inspections.filter((i:any)=>i.case_id===c.id).flatMap((i:any)=>photos.filter((p:any)=>p.inspection_id===i.id)).map((p:any)=>({...p,url:mediaUrl(p.storage_path)}));const tu=teamUpdates.filter((x:any)=>x.case_id===c.id).map((x:any)=>{if(!["admin","sales","legal"].includes(role)&&x.update_type==="documents_checklist"){const p={...(x.payload||{})};delete p.seller_payment_details;return {...x,payload:p}}return x});const fe=financialEntries.filter((x:any)=>x.case_id===c.id);const cr=contractRecords.filter((x:any)=>x.case_id===c.id);const calc=tu.find((x:any)=>x.update_type==="calculate_branch_offer")?.payload||null;const caseAuctions=auctions.filter((a:any)=>a.case_id===c.id);const latestAuction=caseAuctions[0]||null;return {...c,...(["sales","legal","contracts"].includes(role)?{legal_parties:{seller:(()=>{const p=tu.find((x:any)=>x.update_type==="documents_checklist")?.payload||{};const d=p.seller_payment_details||{};return {name:c.customer_name||null,mobile:c.customer_mobile||null,address:c.customer_address||null,national_id:d.national_id||null,account_number:d.account_number||null,card_number:d.card_number||null,iban:d.iban||null}})(),buyer:latestAuction?.winner_id?(legalBuyerById[latestAuction.winner_id]||null):null}}:{}),assigned_to_me:role==="expert"&&!!staffMemberId&&c.assigned_expert_staff_id===staffMemberId,vehicles:vehicles.filter((v:any)=>v.case_id===c.id),inspection:(inspections.find((i:any)=>i.case_id===c.id)||null),defects:inspections.filter((i:any)=>i.case_id===c.id).flatMap((i:any)=>defects.filter((d:any)=>d.inspection_id===i.id)),documents:cd,photos:cp,history:history.filter((h:any)=>h.case_id===c.id),team_updates:tu,financial_entries:fe,contract_records:cr,sales_calculation:calc,auction:(()=>{const ca=auctions.filter((a:any)=>a.case_id===c.id);const latest=ca[0]||null;if(!latest)return null;const withdrawals=ca.filter((a:any)=>a.status==="ended"&&(a.purchase_stage==="cancelled"||a.winner_response_status==="declined"));return {...latest,withdrawal_order:withdrawals.length}})()}}),statusFa});
}
async function saveDraft(req:Request,id:string){const b=await req.json();const data=b.data&&typeof b.data==="object"?b.data:{};const {error}=await db.from("inspection_drafts").upsert({case_id:id,data,updated_at:new Date().toISOString()},{onConflict:"case_id"});return error?json({error:error.message},500):json({ok:true})}
async function getDraft(id:string){const {data,error}=await db.from("inspection_drafts").select("data,updated_at").eq("case_id",id).maybeSingle();return error?json({error:error.message},500):json({ok:true,draft:data||null})}async function sha256Hex(v:string){const d=new TextEncoder().encode(v);const h=await crypto.subtle.digest("SHA-256",d);return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,"0")).join("")}
function randCode(){return String(Math.floor(100000+Math.random()*900000))}
function randToken(){const b=new Uint8Array(32);crypto.getRandomValues(b);return btoa(String.fromCharCode(...b)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
async function auctionToken(req:Request,u:URL){const h=req.headers.get("authorization")||"";const bearer=h.startsWith("Bearer ")?h.slice(7).trim():"";const queryToken=(u.searchParams.get("token")||"").trim();const candidates=[...new Set([bearer,queryToken].filter(Boolean))];if(!candidates.length)return null;let session:any=null;for(const t of candidates){const th=await sha256Hex(t);const r=await db.from("auction_sessions").select("id,member_id,expires_at").eq("token_hash",th).gt("expires_at",new Date().toISOString()).maybeSingle();if(r.data){session=r.data;break}}if(!session)return null;const nextExpiry=new Date(Date.now()+90*24*60*60*1000).toISOString();const renewed=await db.from("auction_sessions").update({expires_at:nextExpiry}).eq("id",session.id);return renewed.error?session:{...session,expires_at:nextExpiry}}
async function sendAuctionCode(mobile:string,code:string){const hook=Deno.env.get("SMS_WEBHOOK_URL")||"";if(!hook)return false;try{const r=await fetch(hook,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mobile,code,template:"S2S_AUCTION_LOGIN"})});return r.ok}catch(_){return false}}
async function requestAuctionOtp(req:Request){
 const b=await req.json();
 const toEnglish=(v:string)=>v.replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d));
 const mobile=toEnglish(String(b.mobile||"").replace(/\s/g,"")),name=String(b.full_name||"").trim().slice(0,120);
 if(!/^09\d{9}$/.test(mobile))return json({error:"شماره موبایل باید با 09 شروع شود و دقیقاً ۱۱ رقم داشته باشد؛ مثل 09123456789"},400);
 const recent=await db.from("auction_otp_codes").select("created_at").eq("mobile",mobile).order("created_at",{ascending:false}).limit(1).maybeSingle();
 if(recent.data&&Date.now()-new Date(recent.data.created_at).getTime()<60000)return json({error:"لطفاً ۶۰ ثانیه بعد دوباره درخواست کد کنید"},429);
 const code=randCode(),hash=await sha256Hex(code);
 // SMS is intentionally not required: the manager reads this short-lived code in the admin panel.
 const ins=await db.from("auction_otp_codes").insert({mobile,code_hash:hash,display_code:code,expires_at:new Date(Date.now()+5*60000).toISOString()}).select("id").single();
 if(ins.error)return json({error:"ذخیره کد ورود ناموفق بود"},500);
 const mr=await db.from("auction_members").upsert({mobile,full_name:name||null,updated_at:new Date().toISOString()},{onConflict:"mobile"});
 if(mr.error)return json({error:mr.error.message},500);
 return json({ok:true,request_id:ins.data.id,delivery:"admin-approval",message:"درخواست ثبت شد؛ پس از تأیید همکاران، کد همین‌جا نمایش داده می‌شود."});
}
async function verifyAuctionOtp(req:Request){const b=await req.json(),toEnglish=(v:string)=>v.replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)),mobile=toEnglish(String(b.mobile||"").replace(/\s/g,"")),code=toEnglish(String(b.code||"").trim());if(!/^09\d{9}$/.test(mobile)||!/^\d{6}$/.test(code))return json({error:"شماره موبایل یا کد نامعتبر است"},400);const r=await db.from("auction_otp_codes").select("*").eq("mobile",mobile).is("verified_at",null).order("created_at",{ascending:false}).limit(1).maybeSingle();if(!r.data)return json({error:"کد پیدا نشد؛ دوباره درخواست کد کنید"},400);if(new Date(r.data.expires_at).getTime()<Date.now())return json({error:"کد منقضی شده است"},400);if(Number(r.data.attempts)>=5)return json({error:"تعداد تلاش بیش از حد مجاز است"},429);const h=await sha256Hex(code);if(h!==r.data.code_hash){await db.from("auction_otp_codes").update({attempts:Number(r.data.attempts)+1}).eq("id",r.data.id);return json({error:"کد واردشده صحیح نیست"},400)}await db.from("auction_otp_codes").update({verified_at:new Date().toISOString()}).eq("id",r.data.id);const mr=await db.from("auction_members").select("*").eq("mobile",mobile).single();if(mr.error)return json({error:mr.error.message},500);const raw=randToken(),th=await sha256Hex(raw);const sessionInsert=await db.from("auction_sessions").insert({member_id:mr.data.id,token_hash:th,expires_at:new Date(Date.now()+90*24*60*60*1000).toISOString()});if(sessionInsert.error){console.error("auction_session_insert_failed",sessionInsert.error.message);return json({error:"ساخت نشست ورود ناموفق بود. دوباره تلاش کن."},500)}return json({ok:true,verified:true,subscription_required:false,token:raw,expires_in:7776000})}

function b64urlEncode(bytes:Uint8Array){let raw="";for(const x of bytes)raw+=String.fromCharCode(x);return btoa(raw).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/g,"")}
function b64urlDecode(value:string){const raw=atob(value.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((value.length+3)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
function passkeyConfig(req:Request){const origin=Deno.env.get("PASSKEY_ORIGIN")||req.headers.get("origin")||new URL(req.url).origin;try{const parsed=new URL(origin);if(parsed.protocol!=="https:"&&parsed.hostname!=="localhost")return null;return {origin:parsed.origin,rpID:parsed.hostname}}catch(_){return null}}
async function savePasskeyChallenge(memberId:string,challenge:string,purpose:string){const r=await db.from("auction_passkey_challenges").upsert({member_id:memberId,challenge,purpose,expires_at:new Date(Date.now()+5*60*1000).toISOString(),created_at:new Date().toISOString()},{onConflict:"member_id"});return !r.error}
async function passkeyRegistrationOptions(req:Request,u:URL){const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);const cfg=passkeyConfig(req);if(!cfg)return json({error:"برای فعال‌سازی ورود اثر انگشت، نشانی اصلی سایت را در تنظیم PASSKEY_ORIGIN ثبت کنید."},503);const mr=await db.from("auction_members").select("id,mobile,full_name,subscription_status,paid_until").eq("id",sess.member_id).maybeSingle();if(mr.error||!mr.data)return json({error:"حساب خریدار پیدا نشد."},404);if(mr.data.subscription_status!=="active"||!mr.data.paid_until||new Date(mr.data.paid_until).getTime()<=Date.now())return json({error:"فعال‌سازی ورود اثر انگشت فقط با اشتراک معتبر امکان‌پذیر است."},403);const existing=await db.from("auction_member_passkeys").select("credential_id").eq("member_id",sess.member_id);if(existing.error)return json({error:existing.error.message},500);const options=await generateRegistrationOptions({rpName:"سوییچ به سوییچ",rpID:cfg.rpID,userID:new TextEncoder().encode(sess.member_id),userName:mr.data.mobile,userDisplayName:mr.data.full_name||mr.data.mobile,attestationType:"none",excludeCredentials:(existing.data||[]).map((x:any)=>({id:x.credential_id})),authenticatorSelection:{residentKey:"preferred",userVerification:"required"}});if(!await savePasskeyChallenge(sess.member_id,options.challenge,"registration"))return json({error:"ذخیره درخواست امنیتی ناموفق بود."},500);return json({ok:true,options})}
async function passkeyRegistrationVerify(req:Request,u:URL){const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);const cfg=passkeyConfig(req);if(!cfg)return json({error:"تنظیم نشانی سایت برای ورود اثر انگشت انجام نشده است."},503);let b:any;try{b=await req.json()}catch(_){return json({error:"اطلاعات اثر انگشت نامعتبر است."},400)}const cr=await db.from("auction_passkey_challenges").select("*").eq("member_id",sess.member_id).eq("purpose","registration").maybeSingle();if(cr.error||!cr.data||new Date(cr.data.expires_at).getTime()<Date.now())return json({error:"درخواست امنیتی منقضی شده؛ دوباره تلاش کن."},400);try{const verification=await verifyRegistrationResponse({response:b.response,expectedChallenge:cr.data.challenge,expectedOrigin:cfg.origin,expectedRPID:cfg.rpID,requireUserVerification:true});if(!verification.verified||!verification.registrationInfo)return json({error:"تأیید اثر انگشت انجام نشد."},400);const info:any=verification.registrationInfo;const credential=info.credential||{id:info.credentialID?b64urlEncode(info.credentialID):String(b.response?.id||""),publicKey:info.credentialPublicKey,counter:info.counter};const id=String(credential.id||"");const pub=credential.publicKey instanceof Uint8Array?b64urlEncode(credential.publicKey):b64urlEncode(new Uint8Array(credential.publicKey||[]));if(!id||!pub)return json({error:"اطلاعات کلید امنیتی کامل نیست."},400);const ins=await db.from("auction_member_passkeys").upsert({member_id:sess.member_id,credential_id:id,public_key:pub,counter:Number(credential.counter||0),transports:Array.isArray(b.response?.response?.transports)?b.response.response.transports:[]},{onConflict:"credential_id"});if(ins.error)return json({error:"ذخیره ورود اثر انگشت ناموفق بود."},500);await db.from("auction_passkey_challenges").delete().eq("member_id",sess.member_id);return json({ok:true,message:"ورود با اثر انگشت برای این دستگاه فعال شد."})}catch(_){return json({error:"تأیید امنیتی ناموفق بود؛ دوباره تلاش کن."},400)}}
async function passkeyAuthenticationOptions(req:Request){const cfg=passkeyConfig(req);if(!cfg)return json({error:"تنظیم نشانی سایت برای ورود اثر انگشت انجام نشده است."},503);let b:any;try{b=await req.json()}catch(_){return json({error:"شماره موبایل را وارد کن."},400)}const mobile=String(b.mobile||"").replace(/\s/g,"");if(!/^09\\d{9}$/.test(mobile))return json({error:"شماره موبایل معتبر نیست."},400);const mr=await db.from("auction_members").select("id,subscription_status,paid_until").eq("mobile",mobile).maybeSingle();if(mr.error||!mr.data)return json({error:"برای این حساب ورود با اثر انگشت ثبت نشده است."},404);if(mr.data.subscription_status!=="active"||!mr.data.paid_until||new Date(mr.data.paid_until).getTime()<=Date.now())return json({error:"برای ورود با اثر انگشت، اشتراک باید فعال و معتبر باشد."},403);const keys=await db.from("auction_member_passkeys").select("credential_id,transports").eq("member_id",mr.data.id);if(keys.error)return json({error:keys.error.message},500);if(!keys.data?.length)return json({error:"هنوز ورود با اثر انگشت برای این حساب فعال نشده است."},404);const options=await generateAuthenticationOptions({rpID:cfg.rpID,allowCredentials:keys.data.map((x:any)=>({id:x.credential_id,transports:x.transports||[],type:"public-key"})),userVerification:"required"});if(!await savePasskeyChallenge(mr.data.id,options.challenge,"authentication"))return json({error:"ذخیره درخواست امنیتی ناموفق بود."},500);return json({ok:true,options})}
async function passkeyAuthenticationVerify(req:Request){const cfg=passkeyConfig(req);if(!cfg)return json({error:"تنظیم نشانی سایت برای ورود اثر انگشت انجام نشده است."},503);let b:any;try{b=await req.json()}catch(_){return json({error:"پاسخ اثر انگشت نامعتبر است."},400)}const mobile=String(b.mobile||"").replace(/\s/g,"");if(!/^09\\d{9}$/.test(mobile)||!b.response?.id)return json({error:"شماره موبایل یا پاسخ اثر انگشت نامعتبر است."},400);const mr=await db.from("auction_members").select("id,subscription_status,paid_until").eq("mobile",mobile).maybeSingle();if(mr.error||!mr.data)return json({error:"حساب خریدار پیدا نشد."},404);if(mr.data.subscription_status!=="active"||!mr.data.paid_until||new Date(mr.data.paid_until).getTime()<=Date.now())return json({error:"اشتراک فعال و معتبر نیست."},403);const challenge=await db.from("auction_passkey_challenges").select("*").eq("member_id",mr.data.id).eq("purpose","authentication").maybeSingle();if(challenge.error||!challenge.data||new Date(challenge.data.expires_at).getTime()<Date.now())return json({error:"درخواست اثر انگشت منقضی شده؛ دوباره تلاش کن."},400);const key=await db.from("auction_member_passkeys").select("*").eq("member_id",mr.data.id).eq("credential_id",String(b.response.id)).maybeSingle();if(key.error||!key.data)return json({error:"این دستگاه برای حساب ثبت نشده است."},403);try{const verification=await verifyAuthenticationResponse({response:b.response,expectedChallenge:challenge.data.challenge,expectedOrigin:cfg.origin,expectedRPID:cfg.rpID,credential:{id:key.data.credential_id,publicKey:b64urlDecode(key.data.public_key),counter:Number(key.data.counter||0),transports:key.data.transports||[]},requireUserVerification:true});if(!verification.verified)return json({error:"تأیید اثر انگشت ناموفق بود."},401);const up=await db.from("auction_member_passkeys").update({counter:Number(verification.authenticationInfo.newCounter||0),last_used_at:new Date().toISOString()}).eq("id",key.data.id);if(up.error)return json({error:"ثبت ورود امن ناموفق بود."},500);await db.from("auction_passkey_challenges").delete().eq("member_id",mr.data.id);const raw=randToken(),th=await sha256Hex(raw);const ins=await db.from("auction_sessions").insert({member_id:mr.data.id,token_hash:th,expires_at:new Date(Date.now()+90*24*60*60*1000).toISOString()});if(ins.error)return json({error:"ایجاد نشست ورود ناموفق بود."},500);return json({ok:true,verified:true,token:raw,expires_in:7776000})}catch(_){return json({error:"تأیید امنیتی انجام نشد؛ دوباره تلاش کن."},401)}}

async function startAuctionSubscription(req:Request){const b=await req.json(),mobile=String(b.mobile||"").replace(/\s/g,""),name=String(b.full_name||"").trim();if(!/^09\d{9}$/.test(mobile))return json({error:"شماره موبایل معتبر نیست"},400);const mr=await db.from("auction_members").upsert({mobile,full_name:name||null,subscription_status:"pending",updated_at:new Date().toISOString()},{onConflict:"mobile"}).select("id,mobile,full_name,subscription_status").single();if(mr.error)return json({error:mr.error.message},500);const url=Deno.env.get("AUCTION_PAYMENT_URL")||"";return json({ok:true,member:mr.data,payment_required:true,amount:Number(Deno.env.get("AUCTION_SUBSCRIPTION_AMOUNT")||0),payment_url:url||null,message:url?"برای پرداخت اشتراک وارد درگاه شوید.":"درگاه پرداخت هنوز تنظیم نشده است."})}
async function auctionLoginCodes(u:URL){const {data,error}=await db.from("auction_otp_codes").select("id,mobile,display_code,created_at,expires_at,verified_at").is("verified_at",null).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(30);return error?json({error:error.message},500):json({ok:true,codes:data||[]})}
async function auctionCodeStatus(u:URL){const id=u.searchParams.get("id")||"",mobile=(u.searchParams.get("mobile")||"").replace(/\s/g,"");if(!id||!/^09\d{9}$/.test(mobile))return json({error:"درخواست نامعتبر است"},400);const {data,error}=await db.from("auction_otp_codes").select("id,mobile,display_code,approved_at,expires_at").eq("id",id).eq("mobile",mobile).maybeSingle();if(error)return json({error:"بررسی وضعیت کد ناموفق بود"},500);if(!data)return json({error:"درخواست کد پیدا نشد"},404);if(new Date(data.expires_at).getTime()<Date.now())return json({expired:true,approved:false});return json({ok:true,approved:!!data.approved_at,code:data.approved_at?data.display_code:null});}
async function adminApproveAuctionCode(req:Request){const b=await req.json(),id=String(b.id||"");if(!id)return json({error:"شناسه درخواست لازم است"},400);const {data,error}=await db.from("auction_otp_codes").update({approved_at:new Date().toISOString()}).eq("id",id).is("verified_at",null).gt("expires_at",new Date().toISOString()).select("id,mobile,display_code").maybeSingle();if(error)return json({error:"تأیید کد انجام نشد: "+error.message},500);if(!data)return json({error:"درخواست منقضی شده یا قبلاً مصرف شده است"},400);return json({ok:true,mobile:data.mobile});}
async function auctionMembers(){const {data,error}=await db.from("auction_members").select("id,mobile,full_name,national_id,address,subscription_status,paid_at,paid_until,created_at,updated_at,identity_document_path,identity_uploaded_at,identity_verified,identity_review_note").order("created_at",{ascending:false});if(error)return json({error:error.message},500);const ids=(data||[]).map((m:any)=>m.id);const wr=ids.length?await db.from("auction_wallet_transactions").select("buyer_id,amount,direction").in("buyer_id",ids):{data:[],error:null};if(wr.error)return json({error:wr.error.message},500);const balances:any={};for(const t of wr.data||[])balances[t.buyer_id]=(balances[t.buyer_id]||0)+(t.direction==="credit"?1:-1)*Number(t.amount||0);const paths=(data||[]).map((x:any)=>x.identity_document_path).filter(Boolean);const signed=paths.length?(await db.storage.from("s2s-documents").createSignedUrls(paths,1800)).data||[]:[];return json({ok:true,members:(data||[]).map((m:any)=>({...m,wallet_balance:balances[m.id]||0,identity_url:signed.find((x:any)=>x.path===m.identity_document_path)?.signedUrl||null}))})}
async function getWalletBankSettings(){const r=await db.from("wallet_bank_settings").select("bank_name,account_holder,card_number,account_number,sheba,updated_at").eq("id",true).maybeSingle();if(r.error)return json({error:r.error.message},500);return json({ok:true,settings:r.data||{bank_name:"",account_holder:"",card_number:"",account_number:"",sheba:""}})}
async function saveWalletBankSettings(req:Request){let b:any;try{b=await req.json()}catch(_){return json({error:"اطلاعات حساب معتبر نیست"},400)}const bank_name=String(b.bank_name||"").trim().slice(0,100),account_holder=String(b.account_holder||"").trim().slice(0,120),card_number=String(b.card_number||"").replace(/[\\s-]/g,"").slice(0,24),account_number=String(b.account_number||"").trim().slice(0,40),sheba=String(b.sheba||"").replace(/[\\s-]/g,"").toUpperCase().slice(0,30);if(card_number&&!/^[0-9۰-۹]{16}$/.test(card_number))return json({error:"شماره کارت باید ۱۶ رقم باشد"},400);if(sheba&&!/^IR[0-9]{24}$/.test(sheba))return json({error:"شماره شبا باید با IR و ۲۴ رقم وارد شود"},400);if(!account_holder||(!card_number&&!account_number&&!sheba))return json({error:"نام صاحب حساب و دست‌کم یکی از شماره‌های کارت، حساب یا شبا را وارد کنید"},400);const r=await db.from("wallet_bank_settings").upsert({id:true,bank_name,account_holder,card_number,account_number,sheba,updated_at:new Date().toISOString()},{onConflict:"id"}).select("bank_name,account_holder,card_number,account_number,sheba,updated_at").single();if(r.error)return json({error:"ذخیره اطلاعات حساب ناموفق بود: "+r.error.message},500);return json({ok:true,settings:r.data})}
async function buyerSubmitWalletTopup(req:Request,u:URL){const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);let b:any;try{b=await req.json()}catch(_){return json({error:"اطلاعات درخواست نامعتبر است"},400)}const amount=Number(b.amount),dataUrl=String(b.data_url||""),note=String(b.note||"").trim().slice(0,500);if(!Number.isSafeInteger(amount)||amount<=0||amount>1000000000000)return json({error:"مبلغ باید عدد صحیح و بیشتر از صفر باشد"},400);if(!dataUrl.startsWith("data:image/")||!dataUrl.includes(";base64,"))return json({error:"عکس فیش واریز را انتخاب کن"},400);const [head,raw]=dataUrl.split(",",2),mime=(head.match(/data:(.*?);base64/)||[])[1]||"image/jpeg";let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0))}catch(_){return json({error:"فایل فیش معتبر نیست"},400)}if(bytes.length>5*1024*1024)return json({error:"حجم فیش باید کمتر از ۵ مگابایت باشد"},400);const pending=await db.from("wallet_topup_requests").select("id").eq("buyer_id",sess.member_id).eq("status","pending").limit(1);if(pending.data?.length)return json({error:"یک درخواست شارژ در انتظار بررسی داری؛ بعد از بررسی مدیریت دوباره درخواست بده."},409);const ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg",path="wallet-topups/"+sess.member_id+"/"+crypto.randomUUID()+"."+ext;const up=await db.storage.from("s2s-documents").upload(path,bytes,{contentType:mime,upsert:false});if(up.error)return json({error:"بارگذاری فیش انجام نشد: "+up.error.message},500);const ins=await db.from("wallet_topup_requests").insert({buyer_id:sess.member_id,amount,receipt_path:path,buyer_note:note}).select("id,amount,status,created_at").single();if(ins.error){await db.storage.from("s2s-documents").remove([path]);return json({error:"ثبت درخواست شارژ انجام نشد: "+ins.error.message},500)}return json({ok:true,request:ins.data,message:"فیش ارسال شد؛ پس از بررسی مدیریت، در صورت تأیید موجودی کیف پول شارژ می‌شود."},201)}
async function buyerWalletTopupRequests(req:Request,u:URL){const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);const r=await db.from("wallet_topup_requests").select("id,amount,status,buyer_note,review_note,created_at,reviewed_at").eq("buyer_id",sess.member_id).order("created_at",{ascending:false}).limit(30);if(r.error)return json({error:r.error.message},500);return json({requests:r.data||[]})}

async function buyerSubmitSubscriptionPayment(req:Request,u:URL){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 let b:any;try{b=await req.json()}catch(_){return json({error:"اطلاعات درخواست نامعتبر است"},400)}
 const months=Number(b.plan_months),prices:any={3:6000000,6:10000000,12:15000000},amount=prices[months],dataUrl=String(b.data_url||"");
 if(!amount)return json({error:"مدت اشتراک معتبر نیست؛ یکی از پلن‌های ۳، ۶ یا ۱۲ ماهه را انتخاب کن."},400);
 if(!dataUrl.startsWith("data:image/")||!dataUrl.includes(";base64,"))return json({error:"عکس فیش واریز اشتراک را انتخاب کن."},400);
 const [head,raw]=dataUrl.split(",",2),mime=(head.match(/data:(.*?);base64/)||[])[1]||"image/jpeg";
 let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0))}catch(_){return json({error:"فایل فیش معتبر نیست."},400)}
 if(bytes.length>5*1024*1024)return json({error:"حجم فیش باید کمتر از ۵ مگابایت باشد."},400);
 const pending=await db.from("auction_subscription_payment_requests").select("id").eq("buyer_id",sess.member_id).eq("status","pending").limit(1);
 if(pending.error)return json({error:pending.error.message},500);
 if(pending.data?.length)return json({error:"یک فیش خرید اشتراک در انتظار بررسی مدیریت داری؛ پس از بررسی دوباره اقدام کن."},409);
 const ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg",path="subscription-payments/"+sess.member_id+"/"+crypto.randomUUID()+"."+ext;
 const up=await db.storage.from("s2s-documents").upload(path,bytes,{contentType:mime,upsert:false});
 if(up.error)return json({error:"بارگذاری فیش انجام نشد: "+up.error.message},500);
 const ins=await db.from("auction_subscription_payment_requests").insert({buyer_id:sess.member_id,plan_months:months,amount,receipt_path:path}).select("id,plan_months,amount,status,created_at").single();
 if(ins.error){await db.storage.from("s2s-documents").remove([path]);return json({error:"ثبت درخواست خرید اشتراک انجام نشد: "+ins.error.message},500)}
 return json({ok:true,request:ins.data,message:"فیش خرید اشتراک ارسال شد؛ پس از بررسی و تأیید مدیریت، اشتراک فعال می‌شود."},201)
}
async function buyerSubscriptionPaymentRequests(req:Request,u:URL){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 const r=await db.from("auction_subscription_payment_requests").select("id,plan_months,amount,status,buyer_note,review_note,created_at,reviewed_at").eq("buyer_id",sess.member_id).order("created_at",{ascending:false}).limit(20);
 if(r.error)return json({error:r.error.message},500);return json({requests:r.data||[]})
}
async function adminSubscriptionPaymentRequests(){
 const r=await db.from("auction_subscription_payment_requests").select("id,buyer_id,plan_months,amount,status,buyer_note,review_note,created_at,reviewed_at,receipt_path").order("created_at",{ascending:false}).limit(100);
 if(r.error)return json({error:r.error.message},500);
 const ids=[...new Set((r.data||[]).map((x:any)=>x.buyer_id))];
 const m=ids.length?await db.from("auction_members").select("id,mobile,full_name,subscription_status,paid_until").in("id",ids):{data:[],error:null};
 if(m.error)return json({error:m.error.message},500);
 const members:any={};for(const x of m.data||[])members[x.id]=x;
 const items=[];for(const x of r.data||[]){const s=await db.storage.from("s2s-documents").createSignedUrl(x.receipt_path,600);items.push({...x,member:members[x.buyer_id]||null,receipt_url:s.data?.signedUrl||null})}
 return json({requests:items})
}
async function adminReviewSubscriptionPayment(req:Request){
 let b:any;try{b=await req.json()}catch(_){return json({error:"درخواست نامعتبر است"},400)}
 const id=String(b.request_id||""),status=String(b.status||""),note=String(b.note||"").trim().slice(0,500);
 if(!id||!["approved","rejected"].includes(status))return json({error:"وضعیت بررسی معتبر نیست"},400);
 const cur=await db.from("auction_subscription_payment_requests").select("*").eq("id",id).maybeSingle();
 if(cur.error||!cur.data)return json({error:"درخواست خرید اشتراک پیدا نشد"},404);
 if(cur.data.status!=="pending")return json({error:"این فیش قبلاً بررسی شده است"},409);
 const now=new Date(),nowIso=now.toISOString();
 const up=await db.from("auction_subscription_payment_requests").update({status,review_note:note,reviewed_at:nowIso,reviewed_by:"admin"}).eq("id",id).eq("status","pending").select("id").maybeSingle();
 if(up.error)return json({error:up.error.message},500);if(!up.data)return json({error:"این فیش قبلاً بررسی شده است"},409);
 if(status==="approved"){
  const member=await db.from("auction_members").select("id,paid_until").eq("id",cur.data.buyer_id).maybeSingle();
  if(member.error||!member.data){await db.from("auction_subscription_payment_requests").update({status:"pending",reviewed_at:null,reviewed_by:null}).eq("id",id);return json({error:"حساب خریدار پیدا نشد؛ فیش در انتظار بررسی باقی ماند."},500)}
  const base=member.data.paid_until&&new Date(member.data.paid_until).getTime()>now.getTime()?new Date(member.data.paid_until).getTime():now.getTime();
  const days=Number(cur.data.plan_months)*30,until=new Date(base+days*86400000).toISOString();
  const activate=await db.from("auction_members").update({subscription_status:"active",paid_at:nowIso,paid_until:until,updated_at:nowIso}).eq("id",cur.data.buyer_id);
  if(activate.error){await db.from("auction_subscription_payment_requests").update({status:"pending",reviewed_at:null,reviewed_by:null}).eq("id",id);return json({error:"تأیید فیش انجام شد اما فعال‌سازی اشتراک ناموفق بود؛ دوباره تلاش کن. "+activate.error.message},500)}
 }
 await db.from("buyer_notifications").insert({buyer_id:cur.data.buyer_id,title:status==="approved"?"فیش خرید اشتراک تأیید شد":"فیش خرید اشتراک رد شد",message:status==="approved"?"پرداخت شما تأیید شد و اشتراک مزایده فعال شد.":"فیش خرید اشتراک تأیید نشد. "+(note||"برای راهنمایی با پشتیبانی تماس بگیر.")});
 return json({ok:true,status})
}
async function adminWalletTopupRequests(u:URL){const r=await db.from("wallet_topup_requests").select("id,buyer_id,amount,status,buyer_note,review_note,created_at,reviewed_at,receipt_path").order("created_at",{ascending:false}).limit(100);if(r.error)return json({error:r.error.message},500);const ids=[...new Set((r.data||[]).map((x:any)=>x.buyer_id))];const m=ids.length?await db.from("auction_members").select("id,mobile,full_name").in("id",ids):{data:[],error:null};if(m.error)return json({error:m.error.message},500);const members:any={};for(const x of m.data||[])members[x.id]=x;const items=[];for(const x of r.data||[]){const s=await db.storage.from("s2s-documents").createSignedUrl(x.receipt_path,600);items.push({...x,member:members[x.buyer_id]||null,receipt_url:s.data?.signedUrl||null})}return json({requests:items})}
async function adminReviewWalletTopup(req:Request){let b:any;try{b=await req.json()}catch(_){return json({error:"درخواست نامعتبر است"},400)}const id=String(b.request_id||""),status=String(b.status||""),note=String(b.note||"").trim().slice(0,500);if(!id||!["approved","rejected"].includes(status))return json({error:"وضعیت بررسی معتبر نیست"},400);const cur=await db.from("wallet_topup_requests").select("*").eq("id",id).maybeSingle();if(cur.error||!cur.data)return json({error:"درخواست شارژ پیدا نشد"},404);if(cur.data.status!=="pending")return json({error:"این درخواست قبلاً بررسی شده است"},409);const up=await db.from("wallet_topup_requests").update({status,review_note:note,reviewed_at:new Date().toISOString(),reviewed_by:"admin"}).eq("id",id).eq("status","pending").select("id").maybeSingle();if(up.error)return json({error:up.error.message},500);if(!up.data)return json({error:"این درخواست قبلاً بررسی شده است"},409);if(status==="approved"){const ins=await db.from("auction_wallet_transactions").insert({buyer_id:cur.data.buyer_id,amount:cur.data.amount,direction:"credit",note:"شارژ کیف پول پس از تأیید فیش"+(note?" — "+note:""),created_by:"admin"});if(ins.error){await db.from("wallet_topup_requests").update({status:"pending",reviewed_at:null,reviewed_by:null}).eq("id",id).eq("status","approved");return json({error:"درخواست تأیید شد اما شارژ کیف پول ثبت نشد؛ دوباره تلاش کن. "+ins.error.message},500)}}await db.from("buyer_notifications").insert({buyer_id:cur.data.buyer_id,title:status==="approved"?"شارژ کیف پول تأیید شد":"فیش شارژ کیف پول رد شد",message:status==="approved"?"واریز شما تأیید شد و مبلغ به کیف پول اضافه شد.":"فیش شارژ کیف پول تأیید نشد. "+(note||"برای راهنمایی با مدیریت تماس بگیر.")});return json({ok:true,status})}
async function adminTopupWallet(req:Request){
 const b=await req.json(),mobile=String(b.mobile||"").replace(/\s/g,""),amount=Number(b.amount),note=String(b.note||"شارژ کیف پول توسط مدیریت").trim().slice(0,500);
 if(!/^09\\d{9}$/.test(mobile))return json({error:"شماره موبایل معتبر نیست"},400);
 if(!Number.isSafeInteger(amount)||amount<=0||amount>1000000000000)return json({error:"مبلغ شارژ باید عدد صحیح و بیشتر از صفر باشد"},400);
 const mr=await db.from("auction_members").select("id,mobile,full_name").eq("mobile",mobile).maybeSingle();
 if(mr.error)return json({error:mr.error.message},500);if(!mr.data)return json({error:"عضو مزایده با این شماره پیدا نشد"},404);
 const ins=await db.from("auction_wallet_transactions").insert({buyer_id:mr.data.id,amount,direction:"credit",note:note||"شارژ کیف پول توسط مدیریت",created_by:"admin"}).select("id,buyer_id,amount,direction,note,created_at").single();
 if(ins.error)return json({error:"ثبت شارژ کیف پول ناموفق بود: "+ins.error.message},500);
 const sum=await db.from("auction_wallet_transactions").select("amount,direction").eq("buyer_id",mr.data.id);
 if(sum.error)return json({error:"شارژ ثبت شد اما دریافت موجودی جدید ناموفق بود"},500);
 const balance=(sum.data||[]).reduce((v:any,t:any)=>v+(t.direction==="credit"?1:-1)*Number(t.amount||0),0);
 await db.from("buyer_notifications").insert({buyer_id:mr.data.id,title:"کیف پول شارژ شد",message:"کیف پول شما به مبلغ "+amount.toLocaleString("fa-IR")+" تومان توسط مدیریت شارژ شد. موجودی فعلی: "+balance.toLocaleString("fa-IR")+" تومان."});
 return json({ok:true,member:mr.data,transaction:ins.data,balance});
}
async function deleteAuctionMember(req:Request){const b=await req.json();const mobile=String(b.mobile||"").replace(/\s/g,"");if(!/^09\d{9}$/.test(mobile))return json({error:"شماره موبایل معتبر نیست"},400);const member=await db.from("auction_members").select("id,mobile,full_name").eq("mobile",mobile).maybeSingle();if(member.error)return json({error:member.error.message},500);if(!member.data)return json({error:"عضو پیدا نشد"},404);const s=await db.from("auction_sessions").delete().eq("member_id",member.data.id);if(s.error)return json({error:s.error.message},500);const bids=await db.from("bids").delete().eq("buyer_id",member.data.id);if(bids.error)return json({error:bids.error.message},500);const otp=await db.from("auction_otp_codes").delete().eq("mobile",mobile);if(otp.error)return json({error:otp.error.message},500);const gone=await db.from("auction_members").delete().eq("id",member.data.id);if(gone.error)return json({error:gone.error.message},500);return json({ok:true,mobile,full_name:member.data.full_name})}
async function deactivateAuctionMember(req:Request){const b=await req.json();const mobile=String(b.mobile||"").replace(/\s/g,"");if(!/^09\d{9}$/.test(mobile))return json({error:"شماره موبایل معتبر نیست"},400);const r=await db.from("auction_members").update({subscription_status:"inactive",updated_at:new Date().toISOString()}).eq("mobile",mobile).select("id,mobile,full_name,subscription_status,paid_until").single();return r.error?json({error:r.error.message},500):json({ok:true,member:r.data})}
async function updateAuctionMember(req:Request){
 const b=await req.json();
 const mobile=String(b.mobile||"").replace(/\s/g,"");
 const full_name=String(b.full_name||"").trim().slice(0,120);
 const days=Number(b.days);
 if(!/^09\d{9}$/.test(mobile))return json({error:"شماره موبایل معتبر نیست"},400);
 if(!full_name)return json({error:"نام عضو الزامی است"},400);
 if(!Number.isInteger(days)||days<1||days>3650)return json({error:"مدت اشتراک باید بین ۱ تا ۳۶۵۰ روز باشد"},400);
 const now=new Date().toISOString(),until=new Date(Date.now()+days*86400000).toISOString();
 const r=await db.from("auction_members").update({full_name,subscription_status:"active",paid_at:now,paid_until:until,updated_at:now}).eq("mobile",mobile).select("id,mobile,full_name,subscription_status,paid_at,paid_until").single();
 if(r.error)return json({error:r.error.message},500);
 const nr=await db.from("buyer_notifications").insert({buyer_id:r.data.id,title:"اشتراک مزایده فعال شد",message:"اشتراک مزایده شما فعال شد؛ اکنون می‌توانید وارد مزایده شوید و پیشنهاد قیمت ثبت کنید."});
 return json({ok:true,member:r.data,notification_sent:!nr.error});
}
async function activateAuctionMember(u:URL,req:Request){
 const b=await req.json();
 const mobile=String(b.mobile||"").replace(/\s/g,"");
 const days=Math.max(1,Number(b.days||30));
 if(!/^09\d{9}$/.test(mobile))return json({error:"شماره موبایل معتبر نیست"},400);
 const until=new Date(Date.now()+days*86400000).toISOString();
 const r=await db.from("auction_members").update({subscription_status:"active",paid_at:new Date().toISOString(),paid_until:until,updated_at:new Date().toISOString()}).eq("mobile",mobile).select("id,mobile,full_name,subscription_status,paid_until").single();
 if(r.error)return json({error:r.error.message},500);
 const nr=await db.from("buyer_notifications").insert({buyer_id:r.data.id,title:"اشتراک مزایده فعال شد",message:"اشتراک مزایده شما فعال شد؛ اکنون می‌توانید وارد مزایده شوید و پیشنهاد قیمت ثبت کنید."});
 return json({ok:true,member:r.data,notification_sent:!nr.error});
}
async function paymentCallback(req:Request){
 const secret=Deno.env.get("PAYMENT_WEBHOOK_SECRET")||"",got=req.headers.get("x-payment-secret")||"";
 if(!secret||got!==secret)return json({error:"unauthorized"},401);
 const b=await req.json(),mobile=String(b.mobile||"").replace(/\s/g,"");
 if(b.paid!==true)return json({ok:true,ignored:true});
 if(!/^09\d{9}$/.test(mobile))return json({error:"شماره موبایل معتبر نیست"},400);
 const days=Math.max(1,Number(b.days||30)),now=new Date().toISOString(),until=new Date(Date.now()+days*86400000).toISOString();
 const r=await db.from("auction_members").update({subscription_status:"active",paid_at:now,paid_until:until,updated_at:now}).eq("mobile",mobile).select("id").maybeSingle();
 if(r.error)return json({error:r.error.message},500);
 if(r.data?.id)await db.from("buyer_notifications").insert({buyer_id:r.data.id,title:"اشتراک مزایده فعال شد",message:"پرداخت شما تأیید و اشتراک مزایده فعال شد؛ اکنون می‌توانید پیشنهاد قیمت ثبت کنید."});
 return json({ok:true});
}
async function auctionBidState(req:Request,u:URL){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 const buyer=await db.from("auction_members").select("identity_verified").eq("id",sess.member_id).single();
 if(buyer.error||!buyer.data?.identity_verified)return json({error:"احراز هویت کارت ملی باید توسط مدیریت تأیید شود."},403);
 const {data,error}=await db.from("auctions").select("id,status,ends_at,current_bid,starting_price").eq("status","active").order("created_at",{ascending:false});
 if(error)return json({error:error.message},500);
 return json({auctions:(data||[]).filter((a:any)=>new Date(a.ends_at).getTime()>Date.now()).map((a:any)=>({id:a.id,status:a.status,ends_at:a.ends_at,current_bid:a.current_bid,starting_price:a.starting_price}))});
}
async function publicAuctions(req:Request,u:URL){
 const sess=await auctionToken(req,u);
 if(!sess)return json({error:"auction_login_required"},401);
 const buyer=await db.from("auction_members").select("identity_verified").eq("id",sess.member_id).single();
 if(buyer.error||!buyer.data?.identity_verified)return json({error:"احراز هویت کارت ملی باید توسط مدیریت تأیید شود."},403);
 const [setting,auctionResult]=await Promise.all([
  db.from("auction_settings").select("min_increment").eq("id",true).maybeSingle(),
  db.from("auctions").select("id,case_id,vehicle_id,status,starts_at,ends_at,current_bid,starting_price,target_price,fair_price,created_at,prepayment_amount,purchase_stage,seller_account_name,seller_account_number,cancellation_fine_amount").eq("status","active").order("created_at",{ascending:false})
 ]);
 if(auctionResult.error)return json({error:auctionResult.error.message},500);
 const active=(auctionResult.data||[]).filter((a:any)=>new Date(a.ends_at).getTime()>Date.now());
 const expired=(auctionResult.data||[]).filter((a:any)=>new Date(a.ends_at).getTime()<=Date.now());
 if(expired.length)await Promise.all(expired.map(async(a:any)=>Promise.all([
  db.from("auctions").update({status:"ended"}).eq("id",a.id),
  db.from("cases").update({status:"auction-end"}).eq("id",a.case_id)
 ])));
 const out=await Promise.all(active.map(async(a:any)=>{
  const [cr,vr,ir,br,docs]=await Promise.all([
   db.from("cases").select("id,case_number").eq("id",a.case_id).maybeSingle(),
   db.from("vehicles").select("id,brand,model,trim,model_year,color,mileage,body_condition,technical_condition,general_condition,spare_key,fuel_card,power_of_attorney,green_card,factory_invoice,car_document").eq("id",a.vehicle_id).maybeSingle(),
   db.from("inspections").select("id,summary,finished_at,status").eq("case_id",a.case_id).order("finished_at",{ascending:false}).limit(1).maybeSingle(),
   db.from("bids").select("id,amount,created_at").eq("auction_id",a.id).order("amount",{ascending:false}),
   db.from("documents").select("document_type").eq("case_id",a.case_id)
  ]);
  let defects:any[]=[],photos:any[]=[];
  if(ir.data?.id){
   const [dr,pr]=await Promise.all([
    db.from("inspection_defects").select("id,area,part,defect_type,explanation").eq("inspection_id",ir.data.id),
    db.from("inspection_photos").select("id,defect_id,photo_type,label,storage_path,annotation").eq("inspection_id",ir.data.id).neq("photo_type","document")
   ]);
   defects=dr.data||[];photos=pr.data||[];
  }
  const paths=[...new Set(photos.map((x:any)=>x.storage_path).filter(Boolean))] as string[];
  const storage=db.storage.from("s2s-documents");
  // Only request transformed previews once in a batch; original URLs remain available for zoom/fallback.
  const [signedResult,thumbResult]=paths.length?await Promise.all([
   storage.createSignedUrls(paths,3600),
   storage.createSignedUrls(paths,3600,{transform:{width:420,height:315,quality:60,format:"webp"}})
  ]):[{data:[]},{data:[]}];
  const signed=signedResult.data||[],thumbs=thumbResult.data||[];
  const mediaUrl=(p:string)=>signed.find((x:any)=>x.path===p)?.signedUrl||null;
  const thumbUrl=(p:string)=>thumbs.find((x:any)=>x.path===p)?.signedUrl||mediaUrl(p);
  const photoRows=photos.map((p:any)=>({...p,url:mediaUrl(p.storage_path),preview_url:thumbUrl(p.storage_path)}));
  const types=(docs.data||[]).map((x:any)=>String(x.document_type||""));
  return {...a,case:cr.data||null,vehicle:vr.data||null,vehicle_documents:{green_card:types.includes("green_card"),factory_invoice:types.includes("factory_invoice"),car_document:types.includes("car_document_front")&&types.includes("car_document_back")},inspection:ir.data||null,defects:defects.map((d:any)=>({...d,photos:photoRows.filter((p:any)=>p.defect_id===d.id)})),photos:photoRows,bids:(br.data||[]).map((x:any)=>({amount:x.amount,created_at:x.created_at}))};
 }));
 return json({auctions:out,min_increment:Number(setting.data?.min_increment||5000000)});
}
async function buyerDashboard(req:Request,u:URL){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 const mr=await db.from("auction_members").select("id,mobile,full_name,national_id,address,identity_document_path,identity_uploaded_at,identity_verified,identity_review_note,subscription_status,paid_until").eq("id",sess.member_id).single();if(mr.error)return json({error:"خریدار پیدا نشد"},404);
 const [ar,fr,pr,nr,br,wr]=await Promise.all([
  db.from("auctions").select("id,case_id,vehicle_id,status,starts_at,ends_at,current_bid,starting_price,target_price,fair_price,prepayment_amount,purchase_stage,seller_account_name,seller_account_number,cancellation_fine_amount,winner_id,winner_response_status,winner_response_deadline,winner_response_at,created_at").eq("winner_id",sess.member_id).order("created_at",{ascending:false}),
  db.from("fines").select("id,auction_id,amount,paid_amount,reason,status,created_at").eq("buyer_id",sess.member_id).order("created_at",{ascending:false}),
  db.from("buyer_payment_submissions").select("id,auction_id,stage,amount,status,buyer_note,review_note,created_at,reviewed_at,receipt_path").eq("buyer_id",sess.member_id).order("created_at",{ascending:false}),
  db.from("buyer_notifications").select("id,auction_id,title,message,read_at,created_at").eq("buyer_id",sess.member_id).order("created_at",{ascending:false}).limit(50),
  db.from("bids").select("auction_id,amount,created_at").eq("buyer_id",sess.member_id).order("created_at",{ascending:false}).limit(200),
  db.from("auction_wallet_transactions").select("id,amount,direction,note,created_at").eq("buyer_id",sess.member_id).order("created_at",{ascending:false})
 ]);
 for(const x of [ar,fr,pr,nr,br,wr])if(x.error)return json({error:x.error.message},500);
 const walletBalance=(wr.data||[]).reduce((sum:any,t:any)=>sum+(t.direction==="credit"?1:-1)*Number(t.amount||0),0);
 const ids=(ar.data||[]).map((x:any)=>x.case_id).filter(Boolean);const [vr,cr]=await Promise.all([ids.length?db.from("vehicles").select("case_id,brand,model,trim,model_year,color").in("case_id",ids).eq("vehicle_role","current"):{data:[],error:null},ids.length?db.from("cases").select("id,case_number").in("id",ids):{data:[],error:null}]);
 if(vr.error||cr.error)return json({error:vr.error?.message||cr.error?.message},500);
 const auctions=(ar.data||[]).map((a:any)=>({...a,case_number:(cr.data||[]).find((c:any)=>c.id===a.case_id)?.case_number||null,vehicle:(vr.data||[]).find((v:any)=>v.case_id===a.case_id)||null}));
 return json({member:mr.data,auctions,fines:fr.data||[],payments:pr.data||[],notifications:nr.data||[],my_bids:br.data||[],wallet:{balance:walletBalance,transactions:wr.data||[]}});
}
async function buyerDeliveryDetails(req:Request,u:URL,id:string){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 if(!id)return json({error:"شناسه خودرو مشخص نیست"},400);
 const ar=await db.from("auctions").select("id,case_id,status,purchase_stage,winner_id").eq("id",id).maybeSingle();
 if(ar.error)return json({error:ar.error.message},500);
 if(!ar.data||ar.data.winner_id!==sess.member_id)return json({error:"این خودرو در پرونده شما نیست"},403);
 if(ar.data.status!=="ended"||ar.data.purchase_stage!=="vehicle-filed")return json({error:"نشانی تحویل پس از تأیید تسویه کامل نمایش داده می‌شود."},409);
 const cr=await db.from("cases").select("notes").eq("id",ar.data.case_id).maybeSingle();
 if(cr.error)return json({error:cr.error.message},500);
 const notes=String(cr.data?.notes||""),match=notes.match(/\[\[S2S_DELIVERY\]\]([\s\S]*?)\[\[\/S2S_DELIVERY\]\]/);
 if(!match)return json({error:"مدیریت هنوز آدرس و زمان تحویل را ثبت نکرده است."},404);
 let delivery:any;try{delivery=JSON.parse(match[1])}catch(_){return json({error:"اطلاعات تحویل نامعتبر است."},500)}
 if(!delivery.location)return json({error:"مدیریت هنوز نشانی تحویل را ثبت نکرده است."},404);
 return json({delivery:{location:delivery.location,scheduled_date:delivery.scheduled_date,scheduled_time:delivery.scheduled_time}});
}
async function buyerCompleteTransaction(req:Request,u:URL,id:string){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 if(!id)return json({error:"شناسه خودرو مشخص نیست"},400);
 const ar=await db.from("auctions").select("id,case_id,status,purchase_stage,winner_id,current_bid").eq("id",id).maybeSingle();
 if(ar.error)return json({error:ar.error.message},500);
 if(!ar.data||ar.data.winner_id!==sess.member_id)return json({error:"این خودرو در پرونده شما نیست"},403);
 if(ar.data.status!=="ended"||ar.data.purchase_stage!=="vehicle-filed")return json({error:"تکمیل معامله فقط پس از تأیید تسویه نهایی و پیش از ثبت تکمیل امکان‌پذیر است."},409);
 const now=new Date().toISOString();
 const up=await db.from("auctions").update({purchase_stage:"completed"}).eq("id",id).eq("winner_id",sess.member_id).eq("status","ended").eq("purchase_stage","vehicle-filed").select("id").maybeSingle();
 if(up.error)return json({error:up.error.message},500);
 if(!up.data)return json({error:"وضعیت معامله هم‌زمان تغییر کرده است؛ صفحه را تازه کن."},409);
 const member=await db.from("auction_members").select("full_name").eq("id",sess.member_id).maybeSingle();
 const who=String(member.data?.full_name||"خریدار");
 if(ar.data.case_id)await historyAdd(ar.data.case_id,"vehicle-filed","completed","✓ خریدار تحویل فیزیکی خودرو را تأیید و معامله را تکمیل کرد؛ نام خریدار: "+who+"؛ مبلغ نهایی: "+Number(ar.data.current_bid||0).toLocaleString("fa-IR")+" تومان؛ زمان: "+new Date().toLocaleString("fa-IR"));
 await db.from("buyer_notifications").insert({buyer_id:sess.member_id,auction_id:id,title:"معامله با موفقیت تکمیل شد",message:"تحویل فیزیکی خودرو توسط شما تأیید و تکمیل معامله ثبت شد."});
 return json({ok:true,purchase_stage:"completed"});
}
async function buyerMarkNotificationRead(req:Request,u:URL){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 const b=await req.json(),notificationId=String(b.notification_id||"");
 if(!notificationId)return json({error:"شناسه اعلان الزامی است"},400);
 const r=await db.from("buyer_notifications").update({read_at:new Date().toISOString()}).eq("id",notificationId).eq("buyer_id",sess.member_id).select("id").maybeSingle();
 return r.error?json({error:r.error.message},500):json({ok:true,updated:!!r.data});
}
async function buyerSaveProfile(req:Request,u:URL){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"نشست ورود معتبر نیست؛ دوباره وارد حساب شو."},401);
 let b:any;try{b=await req.json()}catch(_){return json({error:"اطلاعات فرم قابل خواندن نیست."},400)}
 const digits=(v:string)=>v.replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[０-９]/g,d=>"０１２３４５６７８９".indexOf(d)).replace(/[\u200B-\u200D\uFEFF]/g,"");
 const nationalId=digits(String(b.national_id||"")).replace(/\D/g,""),address=String(b.address||"").trim().replace(/\s+/g," ").slice(0,1000);
 // Validate format here; the uploaded national-ID card is reviewed manually before auction access is approved.
 if(!/^\d{10}$/.test(nationalId)||/^([0-9])\1{9}$/.test(nationalId))return json({error:"کد ملی باید ۱۰ رقم داشته باشد؛ لطفاً ارقام را بررسی کن."},400);
 if(address.length<10)return json({error:"آدرس کامل را وارد کن (حداقل ۱۰ نویسه)."},400);
 const duplicate=await db.from("auction_members").select("id").eq("national_id",nationalId).neq("id",sess.member_id).limit(1).maybeSingle();
 if(duplicate.error)return json({error:"بررسی کد ملی ناموفق بود؛ دوباره تلاش کن."},500);
 if(duplicate.data)return json({error:"این کد ملی قبلاً برای حساب دیگری ثبت شده است."},409);
 const saved=await db.from("auction_members").update({national_id:nationalId,address,updated_at:new Date().toISOString()}).eq("id",sess.member_id).select("national_id,address").single();
 if(saved.error)return json({error:"ذخیره اطلاعات خریدار ناموفق بود."},500);
 return json({ok:true,member:saved.data,message:"اطلاعات خریدار ذخیره شد."});
}
async function buyerUploadIdentity(req:Request,u:URL){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 const b=await req.json(),dataUrl=String(b.data_url||"");if(!dataUrl.startsWith("data:image/")||!dataUrl.includes(";base64,"))return json({error:"عکس کارت ملی معتبر انتخاب کنید"},400);
 const [head,raw]=dataUrl.split(",",2),mime=(head.match(/data:(.*?);base64/)||[])[1]||"image/jpeg",bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));if(bytes.length>5*1024*1024)return json({error:"حجم عکس بعد از فشرده‌سازی باید کمتر از ۵ مگابایت باشد"},400);
 const path=`buyer-identity/${sess.member_id}/${crypto.randomUUID()}.jpg`,up=await db.storage.from("s2s-documents").upload(path,bytes,{contentType:mime,upsert:false});if(up.error)return json({error:"آپلود کارت ملی ناموفق بود: "+up.error.message},500);
 const mr=await db.from("auction_members").update({identity_document_path:path,identity_uploaded_at:new Date().toISOString(),identity_verified:false,identity_review_note:null,updated_at:new Date().toISOString()}).eq("id",sess.member_id).select("identity_verified,identity_uploaded_at").single();if(mr.error)return json({error:mr.error.message},500);
 return json({ok:true,member:mr.data,message:"کارت ملی ارسال شد و پس از تأیید مدیریت می‌توانی وارد مزایده شوی."});
}
async function buyerSubmitPayment(req:Request,u:URL,id:string){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 const member=await db.from("auction_members").select("identity_verified").eq("id",sess.member_id).single();if(!member.data?.identity_verified)return json({error:"ابتدا احراز هویت را تکمیل و تأیید کنید."},403);
 const b=await req.json(),stage=String(b.stage||""),dataUrl=String(b.data_url||""),amount=Number(b.amount||0);
 if(!["prepayment","seller_settlement"].includes(stage)||!dataUrl.startsWith("data:image/")||!dataUrl.includes(";base64,"))return json({error:"مرحله پرداخت و عکس فیش الزامی است"},400);
 const ar=await db.from("auctions").select("id,case_id,winner_id,purchase_stage,prepayment_amount,seller_account_name,seller_account_number,current_bid").eq("id",id).single();if(ar.error||ar.data.winner_id!==sess.member_id)return json({error:"این خودرو در پرونده برنده‌های شما نیست"},403);
 if(ar.data.purchase_stage!==stage)return json({error:"این مرحله پرداخت هنوز فعال نیست"},400);
 if(stage==="prepayment"){
  const companyBank=await db.from("wallet_bank_settings").select("account_holder,account_number,sheba,card_number").eq("id",true).maybeSingle();
  if(companyBank.error)return json({error:"دریافت حساب شرکت ناموفق بود"},500);
  if(!companyBank.data?.account_holder||!(companyBank.data?.sheba||companyBank.data?.account_number||companyBank.data?.card_number))return json({error:"اطلاعات حساب شرکت هنوز توسط مدیریت ثبت نشده است"},400);
 }else if(!ar.data.seller_account_name||!ar.data.seller_account_number)return json({error:"اطلاعات حساب مقصد فروشنده هنوز ثبت نشده است"},400);
 const expected=stage==="prepayment"?Number(ar.data.prepayment_amount||0):Math.max(0,Number(ar.data.current_bid||0)-Number(ar.data.prepayment_amount||0));
 if(expected<=0)return json({error:"مبلغ این مرحله پرداخت معتبر نیست"},400);
 if(!Number.isFinite(amount)||amount<=0||amount!==expected)return json({error:"مبلغ ثبت‌شده با مبلغ تعیین‌شده برای این مرحله مطابقت ندارد"},400);
 const previous=await db.from("buyer_payment_submissions").select("id").eq("auction_id",id).eq("buyer_id",sess.member_id).eq("stage",stage).eq("status","pending").limit(1);
 if(previous.data?.length)return json({error:"یک فیش در انتظار بررسی دارید؛ تا بررسی مدیر منتظر بمانید."},409);
 const [head,raw]=dataUrl.split(",",2),mime=(head.match(/data:(.*?);base64/)||[])[1]||"image/jpeg",bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));if(bytes.length>5*1024*1024)return json({error:"حجم عکس فیش باید کمتر از ۵ مگابایت باشد"},400);
 const path=`buyer-payments/${sess.member_id}/${id}/${stage}-${crypto.randomUUID()}.jpg`,up=await db.storage.from("s2s-documents").upload(path,bytes,{contentType:mime,upsert:false});if(up.error)return json({error:"آپلود فیش ناموفق بود: "+up.error.message},500);
 const ins=await db.from("buyer_payment_submissions").insert({buyer_id:sess.member_id,auction_id:id,stage,amount:amount>0?amount:null,receipt_path:path,buyer_note:String(b.note||"").slice(0,500)}).select("id,status,stage,created_at").single();if(ins.error)return json({error:ins.error.message},500);
 await db.from("buyer_notifications").insert({buyer_id:sess.member_id,auction_id:id,title:"فیش پرداخت ارسال شد",message:"فیش پرداخت شما برای بررسی مدیریت ارسال شد."});
 return json({ok:true,payment:ins.data});
}
async function buyerPayFineWallet(req:Request,u:URL,id:string){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 if(!id)return json({error:"شناسه جریمه مشخص نیست"},400);
 const paid=await db.rpc("pay_auction_fine_from_wallet",{p_fine_id:id,p_buyer_id:sess.member_id});
 if(paid.error)return json({error:paid.error.message||"پرداخت جریمه انجام نشد"},400);
 const amount=Number(paid.data?.amount||0);
 await db.from("buyer_notifications").insert({buyer_id:sess.member_id,title:"پرداخت جریمه مزایده تأیید شد",message:"مبلغ "+amount.toLocaleString("fa-IR")+" تومان از کیف پول شما بابت جریمه مزایده پرداخت شد."});
 return json({ok:true,amount,status:"paid"});
}
async function buyerPayPrepaymentWallet(req:Request,u:URL,id:string){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 if(!id)return json({error:"شناسه خودرو مشخص نیست"},400);
 const paid=await db.rpc("pay_auction_prepayment_from_wallet",{p_auction_id:id,p_buyer_id:sess.member_id});
 if(paid.error)return json({error:paid.error.message||"پرداخت از کیف پول انجام نشد"},400);
 const amount=Number(paid.data?.amount||0);
 const ar=await db.from("auctions").select("case_id").eq("id",id).eq("winner_id",sess.member_id).maybeSingle();
 if(ar.data?.case_id)await historyAdd(ar.data.case_id,"prepayment","seller_settlement","پیش‌پرداخت از کیف پول عضو پرداخت شد: "+amount);
 await db.from("buyer_notifications").insert({buyer_id:sess.member_id,auction_id:id,title:"پیش‌پرداخت از کیف پول پرداخت شد",message:"مبلغ "+amount.toLocaleString("fa-IR")+" تومان از کیف پول شما کسر شد. اکنون مرحله تسویه با فروشنده فعال است."});
 return json({ok:true,amount,next_stage:"seller_settlement"});
}
async function buyerAuctionDecision(req:Request,u:URL,id:string){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 if(!id)return json({error:"شناسه مزایده مشخص نیست"},400);
 let b:any;try{b=await req.json()}catch(_){return json({error:"درخواست نامعتبر است"},400)}
 const decision=String(b.decision||"");
 if(!["accepted","declined"].includes(decision))return json({error:"موافقت یا عدم موافقت را مشخص کن"},400);
 const now=new Date().toISOString();
 const ar=await db.from("auctions").select("id,case_id,winner_id,status,purchase_stage,current_bid,winner_response_status,winner_response_deadline").eq("id",id).maybeSingle();
 if(ar.error)return json({error:ar.error.message},500);
 if(!ar.data||ar.data.winner_id!==sess.member_id||ar.data.status!=="ended")return json({error:"این پیشنهاد برنده متعلق به حساب شما نیست"},403);
 if(ar.data.purchase_stage!=="awaiting_buyer_confirmation"||ar.data.winner_response_status!=="pending")return json({error:"این درخواست قبلاً پاسخ داده شده یا دیگر فعال نیست"},409);
 if(!ar.data.winner_response_deadline||new Date(ar.data.winner_response_deadline).getTime()<=Date.now()){
  await expireAuctions();
  return json({error:"مهلت ۳ دقیقه‌ای تمام شده است"},409);
 }
 const nextStage=decision==="accepted"?"awaiting_seller_approval":"cancelled";
 const up=await db.from("auctions").update({purchase_stage:nextStage,winner_response_status:decision,winner_response_at:now}).eq("id",id).eq("winner_id",sess.member_id).eq("purchase_stage","awaiting_buyer_confirmation").eq("winner_response_status","pending").gt("winner_response_deadline",now).select("id").maybeSingle();
 if(up.error)return json({error:up.error.message},500);
 if(!up.data)return json({error:"مهلت تمام شده یا وضعیت هم‌زمان تغییر کرده است؛ صفحه را تازه کن"},409);
 const title=decision==="accepted"?"موافقت با قیمت ثبت شد":"عدم موافقت با قیمت ثبت شد";
 const message=decision==="accepted"?"موافقت شما با قیمت "+Number(ar.data.current_bid||0).toLocaleString("fa-IR")+" تومان ثبت شد. اکنون منتظر تأیید فروشنده هستید.":"عدم موافقت شما با قیمت ثبت شد. این پیشنهاد برای بررسی و انتقال به خریدار بعدی در اختیار مدیریت قرار گرفت.";
 await db.from("buyer_notifications").insert({buyer_id:sess.member_id,auction_id:id,title,message});
 if(ar.data.case_id){const buyerInfo=await db.from("auction_members").select("full_name,mobile").eq("id",sess.member_id).maybeSingle();const buyerLabel=[buyerInfo.data?.full_name,buyerInfo.data?.mobile].filter(Boolean).join(" / ")||sess.member_id;await historyAdd(ar.data.case_id,"auction-end","customer",decision==="accepted"?"برنده "+buyerLabel+" قیمت "+Number(ar.data.current_bid||0).toLocaleString("fa-IR")+" تومان را تأیید کرد؛ منتظر موافقت فروشنده.":"⚠️ خریدار اول ("+buyerLabel+") قیمت را نپذیرفت و انصراف داد؛ پیشنهاد برای انتقال به خریدار بعدی در اختیار مدیریت قرار گرفت.");}
 return json({ok:true,decision,purchase_stage:nextStage});
}
function calculateCancellationFine(price:number){const p=Number(price||0);if(!Number.isFinite(p)||p<500_000_000)return 0;if(p<1_000_000_000)return 4_000_000;if(p<2_000_000_000)return 5_000_000;if(p<3_000_000_000)return 10_000_000;if(p<5_000_000_000)return 15_000_000;return 20_000_000;}
 async function buyerCancelPurchase(req:Request,u:URL,id:string){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 const ar=await db.from("auctions").select("id,case_id,winner_id,status,purchase_stage,cancellation_fine_amount,current_bid,starting_price").eq("id",id).maybeSingle();
 if(ar.error)return json({error:"خطا در دریافت مزایده: "+ar.error.message},500);
 if(!ar.data||ar.data.winner_id!==sess.member_id||ar.data.status!=="ended")return json({error:"این خودرو قابل انصراف از طرف حساب شما نیست"},403);
 if(ar.data.purchase_stage==="cancelled")return json({error:"انصراف این مزایده قبلاً ثبت شده است"},409);
 if(!["awaiting_seller_approval","awaiting_admin_prepayment","prepayment"].includes(ar.data.purchase_stage||""))return json({error:"مهلت انصراف پایان یافته است؛ پس از پرداخت پیش‌پرداخت امکان انصراف وجود ندارد."},409);
 const finalPrice=Number(ar.data.current_bid||ar.data.starting_price||0);
 const amount=calculateCancellationFine(finalPrice);
 const result=await db.rpc("register_auction_cancellation_with_wallet",{p_auction_id:id,p_buyer_id:sess.member_id,p_fine_amount:amount});
 if(result.error)return json({error:"ثبت انصراف و تسویه کیف پول انجام نشد: "+result.error.message},409);
 const settlement=result.data||{};
 if(ar.data.case_id){
  const mr=await db.from("auction_members").select("full_name,mobile").eq("id",sess.member_id).maybeSingle();
  const who=mr.data?.full_name||"خریدار";
  await historyAdd(ar.data.case_id,"customer","customer","⚠️ انصراف خریدار از خرید پس از برنده‌شدن؛ نام: "+who+"؛ موبایل: "+(mr.data?.mobile||"ثبت نشده")+"؛ زمان: "+new Date().toLocaleString("fa-IR")+"؛ وجه التزام: "+amount.toLocaleString("fa-IR")+" تومان؛ کسرشده از کیف پول: "+Number(settlement.deducted_amount||0).toLocaleString("fa-IR")+" تومان؛ مانده پرداخت‌نشده: "+Number(settlement.remaining_amount||0).toLocaleString("fa-IR")+" تومان");
 }
 const deducted=Number(settlement.deducted_amount||0),remaining=Number(settlement.remaining_amount||0);
 const message=amount<=0?"انصراف ثبت شد؛ طبق جدول شرایط مزایده برای این بازه قیمت وجه التزامی تعیین نشده است.":deducted>=amount?"انصراف ثبت شد و کل وجه التزام "+amount.toLocaleString("fa-IR")+" تومان از کیف پول شما کسر شد.":"انصراف ثبت شد. مبلغ "+deducted.toLocaleString("fa-IR")+" تومان از موجودی کیف پول کسر شد؛ به‌دلیل کافی نبودن موجودی، "+remaining.toLocaleString("fa-IR")+" تومان از وجه التزام باقی مانده و پرداخت‌نشده است.";
 await db.from("buyer_notifications").insert({buyer_id:sess.member_id,auction_id:id,title:"انصراف از خرید و تسویه وجه التزام",message});
 return json({ok:true,fine:amount>0?{id:settlement.fine_id,amount,status:settlement.status,paid_amount:deducted}:null,cancellation_fine_amount:amount,deducted_amount:deducted,remaining_amount:remaining,automatic:true});
}
async function adminUpdateVehicle(req:Request){
 const b=await req.json(),vehicleId=String(b.vehicle_id||"");
 if(!vehicleId)return json({error:"شناسه خودرو الزامی است"},400);
 const clean=(v:any,max=120)=>String(v??"").trim().slice(0,max);
 const brand=clean(b.brand),model=clean(b.model),trim=clean(b.trim),color=clean(b.color),vehicle_type=clean(b.vehicle_type,80),fuel_type=clean(b.fuel_type,80),transmission=clean(b.transmission,80);
 const year=b.model_year===null||b.model_year===""?null:Number(b.model_year),mileage=b.mileage===null||b.mileage===""?null:Number(String(b.mileage).replace(/[^0-9]/g,""));
 if(!brand||!model)return json({error:"برند و مدل خودرو الزامی است"},400);
 if(year!==null&&(!Number.isInteger(year)||year<1300||year>1500))return json({error:"سال ساخت معتبر نیست"},400);
 if(mileage!==null&&(!Number.isSafeInteger(mileage)||mileage<0))return json({error:"کارکرد معتبر نیست"},400);
 const up=await db.from("vehicles").update({brand,model,trim:trim||null,model_year:year,color:color||null,vehicle_type:vehicle_type||null,fuel_type:fuel_type||null,transmission:transmission||null,mileage}).eq("id",vehicleId).select("id,case_id,vehicle_role,brand,model,trim,model_year,color,vehicle_type,fuel_type,transmission,mileage").maybeSingle();
 if(up.error)return json({error:up.error.message},500);
 if(!up.data)return json({error:"خودرو پیدا نشد"},404);
 return json({ok:true,vehicle:up.data});
}
async function adminReviewIdentity(req:Request){
 const b=await req.json(),memberId=String(b.member_id||""),approved=!!b.approved,note=String(b.note||"").slice(0,500);if(!memberId)return json({error:"شناسه عضو الزامی است"},400);
 const r=await db.from("auction_members").update({identity_verified:approved,identity_review_note:note,updated_at:new Date().toISOString()}).eq("id",memberId).select("id,mobile,full_name,identity_verified").single();if(r.error)return json({error:r.error.message},500);
 if(approved)await db.from("buyer_notifications").insert({buyer_id:memberId,title:"احراز هویت تأیید شد",message:"کارت ملی شما تأیید شد؛ اکنون می‌توانید وارد مزایده شوید."});
 return json({ok:true,member:r.data});
}
async function adminApproveSeller(req:Request){
  const b=await req.json(),auctionId=String(b.auction_id||"");
  if(!auctionId)return json({error:"شناسه مزایده الزامی است"},400);
  const ar=await db.from("auctions").select("id,case_id,status,winner_id,purchase_stage,prepayment_amount,seller_account_number").eq("id",auctionId).single();
  if(ar.error)return json({error:"مزایده پیدا نشد"},404);
  if(ar.data.status!=="ended"||!ar.data.winner_id)return json({error:"برای این مزایده برنده‌ای ثبت نشده است"},400);
  if(ar.data.purchase_stage==="prepayment"){
   const existing=await db.from("buyer_notifications").select("id").eq("buyer_id",ar.data.winner_id).eq("auction_id",auctionId).ilike("title","%فروشنده موافقت کرد%").limit(1);
   if(!existing.data?.length)await db.from("buyer_notifications").insert({buyer_id:ar.data.winner_id,auction_id:auctionId,title:"فروشنده موافقت کرد؛ مرحله پیش‌پرداخت",message:"فروشنده با قیمت پیشنهادی موافقت کرده است. مدیریت مبلغ پیش‌پرداخت و اطلاعات حساب را ثبت می‌کند؛ پس از ثبت اطلاعات، در همین پنل می‌توانید فیش را ارسال کنید."});
   return json({ok:true,already_approved:true,auction_id:auctionId,purchase_stage:"prepayment",prepayment_amount:ar.data.prepayment_amount});
  }
  if(ar.data.purchase_stage!=="awaiting_seller_approval")return json({error:"این مزایده در انتظار موافقت فروشنده نیست"},400);
  const up=await db.from("auctions").update({purchase_stage:"prepayment"}).eq("id",auctionId).eq("purchase_stage","awaiting_seller_approval").select("id").maybeSingle();
  if(up.error)return json({error:up.error.message},500);
  if(!up.data)return json({error:"وضعیت مزایده هم‌زمان تغییر کرده است؛ فهرست را تازه کنید"},409);
  const note=await db.from("buyer_notifications").insert({buyer_id:ar.data.winner_id,auction_id:auctionId,title:"فروشنده با قیمت موافقت کرد",message:"فروشنده با قیمت پیشنهادی شما موافقت کرده است؛ مرحله پیش‌پرداخت در پنل شما آغاز شد. به‌محض ثبت مبلغ و حساب مقصد توسط همکاران ما، فرم واریز و ارسال فیش در همین پنل فعال می‌شود."});
  await historyAdd(ar.data.case_id,"auction-end","customer","فروشنده با قیمت برنده موافقت کرد؛ منتظر ثبت اطلاعات پیش‌پرداخت توسط مدیریت.");
  return json({ok:true,auction_id:auctionId,purchase_stage:"awaiting_admin_prepayment",prepayment_amount:ar.data.prepayment_amount,notification_error:note.error?.message||null});
}async function adminSetAuctionSettlement(req:Request){
 const b=await req.json(),auctionId=String(b.auction_id||"");if(!auctionId)return json({error:"شناسه مزایده الزامی است"},400);
 const parse=(v:any)=>v===null||v===""?null:Number(v),pre=parse(b.prepayment_amount);
 if(pre!==null&&(!Number.isFinite(pre)||pre<0))return json({error:"مبلغ پیش‌پرداخت باید عدد معتبر باشد"},400);
 const accountName=String(b.seller_account_name||"").trim().slice(0,160),accountNumber=String(b.seller_account_number||"").trim().slice(0,160);
 if(pre!==null&&pre>0&&(!accountName||!accountNumber))return json({error:"برای فعال‌کردن پیش‌پرداخت، نام صاحب حساب و شماره حساب الزامی است"},400);
 const r=await db.from("auctions").update({seller_account_name:accountName||null,seller_account_number:accountNumber||null,prepayment_amount:pre}).eq("id",auctionId).select("id,case_id,winner_id,purchase_stage,seller_account_name,seller_account_number,prepayment_amount").single();
 if(r.error)return json({error:r.error.message},500);
 if(["prepayment","awaiting_admin_prepayment"].includes(r.data.purchase_stage||"")&&r.data.winner_id&&pre!==null&&pre>0&&accountName&&accountNumber){
  if(r.data.purchase_stage==="awaiting_admin_prepayment"){
   const stage=await db.from("auctions").update({purchase_stage:"prepayment"}).eq("id",auctionId).eq("purchase_stage","awaiting_admin_prepayment").select("id").maybeSingle();
   if(stage.error)return json({error:stage.error.message},500);
   if(!stage.data)return json({error:"وضعیت مزایده هم‌زمان تغییر کرده است؛ دوباره بررسی کنید"},409);
  }
  await db.from("buyer_notifications").insert({buyer_id:r.data.winner_id,auction_id:auctionId,title:"درخواست پرداخت پیش‌پرداخت آماده است",message:"مبلغ پیش‌پرداخت و اطلاعات حساب مقصد ثبت شد. وارد پنل مزایده شوید؛ اطلاعات و فرم ارسال فیش در بخش دریافت پیش‌پرداخت نمایش داده می‌شود."});
  await historyAdd(r.data.case_id,"customer","prepayment","اطلاعات حساب و مبلغ پیش‌پرداخت ثبت شد؛ فرم پرداخت در پنل خریدار فعال شد.");
 }
 return json({ok:true,auction:r.data});
}
async function adminSetCancellationFine(req:Request){
 const b=await req.json(),auctionId=String(b.auction_id||"").trim();
 if(!auctionId)return json({error:"شناسه مزایده الزامی است"},400);
 const ar=await db.from("auctions").select("id,case_id,purchase_stage,cancellation_fine_amount,current_bid,starting_price").eq("id",auctionId).maybeSingle();
 if(ar.error)return json({error:ar.error.message},500);
 if(!ar.data)return json({error:"مزایده پیدا نشد"},404);
 const price=Number(ar.data.current_bid||ar.data.starting_price||0),amount=calculateCancellationFine(price);
 const up=await db.from("auctions").update({cancellation_fine_amount:amount}).eq("id",auctionId).select("id,case_id,purchase_stage,cancellation_fine_amount,current_bid").single();
 if(up.error)return json({error:up.error.message},500);
 await historyAdd(ar.data.case_id,ar.data.purchase_stage||"customer",ar.data.purchase_stage||"customer","مبلغ وجه التزام انصراف به‌صورت خودکار طبق جدول شرایط مزایده و قیمت فعلی محاسبه شد: "+amount.toLocaleString("fa-IR")+" تومان؛ این مبلغ به‌صورت خودکار از کیف پول برداشت نمی‌شود.");
 return json({ok:true,automatic:true,auction:up.data,calculated_from_price:price});
}
async function adminReviewBuyerPayment(req:Request,reviewerRole:string="admin"){
 const b=await req.json(),paymentId=String(b.payment_id||""),status=String(b.status||""),note=String(b.note||"").slice(0,500);
 if(!paymentId||!["approved","rejected"].includes(status))return json({error:"درخواست بررسی پرداخت نامعتبر است"},400);
 const p=await db.from("buyer_payment_submissions").select("*").eq("id",paymentId).single();
 if(p.error)return json({error:p.error.message},404);
 if(p.data.status==="approved")return json({ok:true,already_reviewed:true});
 if(p.data.status==="rejected"&&status==="approved")return json({error:"فیش ردشده باید توسط خریدار دوباره ارسال شود."},409);
 let caseId:string|null=null,prepaymentAmount=0,previousCaseStatus="";
 if(status==="approved"){
  const ar=await db.from("auctions").select("id,case_id,winner_id,current_bid,prepayment_amount,purchase_stage").eq("id",p.data.auction_id).eq("winner_id",p.data.buyer_id).maybeSingle();
  if(ar.error||!ar.data)return json({error:"مزایده یا خریدار این فیش پیدا نشد."},404);
  caseId=ar.data.case_id||null;
  if(p.data.stage==="prepayment"){
   prepaymentAmount=Number(p.data.amount||ar.data.prepayment_amount||0);
   const expected=Number(ar.data.prepayment_amount||0);
   if(!prepaymentAmount||!Number.isFinite(prepaymentAmount)||prepaymentAmount<=0)return json({error:"مبلغ پیش‌پرداخت در فیش مشخص نیست؛ مبلغ معتبر باید هنگام ارسال فیش ثبت شود."},400);
   if(expected>0&&Math.abs(prepaymentAmount-expected)>0.5)return json({error:"مبلغ فیش با مبلغ پیش‌پرداخت اعلام‌شده برابر نیست: "+expected.toLocaleString("fa-IR")+" تومان"},400);
   if(caseId){
    const cr=await db.from("cases").select("id,status,prepayment_amount,prepayment_status").eq("id",caseId).maybeSingle();
    if(cr.error)return json({error:cr.error.message},500);
    if(cr.data){previousCaseStatus=cr.data.status||"";if(!["awaiting_prepayment","ready_to_sign","prepayment"].includes(previousCaseStatus))return json({error:"وضعیت پرونده برای تأیید پیش‌پرداخت مناسب نیست؛ ابتدا مرحله اعلام پیش‌پرداخت را تکمیل کنید."},409);}
   }
  }
 }
 const up=await db.from("buyer_payment_submissions").update({status,review_note:note,reviewed_at:new Date().toISOString()}).eq("id",paymentId).neq("status","approved").select("id").maybeSingle();
 if(up.error)return json({error:up.error.message},500);
 if(!up.data)return json({error:"این فیش قبلاً بررسی شده است؛ فهرست را تازه‌سازی کنید."},409);
 if(status==="approved"){
  const stage=p.data.stage==="prepayment"?"seller_settlement":"vehicle-filed";
  const au=await db.from("auctions").update({purchase_stage:stage}).eq("id",p.data.auction_id).eq("winner_id",p.data.buyer_id);
  if(au.error)return json({error:au.error.message},500);
  if(p.data.stage==="prepayment"&&caseId){
   const now=new Date().toISOString(),caseUpdates:any={prepayment_amount:prepaymentAmount,prepayment_status:"received",prepayment_received_at:now};
   if(previousCaseStatus==="awaiting_prepayment"||previousCaseStatus==="prepayment")caseUpdates.status="ready_to_sign";
   const cu=await db.from("cases").update(caseUpdates).eq("id",caseId).select("id,status").single();
   if(cu.error)return json({error:"فیش تأیید شد اما به‌روزرسانی پرونده ناموفق بود: "+cu.error.message},500);
   const existing=await db.from("case_financial_entries").select("id").eq("case_id",caseId).eq("entry_type","prepayment").eq("receipt_storage_path",p.data.receipt_path).limit(1);
   if(existing.error)return json({error:existing.error.message},500);
   if(!(existing.data||[]).length){
    const led=await db.from("case_financial_entries").insert({case_id:caseId,entry_type:"prepayment",amount:prepaymentAmount,note:"پیش‌پرداخت به‌صورت خودکار پس از تأیید فیش توسط تیم مالی ثبت شد. شناسه فیش: "+paymentId+(note?"؛ "+note:""),receipt_storage_path:p.data.receipt_path||null});
    if(led.error)return json({error:"وضعیت پرونده تغییر کرد اما ثبت گردش مالی ناموفق بود: "+led.error.message},500);
   }
   const audit=await db.from("case_team_updates").insert({case_id:caseId,team_role:reviewerRole,update_type:"prepayment_received",payload:{amount:prepaymentAmount,payment_submission_id:paymentId,receipt_storage_path:p.data.receipt_path||null,reviewed_at:now,automatic:true},note:"فیش پیش‌پرداخت توسط تیم مالی تأیید و به‌صورت خودکار در پرونده ثبت شد."+(note?" "+note:"")});
   if(audit.error)return json({error:"پیش‌پرداخت ثبت شد اما تاریخچه پرونده ذخیره نشد: "+audit.error.message},500);
   if(caseUpdates.status)await historyAdd(caseId,previousCaseStatus,caseUpdates.status,"فیش پیش‌پرداخت توسط تیم مالی تأیید شد؛ مبلغ و گردش مالی به‌صورت خودکار ثبت شد.");
  }else if(caseId)await historyAdd(caseId,p.data.stage,stage,p.data.stage==="prepayment"?"فیش پیش‌پرداخت توسط تیم مالی تأیید شد":"فیش تسویه کامل توسط تیم مالی تأیید شد");
  await db.from("buyer_notifications").insert({buyer_id:p.data.buyer_id,auction_id:p.data.auction_id,title:p.data.stage==="prepayment"?"پیش‌پرداخت تأیید شد":"تسویه تأیید شد",message:p.data.stage==="prepayment"?"پیش‌پرداخت توسط تیم مالی تأیید و ثبت شد. مرحله بعدی معامله فعال شد.":"تسویه کامل تأیید شد؛ خودرو در بخش «خودروهای من» ثبت شد."});
 }else await db.from("buyer_notifications").insert({buyer_id:p.data.buyer_id,auction_id:p.data.auction_id,title:"نیاز به اصلاح فیش",message:"فیش پرداخت تأیید نشد. لطفاً فیش را اصلاح کنید. "+note});
 return json({ok:true,automatic:p.data.stage==="prepayment"&&status==="approved"});
}
async function adminBuyerPayments(u:URL){
 const r=await db.from("buyer_payment_submissions").select("id,buyer_id,auction_id,stage,amount,status,buyer_note,review_note,created_at,reviewed_at,receipt_path").order("created_at",{ascending:false}).limit(100);if(r.error)return json({error:r.error.message},500);
 const memberIds=[...new Set((r.data||[]).map((x:any)=>x.buyer_id))],auctionIds=[...new Set((r.data||[]).map((x:any)=>x.auction_id))];
 const [m,a]=await Promise.all([memberIds.length?db.from("auction_members").select("id,mobile,full_name").in("id",memberIds):Promise.resolve({data:[],error:null}),auctionIds.length?db.from("auctions").select("id,case_id,vehicle_id,current_bid,prepayment_amount,purchase_stage,seller_account_name,seller_account_number").in("id",auctionIds):Promise.resolve({data:[],error:null})]);
 const caseIds=[...new Set((a.data||[]).map((x:any)=>x.case_id).filter(Boolean))];
 const [cases,vehicles]=await Promise.all([caseIds.length?db.from("cases").select("id,case_number,customer_name,customer_mobile").in("id",caseIds):Promise.resolve({data:[],error:null}),caseIds.length?db.from("vehicles").select("case_id,brand,model,trim,model_year").in("case_id",caseIds).eq("vehicle_role","current"):{data:[],error:null}]);
 const paths=(r.data||[]).map((x:any)=>x.receipt_path).filter(Boolean),signed=paths.length?(await db.storage.from("s2s-documents").createSignedUrls(paths,1800)).data||[]:[];
 return json({payments:(r.data||[]).map((p:any)=>{const auction=(a.data||[]).find((x:any)=>x.id===p.auction_id)||null;const caseInfo=(cases.data||[]).find((x:any)=>x.id===auction?.case_id)||null;return {...p,buyer:(m.data||[]).find((x:any)=>x.id===p.buyer_id)||null,auction:auction?{...auction,case:caseInfo,vehicle:(vehicles.data||[]).find((x:any)=>x.case_id===auction.case_id)||null}:null,receipt_url:signed.find((x:any)=>x.path===p.receipt_path)?.signedUrl||null}})});
}
async function placeBid(req:Request,id:string){
 const u=new URL(req.url),sess=await auctionToken(req,u);
 if(!sess)return json({error:"auction_login_required"},401);
 const b=await req.json(),amount=Number(b.amount||0);
 if(!Number.isFinite(amount)||amount<=0)return json({error:"مبلغ پیشنهاد نامعتبر است"},400);
 const r=await db.rpc("place_auction_bid",{
   p_auction_id:id,
   p_member_id:sess.member_id,
   p_amount:amount
 });
 if(r.error){
   const msg=r.error.message||"ثبت پیشنهاد ناموفق بود";
   return json({error:msg},400);
 }
 return json({ok:true,bid:r.data,current_bid:Number(r.data.current_bid),ends_at:r.data.ends_at||null,extended:!!r.data.extended,extension_count:Number(r.data.extension_count||0)});
}
async function inspect(req:Request,id:string){
 const b=await req.json();
 if(!b.vin||!b.engine_number||!b.plate_number||!b.national_id_path)return json({error:"VIN، شماره موتور، پلاک و عکس کارت ملی مالک الزامی است"},400);
 const {data:v,error:ve}=await db.from("vehicles").select("id").eq("case_id",id).eq("vehicle_role","current").limit(1).maybeSingle();if(ve)return json({error:ve.message},500);
 if(v){const vu=await db.from("vehicles").update({vin:b.vin,engine_number:b.engine_number,plate_number:b.plate_number,mileage:Number(String(b.mileage||"").replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[^0-9]/g,""))||null,spare_key:!!b.spare_key,fuel_card:!!b.fuel_card,power_of_attorney:!!b.power_of_attorney,green_card:!!b.green_card,factory_invoice:!!b.factory_invoice,car_document:!!b.car_document}).eq("id",v.id);if(vu.error)return json({error:vu.error.message},500);}
 const {data:i,error:ie}=await db.from("inspections").insert({case_id:id,status:"completed",finished_at:new Date().toISOString(),summary:b.summary||"کارشناسی ثبت شد"}).select("id").single();if(ie)return json({error:ie.message},500);
 try{
  const nd=await db.from("documents").insert({case_id:id,vehicle_id:v?.id||null,document_type:"owner_national_id",storage_path:b.national_id_path,required:true});if(nd.error)throw new Error(nd.error.message);
  const jobs:any[]=[];
  if(Array.isArray(b.documents))jobs.push(...b.documents.filter((d:any)=>d?.storage_path).map(async(d:any)=>{const r=await db.from("documents").insert({case_id:id,vehicle_id:v?.id||null,document_type:d.type||"other",storage_path:d.storage_path,required:false});if(r.error)throw new Error(r.error.message)}));
  if(Array.isArray(b.main_photos))jobs.push(...b.main_photos.filter((m:any)=>m?.storage_path).map(async(m:any)=>{const r=await db.from("inspection_photos").insert({inspection_id:i.id,photo_type:"main",label:m.label||"عکس اصلی خودرو",storage_path:m.storage_path,annotation:m.annotation||null});if(r.error)throw new Error(r.error.message)}));
  if(Array.isArray(b.defects))jobs.push(...b.defects.filter((d:any)=>d?.part&&d?.defect_type).map(async(d:any)=>{const q=await db.from("inspection_defects").insert({inspection_id:i.id,area:d.area||"بدنه",part:d.part,defect_type:d.defect_type,explanation:d.explanation||""}).select("id").single();if(q.error)throw new Error(q.error.message);await Promise.all((d.photos||[]).filter((p:any)=>p?.storage_path).map(async(p0:any)=>{const r=await db.from("inspection_photos").insert({inspection_id:i.id,defect_id:q.data.id,photo_type:"defect",label:d.part+" • "+d.defect_type,storage_path:p0.storage_path,annotation:p0.annotation||null});if(r.error)throw new Error(r.error.message)}))}));
  await Promise.all(jobs);
 }catch(e){return json({error:"ذخیره عکس‌ها یا مدارک ناموفق بود: "+String((e as any)?.message||e)},500)}
 const up=await db.from("cases").update({status:"review"}).eq("id",id);if(up.error)return json({error:"ثبت وضعیت پایان کارشناسی ناموفق بود: "+up.error.message},500);await historyAdd(id,"inspection","review","کارشناسی پایان یافت و گزارش ثبت شد");return json({ok:true});
}
async function marketPrices(u:URL){ const brand=u.searchParams.get("brand")||""; const model=u.searchParams.get("model")||""; const trim=u.searchParams.get("trim")||""; let q=db.from("vehicle_market_prices").select("*").order("updated_at",{ascending:false}).limit(100); if(brand)q=q.eq("brand",brand); if(model)q=q.eq("model",model); if(trim)q=q.eq("trim",trim); const {data,error}=await q; return error?json({error:error.message},500):json({prices:data||[]}); }
async function estimate(req:Request){
 const b=await req.json(); const brand=b.brand||"",model=b.model||"",trim=b.trim||"",year=Number(b.year||0),km=Number(b.mileage||0),body=b.body_condition||"clean";
 if(!brand||!model||!year||!km)return json({error:"brand, model, year and mileage are required"},400);
 let q=db.from("vehicle_market_prices").select("price,updated_at,trim,model_year,calendar").eq("brand",brand).eq("model",model).order("updated_at",{ascending:false}).limit(8); if(trim)q=q.eq("trim",trim); const {data}=await q;
 const vals=(data||[]).map((x:any)=>Number(x.price)).filter((x:number)=>x>0);
 if(!vals.length)return json({ok:false,source:"no_market_data",message:"برای این مدل قیمت بازار ثبت نشده است."},200);
 const zero=vals.reduce((a:number,v:number)=>a+v,0)/vals.length;
 const age=Math.max(0,1405-year);
 const ageFactor=Math.pow(0.955,Math.min(age,12));
 const mileageFactor=km<=30000?1:Math.max(0.68,1-((km-30000)/100000)*0.035);
 const bodyFactor=({clean:1,minor:0.94,painted:0.88,full:0.80,accident:0.68} as any)[body]||1;
 const estimated=Math.max(150000000,zero*ageFactor*mileageFactor*bodyFactor);
 const low=estimated*0.93,high=estimated*1.07;
 return json({ok:true,source:"market_based_used",source_label:"برآورد بر پایه قیمت روز بازار + سال، کارکرد و وضعیت بدنه",average_price:Math.round(estimated),low_price:Math.round(low),high_price:Math.round(high),zero_reference:Math.round(zero),sample_count:vals.length,updated_at:data?.[0]?.updated_at||new Date().toISOString()});
}async function historyAdd(id:string,from:string,to:string,note:string){await db.from("case_history").insert({case_id:id,from_status:from,to_status:to,note});} async function setStatus(id:string,next:string,note:string){const {data,error}=await db.from("cases").select("status").eq("id",id).single();if(error)return json({error:error.message},500);const r=await db.from("cases").update({status:next}).eq("id",id);if(r.error)return json({error:r.error.message},500);await historyAdd(id,data?.status||"new",next,note);return json({ok:true,status:next})} async function caseComments(req:Request,id:string,role:string,staffMemberId:string){
 if(!id)return json({error:"پرونده مشخص نیست"},400);
 const cr=await db.from("cases").select("id,status").eq("id",id).maybeSingle();
 if(cr.error)return json({error:cr.error.message},500);
 if(!cr.data)return json({error:"پرونده پیدا نشد"},404);
 if(role==="expert"&&!["refer","inspection"].includes(cr.data.status))return json({error:"این پرونده در حال حاضر در دسترس کارشناس نیست"},403);
 if(req.method==="GET"){
  const r=await db.from("case_comments").select("id,case_id,author_role,author_name,message,created_at").eq("case_id",id).order("created_at",{ascending:true});
  return r.error?json({error:r.error.message},500):json({comments:r.data||[]});
 }
 if(req.method==="POST"){
  const b=await req.json(),message=String(b.message||"").trim();
  if(!message)return json({error:"متن پیام را بنویسید"},400);
  if(message.length>3000)return json({error:"پیام نباید بیشتر از ۳۰۰۰ نویسه باشد"},400);
  let authorName=role; if(staffMemberId){const sm=await db.from("staff_members").select("full_name").eq("id",staffMemberId).maybeSingle();if(!sm.error&&sm.data?.full_name)authorName=sm.data.full_name;} const r=await db.from("case_comments").insert({case_id:id,author_role:role,author_name:authorName,message}).select("id,case_id,author_role,author_name,message,created_at").single();
  return r.error?json({error:r.error.message},500):json({ok:true,comment:r.data});
 }
 return json({error:"method_not_allowed"},405);
}
async function expireAuctions(){
 const now=new Date().toISOString();
 const {data,error}=await db.from("auctions").select("id,case_id,current_bid").eq("status","active").lte("ends_at",now).limit(100);
 if(!error&&data?.length)for(const a of data){
  const br=await db.from("bids").select("buyer_id,amount").eq("auction_id",a.id).order("amount",{ascending:false}).limit(1).maybeSingle();
  const winner=br.data?.buyer_id||null,finalBid=Number(br.data?.amount||a.current_bid||0),deadline=new Date(Date.now()+3*60*1000).toISOString();
  const up=await db.from("auctions").update({status:"ended",winner_id:winner,current_bid:finalBid,cancellation_fine_amount:winner?calculateCancellationFine(finalBid):0,purchase_stage:winner?"awaiting_buyer_confirmation":"auction-end",winner_response_status:winner?"pending":null,winner_response_deadline:winner?deadline:null,winner_response_at:null}).eq("id",a.id).eq("status","active").select("id").maybeSingle();
  if(up.data){
   await db.from("cases").update({status:"auction-end"}).eq("id",a.case_id).eq("status","auction");
   await historyAdd(a.case_id,"auction","auction-end",winner?"پایان مزایده؛ برنده برای تأیید قیمت ۳ دقیقه مهلت دارد":"پایان خودکار مزایده پس از ۶۰ دقیقه؛ بدون برنده");
   if(winner)await db.from("buyer_notifications").insert({buyer_id:winner,auction_id:a.id,title:"🎉 برنده مزایده شدی؛ قیمت را تأیید کن",message:"تبریک! برنده مزایده شدی. قیمت نهایی شما "+finalBid.toLocaleString("fa-IR")+" تومان است. لطفاً تا ۳ دقیقه آینده مشخص کن با این قیمت موافقی یا خیر. اگر زمان تمام شود، پیشنهاد به‌عنوان عدم تأیید ثبت می‌شود."});
  }
 }
 const expired=await db.from("auctions").select("id,case_id,winner_id,current_bid").eq("status","ended").eq("purchase_stage","awaiting_buyer_confirmation").eq("winner_response_status","pending").lte("winner_response_deadline",now).limit(100);
 if(!expired.error)for(const a of expired.data||[]){
  const up=await db.from("auctions").update({purchase_stage:"cancelled",winner_response_status:"expired",winner_response_at:now}).eq("id",a.id).eq("purchase_stage","awaiting_buyer_confirmation").eq("winner_response_status","pending").lte("winner_response_deadline",now).select("id").maybeSingle();
  if(up.data){
   await db.from("buyer_notifications").insert({buyer_id:a.winner_id,auction_id:a.id,title:"مهلت تأیید قیمت تمام شد",message:"مهلت ۳ دقیقه‌ای برای تأیید قیمت به پایان رسید؛ این پیشنهاد به‌عنوان عدم تأیید ثبت شد. در صورت نیاز، مدیریت می‌تواند پیشنهاد را به خریدار بعدی منتقل کند."});
   if(a.case_id)await historyAdd(a.case_id,"auction-end","customer","مهلت ۳ دقیقه‌ای تأیید قیمت برنده تمام شد؛ پیشنهاد برای انتقال به نفر بعدی آزاد شد.");
  }
 }
}

async function supportStart(req:Request,u:URL){
 const b=await req.json();
 const requestedChannel=u.searchParams.get("channel")==="auction"?"auction":"website";
 let mobile=String(b.mobile||"").replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/\s/g,"");
 // Auction support must be tied to the authenticated auction member, not a typed/shared phone number.
 const sess=await auctionToken(req,u);
 if(requestedChannel==="auction"&&!sess)return json({error:"برای شروع گفت‌وگوی پشتیبانی مزایده ابتدا وارد حساب خریدار شو."},401);
 let buyerId:string|null=null;
 if(sess){
  const member=await db.from("auction_members").select("id,mobile").eq("id",sess.member_id).maybeSingle();
  if(member.data?.mobile)mobile=String(member.data.mobile).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/\s/g,"");
  if(requestedChannel==="auction")buyerId=sess.member_id;
 }
 if(!/^\+?[0-9]{10,15}$/.test(mobile))return json({error:"شماره موبایل حساب خریدار پیدا نشد؛ یک‌بار از حساب خارج شو و دوباره وارد شو."},400);
 const token=randToken(),tokenHash=await sha256Hex(token);
 const r=await db.from("support_conversations").insert({customer_mobile:mobile,token_hash:tokenHash,status:"open",channel:requestedChannel,buyer_id:buyerId}).select("id,customer_mobile,status,channel,buyer_id,created_at").single();
 if(r.error)return json({error:"ساخت گفت‌وگو ناموفق بود."},500);
 const w=await db.from("support_messages").insert({conversation_id:r.data.id,sender:"admin",message:"سلام! به پشتیبانی سوییچ به سوییچ خوش آمدی. پیامت را بنویس؛ همکاران ما پاسخ می‌دهند."});
 if(w.error)return json({error:"گفت‌وگو ساخته شد، اما پیام خوش‌آمدگویی ارسال نشد."},500);
 return json({ok:true,conversation:r.data,token});
}
async function supportCustomerAuth(id:string,token:string){
 if(!id||!token)return null;
 const hash=await sha256Hex(token);
 const r=await db.from("support_conversations").select("id,customer_mobile,status,channel").eq("id",id).eq("token_hash",hash).maybeSingle();
 return r.data||null;
}
function supportChannel(u:URL){return u.searchParams.get("channel")==="auction"?"auction":"website"}
function supportChannelMismatch(conv:any,channel:string){return (conv?.channel||"website")!==channel}
async function supportPoll(u:URL){
 const id=u.searchParams.get("id")||"",token=u.searchParams.get("token")||"",channel=supportChannel(u);
 const conv=await supportCustomerAuth(id,token);
 if(!conv)return json({error:"نشست چت معتبر نیست."},401);
 if(supportChannelMismatch(conv,channel))return json({error:"این گفت‌وگو متعلق به بخش پشتیبانی دیگری است. یک گفت‌وگوی تازه شروع کن."},403);
 const r=await db.from("support_messages").select("id,sender,message,created_at").eq("conversation_id",id).order("created_at",{ascending:true}).limit(300);
 return r.error?json({error:"دریافت پیام‌ها ناموفق بود."},500):json({conversation:conv,messages:r.data||[]});
}
async function supportSend(req:Request,u:URL){
 const b=await req.json(),id=String(b.conversation_id||""),token=String(b.token||""),message=String(b.message||"").trim(),channel=supportChannel(u);
 if(!message||message.length>3000)return json({error:"پیام باید بین ۱ تا ۳۰۰۰ نویسه باشد."},400);
 const conv=await supportCustomerAuth(id,token);
 if(!conv)return json({error:"نشست چت معتبر نیست."},401);
 if(supportChannelMismatch(conv,channel))return json({error:"این گفت‌وگو متعلق به بخش پشتیبانی دیگری است. یک گفت‌وگوی تازه شروع کن."},403);
 if(conv.status==="closed")return json({error:"این گفت‌وگو بسته شده است."},409);
 const r=await db.from("support_messages").insert({conversation_id:id,sender:"customer",message}).select("id,sender,message,created_at").single();
 if(r.error)return json({error:"ارسال پیام ناموفق بود."},500);
 await db.from("support_conversations").update({updated_at:new Date().toISOString()}).eq("id",id);
 return json({ok:true,message:r.data});
}
async function supportAdminList(u:URL){
 const requestedChannel=u.searchParams.get("channel")==="auction"?"auction":"website";
 const r=await db.from("support_conversations").select("id,customer_mobile,channel,buyer_id,status,created_at,updated_at").order("updated_at",{ascending:false}).limit(200);
 if(r.error)return json({error:r.error.message},500);
 // Keep the website support inbox and auction support inbox completely separate.
 const rows=(r.data||[]).filter((x:any)=>(x.channel||"website")===requestedChannel);
 const ids=rows.map((x:any)=>x.id),mobiles=[...new Set(rows.map((x:any)=>String(x.customer_mobile||"")).filter(Boolean))];
 const buyerIds=[...new Set(rows.map((x:any)=>String(x.buyer_id||"")).filter(Boolean))];
 const [mr,caseNames,auctionNames,auctionBuyers]=await Promise.all([
  ids.length?db.from("support_messages").select("id,conversation_id,sender,message,created_at").in("conversation_id",ids).order("created_at",{ascending:true}):Promise.resolve({data:[],error:null}),
  requestedChannel==="website"&&mobiles.length?db.from("cases").select("customer_mobile,customer_name").in("customer_mobile",mobiles).order("created_at",{ascending:false}):Promise.resolve({data:[],error:null}),
  requestedChannel==="auction"&&mobiles.length?db.from("auction_members").select("id,mobile,full_name").in("mobile",mobiles):Promise.resolve({data:[],error:null}),
  requestedChannel==="auction"&&buyerIds.length?db.from("auction_members").select("id,full_name").in("id",buyerIds):Promise.resolve({data:[],error:null})
 ]);
 if(mr.error)return json({error:mr.error.message},500);
 if(caseNames.error)return json({error:caseNames.error.message},500);
 if(auctionNames.error)return json({error:auctionNames.error.message},500);
 if(auctionBuyers.error)return json({error:auctionBuyers.error.message},500);
 const normalize=(v:any)=>String(v||"").replace(/[^0-9]/g,"").replace(/^98/,"0");
 const caseByMobile=new Map<string,string>(),auctionByMobile=new Map<string,string>(),auctionById=new Map<string,string>();
 for(const c of caseNames.data||[]){const key=normalize(c.customer_mobile);if(key&&c.customer_name&&!caseByMobile.has(key))caseByMobile.set(key,String(c.customer_name).trim())}
 for(const m of auctionNames.data||[]){const key=normalize(m.mobile);if(key&&m.full_name)auctionByMobile.set(key,String(m.full_name).trim())}
 for(const m of auctionBuyers.data||[]){if(m.id&&m.full_name)auctionById.set(String(m.id),String(m.full_name).trim())}
 return json({conversations:rows.map((x:any)=>{const messages=(mr.data||[]).filter((m:any)=>m.conversation_id===x.id),last_message=messages[messages.length-1]||null,key=normalize(x.customer_mobile),customer_name=requestedChannel==="auction"?(auctionById.get(String(x.buyer_id||""))||auctionByMobile.get(key)||""):(caseByMobile.get(key)||"");return {...x,customer_name,messages,last_message,last_message_at:last_message?.created_at||x.updated_at,status:x.status==="closed"?"closed":last_message?.sender==="admin"?"answered":"open"}})});
}
async function supportAdminReply(req:Request,u:URL){
 const b=await req.json(),id=String(b.conversation_id||u.searchParams.get("id")||""),message=String(b.message||"").trim(),channel=(b.channel==="auction"||u.searchParams.get("channel")==="auction")?"auction":"website";
 if(!id||!message||message.length>3000)return json({error:"گفت‌وگو و متن پیام الزامی است."},400);
 const conv=await db.from("support_conversations").select("id,status,channel").eq("id",id).maybeSingle();
 if(conv.error||!conv.data)return json({error:"گفت‌وگو پیدا نشد."},404);
 if(supportChannelMismatch(conv.data,channel))return json({error:"این گفت‌وگو متعلق به بخش پشتیبانی دیگری است."},403);
 if(conv.data.status==="closed")return json({error:"این گفت‌وگو بسته شده است."},409);
 const r=await db.from("support_messages").insert({conversation_id:id,sender:"admin",message}).select("id,sender,message,created_at").single();
 if(r.error)return json({error:r.error.message},500);
 await db.from("support_conversations").update({updated_at:new Date().toISOString()}).eq("id",id);
 return json({ok:true,message:r.data});
}
async function supportAdminClose(req:Request){
 const b=await req.json(),id=String(b.conversation_id||"");
 if(!id)return json({error:"گفت‌وگو مشخص نشده است."},400);
 const r=await db.from("support_conversations").update({status:"closed",updated_at:new Date().toISOString()}).eq("id",id).select("id,status").single();
 return r.error?json({error:r.error.message},500):json({ok:true,conversation:r.data});
}

function normalizeIranMobile(value:string){
 let x=String(value||"").replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/\D/g,"");
 if(x.startsWith("0098"))x=x.slice(2);
 if(x.startsWith("98")&&x.length===12)x="0"+x.slice(2);
 if(x.length===10&&x.startsWith("9"))x="0"+x;
 return /^09\d{9}$/.test(x)?x:"";
}

async function api(req:Request,u:URL){
 const a=u.searchParams.get("api"),id=u.searchParams.get("id")||"";
 if(a==="booking-settings"&&req.method==="GET"){
  const {data,error}=await db.from("booking_settings").select("daily_capacity,blocked_dates,blocked_slots,updated_at").eq("id",1).single();
  if(error)return json({error:error.message},500);
  return json({ok:true,settings:{daily_capacity:data.daily_capacity,blocked_dates:(data.blocked_dates||[]).map((x:any)=>String(x).slice(0,10)),blocked_slots:data.blocked_slots||{},updated_at:data.updated_at}});
 }
 if(a==="booking-calendar"&&req.method==="GET"){
  const start=u.searchParams.get("start")||"",days=Number(u.searchParams.get("days")||10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isInteger(days)||days<1||days>30)return json({error:"تاریخ یا بازه تقویم معتبر نیست."},400);
  const startDate=new Date(start+"T00:00:00Z");if(Number.isNaN(startDate.getTime())||startDate.toISOString().slice(0,10)!==start)return json({error:"تاریخ معتبر نیست."},400);
  const endDate=new Date(startDate.getTime()+(days-1)*86400000).toISOString().slice(0,10);
  const cfg=await db.from("booking_settings").select("daily_capacity,blocked_dates,blocked_slots").eq("id",1).single();if(cfg.error)return json({error:cfg.error.message},500);
  const q=await db.from("cases").select("appointment_date").gte("appointment_date",start).lte("appointment_date",endDate).in("appointment_status",["requested","confirmed"]).not("status","in","(cancelled,done)").not("appointment_time","is",null);
  if(q.error)return json({error:q.error.message},500);
  const counts:any={};for(const c of q.data||[]){const day=String(c.appointment_date).slice(0,10);counts[day]=(counts[day]||0)+1}
  const blockedDates=(cfg.data.blocked_dates||[]).map((x:any)=>String(x).slice(0,10));
  const calendar=[];for(let i=0;i<days;i++){const date=new Date(startDate.getTime()+i*86400000).toISOString().slice(0,10),count=counts[date]||0,blocked=blockedDates.includes(date);calendar.push({date,booked_count:count,remaining_capacity:Math.max(0,Number(cfg.data.daily_capacity)-count),blocked,full:blocked||count>=Number(cfg.data.daily_capacity)})}
  return json({ok:true,daily_capacity:cfg.data.daily_capacity,blocked_dates:blockedDates,blocked_slots:cfg.data.blocked_slots||{},days:calendar});
 }
 if(a==="booking-slots"&&req.method==="GET"){
  const date=u.searchParams.get("date")||"";if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return json({error:"invalid_date"},400);
  const cfg=await db.from("booking_settings").select("daily_capacity,blocked_dates,blocked_slots").eq("id",1).single();if(cfg.error)return json({error:cfg.error.message},500);
  const {data,error}=await db.from("cases").select("appointment_time").eq("appointment_date",date).in("appointment_status",["requested","confirmed"]).not("status","in","(cancelled,done)").not("appointment_time","is",null);
  if(error)return json({error:error.message},500);
  const booked=(data||[]).map((x:any)=>String(x.appointment_time).slice(0,5)),blockedDates=(cfg.data.blocked_dates||[]).map((x:any)=>String(x).slice(0,10)),blockedSlots=(cfg.data.blocked_slots||{})[date]||[];
  return json({ok:true,booked,daily_capacity:cfg.data.daily_capacity,booked_count:booked.length,remaining_capacity:Math.max(0,Number(cfg.data.daily_capacity)-booked.length),is_blocked:blockedDates.includes(date),is_full:blockedDates.includes(date)||booked.length>=Number(cfg.data.daily_capacity),blocked_slots:blockedSlots});
 }
 if(a==="customer-cases"&&req.method==="GET"){
  const header=req.headers.get("authorization")||"",token=header.replace(/^Bearer\s+/i,"").trim();
  if(!token||token==="null"||token==="undefined")return json({error:"برای مشاهده درخواست‌ها وارد حساب مشتری شوید."},401);
  const authResult=await db.auth.getUser(token),user=authResult.data?.user;
  if(authResult.error||!user)return json({error:"نشست ورود معتبر نیست؛ دوباره وارد حساب شوید."},401);
  if(user.phone&&user.phone_confirmed_at){
   const mobile=normalizeIranMobile(user.phone);
   if(mobile)await db.from("cases").update({customer_id:user.id}).eq("customer_mobile",mobile).is("customer_id",null);
  }
  const {data,error}=await db.from("cases").select("id,case_number,service_type,status,appointment_date,appointment_time,appointment_status,created_at,updated_at").eq("customer_id",user.id).order("created_at",{ascending:false});
  if(error)return json({error:error.message},500);
  const ids=(data||[]).map((c:any)=>c.id);let vehicles:any[]=[];
  if(ids.length){const vr=await db.from("vehicles").select("case_id,vehicle_role,brand,model,trim,model_year").in("case_id",ids);if(vr.error)return json({error:vr.error.message},500);vehicles=vr.data||[]}
  const serviceLabels:any={sell:"فروش خودرو",buy:"خرید خودرو",exchange:"معاوضه خودرو"};
  const statusLabels:any={new:"در حال بررسی درخواست",refer:"هماهنگی مراجعه",inspection:"کارشناسی در حال انجام",review:"در حال پیگیری درخواست","auction-ready":"در حال پیگیری درخواست",auction:"در حال پیگیری درخواست","auction-end":"در حال پیگیری درخواست",customer:"در حال پیگیری درخواست",disagreement:"در حال پیگیری درخواست",selling:"در حال پیگیری درخواست",docs:"تکمیل مدارک",deposit:"در حال تکمیل معامله",contract:"در حال تکمیل معامله",done:"تکمیل‌شده",cancelled:"لغوشده"};
  const appointmentLabels:any={requested:"در انتظار تأیید",confirmed:"تأییدشده",cancelled:"لغوشده",completed:"انجام‌شده"};
  return json({cases:(data||[]).map((c:any)=>({case_number:c.case_number,service_label:serviceLabels[c.service_type]||"درخواست خودرو",status_label:statusLabels[c.status]||"در حال پیگیری درخواست",appointment_date:c.appointment_date,appointment_time:c.appointment_time?String(c.appointment_time).slice(0,5):null,appointment_status_label:appointmentLabels[c.appointment_status]||"",created_at:c.created_at,updated_at:c.updated_at,vehicles:vehicles.filter((v:any)=>v.case_id===c.id)}))});
 }
 if(a==="support-start"&&req.method==="POST")return supportStart(req,u);
 if(a==="support-poll"&&req.method==="GET")return supportPoll(u);
 if(a==="support-send"&&req.method==="POST")return supportSend(req,u);

 if(a==="reviews"&&req.method==="GET"){
  const {data,error}=await db.from("customer_reviews").select("id,customer_name,rating,message,created_at").eq("is_approved",true).order("created_at",{ascending:false}).limit(30);
  if(error)return json({error:"دریافت نظرها ناموفق بود."},500);
  return json({reviews:data||[]});
 }
 if(a==="reviews"&&req.method==="POST"){
  try{
   const b=await req.json(),name=String(b.name||"").trim(),message=String(b.message||"").trim(),rating=Number(b.rating);
   if(name.length<2||name.length>80)return json({error:"نام باید بین ۲ تا ۸۰ نویسه باشد."},400);
   if(!Number.isInteger(rating)||rating<1||rating>5)return json({error:"لطفاً امتیاز یک تا پنج ستاره را انتخاب کن."},400);
   if(message.length<5||message.length>1200)return json({error:"متن نظر باید بین ۵ تا ۱۲۰۰ نویسه باشد."},400);
   const {error}=await db.from("customer_reviews").insert({customer_name:name,rating,message,is_approved:false});
   if(error)return json({error:"ذخیره نظر انجام نشد. لطفاً کمی بعد دوباره تلاش کن."},500);
   return json({ok:true,message:"نظر شما ثبت شد و پس از تأیید مدیر منتشر می‌شود."},201);
  }catch(_){return json({error:"اطلاعات نظر معتبر نیست."},400)}
 }
 const hex=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map((b)=>b.toString(16).padStart(2,"0")).join("");

 let role=auth(u),staffMemberId="";
 if(a==="customer-register-request"&&req.method==="POST"){
  try{
   const b=await req.json(),toEnglish=(v:string)=>String(v||"").replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d));
   const full_name=String(b.full_name||"").trim().slice(0,120),mobile=toEnglish(String(b.mobile||"").replace(/\D/g,""));
   if(full_name.length<3)return json({error:"نام و نام خانوادگی را کامل وارد کنید."},400);
   if(!/^09\d{9}$/.test(mobile))return json({error:"شماره موبایل باید ۱۱ رقم و با 09 شروع شود."},400);
   const old=await db.from("customer_access_requests").select("id,status").eq("mobile",mobile).maybeSingle();
   if(old.data?.status==="approved")return json({error:"برای این شماره قبلاً حساب تأیید شده است. کد ورود را از مدیر دریافت کنید."},409);
   if(old.data?.status==="pending")return json({ok:true,message:"درخواست شما قبلاً ثبت شده و منتظر تأیید مدیر است."});
   const payload={full_name,mobile,national_id:"",status:"pending",display_code:null,code_hash:null,code_expires_at:null,code_used_at:null,updated_at:new Date().toISOString()};
   const save=old.data?await db.from("customer_access_requests").update(payload).eq("id",old.data.id):await db.from("customer_access_requests").insert(payload);
   if(save.error)return json({error:"ثبت درخواست انجام نشد؛ دوباره تلاش کنید."},500);
   return json({ok:true,message:"درخواست ثبت شد. پس از تأیید مدیر، کد ورود را از او دریافت کنید."},201);
  }catch(_){return json({error:"اطلاعات درخواست معتبر نیست."},400)}
 }

 if(a==="customer-code-login"&&req.method==="POST"){
  try{
   const b=await req.json(),toEnglish=(v:string)=>String(v||"").replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)),mobile=toEnglish(String(b.mobile||"").replace(/\D/g,"")),code=toEnglish(String(b.code||"").replace(/\D/g,""));
   if(!/^09\d{9}$/.test(mobile)||!/^\d{8}$/.test(code))return json({error:"شماره موبایل یا کد ورود معتبر نیست."},400);
   const r=await db.from("customer_access_requests").select("id,auth_user_id,status,code_hash,code_expires_at,code_used_at,mobile").eq("mobile",mobile).maybeSingle();
   if(r.error||!r.data||r.data.status!=="approved"||!r.data.auth_user_id||!r.data.code_hash||r.data.code_used_at||!r.data.code_expires_at||new Date(r.data.code_expires_at).getTime()<Date.now()||await hex(code)!==r.data.code_hash)return json({error:"کد ورود اشتباه است، منقضی شده یا قبلاً استفاده شده است."},401);
   const ur=await db.auth.admin.getUserById(r.data.auth_user_id);
   if(ur.error||!ur.data.user?.email)return json({error:"حساب مشتری پیدا نشد؛ از مدیر بخواه کد تازه صادر کند."},401);
   const link=await db.auth.admin.generateLink({type:"magiclink",email:ur.data.user.email});
   if(link.error||!link.data?.properties?.hashed_token)return json({error:"ساخت نشست ورود انجام نشد؛ مدیر باید کد تازه صادر کند."},500);
   const used=await db.from("customer_access_requests").update({display_code:null,code_hash:null,code_expires_at:null,code_used_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",r.data.id).is("code_used_at",null).eq("code_hash",r.data.code_hash);
   if(used.error)return json({error:"ثبت استفاده از کد ناموفق بود."},500);
   return json({ok:true,token_hash:link.data.properties.hashed_token,type:"magiclink"});
  }catch(_){return json({error:"ورود با کد مدیر انجام نشد."},400)}
 }
 if(a==="customer-code-used"&&req.method==="POST"){
  const bearer=(req.headers.get("authorization")||"").replace(/^Bearer\\s+/i,"").trim();
  if(!bearer)return json({error:"unauthorized"},401);
  const ur=await db.auth.getUser(bearer);if(ur.error||!ur.data?.user)return json({error:"unauthorized"},401);
  const up=await db.from("customer_access_requests").update({display_code:null,code_hash:null,code_expires_at:null,code_used_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("auth_user_id",ur.data.user.id).eq("status","approved");
  return up.error?json({error:"ثبت مصرف کد انجام نشد."},500):json({ok:true});
 }

 if(a==="staff-login"&&req.method==="POST"){
  try{
   const b=await req.json(),want=String(b.role||""),code=String(b.personnel_code||"").trim(),password=String(b.password||"");
   const allowedRoles=["admin","expert","intake","sales","followup","legal","finance","contracts","dealer"];
   if(!allowedRoles.includes(want)||code.length!==4||Array.from(code).some(ch=>ch<"0"||ch>"9")||!password)return json({error:"کد پرسنلی و رمز عبور را بررسی کنید."},400);
   const ch=await hex(code);
   const mr=await db.from("staff_members").select("id,full_name,role,active").eq("personnel_code_hash",ch).in("role",want==="intake"?["intake","followup"]:[want]).maybeSingle();
   if(mr.error||!mr.data||!mr.data.active)return json({error:"کد پرسنلی نامعتبر یا غیرفعال است."},401);
   const ph=await hex(password);
   if(want==="admin"||want==="expert"){
    const cr=await db.from("staff_credentials").select("password_hash").eq("role",want).maybeSingle();
    if(cr.error||!cr.data||ph!==cr.data.password_hash)return json({error:"ورود ناموفق بود. رمز یا کد پرسنلی صحیح نیست."},401);
   }else{
    const cr=await db.from("staff_member_credentials").select("password_hash").eq("staff_member_id",mr.data.id).maybeSingle();
    if(cr.error||!cr.data||ph!==cr.data.password_hash)return json({error:"ورود ناموفق بود. رمز یا کد پرسنلی صحیح نیست."},401);
   }
   const token=crypto.randomUUID()+crypto.randomUUID();
   const th=await hex(token);
   const sessionRole=(want==="sales"&&b.admin_access===true)?"admin":want;
   const ins=await db.from("staff_sessions").insert({token_hash:th,role:sessionRole,staff_member_id:mr.data.id,expires_at:new Date(Date.now()+12*60*60*1000).toISOString()});
   if(ins.error)return json({error:"ساخت نشست ورود ناموفق بود."},500);
   await db.from("staff_members").update({personnel_code_display:code}).eq("id",mr.data.id);
   return json({ok:true,token,staff_name:mr.data.full_name,role:want});
  }catch(_){return json({error:"درخواست ورود نامعتبر است."},400)}
 }
 if(!role){
  const authHeader=req.headers.get("authorization")||"";
  const raw=(u.searchParams.get("key")||authHeader.replace(/^Bearer\s+/i,"")).trim();
  if(raw){
   const th=await hex(raw);
   const sr=await db.from("staff_sessions").select("role,expires_at,staff_member_id").eq("token_hash",th).gt("expires_at",new Date().toISOString()).maybeSingle();
   if(!sr.error&&sr.data){
    const mr=sr.data.staff_member_id?await db.from("staff_members").select("active,role").eq("id",sr.data.staff_member_id).maybeSingle():null;
    if(!mr||(!mr.error&&mr.data?.active)){role=sr.data.role;staffMemberId=sr.data.staff_member_id||"";}
   }
  }
 }
 if(role==="expert"&&id&&["case-comments","case-comment","draft","inspect"].includes(a)){
  const assigned=await db.from("cases").select("assigned_expert_staff_id").eq("id",id).maybeSingle();
  if(assigned.error)return json({error:assigned.error.message},500);
  if(!assigned.data||assigned.data.assigned_expert_staff_id!==staffMemberId)return json({error:"این پرونده به شما ارجاع نشده است؛ فقط پرونده‌های ارجاع‌شده به خودتان قابل ویرایش هستند."},403);
 }
 if(a==="reviews-admin-list"&&role==="admin"&&req.method==="GET"){
  const {data,error}=await db.from("customer_reviews").select("id,customer_name,rating,message,is_approved,created_at,approved_at").order("created_at",{ascending:false}).limit(500);
  if(error)return json({error:"دریافت نظرها ناموفق بود."},500);
  return json({reviews:data||[]});
 }
 if(a==="reviews-admin-approve"&&role==="admin"&&req.method==="POST"){
  const approvedAt=(await db.from("customer_reviews").select("is_approved").eq("id",id).maybeSingle());
  if(approvedAt.error)return json({error:"بررسی نظر ناموفق بود."},500);
  if(!approvedAt.data)return json({error:"نظر پیدا نشد."},404);
  const next=!approvedAt.data.is_approved;
  const {data,error}=await db.from("customer_reviews").update({is_approved:next,approved_at:next?new Date().toISOString():null}).eq("id",id).select("id,is_approved").single();
  if(error)return json({error:"تغییر وضعیت انتشار نظر ناموفق بود."},500);
  return json({ok:true,is_approved:data.is_approved});
 }
 if(a==="reviews-admin-delete"&&role==="admin"&&req.method==="POST"){
  if(!id)return json({error:"شناسه نظر مشخص نشده است."},400);
  const {error}=await db.from("customer_reviews").delete().eq("id",id);
  if(error)return json({error:"حذف نظر انجام نشد."},500);
  return json({ok:true});
 }
 if(a==="booking-settings"&&req.method==="POST"&&role==="admin"){
  try{
   const b=await req.json(),capacity=Number(b.daily_capacity);
   if(!Number.isInteger(capacity)||capacity<1||capacity>9)return json({error:"ظرفیت روزانه باید بین ۱ تا ۹ نوبت باشد."},400);
   const dates=Array.isArray(b.blocked_dates)?b.blocked_dates.map((x:any)=>String(x)):[];if(dates.length>365||dates.some((x:string)=>!/^\d{4}-\d{2}-\d{2}$/.test(x)||Number.isNaN(new Date(x+"T00:00:00Z").getTime())||new Date(x+"T00:00:00Z").toISOString().slice(0,10)!==x))return json({error:"فهرست روزهای تعطیل معتبر نیست."},400);
   const slots:any={};const incoming=b.blocked_slots&&typeof b.blocked_slots==="object"&&!Array.isArray(b.blocked_slots)?b.blocked_slots:{};
   for(const [date,times] of Object.entries(incoming)){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Array.isArray(times)||times.length>9)return json({error:"فهرست ساعت‌های بسته‌شده معتبر نیست."},400);
    const clean=(times as any[]).map(String);if(clean.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)||Number(t.slice(0,2))<9||Number(t.slice(0,2))>17||Number(t.slice(3,5))!==0))return json({error:"ساعت بسته‌شده باید یکی از ساعت‌های ۰۹ تا ۱۷ باشد."},400);
    if(clean.length)slots[date]=Array.from(new Set(clean));
   }
   const {data,error}=await db.from("booking_settings").update({daily_capacity:capacity,blocked_dates:dates,blocked_slots:slots,updated_at:new Date().toISOString()}).eq("id",1).select("daily_capacity,blocked_dates,blocked_slots,updated_at").single();
   if(error)return json({error:error.message},500);
   return json({ok:true,settings:{daily_capacity:data.daily_capacity,blocked_dates:(data.blocked_dates||[]).map((x:any)=>String(x).slice(0,10)),blocked_slots:data.blocked_slots||{},updated_at:data.updated_at}});
  }catch(e){return json({error:String(e)},400)}
 }
 if(a==="staff-password-change"&&req.method==="POST"&&(role==="admin"||role==="expert")){
  try{
   const b=await req.json(),current=String(b.current_password||""),next=String(b.new_password||""),confirm=String(b.confirm_password||"");
   if(next.length<12)return json({error:"رمز جدید باید حداقل ۱۲ نویسه باشد."},400);
   if(next!==confirm)return json({error:"تکرار رمز جدید مطابقت ندارد."},400);
   const old=await db.from("staff_credentials").select("password_hash").eq("role",role).maybeSingle();
   if(old.error||!old.data||await hex(current)!==old.data.password_hash)return json({error:"رمز فعلی صحیح نیست."},401);
   const up=await db.from("staff_credentials").update({password_hash:await hex(next),updated_at:new Date().toISOString()}).eq("role",role);
   if(up.error)return json({error:"ذخیره رمز جدید ناموفق بود."},500);
   return json({ok:true,message:"رمز عبور با موفقیت تغییر کرد."});
  }catch(_){return json({error:"درخواست تغییر رمز نامعتبر است."},400)}
 }

 if(a==="customer-access-list"&&role==="admin"&&req.method==="GET"){
  const r=await db.from("customer_access_requests").select("id,full_name,mobile,national_id,status,display_code,code_expires_at,code_used_at,created_at,issued_at").order("created_at",{ascending:false}).limit(500);
  return r.error?json({error:"دریافت درخواست‌های مشتری ناموفق بود."},500):json({requests:r.data||[]});
 }
 if(a==="customer-access-issue"&&role==="admin"&&req.method==="POST"){
  try{
   const b=await req.json(),requestId=String(b.request_id||"");
   if(!requestId)return json({error:"درخواست مشتری مشخص نیست."},400);
   const rr=await db.from("customer_access_requests").select("*").eq("id",requestId).maybeSingle();
   if(rr.error||!rr.data)return json({error:"درخواست مشتری پیدا نشد."},404);
   if(rr.data.status==="rejected")return json({error:"این درخواست رد شده است؛ ابتدا وضعیت آن را بررسی کنید."},409);
   const row=rr.data,code=String(crypto.getRandomValues(new Uint32Array(1))[0]%90000000+10000000),email="customer-"+row.mobile+"@login.switch-to-switch.invalid";
   let userId=String(row.auth_user_id||"");
   if(userId){
    const u=await db.auth.admin.updateUserById(userId,{password:code,email_confirm:true,user_metadata:{full_name:row.full_name,mobile:row.mobile}});
    if(u.error)return json({error:"صدور کد ورود ناموفق بود: "+u.error.message},500);
   }else{
    const u=await db.auth.admin.createUser({email,password:code,email_confirm:true,user_metadata:{full_name:row.full_name,mobile:row.mobile}});
    if(u.error)return json({error:"ساخت حساب مشتری ناموفق بود: "+u.error.message},500);
    userId=String(u.data.user.id);
   }
   const profile=await db.from("profiles").upsert({id:userId,full_name:row.full_name,mobile:row.mobile,national_id:row.national_id,role:"customer"},{onConflict:"id"});
   if(profile.error)return json({error:"حساب ساخته شد اما ذخیره مشخصات مشتری ناموفق بود: "+profile.error.message},500);
   const expires=new Date(Date.now()+24*60*60*1000).toISOString(),hash=await hex(code);
   const upd=await db.from("customer_access_requests").update({status:"approved",auth_user_id:userId,display_code:code,code_hash:hash,code_expires_at:expires,code_used_at:null,issued_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",requestId);
   if(upd.error)return json({error:"ذخیره کد ورود ناموفق بود."},500);
   return json({ok:true,code,expires_at:expires,message:"کد ورود صادر شد. آن را فقط به همان مشتری تحویل دهید."});
  }catch(e){return json({error:"صدور کد ورود ناموفق بود: "+String(e)},500)}
 }
 if(a==="customer-access-reject"&&role==="admin"&&req.method==="POST"){
  const b=await req.json(),requestId=String(b.request_id||"");
  if(!requestId)return json({error:"درخواست مشتری مشخص نیست."},400);
  const r=await db.from("customer_access_requests").update({status:"rejected",display_code:null,code_hash:null,code_expires_at:null,updated_at:new Date().toISOString()}).eq("id",requestId).neq("status","approved");
  return r.error?json({error:"رد درخواست ناموفق بود."},500):json({ok:true});
 }
 if(a==="personnel-list"&&(role==="admin"||role==="sales")&&req.method==="GET"){
  let q=db.from("staff_members").select("id,full_name,role,active,personnel_code_display").order("created_at",{ascending:true});
  if(role==="sales")q=q.eq("role","expert").eq("active",true);
  const {data,error}=await q;
  if(error)return json({error:error.message},500);
  return json({staff:data||[]});
 }

 if(a==="support-admin-list"&&role==="admin"&&req.method==="GET")return supportAdminList(u);
 if(a==="support-admin-messages"&&role==="admin"&&req.method==="GET"){
  const channel=supportChannel(u),conv=await db.from("support_conversations").select("id,channel").eq("id",id).maybeSingle();
  if(conv.error||!conv.data)return json({error:"گفت‌وگو پیدا نشد."},404);
  if(supportChannelMismatch(conv.data,channel))return json({error:"این گفت‌وگو متعلق به بخش پشتیبانی دیگری است."},403);
  const q=await db.from("support_messages").select("id,sender,message,created_at").eq("conversation_id",id).order("created_at",{ascending:true}).limit(300);
  return q.error?json({error:q.error.message},500):json({messages:q.data||[]});
 }

 if(a==="support-admin-reply"&&role==="admin"&&req.method==="POST")return supportAdminReply(req,u);
 if(a==="support-admin-close"&&role==="admin"&&req.method==="POST")return supportAdminClose(req);
 await expireAuctions();
 await expireAuctions();
 if(a==="auction-bid-state"&&req.method==="GET")return auctionBidState(req,u);if(a==="public-ready-auctions"&&req.method==="GET"){const {data,error}=await db.from("cases").select("id,case_number,status,created_at").in("status",["review","auction-ready"]).order("created_at",{ascending:false});if(error)return json({error:error.message},500);const ids=(data||[]).map((c:any)=>c.id);const vr=ids.length?await db.from("vehicles").select("case_id,brand,model,trim,model_year,mileage").in("case_id",ids).eq("vehicle_role","current"):{data:[],error:null};if(vr.error)return json({error:vr.error.message},500);return json({cases:(data||[]).map((c:any)=>({...c,vehicle:(vr.data||[]).find((v:any)=>v.case_id===c.id)||null}))})}if(a==="auction-request-code"&&req.method==="POST")return requestAuctionOtp(req);if(a==="auction-code-status"&&req.method==="GET")return auctionCodeStatus(u);if(a==="auction-approve-code"&&role==="admin"&&req.method==="POST")return adminApproveAuctionCode(req);if(a==="auction-verify-code"&&req.method==="POST")return verifyAuctionOtp(req);if(a==="passkey-registration-options"&&req.method==="POST")return passkeyRegistrationOptions(req,u);if(a==="passkey-registration-verify"&&req.method==="POST")return passkeyRegistrationVerify(req,u);if(a==="passkey-authentication-options"&&req.method==="POST")return passkeyAuthenticationOptions(req);if(a==="passkey-authentication-verify"&&req.method==="POST")return passkeyAuthenticationVerify(req);if(a==="auction-start-subscription"&&req.method==="POST")return startAuctionSubscription(req);if(a==="auction-payment-callback"&&req.method==="POST")return paymentCallback(req);if(a==="public-auctions"&&req.method==="GET")return publicAuctions(req,u);if(a==="buyer-dashboard"&&req.method==="GET")return buyerDashboard(req,u);if(a==="buyer-pay-fine-wallet"&&req.method==="POST")return buyerPayFineWallet(req,u,id);if(a==="buyer-delivery-details"&&req.method==="GET")return buyerDeliveryDetails(req,u,id);if(a==="buyer-complete-transaction"&&req.method==="POST")return buyerCompleteTransaction(req,u,id);if(a==="buyer-mark-notification-read"&&req.method==="POST")return buyerMarkNotificationRead(req,u);if(a==="buyer-save-profile"&&req.method==="POST")return buyerSaveProfile(req,u);if(a==="buyer-upload-identity"&&req.method==="POST")return buyerUploadIdentity(req,u);if(a==="buyer-submit-payment"&&req.method==="POST")return buyerSubmitPayment(req,u,id);if(a==="buyer-pay-prepayment-wallet"&&req.method==="POST")return buyerPayPrepaymentWallet(req,u,id);if(a==="buyer-auction-decision"&&req.method==="POST")return buyerAuctionDecision(req,u,id);if(a==="buyer-cancel-purchase"&&req.method==="POST")return buyerCancelPurchase(req,u,id);
 if(a==="place-bid"&&req.method==="POST")return placeBid(req,id);
 if(a==="market_prices")return marketPrices(u); if(a==="estimate"&&req.method==="POST")return estimate(req);
 if(a==="auction-login-codes"&&role==="admin"&&req.method==="GET")return auctionLoginCodes(u);
if(a==="admin-update-vehicle"&&role==="admin"&&req.method==="POST")return adminUpdateVehicle(req);if(a==="admin-review-identity"&&role==="admin"&&req.method==="POST")return adminReviewIdentity(req);if(a==="admin-approve-seller"&&role==="admin"&&req.method==="POST")return adminApproveSeller(req);if(a==="admin-set-auction-settlement"&&role==="admin"&&req.method==="POST")return adminSetAuctionSettlement(req);if(a==="admin-set-cancellation-fine"&&role==="admin"&&req.method==="POST")return adminSetCancellationFine(req);if(a==="admin-review-buyer-payment"&&["admin","finance"].includes(role)&&req.method==="POST")return adminReviewBuyerPayment(req,role);if(a==="admin-buyer-payments"&&["admin","finance"].includes(role)&&req.method==="GET")return adminBuyerPayments(u);if(a==="wallet-topup-request"&&req.method==="POST")return buyerSubmitWalletTopup(req,u);if(a==="subscription-payment-request"&&req.method==="POST")return buyerSubmitSubscriptionPayment(req,u);if(a==="subscription-payment-requests"&&req.method==="GET")return buyerSubscriptionPaymentRequests(req,u);if(a==="admin-subscription-payment-requests"&&role==="admin"&&req.method==="GET")return adminSubscriptionPaymentRequests();if(a==="admin-review-subscription-payment"&&role==="admin"&&req.method==="POST")return adminReviewSubscriptionPayment(req);if(a==="wallet-topup-requests"&&req.method==="GET")return buyerWalletTopupRequests(req,u);if(a==="admin-wallet-topup-requests"&&role==="admin"&&req.method==="GET")return adminWalletTopupRequests(u);if(a==="admin-review-wallet-topup"&&role==="admin"&&req.method==="POST")return adminReviewWalletTopup(req);if(a==="wallet-bank-settings"&&req.method==="GET")return getWalletBankSettings();if(a==="wallet-bank-settings"&&role==="admin"&&req.method==="POST")return saveWalletBankSettings(req);if(a==="admin-topup-wallet"&&role==="admin"&&req.method==="POST")return adminTopupWallet(req);if(a==="auction-members"&&role==="admin"&&req.method==="GET")return auctionMembers();if(a==="delete-auction-member"&&role==="admin"&&req.method==="POST")return deleteAuctionMember(req);if(a==="activate-auction-member"&&role==="admin"&&req.method==="POST")return activateAuctionMember(u,req);if(a==="deactivate-auction-member"&&role==="admin"&&req.method==="POST")return deactivateAuctionMember(req);if(a==="update-auction-member"&&role==="admin"&&req.method==="POST")return updateAuctionMember(req);if(!role)return json({error:"unauthorized"},401);

 if(a==="price-market-search"&&req.method==="POST"){
  if(!["admin","sales"].includes(role))return json({error:"جست‌وجوی قیمت بازار فقط برای مدیریت و واحد فروش مجاز است."},403);
  let b:any;try{b=await req.json()}catch(_){return json({error:"اطلاعات جست‌وجو نامعتبر است."},400)}
  const brand=String(b.brand||"").trim().slice(0,60),model=String(b.model||"").trim().slice(0,80),trim=String(b.trim||"").trim().slice(0,60),year=String(b.year||"").trim().slice(0,8),mileage=String(b.mileage||"").trim().slice(0,20),city=String(b.city||"تهران").trim().slice(0,60);
  const query=[brand,model,trim,year].filter(Boolean).join(" ").slice(0,120);
  if(!query)return json({error:"برند یا مدل خودرو در پرونده ثبت نشده است."},400);
  const listings:any[]=[],sourceStatus:any={divar:"در حال بررسی",bama:"در حال بررسی",sheypoor:"در حال بررسی"};
  const cleanText=(s:string)=>String(s||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g," ").replace(/&#x([0-9a-f]+);/gi,(_,x)=>String.fromCodePoint(parseInt(x,16))).replace(/&#(\d+);/g,(_,x)=>String.fromCodePoint(Number(x))).replace(/\s+/g," ").trim();
  const rpc=async(method:string,params:any={})=>{
   const res=await fetch("https://divar-mcp.mmdju2.workers.dev/mcp",{method:"POST",headers:{"content-type":"application/json","accept":"application/json, text/event-stream","user-agent":"SwitchToSwitch-PriceAssistant/1.0"},body:JSON.stringify({jsonrpc:"2.0",id:Math.floor(Math.random()*1000000)+1,method,params}),signal:AbortSignal.timeout(11000)});
   const body=await res.text();if(!res.ok)throw new Error("منبع دیوار پاسخ "+res.status);
   const payload=body.split("\n").filter((line)=>line.startsWith("data:")).map((line)=>line.slice(5).trim()).filter(Boolean).at(-1)||body;
   return JSON.parse(payload);
  };
  try{
   await rpc("initialize",{protocolVersion:"2024-11-05",capabilities:{},clientInfo:{name:"switch-to-switch-price-assistant",version:"1.0.0"}});
   await rpc("notifications/initialized",{});
   const searchQueries=[...new Set([query,[brand,model].filter(Boolean).join(" "),[model,year].filter(Boolean).join(" ")].map((x)=>String(x||"").trim()).filter(Boolean))];
   const searchCities=[...new Set([city||"تهران",...(String(city||"تهران").trim()!=="تهران"?["تهران"]:[])])];
   const seenDivar=new Set<string>();let attempted=0,lastSearchError="";
   for(const searchCity of searchCities){
    for(const searchQuery of searchQueries){
     if(listings.length>=8)break;
     attempted++;
     try{
      const search=await rpc("tools/call",{name:"search_ads",arguments:{query:searchQuery,category:"light",city:searchCity,limit:10}});
      const raw=search?.result?.content?.find((x:any)=>x.type==="text")?.text||"";
      let data:any={};try{data=JSON.parse(raw||"{}")}catch(_){data={}};
      const items=Array.isArray(data.items)?data.items:Array.isArray(data.results)?data.results:[];
      for(const item of items){
       const price=Number(item.price_toman);let adUrl="";try{const parsed=new URL(String(item.url||item.link||""));if(parsed.protocol==="https:"&&(parsed.hostname==="divar.ir"||parsed.hostname.endsWith(".divar.ir")))adUrl=parsed.toString()}catch(_){}if(!adUrl||seenDivar.has(adUrl))continue;seenDivar.add(adUrl);
       listings.push({source:"دیوار",title:String(item.title||item.name||"آگهی خودرو").slice(0,220),url:adUrl,city:String(item.city||searchCity||city),price_toman:Number.isFinite(price)&&price>0&&!item.price_is_placeholder?price:null,price_is_placeholder:!!item.price_is_placeholder,price_note:item.price_note||(!Number.isFinite(price)||price<=0?"آگهی قیمت قطعی قابل‌استفاده ندارد":""),mileage:item.mileage??null,verified_price:Number.isFinite(price)&&price>0&&!item.price_is_placeholder});
      }
     }catch(e){lastSearchError=String(e).slice(0,100)}
    }
    if(listings.length>=12)break;
   }
   sourceStatus.divar=listings.length?("دریافت "+listings.length+" آگهی از "+attempted+" جست‌وجوی چندمرحله‌ای؛ شهر و عبارت جست‌وجو به‌صورت جایگزین بررسی شدند"):(lastSearchError?"منبع دیوار نتیجه نداد؛ خطای آخر: "+lastSearchError:"پس از بررسی چند عبارت و شهر، نتیجه‌ای برنگشت");
  }catch(e){sourceStatus.divar="دریافت خودکار دیوار ناموفق بود: "+String(e).slice(0,150)}
  const parseRedirect=(href:string)=>{try{const u=new URL(href,"https://html.duckduckgo.com");const target=u.searchParams.get("uddg");return target?decodeURIComponent(target):href}catch{return href}};
  const searchHtml=async(domain:string)=>{
   const base=[brand,model].filter(Boolean).join(" ")||query;
   const queries=[
    "site:"+domain+" "+query+" "+(year||"")+" "+(city||"تهران")+" قیمت خودرو",
    "site:"+domain+" "+base+" "+(city||"تهران"),
    "site:"+domain+" "+base+" قیمت"
   ];
   const results:any[]=[],seen=new Set<string>();
   for(const textQuery of queries){
    if(results.length>=4)break;
    try{
     const q=encodeURIComponent(textQuery);
     const res=await fetch("https://html.duckduckgo.com/html/?q="+q,{headers:{"user-agent":"Mozilla/5.0 (compatible; SwitchToSwitchPriceAssistant/1.0)","accept":"text/html"},signal:AbortSignal.timeout(4500)});
     if(!res.ok)continue;
     const html=await res.text();
     const re=/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;let m;
     while((m=re.exec(html))&&results.length<4){
      const url=parseRedirect(m[1]);let parsedUrl:URL;try{parsedUrl=new URL(url)}catch(_){continue}
      if(parsedUrl.protocol!=="https:"&&parsedUrl.protocol!=="http:")continue;
      if(!(parsedUrl.hostname.toLowerCase()===domain||parsedUrl.hostname.toLowerCase().endsWith("."+domain)))continue;
      if(seen.has(url))continue;
      const title=cleanText(m[2]);if(!title)continue;seen.add(url);
      let snippet="";const tail=html.slice(re.lastIndex,re.lastIndex+1400),sm=tail.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div|td)>/i);if(sm)snippet=cleanText(sm[1]);
      results.push({url,title,snippet});
     }
    }catch(_){}
   }
   return results;
  };
  const readListingPrice=async(url:string)=>{
   try{
    const res=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; SwitchToSwitchPriceAssistant/1.0)","accept":"text/html"},redirect:"follow",signal:AbortSignal.timeout(3500)});
    if(!res.ok)return null;const html=(await res.text()).slice(0,1200000);
    const candidates:string[]=[];
    const patterns=[
     /<meta[^>]+(?:property|name)=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
     /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']product:price:amount["']/i,
     /<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i,
     /["']price["']\s*:\s*["']([\d,٬،.]+)["']/i,
     /(?:قیمت|مبلغ)[^<>]{0,80}?([\d,٬،۰-۹٠-٩]{7,})\s*(تومان|تومن|ریال)/i
    ];
    let explicitCurrency="";
    for(const p of patterns){const m=html.match(p);if(m?.[1]){candidates.push(m[1]);if(m[2]&&/تومان|تومن|ریال/.test(m[2]))explicitCurrency=m[2];break}}
    if(!candidates.length)return null;
    const currency=(html.match(/(?:priceCurrency|currency)["']?\s*[:=]\s*["'](IRR|IRT|تومان|ریال)["']/i)?.[1]||explicitCurrency).toUpperCase();
    if(!["IRR","IRT","تومان","تومن","ریال"].includes(currency))return null;
    const digits=candidates[0].replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[^\d]/g,"");
    const n=Number(digits);if(!Number.isFinite(n)||n<10000000||n>100000000000000)return null;
    if(currency==="IRR"||currency==="ریال")return Math.round(n/10);
    return n;
   }catch(_){return null}
  };
  for(const [key,domain,sourceName] of [["bama","bama.ir","باما"],["sheypoor","sheypoor.com","شیپور"]]){
   try{
    const found=await searchHtml(domain);
    for(const ad of found){
     const price=await readListingPrice(ad.url);
     listings.push({source:sourceName,title:ad.title,url:ad.url,city,price_toman:price,price_is_placeholder:false,price_note:price?"قیمت از داده قابل‌خواندن صفحه آگهی استخراج شد":"آگهی پیدا شد، اما قیمت آن از صفحه قابل تأیید نبود؛ در محاسبه وارد نمی‌شود",verified_price:!!price,search_snippet:ad.snippet||""});
    }
    sourceStatus[key]=found.length?("پیدا شد "+found.length+" نتیجه؛ فقط قیمت‌های قابل‌تأیید استفاده می‌شوند"):"نتیجه قابل‌دسترسی پیدا نشد";
   }catch(e){sourceStatus[key]="دسترسی خودکار فعلاً ناموفق بود: "+String(e).slice(0,120)}
  }
  const normalizeDigits=(s:string)=>String(s||"").replace(/[۰-۹]/g,(d)=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,(d)=>"٠١٢٣٤٥٦٧٨٩".indexOf(d));
  const targetYear=Number(normalizeDigits(year).replace(/[^0-9]/g,""));
  const yearShort=targetYear>=1300?targetYear%100:targetYear;
  const yearMatchState=(listing:any):boolean|null=>{
   if(!targetYear)return true;
   const text=normalizeDigits([listing.title,listing.description,listing.search_snippet,listing.model_year,listing.year].filter(Boolean).join(" "));
   // Detect full Iranian years directly; accept 2-digit years only when explicitly attached to a year/model label.
   const fullYears=[...text.matchAll(/(?<!\d)(?:13|14)\d{2}(?!\d)/g)].map((m:any)=>Number(m[0]));
   const shortYears=[...text.matchAll(/(?:مدل|سال(?:\s*ساخت)?|ساخت|model\s*year|year)\s*[:：-]?\s*(\d{2})(?!\d)/gi)].map((m:any)=>Number(m[1]));
   const years=[...fullYears,...shortYears];
   if(!years.length)return null;
   return years.some((y:number)=>y===targetYear||((y<100)&&(y===yearShort))||((targetYear<100)&&(y%100===targetYear)));
  };
  const beforeYearFilter=listings.length;
  const taggedListings=listings.map((x:any)=>({...x,year_match:yearMatchState(x)}));
  const yearFilteredListings=taggedListings.filter((x:any)=>x.year_match!==false);
  listings.splice(0,listings.length,...yearFilteredListings);
  const yearExcludedCount=beforeYearFilter-listings.length;
  const unknownYearCount=listings.filter((x:any)=>x.year_match===null).length;
  if(targetYear){const label=String(targetYear);sourceStatus.year_filter="آگهی‌های دارای سال مدل "+label+" (یا "+String(yearShort)+" در نگارش کوتاه) برای مقایسه قیمت نگه داشته می‌شوند؛ "+yearExcludedCount+" مورد با سال متفاوت حذف شد و "+unknownYearCount+" آگهی بدون سال مشخص فقط برای بررسی دستی نمایش داده می‌شود."}
  const verified=listings.filter((x:any)=>x.verified_price&&Number.isFinite(Number(x.price_toman))&&Number(x.price_toman)>0);
  return json({ok:true,checked_at:new Date().toISOString(),query,city,requested_year:year,year_excluded_count:yearExcludedCount,source_status:sourceStatus,listings,priced_count:verified.length,notice:"قیمت‌ها فقط وقتی محاسبه می‌شوند که منبع مقدار عددی قابل‌خواندن ارائه کند. جست‌وجوی دیوار از سرویس عمومی غیررسمیِ بدون کلید استفاده می‌کند و ممکن است با تغییر منبع متوقف شود؛ باما و شیپور از نتایج وب عمومی و صفحه آگهی بررسی می‌شوند، نه API رسمی.",method:"public-listing-search"});
 }
 if(a==="team-update"&&req.method==="POST"){
  if(!["admin","intake","expert","sales","followup","legal","finance","contracts"].includes(role))return json({error:"این عملیات برای واحد شما مجاز نیست."},403);
  if(!id)return json({error:"شناسه پرونده مشخص نشده است."},400);
  let b:any;try{b=await req.json()}catch(_){return json({error:"اطلاعات ارسالی نامعتبر است."},400)}
  const type=String(b.update_type||"").slice(0,60),note=String(b.note||"").trim().slice(0,2000),payload=b.payload&&typeof b.payload==="object"&&!Array.isArray(b.payload)?b.payload:{};
  if(role==="legal"&&type==="documents_rejected"&&!note)return json({error:"برای بازگرداندن پرونده به‌دلیل نقص مدارک، ثبت دلیل نقص الزامی است."},400);
  if(role==="legal"&&type==="legal_inquiries_completed"&&!note)return json({error:"برای ثبت پایان استعلام‌ها، نتیجه استعلام‌ها را در یادداشت وارد کنید."},400);
  if(type==="documents_checklist_save"){
   if(role!=="sales")return json({error:"ثبت و تأیید چک‌لیست مدارک فقط برای تیم فروش مجاز است."},403);
   const cr=await db.from("cases").select("id,status").eq("id",id).maybeSingle();if(cr.error)return json({error:cr.error.message},500);if(!cr.data)return json({error:"پرونده پیدا نشد."},404);
   if(!["awaiting_docs","docs"].includes(cr.data.status))return json({error:"چک‌لیست فقط توسط فروش و در مرحله تکمیل مدارک قابل ثبت است."},409);
   const items=payload.items&&typeof payload.items==="object"?payload.items:{};
   const requiredKeys=["owner_national_id","vehicle_card","green_card"];
   const uploaded=await db.from("documents").select("document_type").eq("case_id",id).in("document_type",requiredKeys);
   if(uploaded.error)return json({error:uploaded.error.message},500);
   const uploadedTypes=new Set((uploaded.data||[]).map((x:any)=>x.document_type));
   const missing=requiredKeys.filter(k=>!uploadedTypes.has(k));
   const toDigits=(v:any)=>String(v||"").replace(/[۰-۹]/g,(d:string)=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,(d:string)=>"٠١٢٣٤٥٦٧٨٩".indexOf(d));
   const rawDetails=payload.seller_payment_details&&typeof payload.seller_payment_details==="object"?payload.seller_payment_details:{};
   const sellerDetails={national_id:toDigits(rawDetails.national_id).replace(/\D/g,""),account_number:toDigits(rawDetails.account_number).replace(/\s/g,""),card_number:toDigits(rawDetails.card_number).replace(/\D/g,""),iban:toDigits(rawDetails.iban).toUpperCase().replace(/\s/g,"")};
   const missingDetails:string[]=[];
   if(!/^\d{10}$/.test(sellerDetails.national_id))missingDetails.push("کد ملی فروشنده");
   if(sellerDetails.account_number.length<4)missingDetails.push("شماره حساب فروشنده");
   if(!/^\d{16}$/.test(sellerDetails.card_number))missingDetails.push("شماره کارت فروشنده");
   if(!/^IR\d{24}$/.test(sellerDetails.iban))missingDetails.push("شماره شبای فروشنده");
   const approved=payload.approved===true&&missing.length===0&&missingDetails.length===0&&requiredKeys.every((k:string)=>items[k]===true)&&!!String(payload.reviewer_name||"").trim();
   const savedPayload={items,approved,missing_documents:missing,missing_seller_details:missingDetails,seller_payment_details:sellerDetails,reviewer_name:String(payload.reviewer_name||"").trim().slice(0,120),reviewed_at:approved?new Date().toISOString():null};
   const ins=await db.from("case_team_updates").insert({case_id:id,team_role:role,staff_member_id:staffMemberId||null,update_type:"documents_checklist",payload:savedPayload,note:note||null});
   if(ins.error)return json({error:"ذخیره چک‌لیست ناموفق بود: "+ins.error.message},500);
   await historyAdd(id,cr.data.status,cr.data.status,approved?"چک‌لیست مدارک تأیید شد":"چک‌لیست مدارک ذخیره شد؛ موارد ناقص: "+missing.join(", "));
   return json({ok:true,approved,missing_documents:missing,missing_seller_details:missingDetails,message:approved?"مدارک و اطلاعات فروشنده کامل و تأیید شد.":("برای ادامه، مدارک و اطلاعات الزامی را کامل کنید. "+[...(missing.length?["مدارک: "+missing.join("، ")]:[]),...(missingDetails.length?["اطلاعات فروشنده: "+missingDetails.join("، ")]:[])].join("؛ "))});
  }
  const transitions:any={
   intake:{confirm_contact:{from:["new"],to:"booking_confirmed"},confirm_visit:{from:["booking_confirmed"],to:"expert_visit_confirmed"}},
   expert:{start_inspection:{from:["awaiting_expert_confirmation","expert_visit_confirmed","refer"],to:"inspection"},finish_inspection:{from:["inspection"],to:"review"}},
   sales:{price_review:{from:["review","auction-ready"],to:"auction-ready"},calculate_branch_offer:{from:["auction-end"],to:"awaiting_negotiation"},begin_negotiation:{from:["awaiting_negotiation"],to:"negotiation"},customer_accept:{from:["negotiation","customer","selling"],to:"awaiting_docs"},customer_decline:{from:["negotiation","customer","selling"],to:"disagreement"},sales_contract_approved:{from:["ready_to_sign","contract"],to:"contract_approved"},buyer_coordination_complete:{from:["contract_approved"],to:"awaiting_custody_receipt"}},
   followup:{begin_negotiation:{from:["awaiting_negotiation"],to:"negotiation"},customer_accept:{from:["negotiation","customer","selling"],to:"awaiting_docs"},customer_decline:{from:["negotiation","customer","selling"],to:"disagreement"},seller_settlement_confirmed:{from:["buyer_settlement_review"],to:"awaiting_seller_settlement_confirmation"}},
   legal:{legal_approved:{from:["legal_review"],to:"awaiting_legal_inquiries"},legal_inquiries_completed:{from:["awaiting_legal_inquiries"],to:"prepayment"},documents_rejected:{from:["legal_review","awaiting_legal_inquiries"],to:"awaiting_docs"},transfer_method_confirmed:{from:["awaiting_transfer_method_confirmation"],to:"awaiting_buyer_confirmation"}},
   finance:{set_prepayment_amount:{from:["prepayment","awaiting_prepayment"],to:"awaiting_prepayment"},prepayment_received:{from:["prepayment","deposit","awaiting_prepayment"],to:"ready_to_sign"},deductions_completed:{from:["deductions_review"],to:"awaiting_buyer_settlement"},buyer_settlement_received:{from:["awaiting_buyer_settlement"],to:"buyer_settlement_review"},settlement_completed:{from:["awaiting_seller_settlement_confirmation"],to:"awaiting_transfer_method_confirmation"},seller_final_payout_completed:{from:["seller_final_payout_pending"],to:"settled"}},
   contracts:{contract_approved:{from:["ready_to_sign"],to:"contract_approved"},await_buyer_settlement:{from:["contract_approved"],to:"awaiting_buyer_settlement"},custody_receipt_issued:{from:["awaiting_custody_receipt"],to:"deductions_review"},buyer_confirmed:{from:["awaiting_buyer_confirmation"],to:"awaiting_seller_confirmation"},seller_confirmed:{from:["awaiting_seller_confirmation"],to:"awaiting_notary"},notary_attended:{from:["awaiting_notary"],to:"awaiting_power_of_attorney_signature"},poa_signed:{from:["awaiting_power_of_attorney_signature"],to:"seller_final_payout_pending"},start_plate_release:{from:["settled"],to:"awaiting_plate_release"},plate_release:{from:["awaiting_plate_release"],to:"vehicle_delivery"},vehicle_delivered:{from:["vehicle_delivery"],to:"done"},transaction_completed:{from:["vehicle_delivery","contract"],to:"done"}}
  };
  if(role==="sales"&&type==="relist_after_buyer_cancel"){
    const ar=await db.from("auctions").select("id,case_id,status,winner_id,winner_response_status,purchase_stage").eq("case_id",id).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(ar.error)return json({error:ar.error.message},500);
    if(!ar.data||ar.data.status!=="ended"||!(ar.data.purchase_stage==="cancelled"||ar.data.winner_response_status==="declined"))return json({error:"بازگشت به مزایده فقط پس از ثبت انصراف خریدار یا رد قیمت مجاز است."},409);
    const up=await db.from("cases").update({status:"auction-ready",updated_at:new Date().toISOString()}).eq("id",id).eq("status","auction-end").select("id").maybeSingle();
    if(up.error)return json({error:up.error.message},500);
    if(!up.data)return json({error:"پرونده در وضعیت پایان مزایده نیست؛ فهرست را تازه کنید."},409);
    await historyAdd(id,"auction-end","auction-ready","تیم فروش پس از انصراف خریدار، خودرو را برای انتشار مجدد در مزایده آماده کرد. سوابق مزایده قبلی حفظ شد.");
    return json({ok:true,status:"auction-ready"});
   }
   if(role==="sales"&&type==="set_buyer_cancellation_fine"){
    const amount=Number(payload.fine_amount),reason=String(payload.fine_reason||note||"").trim().slice(0,1000);
    if(!Number.isSafeInteger(amount)||amount<=0||!reason)return json({error:"مبلغ مثبت و علت مستند جریمه الزامی است."},400);
    const ar=await db.from("auctions").select("id,case_id,status,purchase_stage,winner_response_status").eq("case_id",id).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(ar.error)return json({error:ar.error.message},500);
    if(!ar.data||ar.data.status!=="ended"||!(ar.data.purchase_stage==="cancelled"||ar.data.winner_response_status==="declined"))return json({error:"جریمه فقط برای مزایده‌ای که خریدار آن انصراف داده یا قیمت را رد کرده قابل ثبت است."},409);
    const up=await db.from("auctions").update({cancellation_fine_amount:amount}).eq("id",ar.data.id).select("id,cancellation_fine_amount").single();
    if(up.error)return json({error:"ثبت مبلغ جریمه ناموفق بود: "+up.error.message},500);
    await historyAdd(id,"customer","customer","تیم فروش مبلغ جریمه انصراف را ثبت کرد: "+amount.toLocaleString("fa-IR")+" تومان؛ علت: "+reason+"؛ ثبت مبلغ به‌تنهایی به معنی برداشت وجه از کیف پول نیست.");
    return json({ok:true,fine_amount:amount});
   }
   if(type==="docs_received"){
   const latest=await db.from("case_team_updates").select("payload,created_at").eq("case_id",id).eq("update_type","documents_checklist").order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(latest.error)return json({error:latest.error.message},500);
   const required=["owner_national_id","vehicle_card","green_card"],items=latest.data?.payload?.items||{};
   const docs=await db.from("documents").select("document_type").eq("case_id",id).in("document_type",required);
   if(docs.error)return json({error:docs.error.message},500);
   const types=new Set((docs.data||[]).map((x:any)=>x.document_type));
   const missing=required.filter(k=>!types.has(k)||items[k]!==true);
   if(!latest.data?.payload?.approved||missing.length)return json({error:"تکمیل مدارک مجاز نیست؛ ابتدا سه مدرک ضروری را بارگذاری کنید، در چک‌لیست تأیید بزنید و چک‌لیست را ذخیره کنید.",missing_documents:missing},409);
  }
  const salesManualStatuses=["review","auction-ready","awaiting_negotiation","negotiation","customer","selling","disagreement","awaiting_docs","docs","legal_review","prepayment","ready_to_sign","contract_approved","awaiting_custody_receipt","deductions_review","awaiting_buyer_settlement","buyer_settlement_review","awaiting_seller_settlement_confirmation","awaiting_transfer_method_confirmation","awaiting_buyer_confirmation","awaiting_seller_confirmation","awaiting_notary","settled","awaiting_power_of_attorney_signature","seller_final_payout_pending","awaiting_plate_release","vehicle_delivery"];
  let spec=transitions[role]?.[type];
  if(role==="sales"&&type==="sales_change_status"){
   const target=String(payload.target_status||"");
   if(!salesManualStatuses.includes(target))return json({error:"این وضعیت از پنل فروش قابل تغییر دستی نیست؛ از عملیات تخصصی همان مرحله استفاده کنید."},403);
   if(!note)return json({error:"برای تغییر وضعیت، دلیل الزامی است."},400);
   spec={from:["__sales_manual__"],to:target};
  }
  if(!spec)return json({error:"این نوع عملیات برای نقش شما تعریف نشده است."},403);
  const cr=await db.from("cases").select("id,status,case_number,customer_name,customer_mobile,agreed_price,prepayment_amount,prepayment_status,prepayment_amount_approved,company_profit_amount,company_profit_percent,contract_prepayment_amount,sales_suggested_price,assigned_expert_staff_id").eq("id",id).maybeSingle();
  if(cr.error)return json({error:cr.error.message},500);
  if(!cr.data)return json({error:"پرونده پیدا نشد."},404);
  if(role==="expert"&&cr.data.assigned_expert_staff_id!==staffMemberId)return json({error:"این پرونده به شما ارجاع نشده است؛ فقط پرونده‌های ارجاع‌شده به خودتان قابل ویرایش هستند."},403);
  if(spec.from.includes("__sales_manual__")){if(!salesManualStatuses.includes(cr.data.status))return json({error:"تغییر دستی فقط برای مراحل قابل‌کنترل واحد فروش مجاز است؛ از عملیات تخصصی همان مرحله استفاده کنید.",current_status:cr.data.status},409);if(cr.data.status===spec.to)return json({error:"وضعیت پرونده از قبل همین است."},400)}else if(!spec.from.includes(cr.data.status))return json({error:"وضعیت پرونده تغییر کرده است؛ ابتدا فهرست را به‌روزرسانی کنید.",current_status:cr.data.status},409);
  const updates:any={status:spec.to,updated_at:new Date().toISOString()};
  let auctionResultForPrepayment:any=null;
  if(role==="finance"&&["set_prepayment_amount","prepayment_received"].includes(type)){
   const aq=await db.from("auctions").select("id,case_id,status,current_bid,starting_price,winner_id,purchase_stage,prepayment_amount").eq("case_id",id).order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(aq.error)return json({error:"دریافت مزایده برای ثبت پیش‌پرداخت ناموفق بود: "+aq.error.message},500);
   auctionResultForPrepayment=aq.data||null;
  }
  let acceptedAuctionForPrepayment:any=null;
  if((role==="followup"||role==="intake"||role==="sales")&&type==="customer_accept"){
   const agreed=Number(payload.agreed_price||0);
   if(!Number.isFinite(agreed)||agreed<=0)return json({error:"برای ثبت موافقت، مبلغ نهایی معتبر لازم است."},400);
   updates.agreed_price=agreed;updates.customer_decision_at=new Date().toISOString();updates.customer_decision_note=note||"موافقت مشتری ثبت شد.";
   const ar=await db.from("auctions").select("id,case_id,status,current_bid,winner_id,winner_response_status,purchase_stage").eq("case_id",id).order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(ar.error)return json({error:"دریافت مزایده برای اعلام قیمت به خریدار ناموفق بود: "+ar.error.message},500);
   if(ar.data&&ar.data.status==="ended"&&ar.data.winner_id&&ar.data.winner_response_status==="accepted"){
    const buyerFinal=Number(ar.data.current_bid||agreed);
    const prepayment=Math.round(buyerFinal*0.05);
    if(buyerFinal<=0||prepayment<=0)return json({error:"قیمت خریدار یا مبلغ پیش‌پرداخت معتبر نیست."},409);
    acceptedAuctionForPrepayment={...ar.data,buyerFinal,prepayment};
   }
  }
  if((role==="followup"||role==="intake"||role==="sales")&&type==="customer_decline"){
   updates.customer_decision_at=new Date().toISOString();updates.customer_decision_note=note||"مشتری پیشنهاد را نپذیرفت.";
  }
  if(role==="sales"&&type==="price_review"){
   const amount=Number(payload.estimated_price||0),fair=Number(payload.fair_price||0),target=Number(payload.target_price||0);
   if(!Number.isFinite(amount)||amount<=0)return json({error:"قیمت پیشنهادی معتبر و بیشتر از صفر لازم است."},400);
   if(!Number.isFinite(fair)||fair<=0||!Number.isFinite(target)||target<=0)return json({error:"قیمت منصفانه و هدف باید از برآورد قیمت‌گذاری به‌صورت خودکار ثبت شوند."},400);
   updates.sales_suggested_price=amount;updates.sales_fair_price=fair;updates.sales_target_price=Math.max(amount,target,fair);
  }
  if(role==="sales"&&type==="calculate_branch_offer"){
   const auctionResult=await db.from("auctions").select("id,status,current_bid,winner_id,winner_response_status").eq("case_id",id).order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(auctionResult.error)return json({error:auctionResult.error.message},500);
   if(!auctionResult.data||auctionResult.data.status!=="ended")return json({error:"ابتدا پایان مزایده را ثبت کنید."},409);
   if(!auctionResult.data.winner_id||auctionResult.data.winner_response_status!=="accepted")return json({error:"تا زمانی که برنده مزایده قیمت را تأیید نکرده، ارسال قیمت به شعبه مجاز نیست."},409);
   const finalPrice=Number(auctionResult.data.current_bid||0);
   const requestedPercent=payload.company_profit_percent===undefined||payload.company_profit_percent===null||payload.company_profit_percent===""?null:Number(payload.company_profit_percent);
   const requestedAmount=payload.company_profit_amount===undefined||payload.company_profit_amount===null||payload.company_profit_amount===""?null:Number(payload.company_profit_amount);
   if(!Number.isFinite(finalPrice)||finalPrice<=0)return json({error:"قیمت نهایی مزایده معتبر نیست."},400);
   if(requestedPercent!==null&&(!Number.isFinite(requestedPercent)||requestedPercent<0||requestedPercent>=100))return json({error:"درصد سود شرکت باید از صفر تا کمتر از ۱۰۰ باشد."},400);
   const profit=requestedPercent!==null?Math.round(finalPrice*requestedPercent/100):requestedAmount;
   if(!Number.isFinite(profit)||profit<0||profit>=finalPrice)return json({error:"سود مجموعه باید صفر یا بیشتر و کمتر از قیمت نهایی خریدار باشد."},400);
   const percent=finalPrice?profit/finalPrice*100:0,offer=finalPrice-profit;
   payload.auction_final_price=finalPrice;payload.company_profit_amount=profit;payload.company_profit_percent=requestedPercent!==null?requestedPercent:percent;payload.branch_offer_price=offer;payload.auction_id=auctionResult.data.id;
   const grossPrepayment=Math.max(0,Number(cr.data.prepayment_amount||0)),profitDeducted=Math.min(grossPrepayment,profit),netPrepayment=Math.max(0,grossPrepayment-profitDeducted);
   payload.prepayment_gross_amount=grossPrepayment;payload.company_profit_deducted_from_prepayment=profitDeducted;payload.contract_prepayment_amount=netPrepayment;
   updates.sales_suggested_price=offer;updates.company_profit_percent=payload.company_profit_percent;updates.company_profit_amount=profit;updates.contract_prepayment_amount=netPrepayment;
  }
  if(role==="finance"&&type==="buyer_settlement_received"){
   const amount=Number(payload.amount);
   const auctionResult=await db.from("auctions").select("current_bid,status").eq("case_id",id).order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(auctionResult.error)return json({error:auctionResult.error.message},500);
   const expected=Number(auctionResult.data?.current_bid||cr.data.agreed_price||cr.data.sales_suggested_price||0);
   if(!Number.isFinite(amount)||amount<=0||expected<=0)return json({error:"مبلغ تسویه خریدار یا قیمت نهایی معامله معتبر نیست."},400);
   if(auctionResult.data?.status==="ended"&&Math.abs(amount-expected)>0.5)return json({error:"مبلغ تسویه باید برابر قیمت نهایی مزایده باشد: "+expected.toLocaleString("fa-IR")+" تومان"},400);
   payload.amount=amount;payload.expected_buyer_settlement=expected;
  }
  if(role==="finance"&&type==="deductions_completed"){
   const total=Number(payload.total_deductions);
   if(!Number.isFinite(total)||total<0)return json({error:"مجموع کسورات باید عددی معتبر و صفر یا بیشتر باشد."},400);
   if(Number(cr.data.prepayment_amount||0)<=0)return json({error:"پیش‌پرداخت باید قبل از ثبت کسورات دریافت شده باشد."},409);
   const calcResult=await db.from("case_team_updates").select("payload").eq("case_id",id).eq("update_type","calculate_branch_offer").order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(calcResult.error)return json({error:calcResult.error.message},500);
   const auctionResult=await db.from("auctions").select("current_bid").eq("case_id",id).order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(auctionResult.error)return json({error:auctionResult.error.message},500);
   const calc=calcResult.data?.payload||{},buyerFinal=Number(calc.auction_final_price||auctionResult.data?.current_bid||cr.data.agreed_price||0),sellerNet=Number(calc.branch_offer_price??Math.max(0,buyerFinal-Number(calc.company_profit_amount||0)));
   if(buyerFinal<=0||sellerNet<0)return json({error:"قیمت نهایی خریدار یا سهم فروشنده برای محاسبه مالی مشخص نیست."},409);
   const fr=await db.from("case_financial_entries").select("entry_type,amount").eq("case_id",id);
   if(fr.error)return json({error:fr.error.message},500);
   const alreadyDeducted=(fr.data||[]).filter((x:any)=>["deduction","fine","commission","expense"].includes(x.entry_type)).reduce((n:number,x:any)=>n+Number(x.amount||0),0);
   const sellerPaid=(fr.data||[]).filter((x:any)=>x.entry_type==="seller_payout").reduce((n:number,x:any)=>n+Number(x.amount||0),0);
   if(alreadyDeducted+total>sellerNet)return json({error:"مجموع کسورات جدید و قبلی نمی‌تواند از سهم فروشنده پس از کسر سود مجموعه بیشتر باشد: "+sellerNet.toLocaleString("fa-IR")+" تومان"},400);
   const prepayUpdate=await db.from("case_team_updates").select("payload").eq("case_id",id).eq("update_type","prepayment_received").order("created_at",{ascending:false}).limit(1).maybeSingle();if(prepayUpdate.error)return json({error:prepayUpdate.error.message},500);const netPrepayment=Math.max(0,Number(prepayUpdate.data?.payload?.contract_prepayment_amount||cr.data.contract_prepayment_amount||0));payload.total_deductions=total;payload.contract_prepayment_amount=netPrepayment;payload.seller_payout_due=Math.max(0,sellerNet-netPrepayment-alreadyDeducted-total-sellerPaid);payload.buyer_final_price=buyerFinal;payload.company_profit_amount=Number(calc.company_profit_amount||Math.max(0,buyerFinal-sellerNet));payload.seller_net_before_deductions=sellerNet;
  }
  if(role==="finance"&&type==="seller_final_payout_completed"){
   const calcResult=await db.from("case_team_updates").select("payload").eq("case_id",id).eq("update_type","calculate_branch_offer").order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(calcResult.error)return json({error:calcResult.error.message},500);
   const auctionResult=await db.from("auctions").select("current_bid").eq("case_id",id).order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(auctionResult.error)return json({error:auctionResult.error.message},500);
   const calc=calcResult.data?.payload||{},buyerFinal=Number(calc.auction_final_price||auctionResult.data?.current_bid||cr.data.agreed_price||0),sellerNet=Number(calc.branch_offer_price??Math.max(0,buyerFinal-Number(calc.company_profit_amount||0)));
   if(buyerFinal<=0||sellerNet<0)return json({error:"قیمت نهایی خریدار یا سهم فروشنده برای محاسبه پرداخت مشخص نیست."},409);
   const fr=await db.from("case_financial_entries").select("entry_type,amount").eq("case_id",id);
   if(fr.error)return json({error:fr.error.message},500);
   const deducted=(fr.data||[]).filter((x:any)=>["deduction","fine","commission","expense"].includes(x.entry_type)).reduce((n:number,x:any)=>n+Number(x.amount||0),0);
   const sellerPaid=(fr.data||[]).filter((x:any)=>x.entry_type==="seller_payout").reduce((n:number,x:any)=>n+Number(x.amount||0),0);
   const prepayUpdate=await db.from("case_team_updates").select("payload").eq("case_id",id).eq("update_type","prepayment_received").order("created_at",{ascending:false}).limit(1).maybeSingle();if(prepayUpdate.error)return json({error:prepayUpdate.error.message},500);const netPrepayment=Math.max(0,Number(prepayUpdate.data?.payload?.contract_prepayment_amount||cr.data.contract_prepayment_amount||0));const due=Math.max(0,sellerNet-netPrepayment-deducted-sellerPaid),amount=Number(payload.amount);
   if(!Number.isFinite(amount)||Math.abs(amount-due)>0.5)return json({error:"مبلغ پرداخت نهایی باید برابر سهم فروشنده پس از کسر سود مجموعه، کسورات و پرداخت‌های قبلی باشد: "+due.toLocaleString("fa-IR")+" تومان"},400);
   payload.amount=due;payload.buyer_final_price=buyerFinal;payload.seller_net_before_deductions=sellerNet;payload.total_deductions=deducted;payload.company_profit_amount=Number(calc.company_profit_amount||Math.max(0,buyerFinal-sellerNet));
  }
  if(role==="finance"&&type==="set_prepayment_amount"){
   const percent=Number(payload.prepayment_percent),base=Number(auctionResultForPrepayment?.current_bid||auctionResultForPrepayment?.starting_price||cr.data.agreed_price||cr.data.sales_suggested_price||0);
   if(!Number.isFinite(percent)||percent<=0||percent>100)return json({error:"درصد پیش‌پرداخت باید بیشتر از صفر و حداکثر ۱۰۰ باشد."},400);
   if(!Number.isFinite(base)||base<=0)return json({error:"قیمت نهایی خریدار برای محاسبه پیش‌پرداخت مشخص نیست."},409);
   const amount=Math.round(base*percent/100),calcResult=await db.from("case_team_updates").select("payload").eq("case_id",id).eq("update_type","calculate_branch_offer").order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(calcResult.error)return json({error:calcResult.error.message},500);
   const calc=calcResult.data?.payload||{},profit=Math.max(0,Number(calc.company_profit_amount||cr.data.company_profit_amount||0)),deducted=Math.min(amount,profit),net=Math.max(0,amount-deducted);
   payload.prepayment_percent=percent;payload.base_price=base;payload.prepayment_amount=amount;payload.company_profit_percent=Number(calc.company_profit_percent||cr.data.company_profit_percent||0);payload.company_profit_amount=profit;payload.company_profit_deducted_from_prepayment=deducted;payload.contract_prepayment_amount=net;
   updates.prepayment_amount=amount;updates.prepayment_amount_approved=true;updates.contract_prepayment_amount=net;updates.company_profit_amount=profit;updates.company_profit_percent=payload.company_profit_percent;
  }
  if(role==="finance"&&type==="prepayment_received"){
   const amount=Number(payload.amount||cr.data.prepayment_amount||0);
   if(!Number.isFinite(amount)||amount<=0)return json({error:"مبلغ پیش‌پرداخت باید بیشتر از صفر باشد."},400);
   const calcResult=await db.from("case_team_updates").select("payload").eq("case_id",id).eq("update_type","calculate_branch_offer").order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(calcResult.error)return json({error:calcResult.error.message},500);
   const calc=calcResult.data?.payload||{},profit=Math.max(0,Number(calc.company_profit_amount||cr.data.company_profit_amount||0)),deducted=Math.min(amount,profit),net=Math.max(0,amount-deducted);
   payload.amount=amount;payload.company_profit_percent=Number(calc.company_profit_percent||cr.data.company_profit_percent||0);payload.company_profit_amount=profit;payload.company_profit_deducted_from_prepayment=deducted;payload.contract_prepayment_amount=net;payload.contract_prepayment_label="پیش‌پرداخت خالص پس از کسر سهم سود شرکت";
   updates.prepayment_amount=amount;updates.prepayment_amount_approved=true;updates.contract_prepayment_amount=net;updates.company_profit_amount=profit;updates.company_profit_percent=payload.company_profit_percent;updates.prepayment_status="received";updates.prepayment_received_at=new Date().toISOString();
  }
  const up=await db.from("cases").update(updates).eq("id",id).eq("status",cr.data.status).select("id,status").maybeSingle();
  if(up.error)return json({error:up.error.message},500);
  if(!up.data)return json({error:"پرونده هم‌زمان توسط همکار دیگری تغییر کرده است؛ دوباره بارگذاری کنید."},409);
  if(role==="finance"&&type==="set_prepayment_amount"&&auctionResultForPrepayment){
   if(auctionResultForPrepayment.winner_id){
    const stageUpdate=await db.from("auctions").update({purchase_stage:"prepayment"}).eq("id",auctionResultForPrepayment.id).select("id").maybeSingle();
    if(stageUpdate.error)return json({error:"مبلغ ذخیره شد اما فعال‌سازی مرحله پیش‌پرداخت در مزایده ناموفق بود: "+stageUpdate.error.message},500);
    const notice=await db.from("buyer_notifications").insert({buyer_id:auctionResultForPrepayment.winner_id,auction_id:auctionResultForPrepayment.id,title:"مبلغ پیش‌پرداخت تأیید شد",message:"تیم مالی مبلغ پیش‌پرداخت را تأیید کرده است. اکنون مبلغ و روش پرداخت در پنل مزایده شما نمایش داده می‌شود."});
    if(notice.error)return json({error:"مبلغ تأیید شد اما اعلان خریدار ارسال نشد: "+notice.error.message},500);
   }
  }
  if(role==="contracts"&&type==="custody_receipt_issued"){
   const receipt=await db.from("case_contract_records").insert({case_id:id,contract_type:"custody_receipt",status:"ready",created_by:staffMemberId||null,metadata:{case_number:cr.data.case_number,customer_name:cr.data.customer_name,customer_mobile:cr.data.customer_mobile,issued_at:new Date().toISOString(),note:note||"رسید امانت خودرو"}}).select("id").single();
   if(receipt.error){await db.from("cases").update({status:cr.data.status}).eq("id",id).eq("status",spec.to);return json({error:"ثبت رسید امانت ناموفق بود: "+receipt.error.message},500)}
  }
  const audit=await db.from("case_team_updates").insert({case_id:id,team_role:role,staff_member_id:staffMemberId||null,update_type:type,payload,note:note||null});
  if(audit.error){await db.from("cases").update({status:cr.data.status}).eq("id",id).eq("status",spec.to);return json({error:"مرحله ثبت شد اما ثبت تاریخچه تیم ناموفق بود: "+audit.error.message},500)}
  await historyAdd(id,cr.data.status,spec.to,note||type);
  if(acceptedAuctionForPrepayment){
   const a=acceptedAuctionForPrepayment;
   const au=await db.from("auctions").update({purchase_stage:"prepayment",prepayment_amount:a.prepayment}).eq("id",a.id).eq("winner_id",a.winner_id).select("id").maybeSingle();
   if(au.error||!au.data)return json({error:"موافقت ثبت شد اما فعال‌سازی پیش‌پرداخت در پنل خریدار ناموفق بود."+(au.error?" "+au.error.message:"")},500);
   const bank=await db.from("wallet_bank_settings").select("account_holder,sheba,account_number,card_number").eq("id",true).maybeSingle();
   const bankNumber=String(bank.data?.sheba||bank.data?.account_number||bank.data?.card_number||"");
   const bankHolder=String(bank.data?.account_holder||"حساب شرکت");
   const message="فروشنده با مبلغ "+a.buyerFinal.toLocaleString("fa-IR")+" تومان موافقت کرد. پیش‌پرداخت ۵٪ معامله، معادل "+a.prepayment.toLocaleString("fa-IR")+" تومان است."+(bankNumber?" شماره شبای شرکت: "+bankNumber+"؛ صاحب حساب: "+bankHolder+".":" اطلاعات حساب شرکت به‌زودی در پنل نمایش داده می‌شود.");
   const notice=await db.from("buyer_notifications").insert({buyer_id:a.winner_id,auction_id:a.id,title:"موافقت فروشنده و اعلام پیش‌پرداخت",message});
   if(notice.error)return json({error:"پیش‌پرداخت فعال شد اما ارسال اعلان خریدار ناموفق بود: "+notice.error.message},500);
   await historyAdd(id,spec.to,spec.to,"قیمت نهایی "+a.buyerFinal.toLocaleString("fa-IR")+" تومان تأیید شد؛ پیش‌پرداخت ۵٪ به مبلغ "+a.prepayment.toLocaleString("fa-IR")+" تومان در پنل خریدار فعال شد.");
  }
  if(role==="finance"&&type==="prepayment_received"){
   const amount=Number(payload.amount);
   const ledger=await db.from("case_financial_entries").insert({case_id:id,entry_type:"prepayment",amount,note:[payload.payment_reference?"شماره پیگیری: "+String(payload.payment_reference).slice(0,120):"",note||"ثبت پیش‌پرداخت توسط امور مالی"].filter(Boolean).join(" | "),created_by:staffMemberId||null});
   if(ledger.error)return json({error:"مرحله ثبت شد اما ثبت سند مالی ناموفق بود: "+ledger.error.message},500);
  }
  if(role==="finance"&&type==="buyer_settlement_received"){
   const ledger=await db.from("case_financial_entries").insert({case_id:id,entry_type:"buyer_payment",amount:Number(payload.amount),note:[payload.payment_reference?"شماره پیگیری: "+String(payload.payment_reference).slice(0,120):"",note||"ثبت تسویه کامل خریدار"].filter(Boolean).join(" | "),created_by:staffMemberId||null});
   if(ledger.error)return json({error:"مرحله ثبت شد اما سند تسویه خریدار ذخیره نشد: "+ledger.error.message},500);
  }
  if(role==="finance"&&type==="deductions_completed"){
   const total=Number(payload.total_deductions||0);
   const ledger=await db.from("case_financial_entries").insert({case_id:id,entry_type:"deduction",amount:total,note:String(payload.deduction_note||note||"مجموع کسورات شامل خلافی، مالیات، عوارض و سایر موارد").slice(0,1000),created_by:staffMemberId||null});
   if(ledger.error)return json({error:"مرحله ثبت شد اما ثبت سند کسورات ناموفق بود: "+ledger.error.message},500);
  }
  if(role==="finance"&&type==="seller_final_payout_completed"){
   const ledger=await db.from("case_financial_entries").insert({case_id:id,entry_type:"seller_payout",amount:Number(payload.amount||0),note:note||"پرداخت مانده پیش‌پرداخت فروشنده پس از تأیید وکالت‌نامه",created_by:staffMemberId||null});
   if(ledger.error)return json({error:"مرحله ثبت شد اما ثبت سند پرداخت فروشنده ناموفق بود: "+ledger.error.message},500);
  }
  return json({ok:true,status:spec.to,payload});
 }
 if(a==="dealer-inventory"&&["GET","POST","PATCH"].includes(req.method)){
  if(!["dealer","admin"].includes(role))return json({error:"این بخش فقط برای نمایشگاه‌داران و مدیریت مجاز است."},403);
  if(req.method==="GET"){
   let q=db.from("dealer_inventory").select("*").order("updated_at",{ascending:false}).limit(300);
   if(role==="dealer")q=q.eq("dealer_staff_id",staffMemberId);
   const r=await q;return r.error?json({error:r.error.message},500):json({items:r.data||[]});
  }
  let b:any;try{b=await req.json()}catch(_){return json({error:"اطلاعات خودرو نامعتبر است."},400)}
  const brand=String(b.brand||"").trim().slice(0,80),model=String(b.model||"").trim().slice(0,100),price=Number(b.price);
  if(!brand||!model||!Number.isFinite(price)||price<0)return json({error:"برند، مدل و قیمت معتبر الزامی است."},400);
  const availability=["available","reserved","sold","hidden"].includes(b.availability)?b.availability:"available";
  const data:any={brand,model,trim:String(b.trim||"").slice(0,100)||null,model_year:Number(b.model_year)||null,color:String(b.color||"").slice(0,60)||null,mileage:Number(b.mileage)||null,approximate_price:price,price,technical_condition:String(b.technical_condition||"ثبت نشده").slice(0,300),body_condition:String(b.body_condition||"ثبت نشده").slice(0,300),general_condition:String(b.general_condition||"ثبت نشده").slice(0,500)||null,status:availability,defects:Array.isArray(b.defects)?b.defects.slice(0,100):[],photo_paths:Array.isArray(b.photo_paths)?b.photo_paths.slice(0,30):[],notes:String(b.notes||"").slice(0,2000)||null,availability,updated_at:new Date().toISOString()};
  if(req.method==="POST"){
   const ins=await db.from("dealer_inventory").insert({...data,dealer_staff_id:staffMemberId}).select("*").single();
   return ins.error?json({error:ins.error.message},500):json({ok:true,item:ins.data});
  }
  const itemId=String(b.id||"");
  if(!itemId)return json({error:"شناسه موجودی مشخص نیست."},400);
  let q=db.from("dealer_inventory").update(data).eq("id",itemId);
  if(role==="dealer")q=q.eq("dealer_staff_id",staffMemberId);
  const up=await q.select("*").maybeSingle();
  return up.error?json({error:up.error.message},500):!up.data?json({error:"موجودی پیدا نشد یا اجازه ویرایش ندارید."},404):json({ok:true,item:up.data});
 }
 if(a==="team-staff-create"&&req.method==="POST"){
  if(role!=="admin")return json({error:"فقط مدیریت کل می‌تواند حساب همکار جدید بسازد."},403);
  let b:any;try{b=await req.json()}catch(_){return json({error:"اطلاعات حساب نامعتبر است."},400)}
  const name=String(b.full_name||"").trim().slice(0,120),want=String(b.role||""),code=String(b.personnel_code||"").trim(),password=String(b.password||"");
  const allowed=["intake","sales","followup","legal","finance","contracts","dealer"];
  if(!name||!allowed.includes(want)||!/^[0-9]{4}$/.test(code)||password.length<8)return json({error:"نام، واحد، کد پرسنلی چهاررقمی و رمز حداقل ۸ نویسه‌ای الزامی است."},400);
  const hash=await hex(code);
  const ins=await db.from("staff_members").insert({full_name:name,role:want,personnel_code_hash:hash,personnel_code_display:code,active:true}).select("id,full_name,role,personnel_code_display").single();
  if(ins.error)return json({error:ins.error.code==="23505"?"این کد پرسنلی قبلاً ثبت شده است.":ins.error.message},400);
  const cr=await db.from("staff_member_credentials").insert({staff_member_id:ins.data.id,password_hash:await hex(password)});
  if(cr.error){await db.from("staff_members").delete().eq("id",ins.data.id);return json({error:"ساخت رمز همکار ناموفق بود؛ حساب ایجاد نشد."},500)}
  return json({ok:true,staff:ins.data});
 }
 if(a==="expert-departure"&&role==="expert"&&req.method==="POST"){
  if(!id)return json({error:"شناسه پرونده مشخص نیست"},400);
  let b:any;try{b=await req.json()}catch(_){return json({error:"درخواست نامعتبر است"},400)}
  if(!["start","arrived"].includes(String(b.action||"")))return json({error:"عملیات شمارش معکوس نامعتبر است"},400);
  const cr=await db.from("cases").select("id,status,assigned_expert_staff_id,expert_departed_at,expert_arrived_at").eq("id",id).maybeSingle();
  if(cr.error)return json({error:cr.error.message},500);
  if(!cr.data)return json({error:"پرونده پیدا نشد"},404);
  if(!staffMemberId||cr.data.assigned_expert_staff_id!==staffMemberId)return json({error:"این پرونده به شما ارجاع نشده است؛ فقط پرونده‌های ارجاع‌شده به خودتان قابل ویرایش هستند."},403);
  if(!["awaiting_expert_confirmation","expert_visit_confirmed","refer","inspection"].includes(cr.data.status))return json({error:"وضعیت فعلی پرونده اجازه ثبت حرکت کارشناس را نمی‌دهد."},409);
  if(b.action==="arrived"&&!cr.data.expert_departed_at)return json({error:"ابتدا حرکت به سمت مشتری را ثبت کنید."},400);
  const changes:any=b.action==="start"?{expert_departed_at:new Date().toISOString(),expert_arrived_at:null}:{expert_arrived_at:new Date().toISOString()};
  const up=await db.from("cases").update(changes).eq("id",id).eq("assigned_expert_staff_id",staffMemberId).select("expert_departed_at,expert_arrived_at").maybeSingle();
  if(up.error)return json({error:"ثبت زمان حرکت ناموفق بود: "+up.error.message},500);
  if(!up.data)return json({error:"پرونده تغییر کرده یا دیگر به شما ارجاع نشده است."},409);
  return json({ok:true,expert_departed_at:up.data.expert_departed_at,expert_arrived_at:up.data.expert_arrived_at});
 }
 if(a==="upload-photo"&&role==="expert"&&req.method==="POST"){if(!id)return json({error:"شناسه پرونده مشخص نیست"},400);const cr=await db.from("cases").select("id,assigned_expert_staff_id").eq("id",id).maybeSingle();if(cr.error)return json({error:cr.error.message},500);if(!cr.data)return json({error:"پرونده پیدا نشد"},404);if(!staffMemberId||cr.data.assigned_expert_staff_id!==staffMemberId)return json({error:"این پرونده به شما ارجاع نشده است."},403);let b:any;try{b=await req.json()}catch(_){return json({error:"اطلاعات عکس نامعتبر است"},400)}const dataUrl=String(b.data_url||"");const raw=dataUrl.split(",");if(raw.length<2||!raw[0].includes("base64"))return json({error:"فایل عکس معتبر نیست"},400);const mime=(raw[0].match(/data:(.*?);base64/)||[])[1]||"image/jpeg";if(!mime.startsWith("image/"))return json({error:"فقط فایل تصویری پذیرفته می‌شود"},400);let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(raw[1]),(x:string)=>x.charCodeAt(0))}catch(_){return json({error:"رمزگشایی عکس ناموفق بود"},400)}if(bytes.length>12*1024*1024)return json({error:"حجم عکس بیش از حد مجاز است"},413);const path=`${id}/inspection/uploads/${crypto.randomUUID()}.jpg`;const up=await db.storage.from("s2s-documents").upload(path,bytes,{contentType:mime,upsert:false});if(up.error)return json({error:"ذخیره عکس ناموفق بود: "+up.error.message},500);return json({ok:true,storage_path:path})}
 if(a==="complete-documents"&&req.method==="POST"){
  if(role!=="sales")return json({error:"تکمیل مدارک و ارسال پرونده به حقوقی فقط در اختیار تیم فروش است."},403);
  if(!id)return json({error:"شناسه پرونده مشخص نشده است."},400);
  const cr=await db.from("cases").select("id,status").eq("id",id).maybeSingle();
  if(cr.error)return json({error:cr.error.message},500);
  if(!cr.data)return json({error:"پرونده پیدا نشد."},404);
  if(!["docs","awaiting_docs"].includes(cr.data.status))return json({error:"این پرونده در مرحله تکمیل مدارک نیست."},409);
  const checklist=await db.from("case_team_updates").select("payload,team_role,created_at").eq("case_id",id).eq("update_type","documents_checklist").order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(checklist.error)return json({error:"بررسی چک‌لیست مدارک ناموفق بود: "+checklist.error.message},500);
  const checklistPayload=checklist.data?.payload||{}, checklistItems=checklistPayload.items||{};
  const pd=checklistPayload.seller_payment_details||{};const pdDigits=(v:any)=>String(v||"").replace(/[۰-۹]/g,(d:string)=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,(d:string)=>"٠١٢٣٤٥٦٧٨٩".indexOf(d));const validSellerDetails=/^\d{10}$/.test(pdDigits(pd.national_id).replace(/\D/g,""))&&pdDigits(pd.account_number).replace(/\s/g,"").length>=4&&/^\d{16}$/.test(pdDigits(pd.card_number).replace(/\D/g,""))&&/^IR\d{24}$/.test(pdDigits(pd.iban).toUpperCase().replace(/\s/g,""));if(checklist.data?.team_role!=="sales"||checklistPayload.approved!==true||!validSellerDetails||!String(checklistPayload.reviewer_name||"").trim()||!["owner_national_id","vehicle_card","green_card"].every((k:string)=>checklistItems[k]===true))return json({error:"ابتدا فروش باید مدارک، کد ملی، شماره حساب، کارت و شبا را کامل و چک‌لیست را با نام مسئول تأیید کند."},409);
  const dr=await db.from("documents").select("document_type").eq("case_id",id);
  if(dr.error)return json({error:"بررسی مدارک ناموفق بود: "+dr.error.message},500);
  const types=new Set((dr.data||[]).map((d:any)=>String(d.document_type||"")));
  const missing:string[]=[];
  if(!types.has("owner_national_id"))missing.push("کارت ملی مالک");
  if(!types.has("vehicle_card")&&!(types.has("car_document_front")&&types.has("car_document_back")))missing.push("کارت خودرو (یا تصویر رو و پشت)");
  if(!types.has("green_card"))missing.push("برگ سبز / سند مالکیت");
  if(missing.length)return json({error:"مدارک ضروری ناقص است: "+missing.join("، ")},409);
  const up=await db.from("cases").update({status:"legal_review",updated_at:new Date().toISOString()}).eq("id",id).in("status",["docs","awaiting_docs"]).select("id,status").maybeSingle();
  if(up.error)return json({error:"انتقال به کنترل حقوقی انجام نشد: "+up.error.message},500);
  if(!up.data)return json({error:"وضعیت پرونده هم‌زمان تغییر کرده است؛ فهرست را تازه‌سازی کنید."},409);
  await historyAdd(id,cr.data.status,"legal_review","مدارک ضروری بررسی شد و پرونده برای کنترل حقوقی ارسال شد.");
  return json({ok:true,status:"legal_review",message:"مدارک کامل است؛ پرونده به کنترل حقوقی ارسال شد."});
}
if(a==="upload-document"&&req.method==="POST"){
  if(!["admin","sales","legal","intake"].includes(role))return json({error:"برای بارگذاری مدارک اجازه ندارید."},403);
  if(!id)return json({error:"شناسه پرونده مشخص نشده است."},400);
  const cr=await db.from("cases").select("id,status").eq("id",id).maybeSingle();if(cr.error)return json({error:cr.error.message},500);if(!cr.data)return json({error:"پرونده پیدا نشد."},404);
  if(["awaiting_docs","docs"].includes(cr.data.status)&&role!=="sales")return json({error:"بارگذاری و تکمیل مدارک در این مرحله فقط توسط تیم فروش انجام می‌شود."},403);
  let b:any;try{b=await req.json()}catch(_){return json({error:"اطلاعات فایل نامعتبر است."},400)}
  const dataUrl=String(b.data_url||""),docType=String(b.document_type||"other").slice(0,80),fileName=String(b.file_name||"document").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,100);
  const raw=dataUrl.split(",");if(raw.length<2||!raw[0].includes("base64"))return json({error:"فایل انتخاب‌شده معتبر نیست."},400);
  const mime=(raw[0].match(/data:(.*?);base64/)||[])[1]||"application/octet-stream";
  if(!/^(image\/(jpeg|png|webp|pdf)|application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/msword)$/.test(mime))return json({error:"فقط عکس، PDF یا فایل Word پذیرفته می‌شود."},400);
  let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(raw[1]),(x:string)=>x.charCodeAt(0))}catch(_){return json({error:"خواندن فایل ناموفق بود."},400)}
  if(!bytes.length||bytes.length>12*1024*1024)return json({error:"حجم فایل باید کمتر از ۱۲ مگابایت باشد."},413);
  const ext=(fileName.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,8)||"bin";
  const path=`${id}/case-documents/${crypto.randomUUID()}.${ext}`;
  const up=await db.storage.from("s2s-documents").upload(path,bytes,{contentType:mime,upsert:false});if(up.error)return json({error:"ذخیره فایل ناموفق بود: "+up.error.message},500);
  const ins=await db.from("documents").insert({case_id:id,document_type:docType,storage_path:path,required:["owner_national_id","vehicle_card","green_card"].includes(docType)}).select("id").single();
  if(ins.error){await db.storage.from("s2s-documents").remove([path]);return json({error:"فایل بارگذاری شد اما ثبت مدرک ناموفق بود: "+ins.error.message},500)}
  return json({ok:true,document_id:ins.data.id,storage_path:path,file_name:fileName});
 }
 if(a==="list")return listCases(role,staffMemberId);
 if(a==="assign-case-expert"&&(role==="admin"||role==="sales")&&req.method==="POST"){
  if(!id)return json({error:"شناسه پرونده مشخص نیست"},400);
  let b:any;try{b=await req.json()}catch(_){return json({error:"درخواست نامعتبر است"},400)}
  const personnelId=String(b.personnel_id||"").trim();
  if(!personnelId)return json({error:"ابتدا کارشناس را انتخاب کنید"},400);
  const sr=await db.from("staff_members").select("id,full_name,role,active").eq("id",personnelId).maybeSingle();
  if(sr.error)return json({error:sr.error.message},500);
  if(!sr.data||sr.data.role!=="expert"||!sr.data.active)return json({error:"کارشناس انتخاب‌شده پیدا نشد یا غیرفعال است"},400);
  const cr=await db.from("cases").select("id,status").eq("id",id).maybeSingle();
  if(cr.error)return json({error:cr.error.message},500);
  if(!cr.data)return json({error:"پرونده پیدا نشد"},404);
  if(role==="sales"&&!["expert_visit_confirmed","refer"].includes(cr.data.status))return json({error:"ارجاع کارشناس فقط پس از تأیید مراجعه کارشناس امکان‌پذیر است."},409);
  const up=await db.from("cases").update({assigned_expert_staff_id:sr.data.id,assigned_expert_name:sr.data.full_name,status:"awaiting_expert_confirmation",updated_at:new Date().toISOString()}).eq("id",id);
  if(up.error)return json({error:up.error.message},500);
  await historyAdd(id,cr.data.status||"new","awaiting_expert_confirmation","ارجاع پرونده به کارشناس: "+sr.data.full_name);
  return json({ok:true,expert:{id:sr.data.id,full_name:sr.data.full_name},status:"awaiting_expert_confirmation"});
 }
 if(a==="delivery-record"&&role==="admin"&&req.method==="POST"){
   if(!id)return json({error:"شناسه پرونده مشخص نیست"},400);
   let b:any;try{b=await req.json()}catch(_){return json({error:"اطلاعات تحویل نامعتبر است"},400)}
   const cr=await db.from("cases").select("id,status,notes,case_number").eq("id",id).maybeSingle();
   if(cr.error)return json({error:cr.error.message},500);if(!cr.data)return json({error:"پرونده پیدا نشد"},404);
   const ar=await db.from("auctions").select("id,winner_id,purchase_stage,status").eq("case_id",id).order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(ar.error)return json({error:ar.error.message},500);
   if(!ar.data||ar.data.status!=="ended"||ar.data.purchase_stage!=="vehicle-filed")return json({error:"تحویل فقط پس از تأیید تسویه کامل خریدار امکان‌پذیر است."},409);
   const notes=String(cr.data.notes||"");
   const oldMatch=notes.match(/\[\[S2S_DELIVERY\]\]([\s\S]*?)\[\[\/S2S_DELIVERY\]\]/);
   let previous:any={};try{previous=oldMatch?JSON.parse(oldMatch[1]):{}}catch(_){}
   const action=String(b.action||"save");
   const data:any={
    scheduled_date:String(b.scheduled_date||"").slice(0,10),scheduled_time:String(b.scheduled_time||"").slice(0,5),
    location:String(b.location||"").trim().slice(0,500),recipient_name:String(b.recipient_name||"").trim().slice(0,120),
    recipient_id:String(b.recipient_id||"").trim().slice(0,40),odometer:String(b.odometer||"").replace(/[^0-9۰-۹٠-٩]/g,"").slice(0,15),
    spare_key:b.spare_key===true,fuel_card:b.fuel_card===true,documents:b.documents===true,vehicle_photos:b.vehicle_photos===true,checklist:Object.fromEntries(["GreenCard","VehicleCard","Insurance","Inspection","MainKey","SpareTire","Jack","Tools","Manual","Plates","BuyerViewed","TestDrive","Defects","Possession"].map(k=>[k,!!(b.checklist&&b.checklist[k]===true)])),
    receipt_note:String(b.receipt_note||"").trim().slice(0,1000),delivery_notes:String(b.delivery_notes||"").trim().slice(0,1500),
    updated_at:new Date().toISOString(),completed:previous.completed===true
   };
   if(!data.scheduled_date||!/^\d{4}-\d{2}-\d{2}$/.test(data.scheduled_date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.scheduled_time)||!data.location)return json({error:"تاریخ، ساعت و محل تحویل را کامل وارد کنید."},400);
   if(action==="complete"){
    if(!data.recipient_name||!data.recipient_id||!data.odometer||!data.receipt_note)return json({error:"نام و کد شناسایی تحویل‌گیرنده، کیلومتر و مشخصات رسید تحویل الزامی است."},400);
    if(!data.documents||!data.vehicle_photos)return json({error:"برای نهایی‌سازی، تأیید مدارک و ثبت تصاویر خودرو را علامت بزنید."},400);
    data.completed=true;data.completed_at=new Date().toISOString();
   }else if(action!=="save")return json({error:"عملیات تحویل نامعتبر است"},400);
   const nextNotes=notes.replace(/\n?\n?\[\[S2S_DELIVERY\]\][\s\S]*?\[\[\/S2S_DELIVERY\]\]/g,"").trim();
   const merged=(nextNotes?nextNotes+"\n\n":"")+"[[S2S_DELIVERY]]"+JSON.stringify(data)+"[[/S2S_DELIVERY]]";
   const up=await db.from("cases").update({notes:merged,updated_at:new Date().toISOString(),...(data.completed?{status:"done"}:{})}).eq("id",id);
   if(up.error)return json({error:up.error.message},500);
   await historyAdd(id,cr.data.status||"docs",data.completed?"done":"delivery","تحویل خودرو: "+(data.completed?"تحویل نهایی ثبت شد":("زمان "+data.scheduled_date+" ساعت "+data.scheduled_time+" ثبت/به‌روزرسانی شد")));
   if(ar.data.winner_id){
    const title=data.completed?"خودرو تحویل شد":"زمان تحویل خودرو ثبت شد";
    const message=data.completed?"تحویل خودرو در پرونده ثبت و نهایی شد.":("زمان تحویل خودرو: "+data.scheduled_date+" ساعت "+data.scheduled_time+"؛ محل: "+data.location);
    const dup=await db.from("buyer_notifications").select("id").eq("buyer_id",ar.data.winner_id).eq("auction_id",ar.data.id).eq("title",title).order("created_at",{ascending:false}).limit(1);
    if(!dup.data?.length||data.completed)await db.from("buyer_notifications").insert({buyer_id:ar.data.winner_id,auction_id:ar.data.id,title,message});
   }
   return json({ok:true,delivery:data,status:data.completed?"done":cr.data.status});
  }
  if(a==="dispatch-address"&&role==="admin"&&req.method==="POST"){const b=await req.json();const address=String(b.address||"").trim().slice(0,1200);const cr=await db.from("cases").select("notes").eq("id",id).single();if(cr.error)return json({error:"پرونده پیدا نشد"},404);const base=String(cr.data.notes||"").replace(/\n?\n?\[\[S2S_DISPATCH_ADDRESS\]\][\s\S]*?\[\[\/S2S_DISPATCH_ADDRESS\]\]/g,"").trim();const notes=(base?base+"\n\n":"")+(address?"[[S2S_DISPATCH_ADDRESS]]"+address+"[[/S2S_DISPATCH_ADDRESS]]":"");const up=await db.from("cases").update({notes,updated_at:new Date().toISOString()}).eq("id",id);if(up.error)return json({error:up.error.message},500);await historyAdd(id,"dispatch","dispatch","آدرس اعزام توسط مدیر "+(address?"ثبت/ویرایش شد":"پاک شد"));return json({ok:true})}
 if(a==="case-address"&&req.method==="POST"){if(!["admin","intake"].includes(role))return json({error:"فقط واحد ثبت درخواست یا مدیریت می‌تواند آدرس مشتری را تغییر دهد."},403);if(!id)return json({error:"پرونده مشخص نیست"},400);const b=await req.json(),address=String(b.address||"").trim();if(address.length>1000)return json({error:"آدرس نباید بیشتر از ۱۰۰۰ نویسه باشد."},400);const up=await db.from("cases").update({customer_address:address}).eq("id",id).select("id,customer_address").maybeSingle();if(up.error)return json({error:up.error.message},500);if(!up.data)return json({error:"پرونده پیدا نشد"},404);return json({ok:true,customer_address:up.data.customer_address});}
 if(a==="case-comments"&&req.method==="GET")return caseComments(req,id,role,staffMemberId);
 if(a==="case-comment"&&req.method==="POST")return caseComments(req,id,role);
 if(a==="draft"&&role==="expert"&&req.method==="GET")return getDraft(id);
 if(a==="draft"&&role==="expert"&&req.method==="POST")return saveDraft(req,id);
 if(a==="auction-bid-settings"&&role==="admin"&&req.method==="GET"){const r=await db.from("auction_settings").select("min_increment,updated_at").eq("id",true).maybeSingle();return r.error?json({error:r.error.message},500):json({min_increment:Number(r.data?.min_increment||5000000)})}if(a==="auction-bid-settings"&&role==="admin"&&req.method==="POST"){const b=await req.json(),v=Number(b.min_increment);if(!Number.isSafeInteger(v)||v<1)return json({error:"حداقل افزایش باید عدد صحیح و بیشتر از صفر باشد"},400);const r=await db.from("auction_settings").upsert({id:true,min_increment:v,updated_at:new Date().toISOString()},{onConflict:"id"}).select("min_increment").single();return r.error?json({error:r.error.message},500):json({ok:true,min_increment:Number(r.data.min_increment)})}if(a==="set-auction-prices"&&role==="admin"&&req.method==="POST"){const b=await req.json(),auctionId=String(b.auction_id||"");if(!auctionId)return json({error:"شناسه مزایده مشخص نیست"},400);const parsePrice=(v:any)=>v===null||v===""?null:Number(v);const target=parsePrice(b.target_price),fair=parsePrice(b.fair_price);if((target!==null&&(!Number.isFinite(target)||target<0))||(fair!==null&&(!Number.isFinite(fair)||fair<0)))return json({error:"قیمت‌ها باید عدد مثبت باشند"},400);const r=await db.from("auctions").update({target_price:target,fair_price:fair}).eq("id",auctionId).select("id,target_price,fair_price").single();return r.error?json({error:r.error.message},500):json({ok:true,auction:r.data})}if(a==="admin-offer-next-bidder"&&role==="admin"&&req.method==="POST"){
 let b:any;try{b=await req.json()}catch(_){return json({error:"درخواست نامعتبر است"},400)}
 const auctionId=String(b.auction_id||""),rank=Number(b.rank);
 if(!auctionId||![2,3].includes(rank))return json({error:"مزایده و رتبه خریدار دوم یا سوم را مشخص کن"},400);
 const ar=await db.from("auctions").select("id,case_id,status,purchase_stage,winner_id,current_bid").eq("id",auctionId).maybeSingle();
 if(ar.error)return json({error:ar.error.message},500);
 if(!ar.data)return json({error:"مزایده پیدا نشد"},404);
 if(ar.data.status!=="ended"||ar.data.purchase_stage!=="cancelled")return json({error:"انتقال فقط پس از انصراف برنده فعلی امکان‌پذیر است"},409);
 const br=await db.from("bids").select("buyer_id,amount,created_at").eq("auction_id",auctionId).order("amount",{ascending:false});
 if(br.error)return json({error:"دریافت پیشنهادها ناموفق بود: "+br.error.message},500);
 const ranked:any[]=[],seen=new Set<string>();
 for(const bid of br.data||[]){const bidBuyer=String(bid.buyer_id||"");if(!bidBuyer||seen.has(bidBuyer))continue;seen.add(bidBuyer);ranked.push(bid)}
 const chosen=ranked[rank-1];
 if(!chosen)return json({error:"برای این رتبه خریدار دیگری پیشنهاد ثبت نکرده است"},404);
 if(String(chosen.buyer_id)===String(ar.data.winner_id))return json({error:"خریدار انتخاب‌شده همان برنده قبلی است؛ فهرست پیشنهادها را بررسی کن"},409);
 const members=await db.from("auction_members").select("id,full_name,mobile").in("id",[String(ar.data.winner_id||""),String(chosen.buyer_id)]);
 if(members.error)return json({error:members.error.message},500);
 const oldBuyer=(members.data||[]).find((m:any)=>String(m.id)===String(ar.data.winner_id));
 const nextBuyer=(members.data||[]).find((m:any)=>String(m.id)===String(chosen.buyer_id));
 if(!nextBuyer)return json({error:"حساب خریدار بعدی پیدا نشد"},404);
 const now=new Date().toISOString(),deadline=new Date(Date.now()+3*60*1000).toISOString(),amount=Number(chosen.amount||0);
 const up=await db.from("auctions").update({winner_id:chosen.buyer_id,current_bid:amount,purchase_stage:"awaiting_buyer_confirmation",winner_response_status:"pending",winner_response_deadline:deadline,winner_response_at:null}).eq("id",auctionId).eq("status","ended").eq("purchase_stage","cancelled").select("id").maybeSingle();
 if(up.error)return json({error:"ثبت انتقال به خریدار جدید ناموفق بود: "+up.error.message},500);
 if(!up.data)return json({error:"وضعیت مزایده هم‌زمان تغییر کرده؛ صفحه را تازه کن"},409);
 const oldLabel=[oldBuyer?.full_name,oldBuyer?.mobile].filter(Boolean).join(" / ")||"خریدار قبلی";
 const nextLabel=[nextBuyer.full_name,nextBuyer.mobile].filter(Boolean).join(" / ")||"خریدار رتبه "+rank;
 const note=await db.from("buyer_notifications").insert({buyer_id:chosen.buyer_id,auction_id:auctionId,title:"🎉 نوبت شما شد؛ برنده مزایده هستید",message:"به دلیل انصراف برنده قبلی، پیشنهاد شما برای خودرو انتخاب شد. قیمت پیشنهاد شما "+amount.toLocaleString("fa-IR")+" تومان است. لطفاً تا ۳ دقیقه آینده موافقت یا عدم موافقت خود را ثبت کنید."});
 if(ar.data.case_id)await historyAdd(ar.data.case_id,"auction-end","customer","مدیریت پیشنهاد را به خریدار رتبه "+rank+" ("+nextLabel+") منتقل کرد؛ قیمت "+amount.toLocaleString("fa-IR")+" تومان. انصراف خریدار قبلی ("+oldLabel+") ثبت شد؛ برای خریدار جدید اعلان برنده‌شدن و مهلت ۳ دقیقه‌ای ایجاد شد.");
 return json({ok:true,rank,buyer:nextBuyer,amount,winner_response_deadline:deadline,notification_sent:!note.error,notification_error:note.error?.message||null});
}
if(a==="auctions"&&(role==="admin"||role==="sales")){const {data,error}=await db.from("auctions").select("*").order("created_at",{ascending:false});if(error)return json({error:error.message},500);const ids=(data||[]).map((x:any)=>x.case_id).filter(Boolean);let cases:any[]=[],vehicles:any[]=[];if(ids.length){const cr=await db.from("cases").select("*").in("id",ids);if(cr.error)return json({error:cr.error.message},500);cases=cr.data||[];const vr=await db.from("vehicles").select("*").in("case_id",ids);if(vr.error)return json({error:vr.error.message},500);vehicles=vr.data||[]}const aids=(data||[]).map((x:any)=>x.id);let bids:any[]=[];if(aids.length){const br=await db.from("bids").select("*").in("auction_id",aids).order("amount",{ascending:false});if(br.error)return json({error:br.error.message},500);bids=br.data||[]}return json({auctions:(data||[]).map((a:any)=>({...a,case:cases.find((c:any)=>c.id===a.case_id)||null,vehicle:vehicles.find((v:any)=>v.id===a.vehicle_id)||vehicles.find((v:any)=>v.case_id===a.case_id&&v.vehicle_role==="current")||null,bids:bids.filter((b:any)=>b.auction_id===a.id)}))})}
if(a==="eligible-auctions"&&(role==="admin"||role==="sales")){const {data,error}=await db.from("cases").select("*").eq("status","review").order("created_at",{ascending:false});return error?json({error:error.message},500):json({cases:data||[]})}
if(a==="create_auction"&&(role==="admin"||role==="sales")){const b=await req.json();const targetPrice=Number(b.target_price),fairPrice=Number(b.fair_price);if(!id||!b.starting_price||Number(b.starting_price)<=0)return json({error:"پرونده و قیمت شروع الزامی است"},400);if(!Number.isFinite(targetPrice)||targetPrice<=0||!Number.isFinite(fairPrice)||fairPrice<=0)return json({error:"قیمت هدف و قیمت منصفانه باید قبل از شروع مزایده ثبت شوند"},400);const cr=await db.from("cases").select("id,status").eq("id",id).single();if(cr.error)return json({error:"پرونده پیدا نشد"},404);if(role==="sales"&&cr.data.status!=="auction-ready")return json({error:"تیم فروش فقط می‌تواند خودروی آماده مزایده را منتشر کند؛ ابتدا مراحل کارشناسی و وجه تضمین را تکمیل کنید."},400);if(role==="admin"&&!["review","auction-ready"].includes(cr.data.status))return json({error:"ابتدا پایان کارشناسی را تأیید و پرونده را به مرحله انتقال به مزایده ببرید"},400);const ex=await db.from("auctions").select("id,status").eq("case_id",id).eq("status","active").maybeSingle();if(ex.data)return json({error:"برای این پرونده یک مزایده فعال از قبل وجود دارد"},409);const vr=await db.from("vehicles").select("id").eq("case_id",id).eq("vehicle_role","current").limit(1).maybeSingle();const durationMinutes=Number(b.duration_minutes??60);if(!Number.isInteger(durationMinutes)||durationMinutes<60||durationMinutes>5256000)return json({error:"مدت مزایده باید حداقل ۶۰ دقیقه باشد و حداکثر تا ۱۰ سال قابل تنظیم است"},400);const starts=new Date();const ends=new Date(starts.getTime()+durationMinutes*60000);const ar=await db.from("auctions").insert({case_id:id,vehicle_id:vr.data?.id||null,status:"active",starts_at:starts.toISOString(),ends_at:ends.toISOString(),starting_price:Number(b.starting_price),current_bid:Number(b.starting_price),target_price:targetPrice,fair_price:fairPrice}).select("*").single();if(ar.error)return json({error:ar.error.message},500);await db.from("cases").update({status:"auction"}).eq("id",id);await historyAdd(id,cr.data.status,"auction","مزایده با مدت تنظیم‌شده توسط تیم مجاز شروع شد: "+durationMinutes+" دقیقه؛ قیمت هدف: "+targetPrice+"؛ قیمت منصفانه: "+fairPrice);return json({ok:true,auction:ar.data})}
if(a==="update_auction_time"&&role==="admin"){const b=await req.json();const minutes=Number(b.minutes);if(!id||!Number.isInteger(minutes)||minutes<60||minutes>5256000)return json({error:"مدت جدید باید حداقل ۶۰ دقیقه و حداکثر ۱۰ سال باشد"},400);const ar=await db.from("auctions").select("id,case_id,status").eq("id",id).maybeSingle();if(ar.error)return json({error:ar.error.message},500);if(!ar.data)return json({error:"مزایده پیدا نشد"},404);if(ar.data.status!=="active")return json({error:"فقط مزایده فعال قابل تنظیم زمان است"},400);const endsAt=new Date(Date.now()+minutes*60000).toISOString();const up=await db.from("auctions").update({ends_at:endsAt}).eq("id",id).eq("status","active").select("id,ends_at").single();if(up.error)return json({error:up.error.message},500);await historyAdd(ar.data.case_id,"auction","auction","مدت مزایده توسط مدیر تنظیم شد: "+minutes+" دقیقه");return json({ok:true,ends_at:up.data.ends_at})}if(a==="end_auction"&&(role==="admin"||role==="sales")){
 const ar=await db.from("auctions").select("*").eq("id",id).maybeSingle();
 if(ar.error)return json({error:"خطا در دریافت مزایده: "+ar.error.message},500);
 if(!ar.data)return json({error:"مزایده پیدا نشد"},404);
 if(ar.data.status==="ended")return json({ok:true,already_ended:true,winner_id:ar.data.winner_id,current_bid:ar.data.current_bid});
 if(ar.data.status!=="active")return json({error:"این مزایده فعال نیست و وضعیت فعلی آن "+String(ar.data.status)},400);
 const br=await db.from("bids").select("*").eq("auction_id",id).order("amount",{ascending:false}).limit(1).maybeSingle();
 if(br.error)return json({error:"خطا در دریافت پیشنهادها: "+br.error.message},500);
 const winner=br.data?.buyer_id||null;
 const winnerDeadline=new Date(Date.now()+3*60*1000).toISOString();const upd=await db.from("auctions").update({status:"ended",winner_id:winner,current_bid:br.data?.amount||ar.data.current_bid,purchase_stage:winner?"awaiting_buyer_confirmation":"auction-end",winner_response_status:winner?"pending":null,winner_response_deadline:winner?winnerDeadline:null,winner_response_at:null}).eq("id",id).eq("status","active").select("id").maybeSingle();
 if(upd.error)return json({error:"خطا در ثبت پایان مزایده: "+upd.error.message},500);
 if(!upd.data){
  const latest=await db.from("auctions").select("status,winner_id,current_bid").eq("id",id).maybeSingle();
  if(latest.data?.status==="ended")return json({ok:true,already_ended:true,winner_id:latest.data.winner_id,current_bid:latest.data.current_bid});
  return json({error:"مزایده هم‌زمان تغییر کرده؛ صفحه را تازه‌سازی کن و دوباره بررسی کن."},409);
 }
 const caseUpdate=await db.from("cases").update({status:"auction-end"}).eq("id",ar.data.case_id);
 if(caseUpdate.error)return json({error:"مزایده بسته شد اما تغییر وضعیت پرونده ناموفق بود: "+caseUpdate.error.message},500);
 await historyAdd(ar.data.case_id,"auction","auction-end",winner?"مزایده پایان یافت و برنده مشخص شد":"مزایده پایان یافت بدون برنده");
 if(winner)await db.from("buyer_notifications").insert({buyer_id:winner,auction_id:id,title:"🎉 برنده مزایده شدی؛ قیمت را تأیید کن",message:"تبریک! برنده مزایده شدی. قیمت نهایی شما "+Number(br.data?.amount||ar.data.current_bid||0).toLocaleString("fa-IR")+" تومان است. لطفاً تا ۳ دقیقه آینده مشخص کن با این قیمت موافقی یا خیر. اگر زمان تمام شود، پیشنهاد به‌عنوان عدم تأیید ثبت می‌شود."});
 return json({ok:true,winner_id:winner,current_bid:br.data?.amount||ar.data.current_bid});
}
if(a==="confirm-call"&&role==="admin")return setStatus(id,"booking_confirmed","تأیید رزرو توسط مدیریت");if(a==="customer-decision"&&role==="admin"){const b=await req.json();if(!["accept","decline"].includes(b.decision))return json({error:"decision_invalid"},400);const next=b.decision==="accept"?"docs":"disagreement";const r=await db.from("cases").update({status:next,agreed_price:b.decision==="accept"?(Number(b.agreed_price||0)||null):null,customer_decision_at:new Date().toISOString(),customer_decision_note:b.note||null}).eq("id",id);if(r.error)return json({error:r.error.message},500);await historyAdd(id,"customer",next,b.decision==="accept"?"مشتری قیمت را پذیرفت":"عدم توافق با قیمت");return json({ok:true,status:next})}if(a==="prepayment"&&role==="admin"){const b=await req.json(),amount=Number(b.amount||0);if(amount<=0)return json({error:"مبلغ پیش‌پرداخت نامعتبر است"},400);const r=await db.from("cases").update({status:"contract",prepayment_amount:amount,prepayment_status:"received",prepayment_received_at:new Date().toISOString()}).eq("id",id);if(r.error)return json({error:r.error.message},500);await historyAdd(id,"deposit","contract","پیش‌پرداخت دریافت شد: "+amount);return json({ok:true,status:"contract"})}if(a==="continue-selling"&&role==="admin")return setStatus(id,"selling","ادامه فعالیت برای فروش خودرو");if(a==="set-status"&&role==="admin"){const b=await req.json();if(!b.status||!statusFa[b.status])return json({error:"status_invalid"},400);if(["review","auction"].includes(b.status))return json({error:"این مرحله فقط از مسیر اختصاصی کارشناسی یا شروع مزایده قابل ثبت است"},403);if(b.status==="inspection"){const cr=await db.from("cases").select("status").eq("id",id).single();if(cr.error)return json({error:"پرونده پیدا نشد"},404);if(!["refer","inspection"].includes(cr.data.status))return json({error:"ابتدا پرونده را به کارشناس ارجاع دهید"},400)}return setStatus(id,b.status,b.note||"تغییر وضعیت توسط مدیر")}if(a==="expert-status"&&role==="expert"){const assignedCase=await db.from("cases").select("assigned_expert_staff_id").eq("id",id).maybeSingle();if(assignedCase.error)return json({error:assignedCase.error.message},500);if(!assignedCase.data||assignedCase.data.assigned_expert_staff_id!==staffMemberId)return json({error:"این پرونده به شما ارجاع نشده است؛ فقط پرونده‌های ارجاع‌شده به خودتان قابل ویرایش هستند."},403);const b=await req.json();if(!["inspection","review","expert_visit_confirmed"].includes(b.status))return json({error:"status_invalid"},400);const currentCase=await db.from("cases").select("status").eq("id",id).single();if(currentCase.error)return json({error:"پرونده پیدا نشد"},404);if(b.status==="expert_visit_confirmed"){if(currentCase.data.status!=="awaiting_expert_confirmation")return json({error:"این پرونده در انتظار تأیید کارشناس نیست"},400);return setStatus(id,"expert_visit_confirmed",b.note||"کارشناس پرونده را تأیید کرد")}if(b.status==="review"&&currentCase.data.status!=="inspection")return json({error:"فقط کارشناسِ پرونده در حال کارشناسی می‌تواند پایان کارشناسی را ثبت کند"},403);if(b.status==="inspection"&&!["refer","inspection","expert_visit_confirmed"].includes(currentCase.data.status))return json({error:"ابتدا پرونده را تأیید کنید؛ سپس شروع کارشناسی را بزنید."},400);return setStatus(id,b.status,b.note||(b.status==="inspection"?"کارشناس شروع به کارشناسی کرد":"کارشناسی پایان یافت"))}if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 if(a==="next"&&role==="admin"){const {data,error}=await db.from("cases").select("status").eq("id",id).single();if(error)return json({error:error.message},500);const i=order.indexOf(data?.status||"new"),next=order[Math.min(i+1,order.length-1)];return setStatus(id,next,"مرحله بعد")}
 if(a==="cancel"&&role==="admin")return setStatus(id,"cancelled","انصراف");
 if(a==="inspect"&&role==="expert")return inspect(req,id);
 return json({error:"not_found"},404)
}
Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response(null,{status:204,headers:J});const u=new URL(req.url);if(u.searchParams.has("api"))return api(req,u);
 if(req.method==="POST"){try{const b=await req.json();if(!b.name||!b.mobile||!["sell","buy","exchange"].includes(b.type))return json({error:"نام، موبایل و نوع درخواست الزامی است"},400);const mobile=String(b.mobile).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[^0-9]/g,"");if(!/^09[0-9]{9}$/.test(mobile))return json({error:"شماره موبایل معتبر نیست. شماره را با 09 و 11 رقم وارد کن."},400);const appointmentDate=b.type==="buy"?null:(b.appointment_date||null),appointmentTime=b.type==="buy"?null:(b.appointment_time||null);
 let customerId:string|null=null;const bearer=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();if(bearer&&bearer!=="null"&&bearer!=="undefined"){try{const ur=await db.auth.getUser(bearer);if(!ur.error&&ur.data?.user)customerId=ur.data.user.id}catch(_){customerId=null}}
 const {data:c,error}=await db.from("cases").insert({customer_id:customerId,service_type:b.type,customer_name:String(b.name).trim(),customer_mobile:mobile,notes:String(b.notes||"").trim()||null,appointment_date:appointmentDate,appointment_time:appointmentTime}).select("id,case_number").single();
 if(error){if(error.code==="P0001")return json({error:error.message,code:"booking_unavailable"},409);if(error.code==="23505"&&error.message.includes("cases_unique_active_appointment"))return json({error:"این روز و ساعت قبلاً رزرو شده است. لطفاً یک زمان دیگر انتخاب کنید.",code:"appointment_taken"},409);if(error.code==="23505"&&error.message.includes("cases_unique_active_mobile"))return json({error:"این شماره قبلاً پرونده فعال دارد. محدودیت قدیمی موبایل باید در پایگاه داده اصلاح شود.",code:"legacy_mobile_limit"},409);return json({error:error.message},500)}
 const vs:any[]=[];if(b.vehicle)vs.push({...b.vehicle,vehicle_role:"current"});if(b.target_vehicle)vs.push({...b.target_vehicle,vehicle_role:"target"});for(const v of vs){const x={...v,case_id:c.id};delete x.budget;const r=await db.from("vehicles").insert(x);if(r.error)return json({error:"پرونده ساخته شد اما ذخیره خودرو ناموفق بود: "+r.error.message,case_number:c.case_number,id:c.id},500)}
 return json({ok:true,case_number:c.case_number,id:c.id})}catch(e){return json({error:String(e)},500)}}return json({ok:true,service:"switch-to-switch-v4-api"})});