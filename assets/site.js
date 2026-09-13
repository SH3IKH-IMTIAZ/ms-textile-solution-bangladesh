/* Static-export interactions: no WordPress backend is required. */
(() => {
 'use strict';
 const ready = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();
 ready(() => {
  document.querySelectorAll('.elementor-top-section').forEach(section => {
   const c = getComputedStyle(section).backgroundColor.match(/[\d.]+/g);
   if (c && c.length >= 3 && (c.length < 4 || Number(c[3]) > .5) && Math.max(...c.slice(0, 3).map(Number)) < 125) section.classList.add('ts-dark');
  });
  document.querySelectorAll('[data-reveal]').forEach(el => el.removeAttribute('data-reveal'));
  document.querySelectorAll('a[aria-disabled="true"]').forEach(a => {
   const explain = e => {
    e.preventDefault();
    let note = a.nextElementSibling;
    if (!note?.classList.contains('ts-unavailable')) {
     note = document.createElement('span');
     note.className = 'ts-unavailable';
     note.setAttribute('role', 'status');
     note.textContent = a.title;
     a.after(note);
    }
   };
   a.addEventListener('click', explain);
   a.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') explain(e); });
  });

  // Panels must release inert before focus and restore the background on every close path.
  let activePanel = null, opener = null, previousOverflow = '', background = [];
  const panelTriggers = [...document.querySelectorAll('[data-toggle-panel]')];
  const isVisible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const focusable = panel => [...panel.querySelectorAll('a[href],button,input,textarea,select,[tabindex]')]
   .filter(el => el.tabIndex >= 0 && !el.disabled && !el.closest('[inert]') && isVisible(el));
  const setExpanded = (panel, open) => panelTriggers.filter(t => t.dataset.togglePanel === '#' + panel.id)
   .forEach(t => t.setAttribute('aria-expanded', String(open)));
  document.querySelectorAll('.ct-panel').forEach(panel => {
   panel.inert = true;
   panel.setAttribute('aria-hidden', 'true');
   panel.setAttribute('aria-modal', 'true');
   setExpanded(panel, false);
  });
  const closePanel = () => {
   if (!activePanel) return;
   background.forEach(([el, inert]) => { el.inert = inert; });
   background = [];
   document.body.style.overflow = previousOverflow;
   setExpanded(activePanel, false);
   const returnTo = opener && isVisible(opener) ? opener : [...document.querySelectorAll('#header a[href],#header button')].find(isVisible);
   returnTo?.focus({preventScroll: true});
   activePanel.inert = true;
   activePanel.setAttribute('aria-hidden', 'true');
   activePanel.classList.remove('ts-open');
   activePanel = null;
  };
  const openPanel = trigger => {
   const selector = trigger.dataset.togglePanel;
   const panel = selector?.startsWith('#') ? document.getElementById(selector.slice(1)) : null;
   if (!panel) return;
   if (activePanel === panel) { closePanel(); return; }
   closePanel();
   activePanel = panel;
   opener = trigger;
   previousOverflow = document.body.style.overflow;
   panel.inert = false;
   panel.classList.add('ts-open');
   panel.setAttribute('aria-hidden', 'false');
   setExpanded(panel, true);
   document.body.style.overflow = 'hidden';
   // Inert siblings at each level without disabling the panel's own ancestors.
   for (let node = panel; node !== document.body; node = node.parentElement) {
    [...node.parentElement.children].filter(el => el !== node && el instanceof HTMLElement).forEach(el => {
     background.push([el, el.inert]);
     el.inert = true;
    });
   }
   (panel.querySelector('input[type="search"]') || focusable(panel)[0])?.focus();
  };
  document.addEventListener('click', e => {
   const trigger = e.target.closest('[data-toggle-panel]');
   if (trigger) {
    e.preventDefault();
    openPanel(trigger);
   } else if (activePanel && (e.target === activePanel || e.target.closest('.ct-toggle-close') && activePanel.contains(e.target))) {
    e.preventDefault();
    closePanel();
   } else if (activePanel && activePanel.contains(e.target) && e.target.closest('a[href]:not([aria-disabled="true"])')) {
    // Keep native page/fragment navigation, including search results on the current page.
    closePanel();
   }
  });
  document.addEventListener('keydown', e => {
   if (e.key === 'Escape') closePanel();
   if (e.key === 'Tab' && activePanel) {
    const list = focusable(activePanel), first = list[0], last = list.at(-1);
    if (!list.length) { e.preventDefault(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
   }
  });
  matchMedia('(min-width: 1101px)').addEventListener('change', e => {
   if (e.matches && activePanel?.id === 'offcanvas') closePanel();
  });
  document.querySelectorAll('#offcanvas .ct-toggle-dropdown-mobile').forEach(button => {
   button.addEventListener('click', e => {
    e.preventDefault();
    const open = button.closest('li').classList.toggle('ts-sub-open');
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Collapse dropdown menu' : 'Expand dropdown menu');
   });
  });

  // Desktop mega-menu content is already in the export; it needs no AJAX loader.
  document.querySelectorAll('#header nav[data-id="menu"]').forEach(nav => {
   nav.dataset.responsive = 'yes';
   nav.querySelectorAll('.ct-ajax-pending').forEach(el => el.classList.remove('ct-ajax-pending'));
   nav.querySelectorAll(':scope > ul > .menu-item-has-children').forEach(item => {
    const button = item.querySelector(':scope > .ct-toggle-dropdown-desktop-ghost');
    if (!button) return;
    const setOpen = open => {
     item.classList.toggle('ts-sub-open', open);
     item.classList.toggle('ts-sub-closed', !open);
     button.setAttribute('aria-expanded', String(open));
     button.setAttribute('aria-label', open ? 'Collapse dropdown menu' : 'Expand dropdown menu');
    };
    item.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') setOpen(true); });
    item.addEventListener('mouseleave', () => { if (!item.contains(document.activeElement)) setOpen(false); });
    item.addEventListener('focusin', e => { if (!item.contains(e.relatedTarget) && e.target.matches(':focus-visible')) setOpen(true); });
    item.addEventListener('focusout', e => { if (!item.contains(e.relatedTarget)) setOpen(false); });
    button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
    item.addEventListener('keydown', e => {
     if (e.key === 'Escape') {
      e.preventDefault();
      button.focus();
      setOpen(false);
     }
    });
    document.addEventListener('click', e => { if (!item.contains(e.target)) setOpen(false); });
   });
  });

  // Elementor FAQ markup is static; bind its existing answer controls locally.
  document.querySelectorAll('.elementor-toggle-item').forEach(item => {
   const title = item.querySelector('.elementor-tab-title');
   const content = item.querySelector('.elementor-tab-content');
   if (!title || !content) return;
   title.tabIndex = 0;
   title.querySelectorAll('a:not([href])').forEach(a => a.removeAttribute('tabindex'));
   const setOpen = open => {
    title.setAttribute('aria-expanded', String(open));
    title.classList.toggle('elementor-active', open);
    content.classList.toggle('elementor-active', open);
    content.hidden = !open;
    content.style.display = open ? 'block' : 'none';
   };
   setOpen(title.getAttribute('aria-expanded') === 'true');
   const toggle = () => setOpen(title.getAttribute('aria-expanded') !== 'true');
   title.addEventListener('click', toggle);
   title.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
   });
  });

  let indexPromise;
  const getSearchIndex = () => {
   if (!indexPromise) indexPromise = fetch('/assets/search-index.json')
    .then(r => { if (!r.ok) throw Error('Search index unavailable'); return r.json(); })
    .catch(error => { indexPromise = null; throw error; });
   return indexPromise;
  };
  const initialQuery = new URLSearchParams(location.search).get('q');
  document.querySelectorAll('.ct-search-form').forEach((form, index) => {
   const input = form.querySelector('input[type="search"]');
   if (!input) return;
   ['aria-activedescendant', 'aria-describedby', 'aria-expanded', 'aria-autocomplete'].forEach(attr => input.removeAttribute(attr));
   input.setAttribute('role', 'searchbox');
   form.querySelectorAll('[role="status"]').forEach(status => { status.textContent = ''; });
   const results = document.createElement('ul');
   results.className = 'ts-search-results';
   results.id = 'ts-search-results-' + index;
   results.hidden = true;
   results.setAttribute('aria-live', 'polite');
   input.setAttribute('aria-controls', results.id);
   form.after(results);
   let timer, version = 0;
   const message = text => {
    const li = document.createElement('li');
    li.textContent = text;
    results.replaceChildren(li);
   };
   const search = async () => {
    const current = ++version, q = input.value.trim().toLowerCase();
    results.replaceChildren();
    results.hidden = !q;
    if (!q) return;
    try {
     const pages = await getSearchIndex();
     if (current !== version) return;
     const terms = q.split(/\s+/);
     const matches = pages.filter(p => terms.every(term => (p.title + ' ' + p.text).toLowerCase().includes(term)))
      .sort((a, b) => Number(b.title.toLowerCase().includes(q)) - Number(a.title.toLowerCase().includes(q)));
     if (!matches.length) message('No matching pages found.');
     matches.forEach(p => {
      const li = document.createElement('li'), a = document.createElement('a');
      a.href = p.url;
      a.textContent = p.title;
      li.append(a);
      results.append(li);
     });
    } catch {
     if (current === version) message('Search could not load. Please try again.');
    }
   };
   input.addEventListener('input', () => {
    // Invalidate in-flight responses immediately, before the next debounce completes.
    ++version;
    clearTimeout(timer);
    results.replaceChildren();
    results.hidden = true;
    timer = setTimeout(search, 180);
   });
   form.addEventListener('submit', e => { e.preventDefault(); clearTimeout(timer); search(); });
   if (initialQuery) { input.value = initialQuery; search(); }
  });
  if (initialQuery) {
   const trigger = panelTriggers.find(t => t.dataset.togglePanel === '#search-modal' && isVisible(t));
   if (trigger) openPanel(trigger);
  }

  document.querySelectorAll('.wpforms-form').forEach(form => {
   form.removeAttribute('novalidate');
   const note = document.createElement('p');
   note.className = 'ts-form-note';
   note.setAttribute('role', 'status');
   note.textContent = 'This form opens your email app with your message ready to send.';
   form.append(note);
   form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const value = id => form.querySelector('[id$="field_' + id + '"]')?.value.trim() || '';
    const subject = value(3) || 'Website enquiry';
    const body = 'Name: ' + value(0) + '\nEmail: ' + value(1) + '\n\n' + value(2);
    location.href = 'mailto:info@textile-solution-bd.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    note.textContent = 'Continue in your email app to send your message, or email info@textile-solution-bd.com directly.';
   });
  });
  const chat = document.getElementById('ht-ctc-chat');
  if (chat) {
   chat.setAttribute('role', 'button');
   chat.setAttribute('aria-label', 'Chat on WhatsApp');
   chat.tabIndex = 0;
   chat.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chat.click(); }
   });
  }
 });
})();
