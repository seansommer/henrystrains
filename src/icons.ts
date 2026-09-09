// Small functional controls drawn on a shared 24-unit grid.
const paths:Record<string,string>={
  play:'<path d="m8 5 11 7-11 7Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',
  train:'<rect x="5" y="3" width="14" height="15" rx="5"/><path d="M5 10h14M8 18l-2 3m10-3 2 3M10 3v7m4-7v7"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/>',
  lights:'<path d="M12 16v6M4 18l16-12M4 6l16 12"/><rect x="2" y="8" width="20" height="9" rx="4"/><circle cx="7" cy="12.5" r="2"/><circle cx="17" cy="12.5" r="2"/>',
  gate:'<path d="M3 21V9M21 21v-9M3 8h18v5H3m3-5 5 5m2-5 5 5"/><circle cx="3" cy="8" r="2"/>',
  volume:'<path d="m11 4-5 5H2v6h4l5 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted:'<path d="m11 4-5 5H2v6h4l5 5ZM16 9l6 6m0-6-6 6"/>',
  settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
  horn:'<path d="m4 11 12-6v14l-12-6ZM4 11H2v2h2m5 3 1 5h3l-1-6m7-6 3-2m-3 9 3 2"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  view:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="4"/>',
  loop:'<path d="m18 3 3 4-3 4M21 7H8a5 5 0 0 0-5 5m3 9-3-4 3-4m-3 4h13a5 5 0 0 0 5-5"/>',
  sparkle:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
};
export function icon(name:string) {return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.play}</svg>`;}
