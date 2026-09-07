(function () {
  "use strict";

  const EXCLUDED_GENERAL = new Set(["مندوب", "صحن تقديم", "شريط عبارة"]);

  function esc(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function money(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  }

  function parseLocalDateTime(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function formatInvoiceDate(value) {
    const d = parseLocalDateTime(value) || new Date();
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatDeliveryDate(value) {
    const d = parseLocalDateTime(value);
    if (!d) return "لم يتم تحديد موعد التسليم";
    const hour24 = d.getHours();
    const minute = String(d.getMinutes()).padStart(2, "0");
    const period = hour24 >= 12 ? "م" : "ص";
    const hour12 = hour24 % 12 || 12;
    const weekday = d.toLocaleDateString("ar-SA", { weekday: "long" });
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} الساعة ${hour12}:${minute} ${period}، يوم ${weekday}`;
  }

  function financials(order) {
    const items = Array.isArray(order?.items) ? order.items : [];
    const generalDiscount = Math.max(0, Math.min(100, Number(order?.generalDiscount || 0)));
    let before = 0;
    let after = 0;

    items.forEach((item) => {
      const qty = Math.max(0, Number(item?.qty ?? item?.quantity ?? 0));
      const price = Math.max(0, Number(item?.price || 0));
      const itemBefore = qty * price;
      const individual = Math.max(0, Math.min(100, Number(item?.discount || 0)));
      const key = String(item?.originalName || item?.name || "").trim();
      const appliedGeneral = EXCLUDED_GENERAL.has(key) ? 0 : generalDiscount;
      const afterIndividual = itemBefore * (1 - individual / 100);
      const itemAfter = afterIndividual * (1 - appliedGeneral / 100);
      before += itemBefore;
      after += itemAfter;
    });

    const savedBefore = Number(order?.totalBefore);
    const savedAfter = Number(order?.totalAfter);
    if (Number.isFinite(savedBefore)) before = savedBefore;
    if (Number.isFinite(savedAfter)) after = savedAfter;
    return { before, after, discount: Math.max(0, before - after) };
  }

  function buildReceiptInner(order) {
    const items = Array.isArray(order?.items) ? order.items : [];
    const totals = financials(order || {});
    const hasDiscount = totals.discount > 0.009;
    const rows = items.map((item) => {
      const qty = Math.max(0, Number(item?.qty ?? item?.quantity ?? 0));
      const price = Math.max(0, Number(item?.price || 0));
      const notes = String(item?.notes || "").trim();
      return `
        <tr>
          <td style="text-align:right;padding:4px 0;vertical-align:top;">${esc(item?.customName || item?.name || "منتج")}</td>
          <td style="text-align:center;padding:4px 3px;vertical-align:top;">${qty}</td>
          <td style="text-align:left;padding:4px 0;vertical-align:top;white-space:nowrap;">${money(price * qty)} ر.س</td>
        </tr>
        ${notes ? `<tr><td colspan="3" style="text-align:right;font-size:12px;color:#555;padding:0 0 5px;">📌 ملاحظة: ${esc(notes)}</td></tr>` : ""}`;
    }).join("");

    return `
      <div class="header" style="text-align:center;margin-bottom:12px;">
        <div class="logo-ar" style="font-size:28px;font-weight:800;color:#d35400;">نوشي بيكري</div>
        <div class="logo-en" style="font-size:17px;color:#000;margin-bottom:6px;letter-spacing:.8px;">NOSHI BAKERY</div>
        <div class="slogan" style="font-size:15px;color:#000;margin-bottom:15px;line-height:1.3;">نَكْهَةٌ تُحْكَى... صُنِعَتْ بِعِنَاية، وقُدِّمَتْ بِفَخْر.</div>
      </div>

      <div style="font-size:14px;margin-bottom:8px;font-weight:bold;text-align:right;">
        التاريخ: <span>${esc(formatInvoiceDate(order?.date))}</span>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:12px;">
        <thead>
          <tr>
            <th style="text-align:right;border-bottom:1px solid #ccc;padding:6px 0;font-size:14px;">الصنف</th>
            <th style="text-align:center;border-bottom:1px solid #ccc;padding:6px 0;font-size:14px;">الكمية</th>
            <th style="text-align:left;border-bottom:1px solid #ccc;padding:6px 0;font-size:14px;">السعر</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="total-section" style="background:#fffaf5;padding:12px;border-radius:10px;margin:15px 0;border:1px solid #f5e9dd;">
        ${hasDiscount ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:14px;align-items:center;">
            <span>❌ الإجمالي السابق:</span>
            <span class="old-total">${money(totals.before)} ر.س</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:14px;align-items:center;color:#27ae60;">
            <span>الخصم:</span><span>${money(totals.discount)} ر.س</span>
          </div>` : `
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:14px;align-items:center;color:#444;">
            <span>الإجمالي:</span><span>${money(totals.after)} ر.س</span>
          </div>`}

        <div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px dashed #e6d3bf;align-items:center;">
          <span style="font-size:15px;font-weight:700;color:#555;">${hasDiscount ? "✅ " : ""}الإجمالي النهائي:</span>
          <span style="font-size:17px;font-weight:900;color:#2c7da0;letter-spacing:.5px;">${money(totals.after)} ر.س</span>
        </div>
      </div>

      <div class="thanks" style="text-align:center;margin:12px 0;color:#d35400;font-size:14px;font-weight:600;line-height:1.4;">
        شكراً لثِقتكم في نوشي بيكري!<br>نسعد بخدمتكم دائمًا 💕🍰!
      </div>

      <div class="contact" style="text-align:center;margin-top:8px;color:#8e8e93;font-size:14px;line-height:1.4;">
        للطلب والاستفسارات:<br>0576059229
      </div>`;
  }

  const css = `
    :host{all:initial}
    *{box-sizing:border-box}
    .overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(18,20,24,.58);display:flex;align-items:center;justify-content:center;padding:max(14px,env(safe-area-inset-top)) 14px max(14px,env(safe-area-inset-bottom));font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;direction:rtl;-webkit-overflow-scrolling:touch}
    .shell{width:min(94vw,350px);max-height:calc(100dvh - 28px);overflow:auto;background:#f7f7f7;border-radius:20px;box-shadow:0 18px 55px rgba(0,0,0,.30);padding:10px}
    .topbar{display:flex;justify-content:flex-start;margin-bottom:8px;position:sticky;top:0;z-index:4;pointer-events:none}
    .close{pointer-events:auto;appearance:none;border:0;background:#e53935;color:#fff;width:48px;height:48px;min-width:48px;border-radius:14px;font-size:23px;line-height:1;display:grid;place-items:center;box-shadow:0 4px 12px rgba(229,57,53,.30);cursor:pointer;-webkit-tap-highlight-color:transparent}
    .close:active{transform:scale(.96)}
    .receipt{all:initial;display:block;width:100%;max-width:300px;background:white;border-radius:14px;padding:18px;box-shadow:0 4px 15px rgba(0,0,0,.08);margin:0 auto;border:1px solid #f0e6d9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.35;direction:rtl;color:#000;box-sizing:border-box}
    .footer{width:100%;max-width:300px;margin:10px auto 0}
    .edit{appearance:none;border:0;width:100%;min-height:48px;border-radius:13px;background:#2980b9;color:#fff;font:800 15px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}
    .delivery{background:#fff;border:1px solid #eadfd6;border-radius:13px;padding:12px 10px;text-align:center;color:#2c3e50;font-size:14px;font-weight:800;line-height:1.7;box-shadow:0 2px 8px rgba(0,0,0,.05)}
    .delivery .label{display:block;color:#d35400;font-size:13px;margin-bottom:2px}
    .old-total{display:inline-block;position:relative;color:#c0392b;font-weight:700;text-decoration:none;line-height:1.35;padding:0 1px}
    .old-total::after{content:"";position:absolute;left:0;right:0;top:53%;height:2px;background:#c0392b;border-radius:2px;transform:translateY(-50%);pointer-events:none}
    @media(max-width:520px){.overlay{align-items:flex-end;padding:0}.shell{width:100%;max-width:none;max-height:94dvh;border-radius:22px 22px 0 0;padding:10px 10px max(14px,env(safe-area-inset-bottom))}.receipt{max-width:300px}.topbar{padding-top:2px}}
  `;

  function open(order, options = {}) {
    close();
    const host = document.createElement("div");
    host.id = "noshi-invoice-host";
    document.body.appendChild(host);
    const shadow = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

    const footer = typeof options.onEdit === "function"
      ? `<div class="footer"><button class="edit" type="button">✏️ تعديل الطلب</button></div>`
      : options.showDeliveryInfo
        ? `<div class="footer"><div class="delivery"><span class="label">🕒 تاريخ التسليم</span>${esc(formatDeliveryDate(order?.deliveryDate))}</div></div>`
        : "";

    shadow.innerHTML = `<style>${css}</style><div class="overlay"><div class="shell"><div class="topbar"><button class="close" type="button" aria-label="إغلاق الفاتورة">✕</button></div><div class="receipt">${buildReceiptInner(order || {})}</div>${footer}</div></div>`;
    const overlay = shadow.querySelector(".overlay");
    const closeBtn = shadow.querySelector(".close");
    const editBtn = shadow.querySelector(".edit");
    closeBtn?.addEventListener("click", close);
    overlay?.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    editBtn?.addEventListener("click", () => { close(); options.onEdit?.(); });
    host._noshiEsc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", host._noshiEsc);
  }

  function render(target, order) {
    if (!target) return;
    target.innerHTML = buildReceiptInner(order || {});
  }

  function close() {
    const host = document.getElementById("noshi-invoice-host");
    if (host?._noshiEsc) document.removeEventListener("keydown", host._noshiEsc);
    host?.remove();
  }

  window.NoshiInvoice = { open, close, render, formatDeliveryDate };
})();
