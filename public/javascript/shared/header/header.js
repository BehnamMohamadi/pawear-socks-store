(() => {
 document.querySelectorAll('.desktop-nav a,.mobile-menu nav a').forEach(link=>{const target=new URL(link.href,location.href);if(target.pathname===location.pathname&&target.search===location.search)link.setAttribute('aria-current','page');});
 const searchButton=document.querySelector('.header-search-toggle'),search=document.querySelector('[data-search-panel]');
 const menuButton=document.querySelector('.menu-toggle'),menu=document.querySelector('[data-mobile-menu]');
 const closeSearch=()=>{if(!search)return;search.hidden=true;searchButton?.setAttribute('aria-expanded','false');};
 searchButton?.addEventListener('click',()=>{const open=search.hidden;search.hidden=!open;searchButton.setAttribute('aria-expanded',String(open));if(open)search.querySelector('input').focus();});
 document.querySelector('[data-search-close]')?.addEventListener('click',()=>{closeSearch();searchButton.focus();});
 const closeMenu=()=>{if(menu?.open)menu.close();};
 menuButton?.addEventListener('click',()=>{menu.showModal();menuButton.setAttribute('aria-expanded','true');document.body.classList.add('menu-open');});
 document.querySelector('[data-menu-close]')?.addEventListener('click',closeMenu);
 menu?.addEventListener('click',e=>{if(e.target===menu){const rect=menu.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right)closeMenu();}});
 menu?.addEventListener('close',()=>{menuButton.setAttribute('aria-expanded','false');document.body.classList.remove('menu-open');menuButton.focus();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSearch();});
 matchMedia('(min-width:1024px)').addEventListener('change',e=>{if(e.matches)closeMenu();});
})();
