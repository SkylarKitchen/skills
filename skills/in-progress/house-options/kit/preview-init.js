// The preview of one option (KEY, set by shoot.cjs): its sheet at the preview's width, each drawing at the largest scale
// its column allows, up to the page's caps.
(function(){
  const key = typeof KEY !== 'undefined' ? KEY : new URLSearchParams(location.search).get('o');
  if(!OPT[key]) throw new Error('OPT.'+key+' is not defined: the option file must assign OPT.'+key);
  window.OPT = OPT;
  const el = document.getElementById('sheet'), o = OPT[key];
  el.dataset.k = key; el.innerHTML = sheetHTML(key); buildLegend();
  // Fixed scales in px per ft, each lowered only as far as its drawing needs to fit its column: a wider canvas scrolls
  // inside its .draw box and its far edge is missing from every capture. Data an option file doesn't have yet keeps the fixed scale.
  const room = e => e ? Math.floor(e.getBoundingClientRect().width) : 0;
  const fit = (s, px, ft) => { try { const r = px/ft(); return r < s ? r : s; } catch(e){ return s; } };
  const scales = () => ({
    plan: fit(CAP.plan, room(el.querySelector('.plans')), () => Math.max(...levelsOf(o).map(l => l.view.x1-l.view.x0))),
    sect: fit(CAP.sect, room(el.querySelector('canvas.sect').parentNode), () => o.sect.view.y1-o.sect.view.y0),
    axon: fit(CAP.axon, room(el.querySelector('canvas.axon').parentNode)-16, () => { const b = axonBounds(o); return b[1]-b[0]; }),   // drawAxon pads 8 px a side
    site: siteScale(room(el.querySelector('canvas.site').closest('figure')))});
  const run = () => { readTokens(); drawLegend(); drawSheet(el, key, scales()); window.__done = true; };
  run();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(run);
})();
