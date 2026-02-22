/**
 * Vanilla JS page router for static HTML snapshots.
 * Injected into <script> before </body> in the snapshot route.
 * No React, no dependencies — pure DOM manipulation.
 *
 * Handles:
 * - Multi-page navigation via URL hash (#home, #services, etc.)
 * - CTA button clicks → navigate to contact page
 * - Mobile hamburger menu → dynamic overlay nav
 * - Phone link tracking (tel: links work natively)
 */
export const STATIC_PAGE_ROUTER_SCRIPT = `
<style>
  @keyframes pageIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  [data-page]{display:none}
  [data-page].active-page{display:block;animation:pageIn .3s ease-out}
  /* Mobile nav overlay */
  .sp-mobile-overlay{position:fixed;inset:0;z-index:90;display:none}
  .sp-mobile-overlay.open{display:block}
  .sp-mobile-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.3);backdrop-filter:blur(4px)}
  .sp-mobile-drawer{position:absolute;right:0;top:0;bottom:0;width:300px;background:#fff;box-shadow:-4px 0 25px rgba(0,0,0,.15);padding:1.5rem;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s ease}
  .sp-mobile-overlay.open .sp-mobile-drawer{transform:translateX(0)}
  .sp-mobile-nav-link{display:block;width:100%;padding:0.875rem 1rem;border-radius:0.75rem;font-size:15px;font-weight:500;color:#1a1a1a;text-align:left;border:none;background:none;cursor:pointer;transition:background .15s}
  .sp-mobile-nav-link:hover{background:#f0fdf4}
  .sp-mobile-close{width:36px;height:36px;border-radius:8px;background:#f0fdf4;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;color:#374151}
  .sp-mobile-cta{display:block;width:100%;padding:0.875rem;border-radius:0.75rem;font-size:14px;font-weight:600;color:#fff;text-align:center;border:none;cursor:pointer;background:linear-gradient(to right,#15803d,#059669);margin-top:0.75rem}
</style>
<script>
(function(){
  var PAGES=['home','services','about','portfolio','contact'];
  var NAV_LABELS={home:'Home',services:'Services',about:'About',portfolio:'Our Work',contact:'Contact'};

  function getPage(){
    var h=location.hash.replace('#','');
    return PAGES.indexOf(h)!==-1?h:'home';
  }

  function showPage(page){
    var all=document.querySelectorAll('[data-page]');
    for(var i=0;i<all.length;i++){
      all[i].classList.remove('active-page');
    }
    var target=document.querySelector('[data-page="'+page+'"]');
    if(target)target.classList.add('active-page');
    // Update nav active states
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
  var CTA_WORDS=/free estimate|get estimate|free quote|get quote|get started|start your|request.*estimate|request.*quote|book.*now|schedule|consultation/i;

  function isCTAButton(el){
    if(!el)return false;
    var text=(el.textContent||'').trim();
    return CTA_WORDS.test(text);
  }

  // ═══ MOBILE NAV ═══
  var mobileOverlay=null;

  function createMobileNav(){
    // Find existing nav pages from the page
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
      // Phone link — try to find from the page
      +'</div>';

    // Try to find a phone number in the page
    var phoneLink=document.querySelector('a[href^="tel:"]');
    if(phoneLink){
      var phoneHref=phoneLink.getAttribute('href');
      var phoneText=phoneLink.textContent||phoneHref.replace('tel:','');
      var phoneBtn=document.createElement('a');
      phoneBtn.href=phoneHref;
      phoneBtn.style.cssText='display:block;width:100%;padding:0.875rem;border-radius:0.75rem;font-size:14px;font-weight:600;color:#15803d;text-align:center;border:1px solid #d1d5db;margin-top:0.5rem;text-decoration:none';
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
    // Hamburger buttons are typically inside lg:hidden containers and contain an SVG
    if(!el)return false;
    var btn=el.closest('button');
    if(!btn)return false;
    // Check if it's in a mobile-only context (lg:hidden parent or the button itself)
    var classes=(btn.className||'')+(btn.parentElement?(' '+(btn.parentElement.className||'')):'');
    if(classes.indexOf('lg:hidden')!==-1 && btn.querySelector('svg')){
      return true;
    }
    return false;
  }

  // ═══ UNIFIED CLICK HANDLER ═══
  document.addEventListener('click',function(e){
    var target=e.target;

    // 1. Nav page links (existing behavior)
    var navEl=target.closest('[data-nav-page]');
    if(navEl){
      e.preventDefault();
      navigateTo(navEl.getAttribute('data-nav-page'));
      return;
    }

    // 2. CTA buttons → contact page
    var btn=target.closest('button');
    if(btn && isCTAButton(btn)){
      e.preventDefault();
      navigateTo('contact');
      return;
    }
    // Also check <a> tags that are CTA-like (not tel: or mailto:)
    var link=target.closest('a');
    if(link && !link.href.match(/^(tel:|mailto:)/) && isCTAButton(link)){
      e.preventDefault();
      navigateTo('contact');
      return;
    }

    // 3. Hamburger menu button
    if(isHamburgerButton(target)){
      e.preventDefault();
      if(!mobileOverlay)createMobileNav();
      mobileOverlay.classList.add('open');
      return;
    }
  });

  window.addEventListener('hashchange',function(){showPage(getPage())});
  // Initial page
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
