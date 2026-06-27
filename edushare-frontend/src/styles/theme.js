// ============================================================================
// theme.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: ALL of the app's CSS, written as plain JavaScript strings
// so App.jsx can inject it once with a single <style> tag. There are two parts:
//   • THEME     — the color palette and font, defined as CSS variables, with a
//                 dark "Candlelight Library" theme and a light "Ferrero" theme.
//   • sharedCSS — the styles for shared components (sidebar, buttons, cards,
//                 modals, tables, chat, etc.).
// At the very bottom, STYLES = THEME + sharedCSS combines them.
//
// CSS variables (the --name values) let every component say e.g. color:var(--gold)
// and automatically get the right color for the current light/dark theme.
// ============================================================================

// --- THEME: color/font variables for light and dark mode --------------------
export const THEME = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

  /* ─────────────────────────────────────────────
     Dark mode — ORIGINAL warm-gold "Candlelight Library"
     (untouched per request)
     ───────────────────────────────────────────── */
  :root{
    --bg:#0f0e0b;
    --surface:#18160f;
    --surface2:#201d14;
    --gold:#d4a050;
    --gold2:#b87a30;
    --gold-dim:rgba(212,160,80,0.13);
    --gold-border:rgba(212,160,80,0.28);
    --shadow-gold:rgba(212,160,80,0.35);
    --shadow-gold-soft:rgba(212,160,80,0.12);
    --text:#f5efe6;
    --text2:rgba(245,239,230,0.72);
    --text3:rgba(245,239,230,0.44);
    --text-muted-bg:rgba(245,239,230,0.08);
    --icon:rgba(245,239,230,0.55);
    --placeholder:rgba(245,239,230,0.4);
    --border:rgba(212,160,80,0.12);
    --field-bg:rgba(245,239,230,0.04);
    --field-bg-focus:rgba(245,239,230,0.07);
    --panel-border:rgba(212,160,80,0.1);
    --panel-overlay:rgba(245,239,230,0.03);
    --gradient-overlay:rgba(212,160,80,0.12);
    --modal-bg:rgba(0,0,0,0.72);
    --modal-shadow:0 24px 80px rgba(0,0,0,0.55);
    --card-shadow:none;
    --red:#e05555;
    --green:#5dba7a;
    --blue:#5b9bd5;
    --brick:#e05555;
    --brick-bg:rgba(224,85,85,0.10);
    --brick-border:rgba(224,85,85,0.28);
    --success:#5dba7a;
    --success-bg:rgba(93,186,122,0.10);
    --success-border:rgba(93,186,122,0.28);
    --warn:#f4b942;
    --warn-bg:rgba(244,185,66,0.12);
    --warn-border:rgba(244,185,66,0.30);
    --radius:10px;
    --radius-lg:12px;
    --radius-sm:6px;
    --transition:0.18s ease;
    --body-gradient:none;
  }

  /* ─────────────────────────────────────────────
     Light mode — "Ferrero Site" (white-based)
     Mirrors the ferrerorocher.com aesthetic:
       crisp white paper, near-black ink for words,
       deep foil-gold accents reserved for headings/CTAs,
       and the signature subtle diamond foil-wallpaper texture.
     ───────────────────────────────────────────── */
  html[data-theme="light"]{
    --bg:#FDFBF5;
    --surface:#FFFFFF;
    --surface2:#F5EDD8;
    --gold:#8C5A0F;
    --gold2:#6E430A;
    --gold-dim:rgba(140,90,15,0.08);
    --gold-border:rgba(140,90,15,0.34);
    --shadow-gold:rgba(140,90,15,0.22);
    --shadow-gold-soft:rgba(140,90,15,0.10);
    --text:#0F0A06;
    --text2:#3D2F20;
    --text3:#8A7558;
    --text-muted-bg:rgba(15,10,6,0.045);
    --icon:#8C5A0F;
    --placeholder:#B89F7A;
    --border:#EBE0C4;
    --field-bg:#FFFFFF;
    --field-bg-focus:#FDFBF5;
    --panel-border:rgba(140,90,15,0.20);
    --panel-overlay:rgba(255,255,255,0.7);
    --gradient-overlay:rgba(140,90,15,0.06);
    --modal-bg:rgba(15,10,6,0.48);
    --modal-shadow:0 28px 70px -10px rgba(15,10,6,0.20),0 10px 30px -6px rgba(140,90,15,0.14);
    --card-shadow:0 1px 2px rgba(15,10,6,0.04),0 6px 18px -10px rgba(140,90,15,0.12);
    --red:#9B3D1F;
    --green:#7A5818;
    --blue:#3D2F20;
    --brick:#9B3D1F;
    --brick-bg:rgba(155,61,31,0.08);
    --brick-border:rgba(155,61,31,0.28);
    --success:#7A5818;
    --success-bg:rgba(122,88,24,0.08);
    --success-border:rgba(122,88,24,0.26);
    --warn:#B8821E;
    --warn-bg:rgba(184,130,30,0.10);
    --warn-border:rgba(184,130,30,0.32);
    /* Body backdrop: faint diamond foil pattern (Ferrero wallpaper) +
       a barely-there warm haze in the top-right corner. */
    --body-gradient:
      radial-gradient(ellipse 1100px 600px at 100% -10%,rgba(184,130,30,0.05),transparent 55%),
      repeating-linear-gradient(45deg,transparent 0 28px,rgba(140,90,15,0.022) 28px 29px),
      repeating-linear-gradient(-45deg,transparent 0 28px,rgba(140,90,15,0.022) 28px 29px);
  }

  body{
    font-family:'DM Sans',sans-serif;
    background:var(--body-gradient,none),var(--bg);
    background-attachment:fixed;
    color:var(--text);
    min-height:100vh;
    transition:background 0.25s,color 0.25s;
    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
    font-weight:400;
  }
  input,select,textarea,button{font-family:'DM Sans',sans-serif}
  button{cursor:pointer}

  .ti{
    display:inline-flex;align-items:center;justify-content:center;
    line-height:1;flex-shrink:0;font-style:normal;
    color:var(--icon)
  }
  .ti-accent{color:var(--gold)}
  .ti-text{color:var(--text)}
  .ti-text2{color:var(--text2)}
  .ti-danger{color:var(--brick)}

  ::-webkit-scrollbar{width:8px;height:8px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:var(--gold-dim);border-radius:4px}
  ::-webkit-scrollbar-thumb:hover{background:var(--gold-border)}
  ::selection{background:var(--gold-dim);color:var(--text)}

  .skip-link{
    position:absolute;left:8px;top:-40px;z-index:9999;
    padding:8px 16px;background:var(--gold);color:#fff;
    border-radius:10px;font-size:13px;font-weight:500;
    text-decoration:none;transition:top 0.2s
  }
  .skip-link:focus{top:8px}

  .eyebrow{
    font-family:'DM Sans',sans-serif;
    font-size:11px;font-weight:500;
    letter-spacing:0.12em;text-transform:uppercase;
    color:var(--text3)
  }

  .display{
    font-family:'Playfair Display',serif;
    font-weight:500;letter-spacing:-0.02em;
    color:var(--text)
  }
  .display em{font-style:italic;color:var(--gold);font-weight:500}

  .grid-pattern{
    background-image:
      linear-gradient(var(--panel-border) 1px,transparent 1px),
      linear-gradient(90deg,var(--panel-border) 1px,transparent 1px);
    background-size:32px 32px;
    opacity:0.5
  }
`

// --- sharedCSS: the actual component styles (uses the variables above) ------
export const sharedCSS = `
  .layout{display:flex;min-height:100vh}

  /* ── Sidebar ── */
  .sidebar{width:240px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:24px 0;flex-shrink:0;position:fixed;top:0;left:0;height:100vh;z-index:50;box-shadow:var(--card-shadow);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1),background 0.25s,border-color 0.25s}
  .sidebar-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.48);z-index:49;opacity:0;pointer-events:none;transition:opacity 0.25s ease;backdrop-filter:blur(3px)}
  .sidebar-overlay.visible{opacity:1;pointer-events:all}
  .sidebar-logo{display:flex;align-items:center;gap:12px;padding:0 20px 28px;border-bottom:1px solid var(--border);margin-bottom:14px}
  .logo-box{width:38px;height:38px;background:linear-gradient(135deg,var(--gold) 0%,var(--gold2) 60%,var(--gold) 100%);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;flex-shrink:0;box-shadow:0 4px 16px var(--shadow-gold-soft),inset 0 1px 0 rgba(255,255,255,0.25)}
  .logo-text{font-family:'Playfair Display',serif;font-size:20px;font-weight:600;color:var(--text);letter-spacing:-0.02em}
  .nav-section{padding:0 12px;margin-bottom:4px}
  .nav-label{font-size:10px;font-weight:500;color:var(--text3);letter-spacing:0.12em;text-transform:uppercase;padding:0 8px;margin-bottom:8px}
  .nav-item{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;font-size:13.5px;font-weight:400;color:var(--text2);transition:all 0.15s;cursor:pointer;border:none;background:none;width:100%;text-align:left;position:relative;outline:none}
  .nav-item:hover{background:var(--gold-dim);color:var(--text)}
  .nav-item:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
  .nav-item.active{background:var(--gold-dim);color:var(--gold);font-weight:500}
  .nav-item.active::before{content:'';position:absolute;left:-12px;top:50%;transform:translateY(-50%);width:3px;height:22px;background:linear-gradient(180deg,var(--gold),var(--gold2));border-radius:0 2px 2px 0}
  .nav-item .ti{font-size:18px;color:inherit;width:20px}
  .nav-item.active .ti{color:var(--gold)}
  .nav-badge{margin-left:auto;background:var(--brick);color:#fff;font-size:10px;font-weight:500;padding:2px 7px;border-radius:10px;min-width:18px;text-align:center;line-height:1.6;letter-spacing:0.02em}
  .sidebar-footer{margin-top:auto;padding:16px 12px 0;border-top:1px solid var(--border)}
  .user-chip{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:var(--surface2);border:1px solid var(--border)}
  .user-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--gold) 0%,var(--gold2) 60%,var(--gold) 100%);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#fff;flex-shrink:0;letter-spacing:0.02em;box-shadow:0 2px 8px var(--shadow-gold-soft),inset 0 1px 0 rgba(255,255,255,0.25)}
  .user-info{flex:1;min-width:0}
  .user-name{font-size:13px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .user-role{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;font-weight:500}
  .btn-signout{width:100%;margin-top:10px;padding:10px;background:transparent;border:1px solid var(--border);border-radius:10px;color:var(--text3);font-size:12px;cursor:pointer;transition:all var(--transition);outline:none;display:inline-flex;align-items:center;justify-content:center;gap:7px;font-weight:500}
  .btn-signout:hover{border-color:var(--brick);color:var(--brick);background:var(--brick-bg)}
  .btn-signout:focus-visible{outline:2px solid var(--brick);outline-offset:2px}

  /* ── Main / topbar ── */
  .main{flex:1;margin-left:240px;display:flex;flex-direction:column;min-height:100vh}
  .topbar{height:64px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 32px;gap:12px;background:var(--surface);position:sticky;top:0;z-index:40;box-shadow:var(--card-shadow);transition:background 0.25s,border-color 0.25s}
  .hamburger{display:none;background:transparent;border:1px solid var(--border);border-radius:10px;width:38px;height:38px;align-items:center;justify-content:center;font-size:18px;cursor:pointer;color:var(--text2);flex-shrink:0;transition:all var(--transition);outline:none}
  .hamburger:hover{border-color:var(--gold);color:var(--gold);background:var(--gold-dim)}
  .hamburger:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
  .topbar-title{font-family:'Playfair Display',serif;font-size:21px;font-weight:600;color:var(--text);letter-spacing:-0.02em}
  .topbar-actions{display:flex;align-items:center;gap:10px;position:relative}
  .icon-btn{width:40px;height:40px;border-radius:10px;background:transparent;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--text2);transition:all 0.15s;cursor:pointer;position:relative;outline:none}
  .icon-btn:hover{border-color:var(--gold);color:var(--gold);background:var(--gold-dim)}
  .icon-btn:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
  .notif-dot{position:absolute;top:6px;right:6px;width:8px;height:8px;background:var(--brick);border-radius:50%;border:2px solid var(--surface)}

  /* ── Content ── */
  .content{flex:1;padding:32px}

  /* ── Cards ── */
  .card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;box-shadow:var(--card-shadow);transition:background 0.25s,border-color 0.2s,box-shadow 0.2s}
  .card:hover{border-color:var(--gold-border)}
  .card-sm{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;box-shadow:var(--card-shadow);transition:background 0.25s,border-color 0.2s}

  /* ── Stat cards ── */
  .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px;margin-bottom:32px}
  .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:22px 24px;position:relative;overflow:hidden;transition:border-color 0.2s,background 0.25s,transform 0.2s,box-shadow 0.2s;box-shadow:var(--card-shadow)}
  .stat-card:hover{border-color:var(--gold-border);transform:translateY(-2px);box-shadow:0 8px 24px var(--shadow-gold-soft)}
  .stat-card::after{content:'';position:absolute;top:-30px;right:-30px;width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,var(--accent,var(--gold-dim)),transparent 70%);opacity:0.7}
  .stat-card-btn{all:unset;display:block;cursor:pointer;width:100%;text-align:left}
  .stat-card-btn:focus-visible .stat-card{outline:2px solid var(--gold);outline-offset:3px;border-color:var(--gold-border)}
  .stat-icon{font-size:20px;color:var(--gold);margin-bottom:14px;display:inline-flex}
  .stat-value{font-family:'Playfair Display',serif;font-size:34px;font-weight:600;color:var(--gold);line-height:1;margin-bottom:6px;letter-spacing:-0.02em}
  .stat-label{font-size:11px;color:var(--text3);font-weight:500;text-transform:uppercase;letter-spacing:0.12em}
  .stat-hint{font-size:10px;color:var(--gold);margin-top:8px;opacity:0.9;letter-spacing:0.08em;font-weight:500;text-transform:uppercase;display:inline-flex;align-items:center;gap:4px}

  /* ── Buttons ── */
  .btn{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:10px;font-size:13.5px;font-weight:500;border:none;transition:all 0.2s;white-space:nowrap;cursor:pointer;outline:none;min-height:42px;justify-content:center;letter-spacing:0.01em}
  .btn:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
  /* Foil-gold gradient — glints like wrapped chocolate */
  .btn-primary{background:linear-gradient(135deg,var(--gold) 0%,var(--gold2) 55%,var(--gold) 100%);background-size:200% 100%;color:#fff;box-shadow:0 1px 2px var(--shadow-gold-soft);text-shadow:0 1px 0 rgba(0,0,0,0.08)}
  .btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 24px var(--shadow-gold);background-position:100% 0}
  .btn-primary:active{transform:translateY(0);box-shadow:none}
  .btn-primary:disabled{opacity:0.55;cursor:not-allowed;transform:none;box-shadow:none}
  .btn-ghost{background:transparent;color:var(--gold);border:1px solid var(--gold-border)}
  .btn-ghost:hover{border-color:var(--gold);background:var(--gold-dim);color:var(--gold)}
  .btn-ghost:disabled{opacity:0.5;cursor:not-allowed}
  .btn-neutral{background:transparent;color:var(--text2);border:1px solid var(--border)}
  .btn-neutral:hover{border-color:var(--gold-border);color:var(--text);background:var(--gold-dim)}
  .btn-danger{background:var(--brick-bg);color:var(--brick);border:1px solid var(--brick-border)}
  .btn-danger:hover{background:rgba(168,90,61,0.16);border-color:var(--brick)}
  .btn-success{background:var(--success-bg);color:var(--success);border:1px solid var(--success-border)}
  .btn-success:hover{background:rgba(122,88,24,0.16);border-color:var(--success)}
  .btn-sm{padding:7px 13px;font-size:12px;min-height:34px}

  /* ── Tables ── */
  .table-wrap{overflow-x:auto;border-radius:12px;border:1px solid var(--border);background:var(--surface);box-shadow:var(--card-shadow)}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:11px;font-weight:500;color:var(--text3);letter-spacing:0.12em;text-transform:uppercase;padding:14px 20px;border-bottom:1px solid var(--border);background:var(--surface2);white-space:nowrap}
  td{padding:14px 20px;font-size:13.5px;color:var(--text2);border-bottom:1px solid var(--border)}
  tr:last-child td{border-bottom:none}
  tbody tr{background:var(--surface);transition:background 0.15s}
  tbody tr:hover{background:var(--gold-dim)}

  /* ── Badges ── */
  .badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:10.5px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase}
  .badge-gold{background:var(--gold-dim);color:var(--gold);border:1px solid var(--gold-border)}
  .badge-green,.badge-success{background:var(--success-bg);color:var(--success);border:1px solid var(--success-border)}
  .badge-red,.badge-danger{background:var(--brick-bg);color:var(--brick);border:1px solid var(--brick-border)}
  .badge-blue,.badge-neutral{background:var(--text-muted-bg);color:var(--text);border:1px solid var(--border)}
  .badge-gray{background:var(--text-muted-bg);color:var(--text3)}

  /* ── Form inputs ── */
  .field{margin-bottom:18px}
  .field-label{display:block;font-size:11px;font-weight:500;color:var(--text3);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px}
  .field-input{width:100%;background:var(--field-bg);border:1px solid var(--border);border-radius:10px;padding:0 14px;height:42px;font-size:14px;color:var(--text);transition:border-color var(--transition),background var(--transition),box-shadow var(--transition);outline:none}
  .field-input:focus{border-color:var(--gold);background:var(--field-bg-focus);box-shadow:0 0 0 3px var(--shadow-gold-soft)}
  .field-input:focus-visible{outline:none}
  .field-input::placeholder{color:var(--placeholder)}
  textarea.field-input{resize:vertical;min-height:96px;line-height:1.55;padding:11px 14px;height:auto}
  select.field-input{cursor:pointer}

  .input-with-icon{position:relative}
  .input-with-icon .ti{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;color:var(--icon);pointer-events:none}
  .input-with-icon .field-input{padding-left:42px}

  /* ── Modals ── */
  .modal-overlay{position:fixed;inset:0;background:var(--modal-bg);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(4px);animation:fadeIn 0.2s ease;padding:16px}
  .modal{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:32px;width:100%;max-width:480px;animation:slideUp 0.25s ease;position:relative;max-height:90vh;overflow-y:auto;box-shadow:var(--modal-shadow)}
  .modal-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:var(--text);margin-bottom:8px;letter-spacing:-0.02em}
  .modal-sub{font-size:13px;color:var(--text2);margin-bottom:24px;line-height:1.6}
  .modal-close{position:absolute;top:16px;right:16px;background:transparent;border:1px solid var(--border);border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--text2);cursor:pointer;transition:all 0.15s;outline:none}
  .modal-close:hover{color:var(--gold);border-color:var(--gold)}
  .modal-close:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
  .modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:24px;padding-top:20px;border-top:1px solid var(--border);flex-wrap:wrap}

  /* ── Section / page headers ── */
  .section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:12px;flex-wrap:wrap}
  .section-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:600;color:var(--text);letter-spacing:-0.02em}
  .empty-state{text-align:center;padding:64px 24px;color:var(--text3)}
  .empty-icon{font-size:42px;margin-bottom:18px;display:block;color:var(--icon);opacity:0.65}
  .empty-text{font-family:'Playfair Display',serif;font-style:italic;font-size:18px;line-height:1.5;max-width:380px;margin:0 auto;color:var(--text2);font-weight:400}
  .empty-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:600;color:var(--text);margin-bottom:8px;letter-spacing:-0.02em}

  /* ── Search ── */
  .search-bar{display:flex;align-items:center;gap:10px;background:var(--field-bg);border:1px solid var(--border);border-radius:10px;padding:0 14px;transition:border-color var(--transition),box-shadow var(--transition);flex:1;max-width:340px;height:42px}
  .search-bar:focus-within{border-color:var(--gold);box-shadow:0 0 0 3px var(--shadow-gold-soft)}
  .search-bar .ti{color:var(--icon);font-size:16px}
  .search-bar input{background:none;border:none;outline:none;font-size:13.5px;color:var(--text);width:100%;height:100%}
  .search-bar input::placeholder{color:var(--placeholder)}
  .row-actions{display:flex;align-items:center;gap:6px}

  /* ── Page header ── */
  .page-header{margin-bottom:32px}
  .page-title{font-family:'Playfair Display',serif;font-size:clamp(24px,3vw,30px);font-weight:600;color:var(--text);margin-bottom:6px;letter-spacing:-0.02em;line-height:1.2}
  .page-title em{font-style:italic;color:var(--gold);font-weight:600}
  .page-sub{font-size:13.5px;color:var(--text2);line-height:1.6}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}

  /* ── Spinner ── */
  .spinner{display:inline-block;width:14px;height:14px;border:2px solid var(--gold-dim);border-top-color:var(--gold);border-radius:50%;animation:spin 0.7s linear infinite}
  .spinner-lg{width:32px;height:32px;border-width:3px;margin:48px auto;display:block}

  /* ── Alerts ── */
  .alert-error{background:var(--brick-bg);border:1px solid var(--brick-border);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--brick);margin-bottom:16px;line-height:1.5;display:flex;gap:10px;align-items:flex-start}
  .alert-success{background:var(--success-bg);border:1px solid var(--success-border);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--success);margin-bottom:16px;line-height:1.5;display:flex;gap:10px;align-items:flex-start}

  /* ── Toast ── */
  .toast{position:fixed;bottom:24px;right:24px;padding:12px 18px;border-radius:10px;font-size:13px;font-weight:500;z-index:500;animation:slideUp 0.2s ease;max-width:calc(100vw - 48px);display:inline-flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--border);box-shadow:var(--card-shadow)}
  .toast-ok{border-color:var(--success-border);color:var(--success)}
  .toast-err{border-color:var(--brick-border);color:var(--brick)}

  /* ── Skeleton ── */
  .skeleton{background:linear-gradient(90deg,var(--surface2) 25%,var(--surface) 50%,var(--surface2) 75%);background-size:200% 100%;animation:shimmer 1.6s infinite;border-radius:10px}
  @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

  /* ── Chat ── */
  .chat-sessions-panel{flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;transition:width 0.25s ease,transform 0.3s cubic-bezier(0.4,0,0.2,1);overflow:hidden}
  .chat-sessions-backdrop{display:none}

  .chat-session-row{padding:10px 12px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:9px;border:1px solid transparent;transition:all 0.15s}
  .chat-session-row:hover{background:var(--gold-dim)}
  .chat-session-row.selected{background:var(--gold-dim);border-color:var(--gold-border)}
  .chat-session-row .ti-bubble{color:var(--icon);font-size:16px;flex-shrink:0}
  .chat-session-row.selected .ti-bubble{color:var(--gold)}
  .chat-session-del{background:transparent;border:1px solid transparent;color:var(--text3);cursor:pointer;font-size:14px;padding:5px;flex-shrink:0;opacity:0.4;border-radius:6px;transition:all 0.15s;display:inline-flex}
  .chat-session-row:hover .chat-session-del{opacity:0.85}
  .chat-session-del:hover{opacity:1!important;color:var(--brick);background:var(--brick-bg);border-color:var(--brick-border)}
  .chat-session-del:focus-visible{outline:2px solid var(--brick);outline-offset:1px;opacity:1}

  .chat-newchat{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;background:transparent;border:1px solid var(--gold-border);border-radius:20px;font-size:12px;color:var(--gold);font-weight:500;cursor:pointer;transition:all 0.15s;outline:none;white-space:nowrap;letter-spacing:0.02em}
  .chat-newchat:hover{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#fff;border-color:transparent;box-shadow:0 4px 12px var(--shadow-gold-soft)}
  .chat-newchat:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
  .chat-newchat .ti{font-size:14px}

  .chat-err-card{display:flex;gap:13px;padding:14px 16px;border-radius:12px;max-width:540px;line-height:1.55;border:1px solid}
  .chat-err-card.kind-rate{background:var(--warn-bg);border-color:var(--warn-border)}
  .chat-err-card.kind-error{background:var(--brick-bg);border-color:var(--brick-border)}
  .chat-err-card.kind-timeout{background:var(--gold-dim);border-color:var(--gold-border)}
  .chat-err-icon{font-size:20px;flex-shrink:0;line-height:1.2;margin-top:1px}
  .chat-err-card.kind-rate .chat-err-icon{color:var(--warn)}
  .chat-err-card.kind-error .chat-err-icon{color:var(--brick)}
  .chat-err-card.kind-timeout .chat-err-icon{color:var(--gold)}
  .chat-err-title{font-size:13.5px;font-weight:600;color:var(--text);margin-bottom:4px}
  .chat-err-detail{font-size:13px;color:var(--text2);margin-bottom:6px}
  .chat-err-meta{font-size:11.5px;color:var(--text3);font-style:italic}
  .chat-err-actions{display:flex;gap:8px;margin-top:11px;flex-wrap:wrap}
  .chat-err-btn{font-size:11.5px;padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;font-weight:500;transition:all 0.15s;display:inline-flex;align-items:center;gap:5px;text-decoration:none}
  .chat-err-btn:hover{border-color:var(--gold);color:var(--gold);background:var(--gold-dim)}
  .chat-err-btn.primary{background:var(--gold);border-color:var(--gold);color:#fff}
  .chat-err-btn.primary:hover{background:var(--gold2);border-color:var(--gold2);color:#fff}

  /* ── Responsive ── */
  @media(max-width:768px){
    .hamburger{display:flex!important}
    .sidebar{transform:translateX(-100%)}
    .sidebar.open{transform:translateX(0);box-shadow:4px 0 32px rgba(0,0,0,0.35)}
    .main{margin-left:0!important}
    .two-col{grid-template-columns:1fr!important;gap:16px}
    .stats-grid{grid-template-columns:repeat(2,1fr)!important;gap:12px}
    .content{padding:24px 16px}
    .topbar{padding:0 16px}
    .topbar-title{font-size:18px}
    td,th{padding:10px 12px;font-size:13px}
    .modal{padding:24px 20px;max-width:calc(100vw - 24px)}
    .card{padding:18px}
    .stat-value{font-size:28px}
    .row-actions{flex-wrap:wrap}
    .chat-session-del{opacity:0.7}
    .chat-sessions-panel{position:fixed;top:64px;left:0;bottom:0;width:280px!important;z-index:60;transform:translateX(-100%)}
    .chat-sessions-panel.open{transform:translateX(0)}
    .chat-sessions-backdrop{display:block;position:fixed;inset:64px 0 0 0;background:rgba(0,0,0,0.45);z-index:59;opacity:0;pointer-events:none;transition:opacity 0.25s}
    .chat-sessions-backdrop.visible{opacity:1;pointer-events:all}
  }
  @media(min-width:769px){
    .sidebar{transform:none!important}
    .sidebar-overlay{display:none!important}
    .hamburger{display:none!important}
  }

  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
`

// The combined stylesheet App.jsx injects once for the whole app.
export const STYLES = THEME + sharedCSS
