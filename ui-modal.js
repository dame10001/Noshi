(function(){
  'use strict';

  const STYLE_ID = 'noshiUiModalStyles';

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      :root{--noshi-safe-bottom:env(safe-area-inset-bottom,0px);--noshi-safe-top:env(safe-area-inset-top,0px)}
      .noshi-ui-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(20,20,20,.48);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:calc(16px + var(--noshi-safe-top)) 16px calc(16px + var(--noshi-safe-bottom));box-sizing:border-box;direction:rtl}
      .noshi-ui-sheet{width:min(92vw,390px);max-height:min(82vh,720px);overflow:auto;-webkit-overflow-scrolling:touch;background:#fff;border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.28);padding:20px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Cairo',sans-serif;color:#1c1c1e;animation:noshiSheetIn .18s ease-out}
      .noshi-ui-title{font-size:18px;font-weight:800;margin:0 0 8px;text-align:center;color:#2c2c2e}
      .noshi-ui-message{white-space:pre-wrap;font-size:16px;line-height:1.65;text-align:right;color:#3a3a3c;margin:0 0 16px;word-break:break-word}
      .noshi-ui-input{width:100%;min-height:48px;border:1.5px solid #d1d1d6;border-radius:14px;padding:12px 14px;font-size:16px;outline:none;box-sizing:border-box;background:#fff;color:#111;-webkit-appearance:none;appearance:none;margin:2px 0 16px;text-align:right}
      .noshi-ui-input:focus{border-color:#d97706;box-shadow:0 0 0 3px rgba(217,119,6,.12)}
      .noshi-ui-actions{display:flex;gap:10px;margin-top:4px}
      .noshi-ui-btn{min-height:48px;flex:1;border:0;border-radius:14px;padding:12px 14px;font-size:16px;font-weight:800;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      .noshi-ui-btn-primary{background:#d97706;color:#fff}.noshi-ui-btn-danger{background:#e74c3c;color:#fff}.noshi-ui-btn-secondary{background:#f2f2f7;color:#2c2c2e}
      .noshi-ui-close{position:absolute;top:12px;left:12px;width:44px;height:44px;border:0;border-radius:50%;background:rgba(242,242,247,.96);color:#3a3a3c;font-size:23px;line-height:44px;text-align:center;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:4;box-shadow:0 2px 8px rgba(0,0,0,.08);-webkit-tap-highlight-color:transparent}
      .noshi-ui-relative{position:relative;padding-top:10px}
      @keyframes noshiSheetIn{from{transform:translateY(10px) scale(.985);opacity:.7}to{transform:none;opacity:1}}
      @media(max-width:600px){
        .noshi-ui-overlay{align-items:flex-end;padding:0 0 0}
        .noshi-ui-sheet{width:100%;max-width:none;max-height:88vh;border-radius:24px 24px 0 0;padding:20px 18px calc(18px + var(--noshi-safe-bottom));animation:noshiSheetUp .2s ease-out}
        @keyframes noshiSheetUp{from{transform:translateY(24px);opacity:.75}to{transform:none;opacity:1}}
        .modal,.settings-modal{padding-left:10px!important;padding-right:10px!important;box-sizing:border-box!important}
        .modal-content,.settings-modal .modal-box{width:100%!important;max-width:430px!important;max-height:88vh!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important;border-radius:22px!important;padding-bottom:calc(18px + var(--noshi-safe-bottom))!important;box-sizing:border-box!important}
        .modal-close,.close-modal-btn,.close-settings{min-height:44px!important;min-width:44px!important;touch-action:manipulation!important}
        input,select,textarea{font-size:16px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function removeOverlay(overlay){
    if (!overlay) return;
    overlay.remove();
    document.documentElement.style.overflow = '';
  }

  function createBase(title, message){
    injectStyles();
    document.querySelector('.noshi-ui-overlay[data-single="1"]')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'noshi-ui-overlay';
    overlay.dataset.single = '1';
    overlay.setAttribute('role','presentation');
    const sheet = document.createElement('div');
    sheet.className = 'noshi-ui-sheet noshi-ui-relative';
    sheet.setAttribute('role','dialog');
    sheet.setAttribute('aria-modal','true');
    if (title) {
      const h = document.createElement('h3'); h.className='noshi-ui-title'; h.textContent=title; sheet.appendChild(h);
    }
    if (message !== undefined && message !== null && String(message) !== '') {
      const p = document.createElement('div'); p.className='noshi-ui-message'; p.textContent=String(message); sheet.appendChild(p);
    }
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    return {overlay,sheet};
  }

  function alertUI(message, options={}){
    return new Promise(resolve => {
      const {overlay,sheet} = createBase(options.title || 'تنبيه', message);
      const actions = document.createElement('div'); actions.className='noshi-ui-actions';
      const ok = document.createElement('button'); ok.className='noshi-ui-btn noshi-ui-btn-primary'; ok.type='button'; ok.textContent=options.okText || 'حسنًا';
      const done=()=>{removeOverlay(overlay);resolve(true)};
      ok.onclick=done; actions.appendChild(ok); sheet.appendChild(actions);
      overlay.addEventListener('click',e=>{ if(e.target===overlay) done(); });
      requestAnimationFrame(()=>ok.focus({preventScroll:true}));
    });
  }

  function confirmUI(message, options={}){
    return new Promise(resolve => {
      const {overlay,sheet}=createBase(options.title || 'تأكيد', message);
      const actions=document.createElement('div'); actions.className='noshi-ui-actions';
      const cancel=document.createElement('button'); cancel.type='button'; cancel.className='noshi-ui-btn noshi-ui-btn-secondary'; cancel.textContent=options.cancelText || 'إلغاء';
      const yes=document.createElement('button'); yes.type='button'; yes.className='noshi-ui-btn noshi-ui-btn-primary'; yes.textContent=options.confirmText || 'تأكيد';
      const finish=v=>{removeOverlay(overlay);resolve(v)};
      cancel.onclick=()=>finish(false); yes.onclick=()=>finish(true); actions.append(cancel,yes); sheet.appendChild(actions);
      overlay.addEventListener('click',e=>{if(e.target===overlay)finish(false)});
      requestAnimationFrame(()=>yes.focus({preventScroll:true}));
    });
  }

  function promptUI(message, options={}){
    return new Promise(resolve => {
      const {overlay,sheet}=createBase(options.title || 'إدخال', message);
      const input=document.createElement(options.multiline ? 'textarea' : 'input');
      input.className='noshi-ui-input'; input.value=options.value || ''; input.placeholder=options.placeholder || '';
      if (!options.multiline) input.type=options.type || 'text';
      if (options.inputMode) input.inputMode=options.inputMode;
      if (options.multiline) input.style.minHeight='110px';
      sheet.appendChild(input);
      const actions=document.createElement('div'); actions.className='noshi-ui-actions';
      const cancel=document.createElement('button'); cancel.type='button'; cancel.className='noshi-ui-btn noshi-ui-btn-secondary'; cancel.textContent=options.cancelText || 'إلغاء';
      const ok=document.createElement('button'); ok.type='button'; ok.className='noshi-ui-btn noshi-ui-btn-primary'; ok.textContent=options.okText || 'تم';
      const finish=v=>{removeOverlay(overlay);resolve(v)};
      cancel.onclick=()=>finish(null); ok.onclick=()=>finish(input.value);
      input.addEventListener('keydown',e=>{if(!options.multiline && e.key==='Enter'){e.preventDefault();finish(input.value)}});
      actions.append(cancel,ok); sheet.appendChild(actions);
      overlay.addEventListener('click',e=>{if(e.target===overlay)finish(null)});
      setTimeout(()=>input.focus({preventScroll:true}),40);
    });
  }

  window.NoshiUI={alert:alertUI,confirm:confirmUI,prompt:promptUI,injectStyles};
  // أي alert قديم في المشروع يتحول إلى مودال Noshi بدون نافذة المتصفح الأصلية.
  window.alert=function(message){ alertUI(message); };
  injectStyles();
})();
