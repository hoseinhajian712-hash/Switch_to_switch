import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const url=Deno.env.get("SUPABASE_URL")!, key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, db=createClient(url,key);
// Staff access is granted only through short-lived, hashed staff_sessions tokens.
const J={"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type,authorization,apikey,x-client-info,prefer,accept,origin"};
const order=["new","refer","inspection","review","auction-ready","auction","auction-end","customer","docs","deposit","contract","done"];
const statusFa:any={new:"تماس اولیه",refer:"تأیید مراجعه کارشناس",inspection:"کارشناسی در حال انجام",review:"پایان کارشناسی","auction-ready":"انتقال به مزایده",auction:"مزایده فعال","auction-end":"پایان مزایده",customer:"مذاکره با مشتری",disagreement:"عدم توافق با مشتری",selling:"در انتظار تصمیم نهایی",docs:"تکمیل مدارک",deposit:"دریافت پیش‌پرداخت",contract:"قرارداد",done:"تکمیل معامله",cancelled:"انصراف"};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:J});
function auth(_u:URL){return null}
async function listCases(role:string,staffMemberId:string=""){
 const cq=role==="expert"?db.from("cases").select("*").eq("assigned_expert_staff_id",staffMemberId||"00000000-0000-0000-0000-000000000000").in("status",["refer","inspection"]).order("created_at",{ascending:false}):db.from("cases").select("*").order("created_at",{ascending:false});
 const {data,error}=await cq;
 if(error)return json({error:error.message},500);
 const ids=(data||[]).map((x:any)=>x.id); let vehicles:any[]=[];
 if(ids.length){const r=await db.from("vehicles").select("*").in("case_id",ids);if(r.error)return json({error:r.error.message},500);vehicles=r.data||[]}
 let inspections:any[]=[]; let defects:any[]=[]; let documents:any[]=[]; let photos:any[]=[]; let history:any[]=[]; let auctions:any[]=[];
 if(ids.length){
  const ir=await db.from("inspections").select("*").in("case_id",ids).order("finished_at",{ascending:false});
  if(ir.error)return json({error:ir.error.message},500); inspections=ir.data||[];
  const ii=inspections.map((x:any)=>x.id);
  if(ii.length){const dr=await db.from("inspection_defects").select("*").in("inspection_id",ii);if(dr.error)return json({error:dr.error.message},500);defects=dr.data||[];const pr=await db.from("inspection_photos").select("*").in("inspection_id",ii);if(pr.error)return json({error:pr.error.message},500);photos=pr.data||[];}
  const xr=await db.from("documents").select("*").in("case_id",ids);if(xr.error)return json({error:xr.error.message},500);documents=xr.data||[];const hr=await db.from("case_history").select("*").in("case_id",ids).order("created_at",{ascending:false});if(hr.error)return json({error:hr.error.message},500);history=hr.data||[];const ar=await db.from("auctions").select("*").in("case_id",ids).order("created_at",{ascending:false});if(ar.error)return json({error:ar.error.message},500);auctions=ar.data||[];
 }
 const mediaRows=[...documents,...photos]; const paths=mediaRows.map((x:any)=>x.storage_path).filter(Boolean); const signed=paths.length?(await db.storage.from("s2s-documents").createSignedUrls(paths,3600)).data||[]:[]; const mediaUrl=(p:string)=>signed.find((x:any)=>x.path===p)?.signedUrl||null;
 return json({cases:(data||[]).map((c:any)=>{const cd=documents.filter((d:any)=>d.case_id===c.id).map((d:any)=>({...d,url:mediaUrl(d.storage_path)}));const cp=inspections.filter((i:any)=>i.case_id===c.id).flatMap((i:any)=>photos.filter((p:any)=>p.inspection_id===i.id)).map((p:any)=>({...p,url:mediaUrl(p.storage_path)}));return {...c,vehicles:vehicles.filter((v:any)=>v.case_id===c.id),inspection:(inspections.find((i:any)=>i.case_id===c.id)||null),defects:inspections.filter((i:any)=>i.case_id===c.id).flatMap((i:any)=>defects.filter((d:any)=>d.inspection_id===i.id)),documents:cd,photos:cp,history:history.filter((h:any)=>h.case_id===c.id),auction:(auctions.find((a:any)=>a.case_id===c.id)||null)}}),statusFa});
}
async function saveDraft(req:Request,id:string){const b=await req.json();const data=b.data&&typeof b.data==="object"?b.data:{};const {error}=await db.from("inspection_drafts").upsert({case_id:id,data,updated_at:new Date().toISOString()},{onConflict:"case_id"});return error?json({error:error.message},500):json({ok:true})}
async function getDraft(id:string){const {data,error}=await db.from("inspection_drafts").select("data,updated_at").eq("case_id",id).maybeSingle();return error?json({error:error.message},500):json({ok:true,draft:data||null})}async function sha256Hex(v:string){const d=new TextEncoder().encode(v);const h=await crypto.subtle.digest("SHA-256",d);return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,"0")).join("")}
function randCode(){return String(Math.floor(100000+Math.random()*900000))}
function randToken(){const b=new Uint8Array(32);crypto.getRandomValues(b);return btoa(String.fromCharCode(...b)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
async function auctionToken(req:Request,u:URL){const h=req.headers.get("authorization")||"";const q=u.searchParams.get("token")||"";const t=(h.startsWith("Bearer ")?h.slice(7):q).trim();if(!t)return null;const th=await sha256Hex(t);const r=await db.from("auction_sessions").select("id,member_id,expires_at").eq("token_hash",th).gt("expires_at",new Date().toISOString()).maybeSingle();return r.data||null}
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
 const ins=await db.from("auction_otp_codes").insert({mobile,code_hash:hash,display_code:code,expires_at:new Date(Date.now()+5*60000).toISOString()});
 if(ins.error)return json({error:"ذخیره کد ورود ناموفق بود"},500);
 const mr=await db.from("auction_members").upsert({mobile,full_name:name||null,updated_at:new Date().toISOString()},{onConflict:"mobile"});
 if(mr.error)return json({error:mr.error.message},500);
 return json({ok:true,delivery:"admin-panel",message:"کد ورود در پنل مدیریت، بخش اشتراک اعضا و کد ورود نمایش داده می‌شود و ۵ دقیقه اعتبار دارد."});
}
async function verifyAuctionOtp(req:Request){const b=await req.json(),mobile=String(b.mobile||"").replace(/\s/g,""),code=String(b.code||"").trim();if(!/^09\d{9}$/.test(mobile)||!/^\d{6}$/.test(code))return json({error:"شماره موبایل یا کد نامعتبر است"},400);const r=await db.from("auction_otp_codes").select("*").eq("mobile",mobile).is("verified_at",null).order("created_at",{ascending:false}).limit(1).maybeSingle();if(!r.data)return json({error:"کد پیدا نشد؛ دوباره درخواست کد کنید"},400);if(new Date(r.data.expires_at).getTime()<Date.now())return json({error:"کد منقضی شده است"},400);if(Number(r.data.attempts)>=5)return json({error:"تعداد تلاش بیش از حد مجاز است"},429);const h=await sha256Hex(code);if(h!==r.data.code_hash){await db.from("auction_otp_codes").update({attempts:Number(r.data.attempts)+1}).eq("id",r.data.id);return json({error:"کد واردشده صحیح نیست"},400)}await db.from("auction_otp_codes").update({verified_at:new Date().toISOString()}).eq("id",r.data.id);const mr=await db.from("auction_members").select("*").eq("mobile",mobile).single();if(mr.error)return json({error:mr.error.message},500);const raw=randToken(),th=await sha256Hex(raw);await db.from("auction_sessions").insert({member_id:mr.data.id,token_hash:th,expires_at:new Date(Date.now()+12*60*60000).toISOString()});return json({ok:true,verified:true,subscription_required:false,token:raw,expires_in:43200})}
async function startAuctionSubscription(req:Request){const b=await req.json(),mobile=String(b.mobile||"").replace(/\s/g,""),name=String(b.full_name||"").trim();if(!/^09\d{9}$/.test(mobile))return json({error:"شماره موبایل معتبر نیست"},400);const mr=await db.from("auction_members").upsert({mobile,full_name:name||null,subscription_status:"pending",updated_at:new Date().toISOString()},{onConflict:"mobile"}).select("id,mobile,full_name,subscription_status").single();if(mr.error)return json({error:mr.error.message},500);const url=Deno.env.get("AUCTION_PAYMENT_URL")||"";return json({ok:true,member:mr.data,payment_required:true,amount:Number(Deno.env.get("AUCTION_SUBSCRIPTION_AMOUNT")||0),payment_url:url||null,message:url?"برای پرداخت اشتراک وارد درگاه شوید.":"درگاه پرداخت هنوز تنظیم نشده است."})}
async function auctionLoginCodes(u:URL){const {data,error}=await db.from("auction_otp_codes").select("id,mobile,display_code,created_at,expires_at,verified_at").is("verified_at",null).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(30);return error?json({error:error.message},500):json({ok:true,codes:data||[]})}
async function auctionMembers(){const {data,error}=await db.from("auction_members").select("id,mobile,full_name,subscription_status,paid_at,paid_until,created_at,updated_at,identity_document_path,identity_uploaded_at,identity_verified,identity_review_note").order("created_at",{ascending:false});if(error)return json({error:error.message},500);const ids=(data||[]).map((m:any)=>m.id);const wr=ids.length?await db.from("auction_wallet_transactions").select("buyer_id,amount,direction").in("buyer_id",ids):{data:[],error:null};if(wr.error)return json({error:wr.error.message},500);const balances:any={};for(const t of wr.data||[])balances[t.buyer_id]=(balances[t.buyer_id]||0)+(t.direction==="credit"?1:-1)*Number(t.amount||0);const paths=(data||[]).map((x:any)=>x.identity_document_path).filter(Boolean);const signed=paths.length?(await db.storage.from("s2s-documents").createSignedUrls(paths,1800)).data||[]:[];return json({ok:true,members:(data||[]).map((m:any)=>({...m,wallet_balance:balances[m.id]||0,identity_url:signed.find((x:any)=>x.path===m.identity_document_path)?.signedUrl||null}))})}
async function getWalletBankSettings(){const r=await db.from("wallet_bank_settings").select("bank_name,account_holder,card_number,account_number,sheba,updated_at").eq("id",true).maybeSingle();if(r.error)return json({error:r.error.message},500);return json({ok:true,settings:r.data||{bank_name:"",account_holder:"",card_number:"",account_number:"",sheba:""}})}
async function saveWalletBankSettings(req:Request){let b:any;try{b=await req.json()}catch(_){return json({error:"اطلاعات حساب معتبر نیست"},400)}const bank_name=String(b.bank_name||"").trim().slice(0,100),account_holder=String(b.account_holder||"").trim().slice(0,120),card_number=String(b.card_number||"").replace(/[\\s-]/g,"").slice(0,24),account_number=String(b.account_number||"").trim().slice(0,40),sheba=String(b.sheba||"").replace(/[\\s-]/g,"").toUpperCase().slice(0,30);if(card_number&&!/^[0-9۰-۹]{16}$/.test(card_number))return json({error:"شماره کارت باید ۱۶ رقم باشد"},400);if(sheba&&!/^IR[0-9]{24}$/.test(sheba))return json({error:"شماره شبا باید با IR و ۲۴ رقم وارد شود"},400);if(!account_holder||(!card_number&&!account_number&&!sheba))return json({error:"نام صاحب حساب و دست‌کم یکی از شماره‌های کارت، حساب یا شبا را وارد کنید"},400);const r=await db.from("wallet_bank_settings").upsert({id:true,bank_name,account_holder,card_number,account_number,sheba,updated_at:new Date().toISOString()},{onConflict:"id"}).select("bank_name,account_holder,card_number,account_number,sheba,updated_at").single();if(r.error)return json({error:"ذخیره اطلاعات حساب ناموفق بود: "+r.error.message},500);return json({ok:true,settings:r.data})}
async function buyerSubmitWalletTopup(req:Request,u:URL){const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);let b:any;try{b=await req.json()}catch(_){return json({error:"اطلاعات درخواست نامعتبر است"},400)}const amount=Number(b.amount),dataUrl=String(b.data_url||""),note=String(b.note||"").trim().slice(0,500);if(!Number.isSafeInteger(amount)||amount<=0||amount>1000000000000)return json({error:"مبلغ باید عدد صحیح و بیشتر از صفر باشد"},400);if(!dataUrl.startsWith("data:image/")||!dataUrl.includes(";base64,"))return json({error:"عکس فیش واریز را انتخاب کن"},400);const [head,raw]=dataUrl.split(",",2),mime=(head.match(/data:(.*?);base64/)||[])[1]||"image/jpeg";let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0))}catch(_){return json({error:"فایل فیش معتبر نیست"},400)}if(bytes.length>5*1024*1024)return json({error:"حجم فیش باید کمتر از ۵ مگابایت باشد"},400);const pending=await db.from("wallet_topup_requests").select("id").eq("buyer_id",sess.member_id).eq("status","pending").limit(1);if(pending.data?.length)return json({error:"یک درخواست شارژ در انتظار بررسی داری؛ بعد از بررسی مدیریت دوباره درخواست بده."},409);const ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg",path="wallet-topups/"+sess.member_id+"/"+crypto.randomUUID()+"."+ext;const up=await db.storage.from("s2s-documents").upload(path,bytes,{contentType:mime,upsert:false});if(up.error)return json({error:"بارگذاری فیش انجام نشد: "+up.error.message},500);const ins=await db.from("wallet_topup_requests").insert({buyer_id:sess.member_id,amount,receipt_path:path,buyer_note:note}).select("id,amount,status,created_at").single();if(ins.error){await db.storage.from("s2s-documents").remove([path]);return json({error:"ثبت درخواست شارژ انجام نشد: "+ins.error.message},500)}return json({ok:true,request:ins.data,message:"فیش ارسال شد؛ پس از بررسی مدیریت، در صورت تأیید موجودی کیف پول شارژ می‌شود."},201)}
async function buyerWalletTopupRequests(req:Request,u:URL){const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);const r=await db.from("wallet_topup_requests").select("id,amount,status,buyer_note,review_note,created_at,reviewed_at").eq("buyer_id",sess.member_id).order("created_at",{ascending:false}).limit(30);if(r.error)return json({error:r.error.message},500);return json({requests:r.data||[]})}
async function adminWalletTopupRequests(u:URL){const r=await db.from("wallet_topup_requests").select("id,buyer_id,amount,status,buyer_note,review_note,created_at,reviewed_at,receipt_path").order("created_at",{ascending:false}).limit(100);if(r.error)return json({error:r.error.message},500);const ids=[...new Set((r.data||[]).map((x:any)=>x.buyer_id))];const m=ids.length?await db.from("auction_members").select("id,mobile,full_name").in("id",ids):{data:[],error:null};if(m.error)return json({error:m.error.message},500);const members:any={};for(const x of m.data||[])members[x.id]=x;const items=[];for(const x of r.data||[]){const s=await db.storage.from("s2s-documents").createSignedUrl(x.receipt_path,600);items.push({...x,member:members[x.buyer_id]||null,receipt_url:s.data?.signedUrl||null})}return json({requests:items})}
async function adminReviewWalletTopup(req:Request){let b:any;try{b=await req.json()}catch(_){return json({error:"درخواست نامعتبر است"},400)}const id=String(b.request_id||""),status=String(b.status||""),note=String(b.note||"").trim().slice(0,500);if(!id||!["approved","rejected"].includes(status))return json({error:"وضعیت بررسی معتبر نیست"},400);const cur=await db.from("wallet_topup_requests").select("*").eq("id",id).maybeSingle();if(cur.error||!cur.data)return json({error:"درخواست شارژ پیدا نشد"},404);if(cur.data.status!=="pending")return json({error:"این درخواست قبلاً بررسی شده است"},409);const up=await db.from("wallet_topup_requests").update({status,review_note:note,reviewed_at:new Date().toISOString(),reviewed_by:"admin"}).eq("id",id).eq("status","pending").select("id").maybeSingle();if(up.error)return json({error:up.error.message},500);if(!up.data)return json({error:"این درخواست قبلاً بررسی شده است"},409);if(status==="approved"){const ins=await db.from("auction_wallet_transactions").insert({buyer_id:cur.data.buyer_id,amount:cur.data.amount,direction:"credit",note:"شارژ کیف پول پس از تأیید فیش"+(note?" — "+note:""),created_by:"admin"});if(ins.error){await db.from("wallet_topup_requests").update({status:"pending",reviewed_at:null,reviewed_by:null}).eq("id",id).eq("status","approved");return json({error:"درخواست تأیید شد اما شارژ کیف پول ثبت نشد؛ دوباره تلاش کن. "+ins.error.message},500)}}await db.from("buyer_notifications").insert({buyer_id:cur.data.buyer_id,title:status==="approved"?"شارژ کیف پول تأیید شد":"فیش شارژ کیف پول رد شد",message:status==="approved"?"واریز شما تأیید شد و مبلغ به کیف پول اضافه شد.":"فیش شارژ کیف پول تأیید نشد. "+(note||"برای راهنمایی با مدیریت تماس بگیر.")});return json({ok:true,status})}
async function adminTopupWallet(req:Request){
 const b=await req.json(),mobile=String(b.mobile||"").replace(/\\s/g,""),amount=Number(b.amount),note=String(b.note||"شارژ کیف پول توسط مدیریت").trim().slice(0,500);
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
async function publicAuctions(req:Request,u:URL){const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);const buyer=await db.from("auction_members").select("identity_verified").eq("id",sess.member_id).single();if(buyer.error||!buyer.data?.identity_verified)return json({error:"احراز هویت کارت ملی باید توسط مدیریت تأیید شود."},403);const setting=await db.from("auction_settings").select("min_increment").eq("id",true).maybeSingle();const minIncrement=Number(setting.data?.min_increment||5000000);const {data:aucs,error}=await db.from("auctions").select("id,case_id,vehicle_id,status,starts_at,ends_at,current_bid,starting_price,target_price,fair_price,created_at,prepayment_amount,purchase_stage,seller_account_name,seller_account_number,cancellation_fine_amount").eq("status","active").order("created_at",{ascending:false});if(error)return json({error:error.message},500);const out:any[]=[];for(const a of (aucs||[])){if(new Date(a.ends_at).getTime()<=Date.now()){await db.from("auctions").update({status:"ended"}).eq("id",a.id);await db.from("cases").update({status:"auction-end"}).eq("id",a.case_id);continue;}const cr=await db.from("cases").select("id,case_number").eq("id",a.case_id).single();const vr=await db.from("vehicles").select("id,brand,model,trim,model_year,color,mileage,body_condition,technical_condition,general_condition,spare_key,fuel_card,power_of_attorney,green_card,factory_invoice,car_document").eq("id",a.vehicle_id).maybeSingle();const ir=await db.from("inspections").select("id,summary,finished_at,status").eq("case_id",a.case_id).order("finished_at",{ascending:false}).limit(1).maybeSingle();let defects:any[]=[],photos:any[]=[];if(ir.data?.id){const dr=await db.from("inspection_defects").select("id,area,part,defect_type,explanation").eq("inspection_id",ir.data.id);defects=dr.data||[];const pr=await db.from("inspection_photos").select("id,defect_id,photo_type,label,storage_path,annotation").eq("inspection_id",ir.data.id).neq("photo_type","document");photos=pr.data||[];}const br=await db.from("bids").select("id,amount,created_at").eq("auction_id",a.id).order("amount",{ascending:false});const paths=photos.map((x:any)=>x.storage_path).filter(Boolean);const signed=paths.length?(await db.storage.from("s2s-documents").createSignedUrls(paths,3600)).data||[]:[];const mediaUrl=(p:string)=>signed.find((x:any)=>x.path===p)?.signedUrl||null;const photoRows=photos.map((p:any)=>({...p,url:mediaUrl(p.storage_path)}));const enrichedDefects=defects.map((d:any)=>({...d,photos:photoRows.filter((p:any)=>p.defect_id===d.id)}));const docs=await db.from("documents").select("document_type").eq("case_id",a.case_id);const types=(docs.data||[]).map((x:any)=>String(x.document_type||""));const vehicle_documents={green_card:types.includes("green_card"),factory_invoice:types.includes("factory_invoice"),car_document:types.includes("car_document_front")&&types.includes("car_document_back")};out.push({...a,case:cr.data||null,vehicle:vr.data||null,vehicle_documents,inspection:ir.data||null,defects:enrichedDefects,photos:photoRows,bids:(br.data||[]).map((x:any)=>({amount:x.amount,created_at:x.created_at}))});}return json({auctions:out,min_increment:minIncrement});}
async function buyerDashboard(req:Request,u:URL){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 const mr=await db.from("auction_members").select("id,mobile,full_name,identity_document_path,identity_uploaded_at,identity_verified,identity_review_note,subscription_status,paid_until").eq("id",sess.member_id).single();if(mr.error)return json({error:"خریدار پیدا نشد"},404);
 const [ar,fr,pr,nr,br,wr]=await Promise.all([
  db.from("auctions").select("id,case_id,vehicle_id,status,starts_at,ends_at,current_bid,starting_price,target_price,fair_price,prepayment_amount,purchase_stage,seller_account_name,seller_account_number,cancellation_fine_amount,winner_id,created_at").eq("winner_id",sess.member_id).order("created_at",{ascending:false}),
  db.from("fines").select("id,auction_id,amount,reason,status,created_at").eq("buyer_id",sess.member_id).order("created_at",{ascending:false}),
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
async function buyerMarkNotificationRead(req:Request,u:URL){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 const b=await req.json(),notificationId=String(b.notification_id||"");
 if(!notificationId)return json({error:"شناسه اعلان الزامی است"},400);
 const r=await db.from("buyer_notifications").update({read_at:new Date().toISOString()}).eq("id",notificationId).eq("buyer_id",sess.member_id).select("id").maybeSingle();
 return r.error?json({error:r.error.message},500):json({ok:true,updated:!!r.data});
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
 if(!ar.data.seller_account_name||!ar.data.seller_account_number)return json({error:"اطلاعات حساب مقصد هنوز توسط مدیریت ثبت نشده است"},400);
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
async function buyerCancelPurchase(req:Request,u:URL,id:string){
 const sess=await auctionToken(req,u);if(!sess)return json({error:"auction_login_required"},401);
 const ar=await db.from("auctions").select("id,case_id,winner_id,status,purchase_stage,cancellation_fine_amount").eq("id",id).maybeSingle();
 if(ar.error)return json({error:"خطا در دریافت مزایده: "+ar.error.message},500);
 if(!ar.data||ar.data.winner_id!==sess.member_id||ar.data.status!=="ended")return json({error:"این خودرو قابل انصراف از طرف حساب شما نیست"},403);
 if(ar.data.purchase_stage==="cancelled")return json({error:"انصراف این مزایده قبلاً ثبت شده است"},409);
 if(!["awaiting_seller_approval","awaiting_admin_prepayment","prepayment"].includes(ar.data.purchase_stage||""))return json({error:"مهلت انصراف پایان یافته است؛ پس از پرداخت پیش‌پرداخت امکان انصراف وجود ندارد."},409);
 const amount=Number(ar.data.cancellation_fine_amount||0);if(amount<=0)return json({error:"مبلغ جریمه انصراف هنوز توسط مدیریت تعیین نشده است."},400);
 const exists=await db.from("fines").select("id").eq("buyer_id",sess.member_id).eq("auction_id",id).maybeSingle();
 if(exists.error)return json({error:"خطا در بررسی جریمه: "+exists.error.message},500);
 if(exists.data)return json({error:"برای این انصراف قبلاً جریمه ثبت شده است"},409);
 const fine=await db.from("fines").insert({buyer_id:sess.member_id,auction_id:id,amount,reason:"انصراف پس از برنده‌شدن در مزایده",status:"unpaid"}).select("id,amount,status").single();
 if(fine.error)return json({error:"ثبت جریمه انصراف ناموفق بود: "+fine.error.message},500);
 const upd=await db.from("auctions").update({purchase_stage:"cancelled"}).eq("id",id).eq("winner_id",sess.member_id).eq("status","ended").in("purchase_stage",["awaiting_seller_approval","awaiting_admin_prepayment","prepayment"]).select("id").maybeSingle();
 if(upd.error||!upd.data)return json({error:"جریمه ثبت شد اما تغییر وضعیت مزایده ناموفق بود؛ لطفاً با مدیریت تماس بگیرید."},500);
 if(ar.data.case_id){
  const mr=await db.from("auction_members").select("full_name,mobile").eq("id",sess.member_id).maybeSingle();
  const who=mr.data?.full_name||"خریدار";
  await historyAdd(ar.data.case_id,"customer","customer","⚠️ انصراف خریدار از خرید پس از برنده‌شدن در مزایده؛ نام: "+who+"؛ موبایل: "+(mr.data?.mobile||"ثبت نشده")+"؛ زمان: "+new Date().toLocaleString("fa-IR")+"؛ مبلغ جریمه: "+amount.toLocaleString("fa-IR")+" تومان");
 }
 await db.from("buyer_notifications").insert({buyer_id:sess.member_id,auction_id:id,title:"انصراف از خرید",message:"انصراف ثبت شد و جریمه در بخش جریمه‌های من نمایش داده می‌شود."});
 return json({ok:true,fine:fine.data});
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
  const up=await db.from("auctions").update({purchase_stage:"awaiting_admin_prepayment"}).eq("id",auctionId).eq("purchase_stage","awaiting_seller_approval").select("id").maybeSingle();
  if(up.error)return json({error:up.error.message},500);
  if(!up.data)return json({error:"وضعیت مزایده هم‌زمان تغییر کرده است؛ فهرست را تازه کنید"},409);
  const note=await db.from("buyer_notifications").insert({buyer_id:ar.data.winner_id,auction_id:auctionId,title:"فروشنده با قیمت موافقت کرد",message:"فروشنده با قیمت پیشنهادی شما موافقت کرده است. مدیریت در حال ثبت مبلغ پیش‌پرداخت و اطلاعات حساب مقصد است. پس از ثبت اطلاعات، مرحله پرداخت پیش‌پرداخت در پنل شما فعال می‌شود."});
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
 if(r.data.purchase_stage==="awaiting_admin_prepayment"&&r.data.winner_id&&pre!==null&&pre>0&&accountName&&accountNumber){
  const stage=await db.from("auctions").update({purchase_stage:"prepayment"}).eq("id",auctionId).eq("purchase_stage","awaiting_admin_prepayment");
  if(stage.error)return json({error:stage.error.message},500);
  await db.from("buyer_notifications").insert({buyer_id:r.data.winner_id,auction_id:auctionId,title:"درخواست پرداخت پیش‌پرداخت آماده است",message:"مدیریت اطلاعات حساب و مبلغ پیش‌پرداخت را ثبت کرد. وارد پنل مزایده شوید تا مبلغ و اطلاعات حساب را ببینید و فیش واریز را بارگذاری کنید."});
  await historyAdd(r.data.case_id,"customer","prepayment","اطلاعات حساب و مبلغ پیش‌پرداخت ثبت شد؛ درخواست پرداخت برای خریدار فعال شد.");
 }
 return json({ok:true,auction:r.data});
}
async function adminSetCancellationFine(req:Request){
 const b=await req.json(),auctionId=String(b.auction_id||"").trim();
 if(!auctionId)return json({error:"شناسه مزایده الزامی است"},400);
 const raw=b.cancellation_fine_amount;
 const amount=raw===null||raw===""?null:Number(raw);
 if(amount!==null&&(!Number.isFinite(amount)||amount<0))return json({error:"مبلغ جریمه باید عدد معتبر و صفر یا بیشتر باشد"},400);
 const ar=await db.from("auctions").select("id,case_id,purchase_stage,cancellation_fine_amount").eq("id",auctionId).maybeSingle();
 if(ar.error)return json({error:ar.error.message},500);
 if(!ar.data)return json({error:"مزایده پیدا نشد"},404);
 const up=await db.from("auctions").update({cancellation_fine_amount:amount}).eq("id",auctionId).select("id,case_id,purchase_stage,cancellation_fine_amount").single();
 if(up.error)return json({error:up.error.message},500);
 await historyAdd(ar.data.case_id,ar.data.purchase_stage||"customer",ar.data.purchase_stage||"customer",amount===null?"مبلغ جریمه انصراف پاک شد":"مبلغ جریمه انصراف جداگانه توسط مدیریت تنظیم شد: "+amount);
 return json({ok:true,auction:up.data});
}
async function adminReviewBuyerPayment(req:Request){
 const b=await req.json(),paymentId=String(b.payment_id||""),status=String(b.status||""),note=String(b.note||"").slice(0,500);if(!paymentId||!["approved","rejected"].includes(status))return json({error:"درخواست بررسی پرداخت نامعتبر است"},400);
 const p=await db.from("buyer_payment_submissions").select("*").eq("id",paymentId).single();if(p.error)return json({error:p.error.message},404);
 const up=await db.from("buyer_payment_submissions").update({status,review_note:note,reviewed_at:new Date().toISOString()}).eq("id",paymentId);if(up.error)return json({error:up.error.message},500);
 if(status==="approved"){
  const stage=p.data.stage==="prepayment"?"seller_settlement":"vehicle-filed";
  const ar=await db.from("auctions").select("case_id").eq("id",p.data.auction_id).eq("winner_id",p.data.buyer_id).maybeSingle();
  const au=await db.from("auctions").update({purchase_stage:stage}).eq("id",p.data.auction_id).eq("winner_id",p.data.buyer_id);
  if(au.error)return json({error:au.error.message},500);
  if(ar.data?.case_id)await historyAdd(ar.data.case_id,p.data.stage,stage,p.data.stage==="prepayment"?"فیش پیش‌پرداخت توسط مدیر تأیید شد":"فیش تسویه کامل توسط مدیر تأیید شد");
  await db.from("buyer_notifications").insert({buyer_id:p.data.buyer_id,auction_id:p.data.auction_id,title:p.data.stage==="prepayment"?"پیش‌پرداخت تأیید شد":"تسویه تأیید شد",message:p.data.stage==="prepayment"?"پیش‌پرداخت تأیید شد. حالا وارد مرحله تسویه کامل شوید.":"تسویه کامل تأیید شد؛ خودرو در بخش «خودروهای من» ثبت شد."});
 }else await db.from("buyer_notifications").insert({buyer_id:p.data.buyer_id,auction_id:p.data.auction_id,title:"نیاز به اصلاح فیش",message:"فیش پرداخت تأیید نشد. لطفاً فیش را اصلاح کنید. "+note});
 return json({ok:true});
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
 return json({ok:true,bid:r.data,current_bid:Number(r.data.current_bid)});
}
async function inspect(req:Request,id:string){
 const b=await req.json();
 if(!b.vin||!b.engine_number||!b.plate_number||!b.national_id_data_url)return json({error:"VIN، شماره موتور، پلاک و عکس کارت ملی مالک الزامی است"},400);
 const {data:v,error:ve}=await db.from("vehicles").select("id").eq("case_id",id).eq("vehicle_role","current").limit(1).maybeSingle();
 if(ve)return json({error:ve.message},500);
 if(v){const vu=await db.from("vehicles").update({vin:b.vin,engine_number:b.engine_number,plate_number:b.plate_number,mileage:Number(String(b.mileage||"").replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[^0-9]/g,""))||null,spare_key:!!b.spare_key,fuel_card:!!b.fuel_card,power_of_attorney:!!b.power_of_attorney,green_card:!!b.green_card,factory_invoice:!!b.factory_invoice,car_document:!!b.car_document}).eq("id",v.id);if(vu.error)return json({error:vu.error.message},500);}
 const {data:i,error:ie}=await db.from("inspections").insert({case_id:id,status:"completed",finished_at:new Date().toISOString(),summary:b.summary||"کارشناسی ثبت شد"}).select("id").single();if(ie)return json({error:ie.message},500);
 const decode=async(dataUrl:string,path:string)=>{const raw=dataUrl.split(","),mime=(raw[0].match(/data:(.*?);base64/)||[])[1]||"image/jpeg",bytes=Uint8Array.from(atob(raw[1]),c=>c.charCodeAt(0));const up=await db.storage.from("s2s-documents").upload(path,bytes,{contentType:mime,upsert:false});if(up.error)throw new Error(up.error.message);return path};
 try{
  const nationalPath=await decode(b.national_id_data_url,`${id}/national-id-${crypto.randomUUID()}.jpg`);
  const nd=await db.from("documents").insert({case_id:id,vehicle_id:v?.id||null,document_type:"owner_national_id",storage_path:nationalPath,required:true});if(nd.error)throw new Error(nd.error.message);
  const jobs:any[]=[];
  if(Array.isArray(b.documents))jobs.push(...b.documents.filter((d:any)=>d?.data_url).map(async(d:any)=>{const path=await decode(d.data_url,`${id}/documents/${crypto.randomUUID()}.jpg`);const r=await db.from("documents").insert({case_id:id,vehicle_id:v?.id||null,document_type:d.type||"other",storage_path:path,required:false});if(r.error)throw new Error(r.error.message)}));
  if(Array.isArray(b.main_photos))jobs.push(...b.main_photos.filter((m:any)=>m?.data_url).map(async(m:any)=>{const path=await decode(m.data_url,`${id}/inspection/main-${crypto.randomUUID()}.jpg`);const r=await db.from("inspection_photos").insert({inspection_id:i.id,photo_type:"main",label:m.label||"عکس اصلی خودرو",storage_path:path,annotation:m.annotation||null});if(r.error)throw new Error(r.error.message)}));
  if(Array.isArray(b.defects))jobs.push(...b.defects.filter((d:any)=>d?.part&&d?.defect_type).map(async(d:any)=>{const q=await db.from("inspection_defects").insert({inspection_id:i.id,area:d.area||"بدنه",part:d.part,defect_type:d.defect_type,explanation:d.explanation||""}).select("id").single();if(q.error)throw new Error(q.error.message);await Promise.all((d.photos||[]).filter((p:any)=>p?.data_url).map(async(p0:any)=>{const path=await decode(p0.data_url,`${id}/inspection/defect-${crypto.randomUUID()}.jpg`);const r=await db.from("inspection_photos").insert({inspection_id:i.id,defect_id:q.data.id,photo_type:"defect",label:d.part+" • "+d.defect_type,storage_path:path,annotation:p0.annotation||null});if(r.error)throw new Error(r.error.message)}))}));
  await Promise.all(jobs);
 }catch(e){return json({error:"ذخیره عکس‌ها یا مدارک ناموفق بود: "+String((e as any)?.message||e)},500)}
 await db.from("cases").update({status:"review"}).eq("id",id);return json({ok:true});
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
}async function historyAdd(id:string,from:string,to:string,note:string){await db.from("case_history").insert({case_id:id,from_status:from,to_status:to,note});} async function setStatus(id:string,next:string,note:string){const {data,error}=await db.from("cases").select("status").eq("id",id).single();if(error)return json({error:error.message},500);const r=await db.from("cases").update({status:next}).eq("id",id);if(r.error)return json({error:r.error.message},500);await historyAdd(id,data?.status||"new",next,note);return json({ok:true,status:next})} async function caseComments(req:Request,id:string,role:string){
 if(!id)return json({error:"پرونده مشخص نیست"},400);
 const cr=await db.from("cases").select("id,status").eq("id",id).maybeSingle();
 if(cr.error)return json({error:cr.error.message},500);
 if(!cr.data)return json({error:"پرونده پیدا نشد"},404);
 if(role==="expert"&&!["refer","inspection"].includes(cr.data.status))return json({error:"این پرونده در حال حاضر در دسترس کارشناس نیست"},403);
 if(req.method==="GET"){
  const r=await db.from("case_comments").select("id,case_id,author_role,message,created_at").eq("case_id",id).order("created_at",{ascending:true});
  return r.error?json({error:r.error.message},500):json({comments:r.data||[]});
 }
 if(req.method==="POST"){
  const b=await req.json(),message=String(b.message||"").trim();
  if(!message)return json({error:"متن پیام را بنویسید"},400);
  if(message.length>3000)return json({error:"پیام نباید بیشتر از ۳۰۰۰ نویسه باشد"},400);
  const r=await db.from("case_comments").insert({case_id:id,author_role:role,message}).select("id,case_id,author_role,message,created_at").single();
  return r.error?json({error:r.error.message},500):json({ok:true,comment:r.data});
 }
 return json({error:"method_not_allowed"},405);
}
async function expireAuctions(){const now=new Date().toISOString();const {data,error}=await db.from("auctions").select("id,case_id,current_bid").eq("status","active").lte("ends_at",now).limit(100);if(error||!data?.length)return;for(const a of data){const br=await db.from("bids").select("buyer_id,amount").eq("auction_id",a.id).order("amount",{ascending:false}).limit(1).maybeSingle();const winner=br.data?.buyer_id||null;const finalBid=Number(br.data?.amount||a.current_bid||0);const up=await db.from("auctions").update({status:"ended",winner_id:winner,current_bid:finalBid,purchase_stage:winner?"awaiting_seller_approval":"auction-end"}).eq("id",a.id).eq("status","active").select("id").maybeSingle();if(up.data){await db.from("cases").update({status:"auction-end"}).eq("id",a.case_id).eq("status","auction");await historyAdd(a.case_id,"auction","auction-end",winner?"پایان خودکار مزایده پس از ۶۰ دقیقه؛ برنده مشخص شد":"پایان خودکار مزایده پس از ۶۰ دقیقه؛ بدون برنده");if(winner)await db.from("buyer_notifications").insert({buyer_id:winner,auction_id:a.id,title:"🎉 برنده مزایده شدی؛ منتظر نظر فروشنده باش",message:"تبریک! بالاترین پیشنهاد را ثبت کردی و برنده مزایده شدی. فروشنده باید قیمت پیشنهادی را تأیید کند؛ به‌محض موافقت فروشنده، مبلغ واریز پیش‌پرداخت در همین پنل برایت فعال می‌شود."});}}}

async function supportStart(req:Request){
 const b=await req.json();
 const mobile=String(b.mobile||"").replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/\s/g,"");
 if(!/^\+?[0-9]{10,15}$/.test(mobile))return json({error:"لطفاً شماره موبایل معتبر وارد کن."},400);
 const token=randToken(),tokenHash=await sha256Hex(token);
 const r=await db.from("support_conversations").insert({customer_mobile:mobile,token_hash:tokenHash,status:"open"}).select("id,customer_mobile,status,created_at").single();
 if(r.error)return json({error:"ساخت گفت‌وگو ناموفق بود."},500);
 const w=await db.from("support_messages").insert({conversation_id:r.data.id,sender:"admin",message:"سلام! به پشتیبانی سوییچ به سوییچ خوش آمدی. پیامت را بنویس؛ همکاران ما پاسخ می‌دهند."});
 if(w.error)return json({error:"گفت‌وگو ساخته شد، اما پیام خوش‌آمدگویی ارسال نشد."},500);
 return json({ok:true,conversation:r.data,token});
}
async function supportCustomerAuth(id:string,token:string){
 if(!id||!token)return null;
 const hash=await sha256Hex(token);
 const r=await db.from("support_conversations").select("id,customer_mobile,status").eq("id",id).eq("token_hash",hash).maybeSingle();
 return r.data||null;
}
async function supportPoll(u:URL){
 const id=u.searchParams.get("id")||"",token=u.searchParams.get("token")||"";
 const conv=await supportCustomerAuth(id,token);
 if(!conv)return json({error:"نشست چت معتبر نیست."},401);
 const r=await db.from("support_messages").select("id,sender,message,created_at").eq("conversation_id",id).order("created_at",{ascending:true}).limit(300);
 return r.error?json({error:"دریافت پیام‌ها ناموفق بود."},500):json({conversation:conv,messages:r.data||[]});
}
async function supportSend(req:Request){
 const b=await req.json(),id=String(b.conversation_id||""),token=String(b.token||""),message=String(b.message||"").trim();
 if(!message||message.length>3000)return json({error:"پیام باید بین ۱ تا ۳۰۰۰ نویسه باشد."},400);
 const conv=await supportCustomerAuth(id,token);
 if(!conv)return json({error:"نشست چت معتبر نیست."},401);
 if(conv.status==="closed")return json({error:"این گفت‌وگو بسته شده است."},409);
 const r=await db.from("support_messages").insert({conversation_id:id,sender:"customer",message}).select("id,sender,message,created_at").single();
 if(r.error)return json({error:"ارسال پیام ناموفق بود."},500);
 await db.from("support_conversations").update({updated_at:new Date().toISOString()}).eq("id",id);
 return json({ok:true,message:r.data});
}
async function supportAdminList(){
 const r=await db.from("support_conversations").select("id,customer_mobile,status,created_at,updated_at").order("updated_at",{ascending:false}).limit(100);
 if(r.error)return json({error:r.error.message},500);
 const ids=(r.data||[]).map((x:any)=>x.id);
 const mr=ids.length?await db.from("support_messages").select("id,conversation_id,sender,message,created_at").in("conversation_id",ids).order("created_at",{ascending:true}):{data:[],error:null};
 if(mr.error)return json({error:mr.error.message},500);
 return json({conversations:(r.data||[]).map((x:any)=>{const messages=(mr.data||[]).filter((m:any)=>m.conversation_id===x.id);const last_message=messages[messages.length-1]||null;return {...x,messages,last_message,last_message_at:last_message?.created_at||x.updated_at,status:x.status==="closed"?"closed":last_message?.sender==="admin"?"answered":"open"}})});
}
async function supportAdminReply(req:Request,u:URL){
 const b=await req.json(),id=String(b.conversation_id||u.searchParams.get("id")||""),message=String(b.message||"").trim();
 if(!id||!message||message.length>3000)return json({error:"گفت‌وگو و متن پیام الزامی است."},400);
 const conv=await db.from("support_conversations").select("id,status").eq("id",id).maybeSingle();
 if(conv.error||!conv.data)return json({error:"گفت‌وگو پیدا نشد."},404);
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
 if(a==="support-start"&&req.method==="POST")return supportStart(req);
 if(a==="support-poll"&&req.method==="GET")return supportPoll(u);
 if(a==="support-send"&&req.method==="POST")return supportSend(req);

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
 if(a==="staff-login"&&req.method==="POST"){
  try{
   const b=await req.json(),want=String(b.role||""),code=String(b.personnel_code||"").trim(),password=String(b.password||"");
   if(!["admin","expert"].includes(want)||code.length!==4||Array.from(code).some(ch=>ch<"0"||ch>"9")||!password)return json({error:"کد پرسنلی و رمز عبور را بررسی کنید."},400);
   const cr=await db.from("staff_credentials").select("password_hash").eq("role",want).maybeSingle();
   if(cr.error||!cr.data)return json({error:"ورود ناموفق بود. رمز یا کد پرسنلی صحیح نیست."},401);
   const ph=await hex(password);
   if(ph!==cr.data.password_hash)return json({error:"ورود ناموفق بود. رمز یا کد پرسنلی صحیح نیست."},401);
   const ch=await hex(code);
   const mr=await db.from("staff_members").select("id,full_name,role,active").eq("personnel_code_hash",ch).eq("role",want).maybeSingle();
   if(mr.error||!mr.data||!mr.data.active)return json({error:"کد پرسنلی نامعتبر یا غیرفعال است."},401);
   const token=crypto.randomUUID()+crypto.randomUUID();
   const th=await hex(token);
   const ins=await db.from("staff_sessions").insert({token_hash:th,role:want,staff_member_id:mr.data.id,expires_at:new Date(Date.now()+12*60*60*1000).toISOString()});
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
 if(a==="personnel-list"&&role==="admin"&&req.method==="GET"){
  const {data,error}=await db.from("staff_members").select("id,full_name,role,active,personnel_code_display").order("created_at",{ascending:true});
  if(error)return json({error:error.message},500);
  return json({staff:data||[]});
 }

 if(a==="support-admin-list"&&role==="admin"&&req.method==="GET")return supportAdminList();
 if(a==="support-admin-messages"&&role==="admin"&&req.method==="GET"){const q=await db.from("support_messages").select("id,sender,message,created_at").eq("conversation_id",id).order("created_at",{ascending:true}).limit(300);return q.error?json({error:q.error.message},500):json({messages:q.data||[]})}

 if(a==="support-admin-reply"&&role==="admin"&&req.method==="POST")return supportAdminReply(req,u);
 if(a==="support-admin-close"&&role==="admin"&&req.method==="POST")return supportAdminClose(req);
 await expireAuctions();
 await expireAuctions();
 if(a==="auction-bid-state"&&req.method==="GET")return auctionBidState(req,u);if(a==="public-ready-auctions"&&req.method==="GET"){const {data,error}=await db.from("cases").select("id,case_number,status,created_at").in("status",["review","auction-ready"]).order("created_at",{ascending:false});if(error)return json({error:error.message},500);const ids=(data||[]).map((c:any)=>c.id);const vr=ids.length?await db.from("vehicles").select("case_id,brand,model,trim,model_year,mileage").in("case_id",ids).eq("vehicle_role","current"):{data:[],error:null};if(vr.error)return json({error:vr.error.message},500);return json({cases:(data||[]).map((c:any)=>({...c,vehicle:(vr.data||[]).find((v:any)=>v.case_id===c.id)||null}))})}if(a==="auction-request-code"&&req.method==="POST")return requestAuctionOtp(req);if(a==="auction-verify-code"&&req.method==="POST")return verifyAuctionOtp(req);if(a==="auction-start-subscription"&&req.method==="POST")return startAuctionSubscription(req);if(a==="auction-payment-callback"&&req.method==="POST")return paymentCallback(req);if(a==="public-auctions"&&req.method==="GET")return publicAuctions(req,u);if(a==="buyer-dashboard"&&req.method==="GET")return buyerDashboard(req,u);if(a==="buyer-mark-notification-read"&&req.method==="POST")return buyerMarkNotificationRead(req,u);if(a==="buyer-upload-identity"&&req.method==="POST")return buyerUploadIdentity(req,u);if(a==="buyer-submit-payment"&&req.method==="POST")return buyerSubmitPayment(req,u,id);if(a==="buyer-pay-prepayment-wallet"&&req.method==="POST")return buyerPayPrepaymentWallet(req,u,id);if(a==="buyer-cancel-purchase"&&req.method==="POST")return buyerCancelPurchase(req,u,id);
 if(a==="place-bid"&&req.method==="POST")return placeBid(req,id);
 if(a==="market_prices")return marketPrices(u); if(a==="estimate"&&req.method==="POST")return estimate(req);
 if(a==="auction-login-codes"&&role==="admin"&&req.method==="GET")return auctionLoginCodes(u);
if(a==="admin-update-vehicle"&&role==="admin"&&req.method==="POST")return adminUpdateVehicle(req);if(a==="admin-review-identity"&&role==="admin"&&req.method==="POST")return adminReviewIdentity(req);if(a==="admin-approve-seller"&&role==="admin"&&req.method==="POST")return adminApproveSeller(req);if(a==="admin-set-auction-settlement"&&role==="admin"&&req.method==="POST")return adminSetAuctionSettlement(req);if(a==="admin-set-cancellation-fine"&&role==="admin"&&req.method==="POST")return adminSetCancellationFine(req);if(a==="admin-review-buyer-payment"&&role==="admin"&&req.method==="POST")return adminReviewBuyerPayment(req);if(a==="admin-buyer-payments"&&role==="admin"&&req.method==="GET")return adminBuyerPayments(u);if(a==="wallet-topup-request"&&req.method==="POST")return buyerSubmitWalletTopup(req,u);if(a==="wallet-topup-requests"&&req.method==="GET")return buyerWalletTopupRequests(req,u);if(a==="admin-wallet-topup-requests"&&role==="admin"&&req.method==="GET")return adminWalletTopupRequests(u);if(a==="admin-review-wallet-topup"&&role==="admin"&&req.method==="POST")return adminReviewWalletTopup(req);if(a==="wallet-bank-settings"&&req.method==="GET")return getWalletBankSettings();if(a==="wallet-bank-settings"&&role==="admin"&&req.method==="POST")return saveWalletBankSettings(req);if(a==="admin-topup-wallet"&&role==="admin"&&req.method==="POST")return adminTopupWallet(req);if(a==="auction-members"&&role==="admin"&&req.method==="GET")return auctionMembers();if(a==="delete-auction-member"&&role==="admin"&&req.method==="POST")return deleteAuctionMember(req);if(a==="activate-auction-member"&&role==="admin"&&req.method==="POST")return activateAuctionMember(u,req);if(a==="deactivate-auction-member"&&role==="admin"&&req.method==="POST")return deactivateAuctionMember(req);if(a==="update-auction-member"&&role==="admin"&&req.method==="POST")return updateAuctionMember(req);if(!role)return json({error:"unauthorized"},401);
 if(a==="list")return listCases(role,staffMemberId);
 if(a==="assign-case-expert"&&role==="admin"&&req.method==="POST"){
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
  const up=await db.from("cases").update({assigned_expert_staff_id:sr.data.id,assigned_expert_name:sr.data.full_name,status:"refer",updated_at:new Date().toISOString()}).eq("id",id);
  if(up.error)return json({error:up.error.message},500);
  await historyAdd(id,cr.data.status||"new","refer","ارجاع پرونده به کارشناس: "+sr.data.full_name);
  return json({ok:true,expert:{id:sr.data.id,full_name:sr.data.full_name},status:"refer"});
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
 if(a==="case-comments"&&req.method==="GET")return caseComments(req,id,role);
 if(a==="case-comment"&&req.method==="POST")return caseComments(req,id,role);
 if(a==="draft"&&role==="expert"&&req.method==="GET")return getDraft(id);
 if(a==="draft"&&role==="expert"&&req.method==="POST")return saveDraft(req,id);
 if(a==="auction-bid-settings"&&role==="admin"&&req.method==="GET"){const r=await db.from("auction_settings").select("min_increment,updated_at").eq("id",true).maybeSingle();return r.error?json({error:r.error.message},500):json({min_increment:Number(r.data?.min_increment||5000000)})}if(a==="auction-bid-settings"&&role==="admin"&&req.method==="POST"){const b=await req.json(),v=Number(b.min_increment);if(!Number.isSafeInteger(v)||v<1)return json({error:"حداقل افزایش باید عدد صحیح و بیشتر از صفر باشد"},400);const r=await db.from("auction_settings").upsert({id:true,min_increment:v,updated_at:new Date().toISOString()},{onConflict:"id"}).select("min_increment").single();return r.error?json({error:r.error.message},500):json({ok:true,min_increment:Number(r.data.min_increment)})}if(a==="set-auction-prices"&&role==="admin"&&req.method==="POST"){const b=await req.json(),auctionId=String(b.auction_id||"");if(!auctionId)return json({error:"شناسه مزایده مشخص نیست"},400);const parsePrice=(v:any)=>v===null||v===""?null:Number(v);const target=parsePrice(b.target_price),fair=parsePrice(b.fair_price);if((target!==null&&(!Number.isFinite(target)||target<0))||(fair!==null&&(!Number.isFinite(fair)||fair<0)))return json({error:"قیمت‌ها باید عدد مثبت باشند"},400);const r=await db.from("auctions").update({target_price:target,fair_price:fair}).eq("id",auctionId).select("id,target_price,fair_price").single();return r.error?json({error:r.error.message},500):json({ok:true,auction:r.data})}if(a==="auctions"&&role==="admin"){const {data,error}=await db.from("auctions").select("*").order("created_at",{ascending:false});if(error)return json({error:error.message},500);const ids=(data||[]).map((x:any)=>x.case_id).filter(Boolean);let cases:any[]=[],vehicles:any[]=[];if(ids.length){const cr=await db.from("cases").select("*").in("id",ids);if(cr.error)return json({error:cr.error.message},500);cases=cr.data||[];const vr=await db.from("vehicles").select("*").in("case_id",ids);if(vr.error)return json({error:vr.error.message},500);vehicles=vr.data||[]}const aids=(data||[]).map((x:any)=>x.id);let bids:any[]=[];if(aids.length){const br=await db.from("bids").select("*").in("auction_id",aids).order("amount",{ascending:false});if(br.error)return json({error:br.error.message},500);bids=br.data||[]}return json({auctions:(data||[]).map((a:any)=>({...a,case:cases.find((c:any)=>c.id===a.case_id)||null,vehicle:vehicles.find((v:any)=>v.id===a.vehicle_id)||vehicles.find((v:any)=>v.case_id===a.case_id&&v.vehicle_role==="current")||null,bids:bids.filter((b:any)=>b.auction_id===a.id)}))})}
if(a==="eligible-auctions"&&role==="admin"){const {data,error}=await db.from("cases").select("*").eq("status","review").order("created_at",{ascending:false});return error?json({error:error.message},500):json({cases:data||[]})}
if(a==="create_auction"&&role==="admin"){const b=await req.json();const targetPrice=Number(b.target_price),fairPrice=Number(b.fair_price);if(!id||!b.starting_price||Number(b.starting_price)<=0)return json({error:"پرونده و قیمت شروع الزامی است"},400);if(!Number.isFinite(targetPrice)||targetPrice<=0||!Number.isFinite(fairPrice)||fairPrice<=0)return json({error:"قیمت هدف و قیمت منصفانه باید قبل از شروع مزایده ثبت شوند"},400);const cr=await db.from("cases").select("id,status").eq("id",id).single();if(cr.error)return json({error:"پرونده پیدا نشد"},404);if(!["review","auction-ready"].includes(cr.data.status))return json({error:"ابتدا پایان کارشناسی را تأیید و پرونده را به مرحله انتقال به مزایده ببرید"},400);const ex=await db.from("auctions").select("id,status").eq("case_id",id).eq("status","active").maybeSingle();if(ex.data)return json({error:"برای این پرونده یک مزایده فعال از قبل وجود دارد"},409);const vr=await db.from("vehicles").select("id").eq("case_id",id).eq("vehicle_role","current").limit(1).maybeSingle();const durationMinutes=Number(b.duration_minutes??60);if(!Number.isInteger(durationMinutes)||durationMinutes<60||durationMinutes>5256000)return json({error:"مدت مزایده باید حداقل ۶۰ دقیقه باشد و حداکثر تا ۱۰ سال قابل تنظیم است"},400);const starts=new Date();const ends=new Date(starts.getTime()+durationMinutes*60000);const ar=await db.from("auctions").insert({case_id:id,vehicle_id:vr.data?.id||null,status:"active",starts_at:starts.toISOString(),ends_at:ends.toISOString(),starting_price:Number(b.starting_price),current_bid:Number(b.starting_price),target_price:targetPrice,fair_price:fairPrice}).select("*").single();if(ar.error)return json({error:ar.error.message},500);await db.from("cases").update({status:"auction"}).eq("id",id);await historyAdd(id,cr.data.status,"auction","مزایده با مدت تنظیم‌شده توسط مدیر شروع شد: "+durationMinutes+" دقیقه؛ قیمت هدف: "+targetPrice+"؛ قیمت منصفانه: "+fairPrice);return json({ok:true,auction:ar.data})}
if(a==="update_auction_time"&&role==="admin"){const b=await req.json();const minutes=Number(b.minutes);if(!id||!Number.isInteger(minutes)||minutes<60||minutes>5256000)return json({error:"مدت جدید باید حداقل ۶۰ دقیقه و حداکثر ۱۰ سال باشد"},400);const ar=await db.from("auctions").select("id,case_id,status").eq("id",id).maybeSingle();if(ar.error)return json({error:ar.error.message},500);if(!ar.data)return json({error:"مزایده پیدا نشد"},404);if(ar.data.status!=="active")return json({error:"فقط مزایده فعال قابل تنظیم زمان است"},400);const endsAt=new Date(Date.now()+minutes*60000).toISOString();const up=await db.from("auctions").update({ends_at:endsAt}).eq("id",id).eq("status","active").select("id,ends_at").single();if(up.error)return json({error:up.error.message},500);await historyAdd(ar.data.case_id,"auction","auction","مدت مزایده توسط مدیر تنظیم شد: "+minutes+" دقیقه");return json({ok:true,ends_at:up.data.ends_at})}if(a==="end_auction"&&role==="admin"){
 const ar=await db.from("auctions").select("*").eq("id",id).maybeSingle();
 if(ar.error)return json({error:"خطا در دریافت مزایده: "+ar.error.message},500);
 if(!ar.data)return json({error:"مزایده پیدا نشد"},404);
 if(ar.data.status==="ended")return json({ok:true,already_ended:true,winner_id:ar.data.winner_id,current_bid:ar.data.current_bid});
 if(ar.data.status!=="active")return json({error:"این مزایده فعال نیست و وضعیت فعلی آن "+String(ar.data.status)},400);
 const br=await db.from("bids").select("*").eq("auction_id",id).order("amount",{ascending:false}).limit(1).maybeSingle();
 if(br.error)return json({error:"خطا در دریافت پیشنهادها: "+br.error.message},500);
 const winner=br.data?.buyer_id||null;
 const upd=await db.from("auctions").update({status:"ended",winner_id:winner,current_bid:br.data?.amount||ar.data.current_bid,purchase_stage:winner?"awaiting_seller_approval":"auction-end"}).eq("id",id).eq("status","active").select("id").maybeSingle();
 if(upd.error)return json({error:"خطا در ثبت پایان مزایده: "+upd.error.message},500);
 if(!upd.data){
  const latest=await db.from("auctions").select("status,winner_id,current_bid").eq("id",id).maybeSingle();
  if(latest.data?.status==="ended")return json({ok:true,already_ended:true,winner_id:latest.data.winner_id,current_bid:latest.data.current_bid});
  return json({error:"مزایده هم‌زمان تغییر کرده؛ صفحه را تازه‌سازی کن و دوباره بررسی کن."},409);
 }
 const caseUpdate=await db.from("cases").update({status:"auction-end"}).eq("id",ar.data.case_id);
 if(caseUpdate.error)return json({error:"مزایده بسته شد اما تغییر وضعیت پرونده ناموفق بود: "+caseUpdate.error.message},500);
 await historyAdd(ar.data.case_id,"auction","auction-end",winner?"مزایده پایان یافت و برنده مشخص شد":"مزایده پایان یافت بدون برنده");
 if(winner)await db.from("buyer_notifications").insert({buyer_id:winner,auction_id:id,title:"🎉 برنده مزایده شدی؛ منتظر نظر فروشنده باش",message:"تبریک! بالاترین پیشنهاد را ثبت کردی و برنده مزایده شدی. فروشنده باید قیمت پیشنهادی را تأیید کند؛ به‌محض موافقت فروشنده، مبلغ واریز پیش‌پرداخت در همین پنل برایت فعال می‌شود."});
 return json({ok:true,winner_id:winner,current_bid:br.data?.amount||ar.data.current_bid});
}
if(a==="confirm-call"&&role==="admin")return setStatus(id,"refer","تأیید تلفنی مشتری");if(a==="customer-decision"&&role==="admin"){const b=await req.json();if(!["accept","decline"].includes(b.decision))return json({error:"decision_invalid"},400);const next=b.decision==="accept"?"docs":"disagreement";const r=await db.from("cases").update({status:next,agreed_price:b.decision==="accept"?(Number(b.agreed_price||0)||null):null,customer_decision_at:new Date().toISOString(),customer_decision_note:b.note||null}).eq("id",id);if(r.error)return json({error:r.error.message},500);await historyAdd(id,"customer",next,b.decision==="accept"?"مشتری قیمت را پذیرفت":"عدم توافق با قیمت");return json({ok:true,status:next})}if(a==="prepayment"&&role==="admin"){const b=await req.json(),amount=Number(b.amount||0);if(amount<=0)return json({error:"مبلغ پیش‌پرداخت نامعتبر است"},400);const r=await db.from("cases").update({status:"contract",prepayment_amount:amount,prepayment_status:"received",prepayment_received_at:new Date().toISOString()}).eq("id",id);if(r.error)return json({error:r.error.message},500);await historyAdd(id,"deposit","contract","پیش‌پرداخت دریافت شد: "+amount);return json({ok:true,status:"contract"})}if(a==="continue-selling"&&role==="admin")return setStatus(id,"selling","ادامه فعالیت برای فروش خودرو");if(a==="set-status"&&role==="admin"){const b=await req.json();if(!b.status||!statusFa[b.status])return json({error:"status_invalid"},400);if(["review","auction"].includes(b.status))return json({error:"این مرحله فقط از مسیر اختصاصی کارشناسی یا شروع مزایده قابل ثبت است"},403);if(b.status==="inspection"){const cr=await db.from("cases").select("status").eq("id",id).single();if(cr.error)return json({error:"پرونده پیدا نشد"},404);if(!["refer","inspection"].includes(cr.data.status))return json({error:"ابتدا پرونده را به کارشناس ارجاع دهید"},400)}return setStatus(id,b.status,b.note||"تغییر وضعیت توسط مدیر")}if(a==="expert-status"&&role==="expert"){const b=await req.json();if(!["inspection","review"].includes(b.status))return json({error:"status_invalid"},400);const cr=await db.from("cases").select("status").eq("id",id).single();if(cr.error)return json({error:"پرونده پیدا نشد"},404);if(b.status==="review"&&cr.data.status!=="inspection")return json({error:"فقط کارشناسِ پرونده در حال کارشناسی می‌تواند پایان کارشناسی را ثبت کند"},403);if(b.status==="inspection"&&!["refer","inspection"].includes(cr.data.status))return json({error:"پرونده هنوز به کارشناس ارجاع نشده"},400);return setStatus(id,b.status,b.note||(b.status==="inspection"?"کارشناس شروع به کارشناسی کرد":"کارشناسی پایان یافت"))}if(req.method!=="POST")return json({error:"method_not_allowed"},405);
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