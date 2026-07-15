/**
 * Demo data store — simulates SQLite meta-config + TDengine series in localStorage.
 */
const Store = (() => {
  const KEY = "price-sniffer-ui-demo-v8";

  const PLATFORMS_SEED = [
    { id: "pdd", name: "拼多多", enabled: true },
    { id: "amazon", name: "亚马逊", enabled: true },
    { id: "jd", name: "京东", enabled: true },
    { id: "taobao", name: "淘宝", enabled: true },
    { id: "shopee", name: "Shopee", enabled: true },
    { id: "tiktok", name: "TikTok Shop", enabled: true },
    { id: "xianyu", name: "闲鱼", enabled: true },
    { id: "lazada", name: "Lazada", enabled: true },
    { id: "aliexpress", name: "速卖通", enabled: true },
    { id: "mercadolibre", name: "Mercado Libre", enabled: true },
    { id: "ozon", name: "Ozon", enabled: true },
    { id: "temu", name: "Temu", enabled: true },
  ];

  const MARKET_TEMPLATES = {
    pdd: [{ id: "cn", name: "中国", region: "cn", country_code: "CN", currency: "CNY", base_url: "https://mobile.yangkeduo.com" }],
    jd: [{ id: "cn", name: "中国", region: "cn", country_code: "CN", currency: "CNY", base_url: "https://www.jd.com" }],
    taobao: [{ id: "cn", name: "中国", region: "cn", country_code: "CN", currency: "CNY", base_url: "https://www.taobao.com" }],
    xianyu: [{ id: "cn", name: "中国", region: "cn", country_code: "CN", currency: "CNY", base_url: "https://www.goofish.com" }],
    shopee: [
      { id: "sg", name: "新加坡", region: "sea", country_code: "SG", currency: "SGD", base_url: "https://shopee.sg" },
      { id: "my", name: "马来西亚", region: "sea", country_code: "MY", currency: "MYR", base_url: "https://shopee.com.my" },
      { id: "th", name: "泰国", region: "sea", country_code: "TH", currency: "THB", base_url: "https://shopee.co.th" },
      { id: "id", name: "印尼", region: "sea", country_code: "ID", currency: "IDR", base_url: "https://shopee.co.id" },
      { id: "vn", name: "越南", region: "sea", country_code: "VN", currency: "VND", base_url: "https://shopee.vn" },
    ],
    lazada: [
      { id: "sg", name: "新加坡", region: "sea", country_code: "SG", currency: "SGD", base_url: "https://www.lazada.sg" },
      { id: "my", name: "马来西亚", region: "sea", country_code: "MY", currency: "MYR", base_url: "https://www.lazada.com.my" },
      { id: "th", name: "泰国", region: "sea", country_code: "TH", currency: "THB", base_url: "https://www.lazada.co.th" },
    ],
    amazon: [
      { id: "us", name: "美国", region: "na", country_code: "US", currency: "USD", base_url: "https://www.amazon.com" },
      { id: "sg", name: "新加坡", region: "sea", country_code: "SG", currency: "SGD", base_url: "https://www.amazon.sg" },
      { id: "jp", name: "日本", region: "apac", country_code: "JP", currency: "JPY", base_url: "https://www.amazon.co.jp" },
      { id: "de", name: "德国", region: "eu", country_code: "DE", currency: "EUR", base_url: "https://www.amazon.de" },
    ],
    tiktok: [
      { id: "us", name: "美国", region: "na", country_code: "US", currency: "USD", base_url: "https://www.tiktok.com" },
      { id: "sg", name: "新加坡", region: "sea", country_code: "SG", currency: "SGD", base_url: "https://www.tiktok.com" },
      { id: "uk", name: "英国", region: "eu", country_code: "GB", currency: "GBP", base_url: "https://www.tiktok.com" },
    ],
    aliexpress: [
      { id: "global", name: "全球站", region: "global", country_code: "WW", currency: "USD", base_url: "https://www.aliexpress.com" },
      { id: "es", name: "西班牙", region: "eu", country_code: "ES", currency: "EUR", base_url: "https://es.aliexpress.com" },
    ],
    mercadolibre: [
      { id: "br", name: "巴西", region: "latam", country_code: "BR", currency: "BRL", base_url: "https://www.mercadolivre.com.br" },
      { id: "mx", name: "墨西哥", region: "latam", country_code: "MX", currency: "MXN", base_url: "https://www.mercadolibre.com.mx" },
      { id: "ar", name: "阿根廷", region: "latam", country_code: "AR", currency: "ARS", base_url: "https://www.mercadolibre.com.ar" },
    ],
    ozon: [
      { id: "ru", name: "俄罗斯", region: "cis", country_code: "RU", currency: "RUB", base_url: "https://www.ozon.ru" },
    ],
    temu: [
      { id: "us", name: "美国", region: "na", country_code: "US", currency: "USD", base_url: "https://www.temu.com" },
      { id: "eu", name: "欧洲", region: "eu", country_code: "EU", currency: "EUR", base_url: "https://www.temu.com" },
    ],
  };

  const PRODUCT_SEEDS = [
    { id: "tank_g", name: "TANK-G", keyword: "TANK-G flashlight", category: "手电", enabled: true, notes: "主力监控 SKU" },
    { id: "pro_x", name: "Pro-X 头灯", keyword: "Pro-X headlamp", category: "头灯", enabled: true, notes: "" },
    { id: "mini_c", name: "Mini-C", keyword: "Mini-C keychain light", category: "钥匙扣灯", enabled: true, notes: "" },
    { id: "ultra_v2", name: "Ultra V2", keyword: "Ultra V2 tactical", category: "战术灯", enabled: false, notes: "暂停监控" },
  ];

  const CATEGORY_OPTIONS = ["手电", "头灯", "钥匙扣灯", "战术灯", "配件", "其他"];

  function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function daysAgo(n) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  function buildMarkets() {
    const markets = [];
    for (const p of PLATFORMS_SEED) {
      const templates = MARKET_TEMPLATES[p.id] || [];
      for (const t of templates) {
        markets.push({
          id: `${p.id}_${t.id}`,
          platform_id: p.id,
          name: t.name,
          region: t.region,
          country_code: t.country_code,
          currency: t.currency,
          base_url: t.base_url,
          enabled: true,
        });
      }
    }
    return markets;
  }

  function buildTasks(products, markets) {
    const statuses = ["pending", "running", "success", "failed"];
    const schedules = ["每 6 小时", "每天 02:00", "每 12 小时", "每周一 03:00"];
    const tasks = [];
    const enabledProducts = products.filter((p) => p.enabled);
    const sampleMarkets = markets.filter((m) =>
      ["shopee", "amazon", "jd", "taobao", "lazada", "temu"].includes(m.platform_id)
    );

    for (const product of enabledProducts) {
      const chosen = sampleMarkets.sort(() => Math.random() - 0.5).slice(0, 5 + Math.floor(Math.random() * 4));
      for (const market of chosen) {
        const status = pick(statuses);
        tasks.push({
          id: uid("task"),
          product_id: product.id,
          platform_id: market.platform_id,
          market_id: market.id,
          schedule: pick(schedules),
          enabled: Math.random() > 0.15,
          last_status: status,
          last_run_at: daysAgo(Math.floor(Math.random() * 3)),
          last_message:
            status === "failed"
              ? "会话过期或页面结构变更"
              : status === "success"
                ? `抓取 ${10 + Math.floor(Math.random() * 40)} 条店铺快照`
                : status === "running"
                  ? "正在翻页采集…"
                  : "等待调度",
        });
      }
    }
    return tasks;
  }

  function hoursAgo(h) {
    const d = new Date();
    d.setTime(d.getTime() - h * 3600 * 1000);
    return d.toISOString();
  }

  /** Historical task_runs (simulates SQLite task_runs table). */
  function buildTaskRuns(tasks) {
    const runs = [];
    for (const task of tasks) {
      const n = 4 + Math.floor(Math.random() * 8);
      for (let i = 0; i < n; i++) {
        const ok = Math.random() > 0.22;
        const started = hoursAgo(i * (4 + Math.floor(Math.random() * 8)) + Math.floor(Math.random() * 3));
        const durationSec = 20 + Math.floor(Math.random() * 180);
        const ended = new Date(new Date(started).getTime() + durationSec * 1000).toISOString();
        const listings = ok ? 10 + Math.floor(Math.random() * 40) : 0;
        runs.push({
          id: uid("run"),
          task_id: task.id,
          status: ok ? "success" : "failed",
          started_at: started,
          finished_at: ended,
          duration_sec: durationSec,
          listings,
          message: ok ? `抓取 ${listings} 条店铺快照` : pick(["会话过期", "反爬拦截", "页面结构变更", "超时"]),
        });
      }
      // Align task last_* with most recent run
      const latest = runs.filter((r) => r.task_id === task.id).sort((a, b) => (a.started_at < b.started_at ? 1 : -1))[0];
      if (latest && task.last_status !== "pending" && task.last_status !== "running") {
        task.last_status = latest.status;
        task.last_run_at = latest.finished_at;
        task.last_message = latest.message;
      }
    }
    return runs.sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
  }

  function runStats(runs, taskId) {
    const list = taskId ? runs.filter((r) => r.task_id === taskId) : runs;
    const done = list.filter((r) => r.status === "success" || r.status === "failed");
    const success = done.filter((r) => r.status === "success").length;
    const failed = done.filter((r) => r.status === "failed").length;
    const rate = done.length ? Math.round((success / done.length) * 1000) / 10 : null;
    return { total: list.length, done: done.length, success, failed, rate };
  }

  const METRIC_LABEL_SEED = {
    price: "价格",
    price_deviation_pct: "价格偏离 %",
    sold: "销量",
    revenue: "销售额",
  };

  function pickSeriesForAlert(series, productId, platformId, marketId) {
    const list = series || [];
    let candidates = list.filter(
      (s) =>
        (!productId || s.product_id === productId) &&
        (!platformId || s.platform_id === platformId) &&
        (!marketId || s.market_id === marketId)
    );
    if (!candidates.length) {
      candidates = list.filter(
        (s) => (!productId || s.product_id === productId) && (!platformId || s.platform_id === platformId)
      );
    }
    if (!candidates.length) candidates = list;
    return candidates.length ? pick(candidates) : null;
  }

  function buildAlertEvents(alertRules, markets, series) {
    const events = [];
    const enabledRules = alertRules.filter((r) => r.enabled);
    const pool = enabledRules.length ? enabledRules : alertRules;
    const focusMarketIds = new Set((series || []).map((s) => s.market_id).filter(Boolean));
    const focusMarkets = markets.filter((m) => focusMarketIds.has(m.id));
    const marketPool = focusMarkets.length ? focusMarkets : markets;

    const makeEvent = (rule, status, hoursBack) => {
      const candidates = marketPool.filter((m) => m.platform_id === rule.platform_id);
      const market = pick(candidates.length ? candidates : marketPool);
      const shopSeries = pickSeriesForAlert(series, rule.product_id, rule.platform_id, market?.id);
      const value = Math.round(rand(rule.threshold * 1.05, rule.threshold * 1.8) * 10) / 10;
      const firedAt = hoursAgo(hoursBack);
      return {
        id: uid("evt"),
        rule_id: rule.id,
        rule_name: rule.name,
        product_id: rule.product_id,
        platform_id: rule.platform_id,
        market_id: shopSeries?.market_id || market?.id || "",
        shop_id: shopSeries?.shop_id || "",
        shop_name: shopSeries?.shop_name || "",
        listing_url: shopSeries?.listing_url || "",
        metric: rule.metric,
        observed_value: value,
        threshold: rule.threshold,
        status,
        fired_at: firedAt,
        updated_at:
          status === "firing"
            ? firedAt
            : new Date(new Date(firedAt).getTime() + rand(10, 120) * 60000).toISOString(),
        message: `${METRIC_LABEL_SEED[rule.metric] || rule.metric} 观测值 ${value}，阈值 ${rule.threshold}`,
      };
    };

    const firingCount = Math.min(6, Math.max(3, pool.length));
    for (let i = 0; i < firingCount; i++) {
      events.push(makeEvent(pool[i % pool.length], "firing", i * 3 + Math.floor(Math.random() * 2)));
    }
    for (let i = 0; i < 10; i++) {
      events.push(makeEvent(pick(pool), "handled", 8 + i * 5 + Math.floor(Math.random() * 4)));
    }
    return events.sort((a, b) => (a.fired_at < b.fired_at ? 1 : -1));
  }

  function buildAlertRules(products, platforms) {
    const metrics = ["price", "price_deviation_pct", "sold", "revenue"];
    const operators = ["gt", "lt", "abs_gt"];
    const focusPlatformIds = ["shopee", "amazon", "jd", "taobao", "lazada", "temu"];
    const focusPlatforms = platforms.filter((p) => focusPlatformIds.includes(p.id));
    const platformPool = focusPlatforms.length ? focusPlatforms : platforms;
    const enabledProducts = products.filter((p) => p.enabled);
    const productPool = enabledProducts.length ? enabledProducts : products;
    const rules = [];
    for (let i = 0; i < 6; i++) {
      const product = productPool[i % productPool.length];
      const platform = platformPool[i % platformPool.length];
      rules.push({
        id: uid("rule"),
        name: `${product.name} · ${platform.name} 告警 ${i + 1}`,
        product_id: product.id,
        platform_id: platform.id,
        market_id: "",
        shop_id: "",
        metric: pick(metrics),
        operator: pick(operators),
        threshold: Math.round(rand(5, 40) * 10) / 10,
        baseline_mode: pick(["market_avg", "history_7d", "fixed"]),
        enabled: true,
        silence_minutes: pick([30, 60, 180, 1440]),
      });
    }
    return rules;
  }

  const SHOP_NAME_POOL = [
    "Official Flagship",
    "BrightLight Store",
    "Outdoor Gear Hub",
    "FlashMart",
    "ProTorch Dealer",
    "NightOwl Shop",
    "MegaDeal Outlet",
    "Tactical Supply",
  ];

  /** Simulated TDengine series: product × platform × market × shop, ~185 days */
  function buildSeries(products, markets) {
    const series = [];
    const focus = markets.filter((m) =>
      ["shopee_sg", "shopee_my", "amazon_us", "amazon_sg", "jd_cn", "taobao_cn", "lazada_sg", "temu_us"].includes(m.id)
    );
    const daySpan = 184;
    for (const product of products.filter((p) => p.enabled)) {
      for (const market of focus) {
        const shopCount = 2 + Math.floor(Math.random() * 2);
        const shops = SHOP_NAME_POOL.slice().sort(() => Math.random() - 0.5).slice(0, shopCount);
        shops.forEach((shopName, si) => {
          const shopId = `${market.id}_shop${si + 1}`;
          const base = rand(18, 120) * (1 + si * 0.08);
          const points = [];
          for (let d = daySpan; d >= 0; d--) {
            const drift = Math.sin(d / 4 + si) * 3 + rand(-2.5, 2.5);
            const price = Math.max(5, base + drift);
            const sold = Math.round(rand(3, 70) + (daySpan - d) * 0.12 + si * 2);
            points.push({
              ts: daysAgo(d),
              price: Math.round(price * 100) / 100,
              sold,
              revenue: Math.round(price * sold * 100) / 100,
            });
          }
          series.push({
            id: `${product.id}__${market.id}__${shopId}`,
            product_id: product.id,
            platform_id: market.platform_id,
            market_id: market.id,
            shop_id: shopId,
            shop_name: shopName,
            listing_url: `${market.base_url || "https://example.com"}/item/${shopId}`,
            points,
          });
        });
      }
    }
    return series;
  }

  function seed() {
    const platforms = PLATFORMS_SEED.map((p) => ({ ...p }));
    const markets = buildMarkets();
    const products = PRODUCT_SEEDS.map((p) => ({ ...p }));
    const tasks = buildTasks(products, markets);
    const taskRuns = buildTaskRuns(tasks);
    const alertRules = buildAlertRules(products, platforms);
    const series = buildSeries(products, markets);
    const alertEvents = buildAlertEvents(alertRules, markets, series);
    return { platforms, markets, products, tasks, taskRuns, alertRules, alertEvents, series };
  }

  function migrate(data) {
    if (!Array.isArray(data.taskRuns)) {
      data.taskRuns = buildTaskRuns(data.tasks || []);
    }
    const seedById = Object.fromEntries(PRODUCT_SEEDS.map((p) => [p.id, p]));
    if (Array.isArray(data.products)) {
      data.products = data.products.map((p) => ({
        ...p,
        category: p.category || seedById[p.id]?.category || "其他",
      }));
    }
    const needsShopSeries =
      !Array.isArray(data.series) ||
      !data.series.length ||
      data.series.some((s) => !s.shop_id || !s.id) ||
      (data.series[0]?.points?.length || 0) < 180;
    if (needsShopSeries) {
      data.series = buildSeries(data.products || PRODUCT_SEEDS, data.markets || buildMarkets());
    }
    const firingCount = (data.alertEvents || []).filter((e) => e.status === "firing").length;
    const needsShopOnEvents = (data.alertEvents || []).some((e) => !e.shop_name && !e.listing_url);
    if (!Array.isArray(data.alertEvents) || firingCount < 2 || needsShopOnEvents) {
      data.alertEvents = buildAlertEvents(
        data.alertRules || buildAlertRules(data.products || PRODUCT_SEEDS, data.platforms || PLATFORMS_SEED),
        data.markets || buildMarkets(),
        data.series || []
      );
    } else {
      data.alertEvents = data.alertEvents.map((e) => ({
        ...e,
        status: e.status === "firing" ? "firing" : e.status === "handled" ? "handled" : "handled",
      }));
    }
    return data;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const data = seed();
        save(data);
        return data;
      }
      const data = migrate(JSON.parse(raw));
      save(data);
      return data;
    } catch {
      const data = seed();
      save(data);
      return data;
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function reset() {
    localStorage.removeItem(KEY);
    return load();
  }

  let state = load();

  function get() {
    return state;
  }

  function commit() {
    save(state);
  }

  function replace(next) {
    state = next;
    commit();
  }

  function platformName(id) {
    return state.platforms.find((p) => p.id === id)?.name || id;
  }

  function productName(id) {
    return state.products.find((p) => p.id === id)?.name || id;
  }

  function marketName(id) {
    return state.markets.find((m) => m.id === id)?.name || id;
  }

  function shopName(id) {
    return state.series.find((s) => s.shop_id === id)?.shop_name || id;
  }

  function productCategory(id) {
    return state.products.find((p) => p.id === id)?.category || "其他";
  }

  function appendRun(run) {
    if (!state.taskRuns) state.taskRuns = [];
    state.taskRuns.unshift(run);
    commit();
  }

  return {
    get,
    commit,
    replace,
    reset,
    seed,
    uid,
    platformName,
    productName,
    marketName,
    shopName,
    productCategory,
    CATEGORY_OPTIONS,
    runStats,
    appendRun,
  };
})();
