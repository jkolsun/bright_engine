/**
 * Vanilla JS page router for static HTML snapshots.
 * Injected into <script> before </body> in the snapshot route.
 * No React, no dependencies — pure DOM manipulation.
 *
 * Handles:
 * - Multi-page navigation via URL hash (#home, #services, etc.)
 * - CTA button clicks → navigate to contact page
 * - Mobile hamburger menu → dynamic overlay nav with client accent color
 * - Text-based nav link detection (fallback when data-nav-page missing)
 * - Chatbot widget button → navigate to contact page
 * - Phone link tracking (tel: links work natively)
 */
export const STATIC_PAGE_ROUTER_SCRIPT = `
<style>
  @keyframes pageIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  [data-page]{display:none}
  [data-page].active-page{display:block;animation:pageIn .3s ease-out}
  /* Mobile nav overlay — uses --sp-accent CSS variable for client colors */
  .sp-mobile-overlay{position:fixed;inset:0;z-index:90;display:none}
  .sp-mobile-overlay.open{display:block}
  .sp-mobile-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.3);backdrop-filter:blur(4px)}
  .sp-mobile-drawer{position:absolute;right:0;top:0;bottom:0;width:300px;background:#fff;box-shadow:-4px 0 25px rgba(0,0,0,.15);padding:1.5rem;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s ease}
  .sp-mobile-overlay.open .sp-mobile-drawer{transform:translateX(0)}
  .sp-mobile-nav-link{display:block;width:100%;padding:0.875rem 1rem;border-radius:0.75rem;font-size:15px;font-weight:500;color:#1a1a1a;text-align:left;border:none;background:none;cursor:pointer;transition:background .15s}
  .sp-mobile-nav-link:hover{background:color-mix(in srgb, var(--sp-accent, #2563eb) 8%, white)}
  .sp-mobile-close{width:36px;height:36px;border-radius:8px;background:color-mix(in srgb, var(--sp-accent, #2563eb) 8%, white);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;color:#374151}
  .sp-mobile-cta{display:block;width:100%;padding:0.875rem;border-radius:0.75rem;font-size:14px;font-weight:600;color:#fff;text-align:center;border:none;cursor:pointer;background:var(--sp-accent, #2563eb);margin-top:0.75rem}
</style>
<script>
(function(){
  var PAGES=['home','services','about','portfolio','contact'];
  var NAV_LABELS={home:'Home',services:'Services',about:'About',portfolio:'Our Work',contact:'Contact'};

  // Map common link text to page names (case-insensitive)
  var TEXT_TO_PAGE={
    'home':'home','services':'services','about':'about','about us':'about',
    'our work':'portfolio','portfolio':'portfolio','gallery':'portfolio','projects':'portfolio',
    'work':'portfolio',
    'contact':'contact','contact us':'contact','get in touch':'contact'
  };

  function getNavPageFromText(text){
    if(!text)return null;
    var t=text.toLowerCase().trim();
    return TEXT_TO_PAGE[t]||null;
  }

  function getPage(){
    var h=location.hash.replace('#','');
    return PAGES.indexOf(h)!==-1?h:'home';
  }

  function showPage(page){
    var all=document.querySelectorAll('[data-page]');
    for(var i=0;i<all.length;i++){
      all[i].classList.remove('active-page');
      all[i].style.display='none';
    }
    var target=document.querySelector('[data-page="'+page+'"]');
    if(target){
      target.classList.add('active-page');
      target.style.display='block';
    }
    // Update nav active states for data-nav-page links
    var navLinks=document.querySelectorAll('[data-nav-page]');
    for(var j=0;j<navLinks.length;j++){
      var link=navLinks[j];
      if(link.getAttribute('data-nav-page')===page){
        link.classList.add('nav-active');
      }else{
        link.classList.remove('nav-active');
      }
    }
    window.scrollTo(0,0);
    // Close mobile nav if open
    var overlay=document.querySelector('.sp-mobile-overlay');
    if(overlay)overlay.classList.remove('open');
  }

  function navigateTo(page){
    if(page==='home'){
      history.pushState(null,'',location.pathname);
      showPage('home');
    }else{
      location.hash=page;
    }
  }

  // ═══ CTA BUTTON DETECTION ═══
  var CTA_WORDS=/free estimate|get estimate|free quote|get quote|get started|start your|request.*estimate|request.*quote|book.*now|schedule|consultation|let.*build|get.*website|^quote$|call now|call us|talk to us|contact us|learn more|discuss your|request examples|get.*free/i;

  function isCTAButton(el){
    if(!el)return false;
    var text=(el.textContent||'').trim();
    return CTA_WORDS.test(text);
  }

  // ═══ CHATBOT DETECTION ═══
  function isChatbotButton(el){
    if(!el)return false;
    // Chatbot widget buttons — look for the floating chat bubble
    var btn=el.closest('button');
    if(!btn)return false;
    var classes=btn.className||'';
    // Chatbot buttons typically have fixed/absolute positioning and chat-related content
    if(classes.indexOf('fixed')!==-1||classes.indexOf('absolute')!==-1){
      var svg=btn.querySelector('svg');
      if(svg){
        // Check for MessageCircle icon (chatbot) or chat-related paths
        var paths=svg.querySelectorAll('path');
        for(var i=0;i<paths.length;i++){
          var d=paths[i].getAttribute('d')||'';
          if(d.indexOf('M21 15a2')!==-1||d.indexOf('m3 21')!==-1||d.indexOf('M7.9')!==-1){
            return true;
          }
        }
      }
      // Also check for chat-related text
      var text=(btn.textContent||'').toLowerCase();
      if(text.indexOf('chat')!==-1||text.indexOf('message')!==-1){return true}
    }
    return false;
  }

  // ═══ MOBILE NAV ═══
  var mobileOverlay=null;

  function createMobileNav(){
    var accent=getComputedStyle(document.documentElement).getPropertyValue('--sp-accent').trim()||'#2563eb';
    var overlay=document.createElement('div');
    overlay.className='sp-mobile-overlay';
    overlay.innerHTML='<div class="sp-mobile-backdrop"></div>'
      +'<div class="sp-mobile-drawer">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem">'
      +'<span style="font-size:18px;font-weight:700;color:#1a1a1a">Menu</span>'
      +'<button class="sp-mobile-close" aria-label="Close menu">&times;</button>'
      +'</div>'
      +'<nav style="flex:1">'+PAGES.map(function(p){
        return '<button class="sp-mobile-nav-link" data-sp-nav="'+p+'">'+NAV_LABELS[p]+'</button>';
      }).join('')+'</nav>'
      +'<button class="sp-mobile-cta" data-sp-nav="contact">Get Free Estimate</button>'
      +'</div>';

    // Try to find a phone number in the page
    var phoneLink=document.querySelector('a[href^="tel:"]');
    if(phoneLink){
      var phoneHref=phoneLink.getAttribute('href');
      var phoneText=phoneLink.textContent||phoneHref.replace('tel:','');
      var phoneBtn=document.createElement('a');
      phoneBtn.href=phoneHref;
      phoneBtn.style.cssText='display:block;width:100%;padding:0.875rem;border-radius:0.75rem;font-size:14px;font-weight:600;color:'+accent+';text-align:center;border:1px solid #d1d5db;margin-top:0.5rem;text-decoration:none';
      phoneBtn.textContent='Call '+phoneText.replace(/[^0-9()+\\- ]/g,'').trim();
      overlay.querySelector('.sp-mobile-drawer').appendChild(phoneBtn);
    }

    document.body.appendChild(overlay);
    mobileOverlay=overlay;

    // Event listeners
    overlay.querySelector('.sp-mobile-backdrop').addEventListener('click',function(){
      overlay.classList.remove('open');
    });
    overlay.querySelector('.sp-mobile-close').addEventListener('click',function(){
      overlay.classList.remove('open');
    });
    var navBtns=overlay.querySelectorAll('[data-sp-nav]');
    for(var i=0;i<navBtns.length;i++){
      navBtns[i].addEventListener('click',function(){
        navigateTo(this.getAttribute('data-sp-nav'));
      });
    }
  }

  function isHamburgerButton(el){
    if(!el)return false;
    var btn=el.closest('button');
    if(!btn)return false;
    // Walk up: check btn, parent, and grandparent classes
    var classes=(btn.className||'');
    if(btn.parentElement) classes+=' '+(btn.parentElement.className||'');
    if(btn.parentElement&&btn.parentElement.parentElement) classes+=' '+(btn.parentElement.parentElement.className||'');
    // Check for responsive hide classes (lg:hidden or md:hidden)
    if((classes.indexOf('lg:hidden')!==-1 || classes.indexOf('md:hidden')!==-1) && btn.querySelector('svg')){
      return true;
    }
    // Fallback: detect by aria-label="Menu" on button with SVG
    if(btn.getAttribute('aria-label')==='Menu' && btn.querySelector('svg')){
      return true;
    }
    return false;
  }

  // ═══ UNIFIED CLICK HANDLER ═══
  document.addEventListener('click',function(e){
    var target=e.target;

    // 1. Nav page links via data-nav-page attribute
    var navEl=target.closest('[data-nav-page]');
    if(navEl){
      e.preventDefault();
      navigateTo(navEl.getAttribute('data-nav-page'));
      return;
    }

    // 2. Text-based nav link detection (buttons/links in nav/header areas)
    var navBtn=target.closest('button,a');
    if(navBtn && navBtn.closest('nav,header,[role="navigation"]')){
      var navText=(navBtn.textContent||'').trim();
      var navPage=getNavPageFromText(navText);
      if(navPage){
        e.preventDefault();
        navigateTo(navPage);
        return;
      }
    }

    // 3. Footer nav links (buttons/links inside footer)
    if(navBtn && navBtn.closest('footer')){
      var footerText=(navBtn.textContent||'').trim();
      var footerPage=getNavPageFromText(footerText);
      if(footerPage){
        e.preventDefault();
        navigateTo(footerPage);
        return;
      }
    }

    // 4. CTA buttons → contact page
    var btn=target.closest('button');
    if(btn && isCTAButton(btn)){
      e.preventDefault();
      navigateTo('contact');
      return;
    }
    // Also check <a> tags that are CTA-like (not tel: or mailto:)
    var link=target.closest('a');
    if(link){
      var href=link.getAttribute('href')||'';
      if(href.indexOf('tel:')!==0 && href.indexOf('mailto:')!==0 && isCTAButton(link)){
        e.preventDefault();
        navigateTo('contact');
        return;
      }
    }

    // 5. Chatbot widget button → contact page
    if(isChatbotButton(target)){
      e.preventDefault();
      navigateTo('contact');
      return;
    }

    // 6. Hamburger menu button
    if(isHamburgerButton(target)){
      e.preventDefault();
      if(!mobileOverlay)createMobileNav();
      mobileOverlay.classList.add('open');
      return;
    }
  });

  window.addEventListener('hashchange',function(){showPage(getPage())});

  // Initial setup: strip React inline styles from [data-page] sections and show the right page
  var allPages=document.querySelectorAll('[data-page]');
  for(var p=0;p<allPages.length;p++){
    allPages[p].style.display='none';
    allPages[p].classList.remove('active-page');
  }
  showPage(getPage());
})();
</script>
`

/**
 * CSS to inject into <head> to prevent flash of all pages visible.
 * The JS router above will add .active-page to show the right page.
 */
export const STATIC_PAGE_ROUTER_CSS = `
<style>[data-page]{display:none}[data-page].active-page{display:block}</style>
`

/**
 * Returns a <style> tag setting the --sp-accent CSS variable.
 * Inject this BEFORE the router script in snapshot/preview/production routes.
 */
export function getAccentCssTag(hex?: string): string {
  return `<style>:root{--sp-accent:${hex || '#2563eb'}}</style>`
}
