(function(){
'use strict';
const faDigits='۰۱۲۳۴۵۶۷۸۹';
function digits(v){return String(v==null?'':v).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));}
function grouped(v){const raw=digits(v).replace(/[^0-9]/g,'');if(!raw)return '';return Number(raw).toLocaleString('fa-IR');}
function moneyContext(el){
 const attrs=[el.id,el.name,el.placeholder,el.getAttribute('aria-label'),el.getAttribute('data-label')].filter(Boolean).join(' ');
 const label=el.closest('label')?.innerText||el.parentElement?.innerText||'';
 const context=(attrs+' '+label).toLowerCase();
 return /(amount|price|money|wallet|deposit|payment|prepayment|settlement|fine|bid|مبلغ|قیمت|پول|کیف|واریز|پرداخت|پیش.?پرداخت|تسویه|جریمه|پیشنهاد قیمت|ارزش خودرو)/i.test(context)
 && !/(mileage|odometer|kilometer|کارکرد|کیلومتر|شماره|تلفن|موبایل|کد ملی|پلاک|سال ساخت|engine|vin)/i.test(context);
}
function formatInput(el){
 if(!el||el.tagName!=='INPUT'||el.type==='number'||el.type==='file'||el.type==='checkbox'||el.type==='radio'||!moneyContext(el))return;
 const start=el.selectionStart,old=el.value,raw=digits(old).replace(/[^0-9]/g,'');
 if(!raw){if(old)el.value='';return;}
 const next=Number(raw).toLocaleString('fa-IR');
 if(next!==old){el.value=next;try{const before=digits(old.slice(0,start==null?old.length:start)).replace(/[^0-9]/g,'').length;let pos=0,count=0;while(pos<next.length&&count<before){if(/[۰-۹0-9]/.test(next[pos]))count++;pos++;}el.setSelectionRange(pos,pos);}catch(_){}}
}
function formatCurrencyText(root){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){
  const p=node.parentElement;if(!p||/^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION)$/i.test(p.tagName))continue;
  let t=node.nodeValue;
  if(/(?:تومان|ریال)/.test(t)&&/[0-9۰-۹٠-٩]/.test(t)){
   t=t.replace(/([0-9۰-۹٠-٩][0-9۰-۹٠-٩,٬،.\s]*)(\s*(?:تومان|ریال))/g,(all,n,unit)=>{const raw=digits(n).replace(/[^0-9]/g,'');return raw?Number(raw).toLocaleString('fa-IR')+unit:all;});
   if(t!==node.nodeValue)node.nodeValue=t;
  }
 }
}
function process(root){if(root.nodeType===1&&root.matches?.('input'))formatInput(root);root.querySelectorAll?.('input').forEach(formatInput);formatCurrencyText(root);}
document.addEventListener('input',e=>formatInput(e.target),true);
document.addEventListener('change',e=>formatInput(e.target),true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>process(document.body));else process(document.body);
const observer=new MutationObserver(records=>{for(const r of records){if(r.type==='childList')r.addedNodes.forEach(n=>{if(n.nodeType===1)process(n);else if(n.nodeType===3&&n.parentElement)formatCurrencyText(n.parentElement)});else if(r.type==='characterData'&&r.target.parentElement)formatCurrencyText(r.target.parentElement);}});
observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();