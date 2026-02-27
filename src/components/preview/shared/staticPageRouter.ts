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
 * - FAQ accordion toggle (React state stripped in snapshots)
 * - Active nav link highlighting
 * - Phone link tracking (tel: links work natively)
 */
export const STATIC_PAGE_ROUTER_SCRIPT = `
<!-- SP_ROUTER_V2 -->
<style>
  @keyframes pageIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  [data-page]{display:none}
  [data-page].active-page{display:block;animation:pageIn .3s ease-out}
  /* Active nav link highlighting */
  [data-nav-page].nav-active{color:var(--sp-accent,#2563eb)!important;position:relative}
  [data-nav-page].nav-active::after{content:'';position:absolute;bottom:-2px;left:10%;width:80%;height:2px;background:var(--sp-accent,#2563eb);border-radius:1px}
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
    var btn=el.closest('button');
    if(!btn)return false;
    // Check aria-label for chat/message
    var label=(btn.getAttribute('aria-label')||'').toLowerCase();
    if(label==='chat'||label==='message'||label==='chatbot')return true;
    // Check for fixed-position button with z-[100] (chatbot float pattern)
    var classes=btn.className||'';
    if(classes.indexOf('z-[100]')!==-1&&btn.querySelector('svg'))return true;
    // Check for fixed/absolute with SVG and chat-related text
    if(classes.indexOf('fixed')!==-1||classes.indexOf('absolute')!==-1){
      var text=(btn.textContent||'').toLowerCase().trim();
      if(text.indexOf('chat')!==-1||text.indexOf('message')!==-1)return true;
      // Check for chat icon SVG paths
      var svg=btn.querySelector('svg');
      if(svg){
        var paths=svg.querySelectorAll('path');
        for(var i=0;i<paths.length;i++){
          var d=paths[i].getAttribute('d')||'';
          if(d.indexOf('M21 15a2')!==-1||d.indexOf('m3 21')!==-1||d.indexOf('M7.9')!==-1)return true;
        }
      }
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
    // Walk up: check btn, parent, grandparent, and great-grandparent classes
    var classes=(btn.className||'');
    if(btn.parentElement) classes+=' '+(btn.parentElement.className||'');
    if(btn.parentElement&&btn.parentElement.parentElement) classes+=' '+(btn.parentElement.parentElement.className||'');
    if(btn.parentElement&&btn.parentElement.parentElement&&btn.parentElement.parentElement.parentElement) classes+=' '+(btn.parentElement.parentElement.parentElement.className||'');
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

  // ═══ FAQ ACCORDION ═══
  function initFaqAccordions(){
    // Find all buttons that are FAQ toggles — they have a sibling div with max-height:0
    var allBtns=document.querySelectorAll('button');
    for(var i=0;i<allBtns.length;i++){
      var btn=allBtns[i];
      var next=btn.nextElementSibling;
      if(!next||next.tagName!=='DIV')continue;
      var mh=next.style.maxHeight;
      // Check if sibling has max-height:0 (collapsed FAQ answer)
      if(mh==='0px'||mh==='0'){
        (function(toggle,answer){
          toggle.style.cursor='pointer';
          toggle.setAttribute('data-faq-btn','');
          answer.setAttribute('data-faq-answer','');
          toggle.addEventListener('click',function(e){
            e.preventDefault();
            e.stopPropagation();
            var isOpen=answer.style.maxHeight!=='0px'&&answer.style.maxHeight!=='0'&&answer.style.maxHeight!=='';
            answer.style.maxHeight=isOpen?'0px':'300px';
            answer.style.opacity=isOpen?'0':'1';
            answer.style.overflow='hidden';
            answer.style.transition='all .3s ease';
            // Toggle +/- icon
            var svgs=toggle.querySelectorAll('svg');
            if(svgs.length>0){
              var lastSvg=svgs[svgs.length-1];
              // Rotate the icon to indicate state
              lastSvg.style.transition='transform .2s';
              lastSvg.style.transform=isOpen?'rotate(0deg)':'rotate(45deg)';
            }
          });
        })(btn,next);
      }
    }
  }

  // ═══ CLEANUP: Remove elements that shouldn't be on static sites ═══
  function cleanupStaticSite(){
    // Remove "Change Style" / TemplateSwitcher button
    var allDivs=document.querySelectorAll('div[style]');
    for(var i=0;i<allDivs.length;i++){
      var s=allDivs[i].style;
      if(s.position==='fixed'&&(s.zIndex==='60'||s.zIndex==='59')&&(allDivs[i].textContent||'').indexOf('Change Style')!==-1){
        allDivs[i].remove();
      }
    }
    // Remove template mobile nav overlays (React ones that got baked in)
    var hzOverlays=document.querySelectorAll('.hz-overlay');
    for(var j=0;j<hzOverlays.length;j++){hzOverlays[j].remove()}
  }

  // ═══ UNIFIED CLICK HANDLER ═══
  document.addEventListener('click',function(e){
    var target=e.target;

    // 0. Skip FAQ buttons — handled separately
    if(target.closest('[data-faq-btn]'))return;

    // 1. Nav page links via data-nav-page attribute
    var navEl=target.closest('[data-nav-page]');
    if(navEl){
      e.preventDefault();
      navigateTo(navEl.getAttribute('data-nav-page'));
      return;
    }

    // 2. Logo click — img or company name in nav/header → home
    var imgEl=target.closest('img');
    if(imgEl){
      var logoBtn=imgEl.closest('button,a');
      if(logoBtn&&logoBtn.closest('nav,header')){
        e.preventDefault();
        navigateTo('home');
        return;
      }
    }

    // 3. Text-based nav link detection (buttons/links in nav/header areas)
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

    // 4. Footer nav links (buttons/links inside footer)
    if(navBtn && navBtn.closest('footer')){
      var footerText=(navBtn.textContent||'').trim();
      var footerPage=getNavPageFromText(footerText);
      if(footerPage){
        e.preventDefault();
        navigateTo(footerPage);
        return;
      }
    }

    // 5. CTA buttons → contact page
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

    // 6. Chatbot widget button → contact page
    if(isChatbotButton(target)){
      e.preventDefault();
      navigateTo('contact');
      return;
    }

    // 7. Hamburger menu button
    if(isHamburgerButton(target)){
      e.preventDefault();
      if(!mobileOverlay)createMobileNav();
      mobileOverlay.classList.add('open');
      return;
    }
  });

  window.addEventListener('hashchange',function(){showPage(getPage())});

  // Initial setup
  cleanupStaticSite();
  var allPages=document.querySelectorAll('[data-page]');
  for(var p=0;p<allPages.length;p++){
    allPages[p].style.display='none';
    allPages[p].classList.remove('active-page');
  }
  showPage(getPage());
  initFaqAccordions();
})();
</script>
<!-- /SP_ROUTER_V2 -->
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

/**
 * Strips any existing router script (old or new) from HTML.
 * Call this BEFORE injecting the fresh router to avoid duplicates.
 */
export function stripOldRouter(html: string): string {
  // Strip V2 marker-based router
  html = html.replace(/<!-- SP_ROUTER_V2 -->[\s\S]*?<!-- \/SP_ROUTER_V2 -->/g, '')
  // Strip V1 router (no markers — match by unique CSS + script pattern)
  html = html.replace(/<style>\s*@keyframes pageIn[\s\S]*?sp-mobile-overlay[\s\S]*?<\/style>\s*<script>\s*\(function\(\)\{\s*var PAGES=[\s\S]*?\}\)\(\);\s*<\/script>/g, '')
  // Strip old accent CSS variable tags
  html = html.replace(/<style>:root\{--sp-accent:[^}]*\}<\/style>/g, '')
  return html
}
