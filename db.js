/* =========================================================
   Noshi Bakery IndexedDB Storage
   ملف التخزين المركزي بدل localStorage
   ملاحظة مهمة:
   - هذا الملف لا يحذف localStorage نهائياً
   - لا يلمس البيانات القديمة
   - يخزن نفس مفاتيح JSON الحالية كما هي
========================================================= */

(function () {
  "use strict";

  const DB_NAME = "noshi_bakery_db";
  const DB_VERSION = 1;
  const STORE_NAME = "app_data";

  const KNOWN_KEYS = [
    "clients",
    "salesData",
    "mandoubOrders",
    "expensesData",
    "expenseItems",	
    "chocotime_data",
    "chocochips_data",
    "ramz_data",
    "alsafra_data",
    "order_products_checkboxes_final"
  ];

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB غير مدعوم في هذا المتصفح"));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function (event) {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };

      request.onsuccess = function (event) {
        resolve(event.target.result);
      };

      request.onerror = function () {
        reject(request.error || new Error("فشل فتح قاعدة البيانات"));
      };

      request.onblocked = function () {
        reject(new Error("قاعدة البيانات محجوبة. أغلق الصفحات الأخرى ثم حاول مرة أخرى."));
      };
    });

    return dbPromise;
  }

  async function transaction(mode, callback) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);

      let callbackResult;

      tx.oncomplete = function () {
        resolve(callbackResult);
      };

      tx.onerror = function () {
        reject(tx.error || new Error("حدث خطأ أثناء عملية قاعدة البيانات"));
      };

      tx.onabort = function () {
        reject(tx.error || new Error("تم إلغاء عملية قاعدة البيانات"));
      };

      try {
        callbackResult = callback(store, tx);
      } catch (error) {
        try {
          tx.abort();
        } catch (_) {}
        reject(error);
      }
    });
  }

  async function set(key, value) {
    if (!key || typeof key !== "string") {
      throw new Error("مفتاح التخزين غير صحيح");
    }

    await transaction("readwrite", (store) => {
      store.put({
        key: key,
        value: value,
        updatedAt: new Date().toISOString()
      });
    });

    return true;
  }

  async function get(key, defaultValue = null) {
    if (!key || typeof key !== "string") {
      throw new Error("مفتاح التخزين غير صحيح");
    }

    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = function () {
        if (request.result && Object.prototype.hasOwnProperty.call(request.result, "value")) {
          resolve(request.result.value);
        } else {
          resolve(defaultValue);
        }
      };

      request.onerror = function () {
        reject(request.error || new Error("فشل قراءة البيانات"));
      };
    });
  }

  async function has(key) {
    const value = await get(key, undefined);
    return value !== undefined;
  }

  async function remove(key) {
    if (!key || typeof key !== "string") {
      throw new Error("مفتاح التخزين غير صحيح");
    }

    await transaction("readwrite", (store) => {
      store.delete(key);
    });

    return true;
  }

  async function keys() {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = function () {
        resolve(request.result || []);
      };

      request.onerror = function () {
        reject(request.error || new Error("فشل جلب مفاتيح البيانات"));
      };
    });
  }

  async function getAll() {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = function () {
        const output = {};

        (request.result || []).forEach((row) => {
          output[row.key] = row.value;
        });

        resolve(output);
      };

      request.onerror = function () {
        reject(request.error || new Error("فشل جلب جميع البيانات"));
      };
    });
  }

  async function setMany(dataObject) {
    if (!dataObject || typeof dataObject !== "object" || Array.isArray(dataObject)) {
      throw new Error("بيانات الاستيراد يجب أن تكون كائن JSON صحيح");
    }

    const incomingKeys = Object.keys(dataObject);

    await transaction("readwrite", (store) => {
      incomingKeys.forEach((key) => {
        store.put({
          key: key,
          value: dataObject[key],
          updatedAt: new Date().toISOString()
        });
      });
    });

    return {
      success: true,
      importedKeys: incomingKeys,
      importedCount: incomingKeys.length
    };
  }

  async function importAll(dataObject) {
    return setMany(dataObject);
  }

  async function exportAll() {
    return getAll();
  }

  async function importFromFile(file) {
    if (!file) {
      throw new Error("لم يتم اختيار ملف");
    }

    const text = await file.text();
    const jsonData = JSON.parse(text);

    if (!jsonData || typeof jsonData !== "object" || Array.isArray(jsonData)) {
      throw new Error("ملف JSON غير صحيح");
    }

    return importAll(jsonData);
  }

  async function exportToFile(filename) {
    const data = await exportAll();

    const safeFilename =
      filename ||
      `noshi-backup-indexeddb-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 500);

    return true;
  }

  function countSummary(dataObject) {
    const data = dataObject || {};

    return {
      clients: Array.isArray(data.clients) ? data.clients.length : 0,
      salesMonths: data.salesData && typeof data.salesData === "object" ? Object.keys(data.salesData).length : 0,
      mandoubMonths: data.mandoubOrders && typeof data.mandoubOrders === "object" ? Object.keys(data.mandoubOrders).length : 0,
      expensesMonths: data.expensesData && typeof data.expensesData === "object" ? Object.keys(data.expensesData).length : 0,
      allKeys: Object.keys(data).length
    };
  }

  const api = {
    DB_NAME,
    DB_VERSION,
    STORE_NAME,
    KNOWN_KEYS,

    openDB,
    set,
    get,
    has,
    remove,

    keys,
    getAll,
    setMany,

    importAll,
    importFromFile,

    exportAll,
    exportToFile,

    countSummary
  };

  window.NoshiDB = api;
})();