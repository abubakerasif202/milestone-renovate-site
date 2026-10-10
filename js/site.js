(() => {
  'use strict';
  const menuButton = document.querySelector('[data-menu]');
  const nav = document.querySelector('#navigation');
  function closeMenu(){nav?.classList.remove('open');menuButton?.setAttribute('aria-expanded','false');menuButton?.setAttribute('aria-label','Open navigation');}
  menuButton?.addEventListener('click',()=>{const open=!nav?.classList.contains('open');nav?.classList.toggle('open',open);menuButton?.setAttribute('aria-expanded',String(open));menuButton?.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
  nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
  document.addEventListener('click',e=>{if(nav?.classList.contains('open')&&!e.target.closest('.nav-inner'))closeMenu();});
  const form=document.querySelector('[data-quote-form]');
  form?.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const data=new FormData(form);
    const clean=(field)=>String(data.get(field)||'').trim().replace(/[\r\n]+/g,' ');
    const lines=[
      'New Milestone Renovate enquiry', '',
      `Name: ${clean('name')}`,`Phone: ${clean('phone')}`,`Email: ${clean('email')}`,
      `Location: ${clean('suburb')}`,`Project type: ${clean('service')}`,
      `Preferred timing: ${clean('timing')||'Not specified'}`,
      `Budget: ${clean('budget')||'Not specified'}`, '',
      'Project description:',String(data.get('details')||'').trim(), '',
      'Sent from the Milestone Renovate website.'
    ];
    const subject=`Milestone Renovate enquiry — ${clean('service')}`;
    const href='mailto:admin@milestonedevelopment.com.au?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(lines.join('\n'));
    const status=form.querySelector('#form-status');
    if(status)status.textContent='Your email app should open with a prepared enquiry. Please send it there to complete your request. If it does not open, email admin@milestonedevelopment.com.au directly.';
    window.location.href=href;
  });
})();
