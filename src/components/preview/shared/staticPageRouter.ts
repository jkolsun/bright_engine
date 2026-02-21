/**
 * Vanilla JS page router for static HTML snapshots.
 * Injected into <script> before </body> in the snapshot route.
 * No React, no dependencies — pure DOM manipulation.
 */
export const STATIC_PAGE_ROUTER_SCRIPT = `
<style>
  @keyframes pageIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  [data-page]{display:none}
  [data-page].active-page{display:block;animation:pageIn .3s ease-out}
</style>
<script>
(function(){
  var PAGES=['home','services','about','portfolio','contact'];
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
  }
  // Handle nav link clicks
  document.addEventListener('click',function(e){
    var el=e.target.closest('[data-nav-page]');
    if(el){
      e.preventDefault();
      var page=el.getAttribute('data-nav-page');
      if(page==='home'){
        history.pushState(null,'',location.pathname);
      }else{
        location.hash=page;
        return; // hashchange will call showPage
      }
      showPage('home');
    }
  });
  window.addEventListener('hashchange',function(){showPage(getPage())});
  // Initial
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
