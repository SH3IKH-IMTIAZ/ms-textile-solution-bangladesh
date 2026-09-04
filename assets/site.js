/* Static-export interactions: no WordPress backend is required. */
(() => {
 'use strict';
 const ready = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();
 ready(() => {
  document.querySelectorAll('.elementor-top-section').forEach(section => {
   const c = getComputedStyle(section).backgroundColor.match(/[\d.]+/g);
   if(c && c.length >= 3 && (c.length < 4 || Number(c[3]) > .5) && Math.max(...c.slice(0,3).map(Number)) < 125) section.classList.add('ts-dark');
  });
  document.querySelectorAll('a[aria-disabled="true"]').forEach(a => {
   const explain = e => {e.preventDefault(); let note = a.nextElementSibling;
    if(!note?.classList.contains('ts-unavailable')) {note=document.createElement('span'); note.className='ts-unavailable';note.setAttribute('role','status');note.textContent=a.title; a.after(note);}
   };
   a.addEventListener('click',explain);a.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')explain(e);});
  });
  // Implement existing panel controls locally: the export lacks Blocksy's dynamic chunks.
  let activePanel=null, opener=null;
  const closePanel=()=>{if(!activePanel)return;activePanel.classList.remove('ts-open');activePanel.setAttribute('aria-hidden','true');opener?.setAttribute('aria-expanded','false');document.body.style.overflow='';opener?.focus();activePanel=null;};
  document.addEventListener('click', e => {
   const trigger=e.target.closest('[data-toggle-panel]');
   if(trigger){const panel=document.querySelector(trigger.dataset.togglePanel);if(!panel)return;e.preventDefault();e.stopImmediatePropagation();if(activePanel===panel){closePanel();return;}closePanel();activePanel=panel;opener=trigger;panel.classList.add('ts-open');panel.setAttribute('aria-hidden','false');trigger.setAttribute('aria-expanded','true');document.body.style.overflow='hidden';panel.querySelector('input,button,a[href]')?.focus();}
   else if(activePanel && (e.target.closest('.ct-toggle-close') || e.target===activePanel)){e.preventDefault();e.stopImmediatePropagation();closePanel();}
  },true);
  document.addEventListener('keydown',e=>{
   if(e.key==='Escape')closePanel();
   if(e.key==='Tab'&&activePanel){const list=[...activePanel.querySelectorAll('a[href],button,input,[tabindex="0"]')].filter(el=>el.getClientRects().length);const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  });
  document.querySelectorAll('#offcanvas .child-indicator').forEach(button=>button.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();const li=button.closest('li');const open=li.classList.toggle('ts-sub-open');button.setAttribute('aria-expanded',String(open));},true));
  document.querySelectorAll('.ct-search-form').forEach(form=>{
   const input=form.querySelector('input[type=search]');if(!input)return;
   input.removeAttribute('aria-controls');input.removeAttribute('aria-activedescendant');input.setAttribute('aria-autocomplete','none');input.setAttribute('role','searchbox');
   const results=document.createElement('ul');results.className='ts-search-results';results.hidden=true;results.setAttribute('aria-live','polite');form.after(results);
   let indexPromise;let timer;let version=0;
   const search=async()=>{const current=++version;const q=input.value.trim().toLowerCase();results.replaceChildren();results.hidden=!q;if(!q)return;
    try {indexPromise ||= fetch('/assets/search-index.json').then(r=>{if(!r.ok)throw Error();return r.json();});const pages=await indexPromise;if(current!==version)return;
     const matches=pages.filter(p=>q.split(/\s+/).every(term=>(p.title+' '+p.text).toLowerCase().includes(term))).sort((a,b)=>Number(b.title.toLowerCase().includes(q))-Number(a.title.toLowerCase().includes(q)));
     if(!matches.length){const li=document.createElement('li');li.textContent='No matching pages found.';results.append(li);}
     matches.forEach(p=>{const li=document.createElement('li'),a=document.createElement('a');a.href=p.url;a.textContent=p.title;li.append(a);results.append(li);});
    }catch{indexPromise=null;results.textContent='Search could not load. Please try again.';}
   };
   input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(search,180);});form.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();search();},true);
   const q=new URLSearchParams(location.search).get('q');if(q){input.value=q;search();document.querySelector('[data-toggle-panel="#search-modal"]')?.click();}
  });
  document.querySelectorAll('.wpforms-form').forEach(form=>{
   form.removeAttribute('novalidate');const note=document.createElement('p');note.className='ts-form-note';note.setAttribute('role','status');note.textContent='This form opens your email app with your message ready to send.';form.append(note);
   form.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();if(!form.reportValidity())return;
    const value=id=>form.querySelector('[id$="field_'+id+'"]')?.value.trim()||'';
    const subject=value(3)||'Website enquiry';const body='Name: '+value(0)+'\nEmail: '+value(1)+'\n\n'+value(2);
    location.href='mailto:ae@ms-textile-solution-bangladesh.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    note.textContent='Continue in your email app to send your message, or email ae@ms-textile-solution-bangladesh.com directly.';
   },true);
  });
 });
})();
