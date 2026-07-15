/**
 * SPA shell: routing, CRUD views, modals.
 */
(() => {
  const TITLES = {
    overview: "概览",
    products: "产品配置",
    platforms: "平台管理",
    markets: "市场管理",
    "alert-panel": "告警面板",
    alerts: "告警规则",
    tasks: "任务列表",
    "task-status": "任务状态",
    "price-trend": "价格趋势",
    "category-trend": "分类聚合趋势",
    "category-summary": "分类销量价格汇总",
    "detail-data": "详细数据",
  };

  const METRIC_LABELS = {
    price: "价格",
    price_deviation_pct: "价格偏离 %",
    sold: "销量",
    revenue: "销售额",
  };

  const OP_LABELS = {
    gt: ">",
    gte: "≥",
    lt: "<",
    lte: "≤",
    eq: "=",
    abs_gt: "|Δ| >",
  };

  const BASELINE_LABELS = {
    market_avg: "市场均价",
    history_7d: "近 7 日均价",
    fixed: "固定阈值",
  };

  let modalSaveHandler = null;
  let expandedPlatforms = new Set();

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function statusBadge(status) {
    const map = {
      success: "badge-success",
      failed: "badge-failed",
      running: "badge-running",
      pending: "badge-pending",
      firing: "badge-failed",
      handled: "badge-success",
      acknowledged: "badge-success",
      resolved: "badge-success",
      silenced: "badge-success",
    };
    const labels = {
      success: "成功",
      failed: "失败",
      running: "运行中",
      pending: "待运行",
      firing: "告警中",
      handled: "已处理",
      acknowledged: "已处理",
      resolved: "已处理",
      silenced: "已处理",
    };
    return `<span class="badge ${map[status] || ""}">${labels[status] || esc(status)}</span>`;
  }

  function enabledBadge(on) {
    return on
      ? `<span class="badge badge-success">启用</span>`
      : `<span class="badge badge-off">停用</span>`;
  }

  function route() {
    const hash = location.hash.replace(/^#\/?/, "") || "overview";
    return hash.split("?")[0];
  }

  function setActiveNav(name) {
    $$(".nav-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.route === name);
    });
    $("#page-title").textContent = TITLES[name] || name;
  }

  function openModal(title, fieldsHtml, onSave) {
    $("#modal-title").textContent = title;
    const form = $("#modal-form");
    form.innerHTML = fieldsHtml;
    modalSaveHandler = onSave;
    $("#modal-backdrop").hidden = false;
    const first = form.querySelector("input, select, textarea");
    if (first) first.focus();
  }

  function closeModal() {
    $("#modal-backdrop").hidden = true;
    modalSaveHandler = null;
    $("#modal-form").innerHTML = "";
  }

  function field(label, name, value = "", type = "text", opts = {}) {
    if (type === "select") {
      const options = (opts.options || [])
        .map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(t)}</option>`)
        .join("");
      return `<div class="field"><label>${esc(label)}</label><select name="${esc(name)}" ${opts.required ? "required" : ""}>${options}</select></div>`;
    }
    if (type === "textarea") {
      return `<div class="field"><label>${esc(label)}</label><textarea name="${esc(name)}" ${opts.required ? "required" : ""}>${esc(value)}</textarea></div>`;
    }
    if (type === "checkbox") {
      return `<div class="field"><label><input type="checkbox" name="${esc(name)}" ${value ? "checked" : ""} /> ${esc(label)}</label></div>`;
    }
    return `<div class="field"><label>${esc(label)}</label><input type="${esc(type)}" name="${esc(name)}" value="${esc(value)}" ${opts.required ? "required" : ""} ${opts.step ? `step="${opts.step}"` : ""} /></div>`;
  }

  function formData(form) {
    const fd = new FormData(form);
    const data = {};
    for (const [k, v] of fd.entries()) data[k] = v;
    form.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      data[cb.name] = cb.checked;
    });
    return data;
  }

  /* ---------- Views ---------- */

  function viewOverview() {
    const d = Store.get();
    const running = d.tasks.filter((t) => t.last_status === "running").length;
    const failed = d.tasks.filter((t) => t.last_status === "failed").length;
    const ok = d.tasks.filter((t) => t.last_status === "success").length;
    const rulesOn = d.alertRules.filter((r) => r.enabled).length;
    const events = d.alertEvents || [];
    const firing = events.filter((e) => e.status === "firing").length;

    const recentAlerts = events.slice(0, 5)
      .map(
        (e) => `
      <tr>
        <td>${statusBadge(e.status)}</td>
        <td>${esc(e.rule_name)}</td>
        <td>${esc(Store.productName(e.product_id))}</td>
        <td class="muted">${esc((e.fired_at || "").slice(0, 16).replace("T", " "))}</td>
      </tr>`
      )
      .join("");

    return `
      <div class="stats">
        <div class="stat"><div class="label">产品</div><div class="value">${d.products.length}</div></div>
        <div class="stat"><div class="label">平台</div><div class="value">${d.platforms.length}</div></div>
        <div class="stat"><div class="label">市场</div><div class="value">${d.markets.length}</div></div>
        <div class="stat"><div class="label">抓取任务</div><div class="value">${d.tasks.length}</div></div>
        <div class="stat"><div class="label">运行中</div><div class="value">${running}</div></div>
        <div class="stat"><div class="label">成功 / 失败</div><div class="value">${ok} / ${failed}</div></div>
        <div class="stat"><div class="label">启用告警规则</div><div class="value">${rulesOn}</div></div>
        <div class="stat"><div class="label">告警中</div><div class="value">${firing}</div></div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>说明</h2></div>
        <p class="muted">本页为纯静态 Demo：元配置 CRUD 持久化在浏览器 localStorage（模拟 SQLite）；图表时序为随机生成数据（模拟 TDengine）。正式产品见 <code>docs/PRODUCT.md</code>。</p>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>最近告警</h2>
          <div class="panel-actions"><a class="btn btn-sm btn-secondary" href="#/alert-panel">告警面板</a></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>状态</th><th>规则</th><th>产品</th><th>触发时间</th></tr></thead>
            <tbody>${recentAlerts || `<tr><td colspan="4" class="empty">暂无告警</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>最近任务</h2>
          <div class="panel-actions"><a class="btn btn-sm btn-secondary" href="#/task-status">查看全部</a></div>
        </div>
        ${taskTable(d.tasks.slice(0, 8), { actions: false })}
      </div>
    `;
  }

  function viewProducts() {
    const d = Store.get();
    const rows = d.products
      .map(
        (p) => `
      <tr>
        <td><code>${esc(p.id)}</code></td>
        <td>${esc(p.name)}</td>
        <td>${esc(p.category || "其他")}</td>
        <td>${esc(p.keyword)}</td>
        <td>${enabledBadge(p.enabled)}</td>
        <td class="muted">${esc(p.notes || "—")}</td>
        <td class="row-actions">
          <button type="button" class="btn btn-sm btn-secondary" data-act="edit-product" data-id="${esc(p.id)}">编辑</button>
          <button type="button" class="btn btn-sm btn-danger" data-act="del-product" data-id="${esc(p.id)}">删除</button>
        </td>
      </tr>`
      )
      .join("");

    return `
      <div class="panel">
        <div class="panel-header">
          <h2>产品列表</h2>
          <div class="panel-actions">
            <button type="button" class="btn btn-primary" data-act="add-product">新增产品</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>名称</th><th>分类</th><th>关键字</th><th>状态</th><th>备注</th><th>操作</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="7" class="empty">暂无产品</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  }

  function productModal(existing) {
    const p = existing || { id: "", name: "", keyword: "", category: "其他", enabled: true, notes: "" };
    const catOpts = (Store.CATEGORY_OPTIONS || ["其他"]).map((c) => [c, c]);
    openModal(
      existing ? "编辑产品" : "新增产品",
      `
      ${field("ID", "id", p.id, "text", { required: true })}
      ${field("名称", "name", p.name, "text", { required: true })}
      ${field("产品分类", "category", p.category || "其他", "select", { options: catOpts, required: true })}
      ${field("搜索关键字", "keyword", p.keyword, "text", { required: true })}
      ${field("启用", "enabled", p.enabled, "checkbox")}
      ${field("备注", "notes", p.notes, "textarea")}
      `,
      (data) => {
        const d = Store.get();
        const row = {
          id: String(data.id).trim(),
          name: String(data.name).trim(),
          category: String(data.category || "其他").trim(),
          keyword: String(data.keyword).trim(),
          enabled: !!data.enabled,
          notes: String(data.notes || "").trim(),
        };
        if (!row.id || !row.name || !row.keyword) {
          alert("请填写 ID、名称与关键字");
          return false;
        }
        const idx = d.products.findIndex((x) => x.id === (existing?.id || row.id));
        if (existing) {
          if (row.id !== existing.id && d.products.some((x) => x.id === row.id)) {
            alert("ID 已存在");
            return false;
          }
          d.products[idx] = row;
        } else {
          if (d.products.some((x) => x.id === row.id)) {
            alert("ID 已存在");
            return false;
          }
          d.products.push(row);
        }
        Store.commit();
        return true;
      }
    );
    if (existing) {
      const idInput = $('#modal-form [name="id"]');
      if (idInput) idInput.readOnly = true;
    }
  }

  function viewPlatforms() {
    const d = Store.get();
    const rows = d.platforms
      .map((p) => {
        const count = d.markets.filter((m) => m.platform_id === p.id).length;
        return `
        <tr>
          <td><code>${esc(p.id)}</code></td>
          <td>${esc(p.name)}</td>
          <td>${count}</td>
          <td>${enabledBadge(p.enabled)}</td>
          <td class="row-actions">
            <button type="button" class="btn btn-sm btn-secondary" data-act="edit-platform" data-id="${esc(p.id)}">编辑</button>
            <button type="button" class="btn btn-sm btn-danger" data-act="del-platform" data-id="${esc(p.id)}">删除</button>
          </td>
        </tr>`;
      })
      .join("");

    return `
      <div class="panel">
        <div class="panel-header">
          <h2>平台列表</h2>
          <div class="panel-actions">
            <button type="button" class="btn btn-primary" data-act="add-platform">新增平台</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>名称</th><th>市场数</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }

  function platformModal(existing) {
    const p = existing || { id: "", name: "", enabled: true };
    openModal(
      existing ? "编辑平台" : "新增平台",
      `
      ${field("ID", "id", p.id, "text", { required: true })}
      ${field("名称", "name", p.name, "text", { required: true })}
      ${field("启用", "enabled", p.enabled, "checkbox")}
      `,
      (data) => {
        const d = Store.get();
        const row = {
          id: String(data.id).trim(),
          name: String(data.name).trim(),
          enabled: !!data.enabled,
        };
        if (!row.id || !row.name) {
          alert("请填写 ID 与名称");
          return false;
        }
        if (existing) {
          const idx = d.platforms.findIndex((x) => x.id === existing.id);
          d.platforms[idx] = row;
        } else {
          if (d.platforms.some((x) => x.id === row.id)) {
            alert("ID 已存在");
            return false;
          }
          d.platforms.push(row);
        }
        Store.commit();
        return true;
      }
    );
    if (existing) {
      const idInput = $('#modal-form [name="id"]');
      if (idInput) idInput.readOnly = true;
    }
  }

  function viewMarkets() {
    const d = Store.get();
    const platformFilter = sessionStorage.getItem("demo-market-platform") || "";
    const options = [`<option value="">全部平台</option>`]
      .concat(d.platforms.map((p) => `<option value="${esc(p.id)}" ${platformFilter === p.id ? "selected" : ""}>${esc(p.name)}</option>`))
      .join("");

    const platforms = platformFilter ? d.platforms.filter((p) => p.id === platformFilter) : d.platforms;

    const tree = platforms
      .map((p) => {
        const markets = d.markets.filter((m) => m.platform_id === p.id);
        const open = expandedPlatforms.has(p.id) || !!platformFilter;
        return `
        <li>
          <div class="tree-platform" data-act="toggle-platform" data-id="${esc(p.id)}">
            <span>${open ? "▾" : "▸"}</span>
            <strong>${esc(p.name)}</strong>
            <span class="muted">(${markets.length})</span>
            <span style="margin-left:auto" class="row-actions" onclick="event.stopPropagation()">
              <button type="button" class="btn btn-sm btn-primary" data-act="add-market" data-platform="${esc(p.id)}">新增市场</button>
            </span>
          </div>
          <ul class="tree-markets ${open ? "" : "hidden"}">
            ${markets
              .map(
                (m) => `
              <li>
                <code>${esc(m.id)}</code>
                <span>${esc(m.name)}</span>
                <span class="muted">${esc(m.country_code)} · ${esc(m.currency)}</span>
                <span class="muted">${esc(m.base_url)}</span>
                ${enabledBadge(m.enabled)}
                <span class="row-actions" style="margin-left:auto">
                  <button type="button" class="btn btn-sm btn-secondary" data-act="edit-market" data-id="${esc(m.id)}">编辑</button>
                  <button type="button" class="btn btn-sm btn-danger" data-act="del-market" data-id="${esc(m.id)}">删除</button>
                </span>
              </li>`
              )
              .join("") || `<li class="muted">暂无市场</li>`}
          </ul>
        </li>`;
      })
      .join("");

    return `
      <div class="panel">
        <div class="panel-header"><h2>按平台层级查看市场</h2></div>
        <div class="toolbar">
          <div class="field">
            <label>筛选平台</label>
            <select id="filter-market-platform">${options}</select>
          </div>
        </div>
        <ul class="tree">${tree}</ul>
      </div>`;
  }

  function marketModal(existing, platformId) {
    const d = Store.get();
    const m = existing || {
      id: "",
      platform_id: platformId || d.platforms[0]?.id || "",
      name: "",
      region: "",
      country_code: "",
      currency: "",
      base_url: "",
      enabled: true,
    };
    const platformOpts = d.platforms.map((p) => [p.id, p.name]);
    openModal(
      existing ? "编辑市场" : "新增市场",
      `
      <div class="form-row">
        ${field("平台", "platform_id", m.platform_id, "select", { options: platformOpts, required: true })}
        ${field("市场 ID", "id", m.id, "text", { required: true })}
      </div>
      <div class="form-row">
        ${field("名称", "name", m.name, "text", { required: true })}
        ${field("区域", "region", m.region)}
      </div>
      <div class="form-row">
        ${field("国家码", "country_code", m.country_code)}
        ${field("币种", "currency", m.currency)}
      </div>
      ${field("Base URL", "base_url", m.base_url)}
      ${field("启用", "enabled", m.enabled, "checkbox")}
      `,
      (data) => {
        const state = Store.get();
        const row = {
          id: String(data.id).trim(),
          platform_id: String(data.platform_id),
          name: String(data.name).trim(),
          region: String(data.region || "").trim(),
          country_code: String(data.country_code || "").trim(),
          currency: String(data.currency || "").trim(),
          base_url: String(data.base_url || "").trim(),
          enabled: !!data.enabled,
        };
        if (!row.id || !row.name) {
          alert("请填写市场 ID 与名称");
          return false;
        }
        if (existing) {
          const idx = state.markets.findIndex((x) => x.id === existing.id);
          if (row.id !== existing.id && state.markets.some((x) => x.id === row.id)) {
            alert("市场 ID 已存在");
            return false;
          }
          state.markets[idx] = row;
        } else {
          if (state.markets.some((x) => x.id === row.id)) {
            alert("市场 ID 已存在");
            return false;
          }
          state.markets.push(row);
        }
        expandedPlatforms.add(row.platform_id);
        Store.commit();
        return true;
      }
    );
    if (existing) {
      const idInput = $('#modal-form [name="id"]');
      if (idInput) idInput.readOnly = true;
    }
  }

  function viewAlerts() {
    const d = Store.get();
    const rows = d.alertRules
      .map(
        (r) => `
      <tr>
        <td>${esc(r.name)}</td>
        <td>${esc(Store.productName(r.product_id))}</td>
        <td>${esc(Store.platformName(r.platform_id))}</td>
        <td>${r.market_id ? esc(Store.marketName(r.market_id)) : '<span class="muted">全部市场</span>'}</td>
        <td>${esc(METRIC_LABELS[r.metric] || r.metric)}</td>
        <td><code>${esc(OP_LABELS[r.operator] || r.operator)} ${esc(r.threshold)}</code></td>
        <td>${esc(BASELINE_LABELS[r.baseline_mode] || r.baseline_mode)}</td>
        <td>${esc(r.silence_minutes)} 分</td>
        <td>${enabledBadge(r.enabled)}</td>
        <td class="row-actions">
          <button type="button" class="btn btn-sm btn-secondary" data-act="edit-alert" data-id="${esc(r.id)}">编辑</button>
          <button type="button" class="btn btn-sm btn-danger" data-act="del-alert" data-id="${esc(r.id)}">删除</button>
        </td>
      </tr>`
      )
      .join("");

    return `
      <div class="panel">
        <div class="panel-header">
          <h2>告警规则（结构化元配置）</h2>
          <div class="panel-actions">
            <a class="btn btn-secondary" href="#/alert-panel">告警面板</a>
            <button type="button" class="btn btn-primary" data-act="add-alert">新增规则</button>
          </div>
        </div>
        <p class="muted" style="margin-top:0">规则存于元配置库（Demo 用 localStorage），非 YAML 文件。市场留空表示该平台下全部市场。</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>名称</th><th>产品</th><th>平台</th><th>市场</th><th>指标</th><th>条件</th><th>基准</th><th>静默</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="10" class="empty">暂无规则</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  }

  function viewAlertPanel() {
    const d = Store.get();
    const events = d.alertEvents || [];
    const firingCount = events.filter((e) => e.status === "firing").length;
    const handledCount = events.filter((e) => e.status !== "firing").length;
    const statusFilter = sessionStorage.getItem("demo-alert-status") || "";
    const productFilter = sessionStorage.getItem("demo-alert-product") || "";
    const platformFilter = sessionStorage.getItem("demo-alert-platform") || "";
    const marketFilter = sessionStorage.getItem("demo-alert-market") || "";
    const markets = platformFilter
      ? d.markets.filter((m) => m.platform_id === platformFilter)
      : d.markets;

    let list = events.slice();
    if (statusFilter === "firing") list = list.filter((e) => e.status === "firing");
    if (statusFilter === "handled") list = list.filter((e) => e.status !== "firing");
    if (productFilter) list = list.filter((e) => e.product_id === productFilter);
    if (platformFilter) list = list.filter((e) => e.platform_id === platformFilter);
    if (marketFilter) list = list.filter((e) => e.market_id === marketFilter);

    const rows = list
      .map(
        (e) => `
      <tr>
        <td>${statusBadge(e.status === "firing" ? "firing" : "handled")}</td>
        <td>${esc(e.rule_name)}</td>
        <td>${esc(Store.productName(e.product_id))}</td>
        <td>${esc(Store.platformName(e.platform_id))}</td>
        <td>${e.market_id ? esc(Store.marketName(e.market_id)) : '<span class="muted">—</span>'}</td>
        <td>${
          e.shop_name || e.shop_id
            ? e.listing_url
              ? `<a class="shop-link" href="${esc(e.listing_url)}" target="_blank" rel="noopener">${esc(e.shop_name || e.shop_id)}</a>`
              : esc(e.shop_name || e.shop_id)
            : '<span class="muted">—</span>'
        }</td>
        <td>${esc(METRIC_LABELS[e.metric] || e.metric)}</td>
        <td><code>${esc(e.observed_value)}</code> / <code>${esc(e.threshold)}</code></td>
        <td class="muted">${esc((e.fired_at || "").slice(0, 16).replace("T", " "))}</td>
        <td class="muted">${esc(e.message || "")}</td>
        <td class="row-actions">
          ${e.status === "firing" ? `<button type="button" class="btn btn-sm btn-primary" data-act="handle-alert" data-id="${esc(e.id)}">已处理</button>` : ""}
          <button type="button" class="btn btn-sm btn-danger" data-act="del-alert-event" data-id="${esc(e.id)}">删除</button>
        </td>
      </tr>`
      )
      .join("");

    return `
      <div class="stats">
        <div class="stat"><div class="label">告警中</div><div class="value">${firingCount}</div></div>
        <div class="stat"><div class="label">已处理</div><div class="value">${handledCount}</div></div>
        <div class="stat"><div class="label">合计</div><div class="value">${events.length}</div></div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <h2>告警事件</h2>
          <div class="panel-actions">
            <button type="button" class="btn btn-secondary" data-act="simulate-alert">模拟触发</button>
            <a class="btn btn-secondary" href="#/alerts">管理规则</a>
          </div>
        </div>
        <p class="muted" style="margin-top:0">状态：告警中 → 已处理。店铺名可点击跳转商品链接。</p>
        <div class="toolbar">
          <div class="field">
            <label>状态</label>
            <select id="filter-alert-status">
              <option value="">全部</option>
              <option value="firing" ${statusFilter === "firing" ? "selected" : ""}>告警中</option>
              <option value="handled" ${statusFilter === "handled" ? "selected" : ""}>已处理</option>
            </select>
          </div>
          <div class="field">
            <label>产品</label>
            <select id="filter-alert-product">
              <option value="">全部产品</option>
              ${d.products.map((p) => `<option value="${esc(p.id)}" ${productFilter === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>平台</label>
            <select id="filter-alert-platform">
              <option value="">全部平台</option>
              ${d.platforms.map((p) => `<option value="${esc(p.id)}" ${platformFilter === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>市场</label>
            <select id="filter-alert-market">
              <option value="">全部市场</option>
              ${markets.map((m) => `<option value="${esc(m.id)}" ${marketFilter === m.id ? "selected" : ""}>${esc(Store.platformName(m.platform_id))} / ${esc(m.name)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>状态</th><th>规则</th><th>产品</th><th>平台</th><th>市场</th><th>店铺</th>
                <th>指标</th><th>观测 / 阈值</th><th>触发时间</th><th>说明</th><th>操作</th>
              </tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="11" class="empty">暂无告警事件</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  }

  function alertModal(existing) {
    const d = Store.get();
    const r = existing || {
      id: Store.uid("rule"),
      name: "",
      product_id: d.products[0]?.id || "",
      platform_id: d.platforms[0]?.id || "",
      market_id: "",
      shop_id: "",
      metric: "price_deviation_pct",
      operator: "abs_gt",
      threshold: 15,
      baseline_mode: "market_avg",
      enabled: true,
      silence_minutes: 60,
    };
    const marketsFor = (platformId) => d.markets.filter((m) => m.platform_id === platformId);
    const marketOpts = [["", "全部市场"]].concat(
      marketsFor(r.platform_id).map((m) => [m.id, `${m.name} (${m.country_code || m.id})`])
    );
    openModal(
      existing ? "编辑告警规则" : "新增告警规则",
      `
      ${field("名称", "name", r.name, "text", { required: true })}
      <div class="form-row">
        ${field("产品", "product_id", r.product_id, "select", { options: d.products.map((p) => [p.id, p.name]) })}
        ${field("平台", "platform_id", r.platform_id, "select", { options: d.platforms.map((p) => [p.id, p.name]) })}
      </div>
      ${field("市场", "market_id", r.market_id || "", "select", { options: marketOpts })}
      <div class="form-row">
        ${field("指标", "metric", r.metric, "select", { options: Object.entries(METRIC_LABELS) })}
        ${field("运算符", "operator", r.operator, "select", { options: Object.entries(OP_LABELS) })}
      </div>
      <div class="form-row">
        ${field("阈值", "threshold", r.threshold, "number", { step: "0.1", required: true })}
        ${field("基准模式", "baseline_mode", r.baseline_mode, "select", { options: Object.entries(BASELINE_LABELS) })}
      </div>
      ${field("静默期（分钟）", "silence_minutes", r.silence_minutes, "number")}
      ${field("启用", "enabled", r.enabled, "checkbox")}
      `,
      (data) => {
        const state = Store.get();
        const row = {
          id: existing?.id || Store.uid("rule"),
          name: String(data.name).trim(),
          product_id: data.product_id,
          platform_id: data.platform_id,
          market_id: String(data.market_id || "").trim(),
          shop_id: "",
          metric: data.metric,
          operator: data.operator,
          threshold: Number(data.threshold),
          baseline_mode: data.baseline_mode,
          enabled: !!data.enabled,
          silence_minutes: Number(data.silence_minutes) || 0,
        };
        if (!row.name) {
          alert("请填写名称");
          return false;
        }
        if (existing) {
          const idx = state.alertRules.findIndex((x) => x.id === existing.id);
          state.alertRules[idx] = row;
        } else {
          state.alertRules.push(row);
        }
        Store.commit();
        return true;
      }
    );

    const platformSelect = $('#modal-form [name="platform_id"]');
    const marketSelect = $('#modal-form [name="market_id"]');
    if (platformSelect && marketSelect) {
      platformSelect.addEventListener("change", () => {
        const list = marketsFor(platformSelect.value);
        marketSelect.innerHTML =
          `<option value="">全部市场</option>` +
          list
            .map((m) => `<option value="${esc(m.id)}">${esc(m.name)} (${esc(m.country_code || m.id)})</option>`)
            .join("");
      });
    }
  }

  function taskTable(tasks, { actions = true } = {}) {
    const rows = tasks
      .map(
        (t) => `
      <tr>
        <td><code>${esc(t.id)}</code></td>
        <td>${esc(Store.productName(t.product_id))}</td>
        <td>${esc(Store.platformName(t.platform_id))}</td>
        <td>${esc(Store.marketName(t.market_id))}</td>
        <td>${esc(t.schedule)}</td>
        <td>${enabledBadge(t.enabled)}</td>
        <td>${statusBadge(t.last_status)}</td>
        <td class="muted">${esc((t.last_run_at || "").slice(0, 16).replace("T", " "))}</td>
        <td class="muted">${esc(t.last_message || "")}</td>
        ${
          actions
            ? `<td class="row-actions">
          <button type="button" class="btn btn-sm btn-secondary" data-act="edit-task" data-id="${esc(t.id)}">编辑</button>
          <button type="button" class="btn btn-sm btn-secondary" data-act="toggle-task" data-id="${esc(t.id)}">${t.enabled ? "停用" : "启用"}</button>
          <button type="button" class="btn btn-sm btn-primary" data-act="run-task" data-id="${esc(t.id)}">立即执行</button>
          <button type="button" class="btn btn-sm btn-danger" data-act="del-task" data-id="${esc(t.id)}">删除</button>
        </td>`
            : ""
        }
      </tr>`
      )
      .join("");

    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>任务 ID</th><th>产品</th><th>平台</th><th>市场</th><th>计划</th><th>启用</th><th>状态</th><th>上次运行</th><th>摘要</th>
              ${actions ? "<th>操作</th>" : ""}
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="${actions ? 10 : 9}" class="empty">暂无任务</td></tr>`}</tbody>
        </table>
      </div>`;
  }

  function viewTasks() {
    return `
      <div class="panel">
        <div class="panel-header">
          <h2>抓取任务</h2>
          <div class="panel-actions">
            <button type="button" class="btn btn-primary" data-act="add-task">新增任务</button>
          </div>
        </div>
        ${taskTable(Store.get().tasks)}
      </div>`;
  }

  function taskModal(existing) {
    const d = Store.get();
    const t = existing || {
      id: Store.uid("task"),
      product_id: d.products[0]?.id || "",
      platform_id: d.platforms[0]?.id || "",
      market_id: d.markets[0]?.id || "",
      schedule: "每 6 小时",
      enabled: true,
      last_status: "pending",
      last_run_at: "",
      last_message: "等待调度",
    };
    const marketsFor = (platformId) => d.markets.filter((m) => m.platform_id === platformId);
    let marketOpts = marketsFor(t.platform_id);
    if (!marketOpts.length) marketOpts = d.markets;

    openModal(
      existing ? "编辑任务" : "新增任务",
      `
      <div class="form-row">
        ${field("产品", "product_id", t.product_id, "select", { options: d.products.map((p) => [p.id, p.name]) })}
        ${field("平台", "platform_id", t.platform_id, "select", { options: d.platforms.map((p) => [p.id, p.name]) })}
      </div>
      ${field("市场", "market_id", t.market_id, "select", { options: marketOpts.map((m) => [m.id, `${Store.platformName(m.platform_id)} / ${m.name}`]) })}
      ${field("调度计划", "schedule", t.schedule, "text", { required: true })}
      ${field("启用", "enabled", t.enabled, "checkbox")}
      `,
      (data) => {
        const state = Store.get();
        const row = {
          ...(existing || {
            last_status: "pending",
            last_run_at: "",
            last_message: "等待调度",
          }),
          id: existing?.id || Store.uid("task"),
          product_id: data.product_id,
          platform_id: data.platform_id,
          market_id: data.market_id,
          schedule: String(data.schedule).trim(),
          enabled: !!data.enabled,
        };
        if (existing) {
          const idx = state.tasks.findIndex((x) => x.id === existing.id);
          state.tasks[idx] = row;
        } else {
          state.tasks.push(row);
        }
        Store.commit();
        return true;
      }
    );

    const platformSelect = $('#modal-form [name="platform_id"]');
    const marketSelect = $('#modal-form [name="market_id"]');
    if (platformSelect && marketSelect) {
      platformSelect.addEventListener("change", () => {
        const list = marketsFor(platformSelect.value);
        marketSelect.innerHTML = list
          .map((m) => `<option value="${esc(m.id)}">${esc(Store.platformName(m.platform_id))} / ${esc(m.name)}</option>`)
          .join("");
      });
    }
  }

  function viewTaskStatus() {
    const d = Store.get();
    const runs = d.taskRuns || [];
    const overall = Store.runStats(runs);
    const statusFilter = sessionStorage.getItem("demo-task-status") || "";
    const taskFilter = sessionStorage.getItem("demo-task-run-task") || "";

    const perTaskRows = d.tasks
      .map((t) => {
        const s = Store.runStats(runs, t.id);
        const rateLabel = s.rate == null ? "—" : `${s.rate}%`;
        const rateClass = s.rate == null ? "" : s.rate >= 80 ? "badge-success" : s.rate >= 50 ? "badge-pending" : "badge-failed";
        return `
        <tr>
          <td><code>${esc(t.id)}</code></td>
          <td>${esc(Store.productName(t.product_id))}</td>
          <td>${esc(Store.platformName(t.platform_id))} / ${esc(Store.marketName(t.market_id))}</td>
          <td>${statusBadge(t.last_status)}</td>
          <td>${s.done}</td>
          <td>${s.success}</td>
          <td>${s.failed}</td>
          <td><span class="badge ${rateClass}">${rateLabel}</span></td>
          <td class="muted">${esc((t.last_run_at || "").slice(0, 16).replace("T", " "))}</td>
        </tr>`;
      })
      .join("");

    let history = runs.slice();
    if (taskFilter) history = history.filter((r) => r.task_id === taskFilter);
    if (statusFilter) history = history.filter((r) => r.status === statusFilter);
    history = history.slice(0, 80);

    const historyRows = history
      .map((r) => {
        const task = d.tasks.find((t) => t.id === r.task_id);
        return `
        <tr>
          <td class="muted">${esc((r.started_at || "").slice(0, 19).replace("T", " "))}</td>
          <td><code>${esc(r.task_id)}</code></td>
          <td>${task ? esc(Store.productName(task.product_id)) : "—"}</td>
          <td>${task ? `${esc(Store.platformName(task.platform_id))} / ${esc(Store.marketName(task.market_id))}` : "—"}</td>
          <td>${statusBadge(r.status)}</td>
          <td>${r.duration_sec != null ? `${r.duration_sec}s` : "—"}</td>
          <td>${r.listings != null ? r.listings : "—"}</td>
          <td class="muted">${esc(r.message || "")}</td>
        </tr>`;
      })
      .join("");

    const taskOptions = d.tasks
      .map(
        (t) =>
          `<option value="${esc(t.id)}" ${taskFilter === t.id ? "selected" : ""}>${esc(t.id)} · ${esc(Store.productName(t.product_id))} / ${esc(Store.marketName(t.market_id))}</option>`
      )
      .join("");

    return `
      <div class="stats">
        <div class="stat"><div class="label">历史运行次数</div><div class="value">${overall.done}</div></div>
        <div class="stat"><div class="label">成功</div><div class="value">${overall.success}</div></div>
        <div class="stat"><div class="label">失败</div><div class="value">${overall.failed}</div></div>
        <div class="stat"><div class="label">总成功率</div><div class="value">${overall.rate == null ? "—" : overall.rate + "%"}</div></div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>按任务汇总</h2></div>
        <p class="muted" style="margin-top:0">基于历史运行记录计算成功率（成功次数 / 已完成次数）。</p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>任务 ID</th><th>产品</th><th>平台 / 市场</th><th>最近状态</th>
                <th>运行次数</th><th>成功</th><th>失败</th><th>成功率</th><th>最近运行</th>
              </tr>
            </thead>
            <tbody>${perTaskRows || `<tr><td colspan="9" class="empty">暂无任务</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>历史运行记录</h2></div>
        <div class="toolbar">
          <div class="field" style="min-width:220px">
            <label>按任务筛选</label>
            <select id="filter-task-run-task">
              <option value="">全部任务</option>
              ${taskOptions}
            </select>
          </div>
          <div class="field">
            <label>按结果筛选</label>
            <select id="filter-task-status">
              <option value="">全部</option>
              <option value="success" ${statusFilter === "success" ? "selected" : ""}>成功</option>
              <option value="failed" ${statusFilter === "failed" ? "selected" : ""}>失败</option>
            </select>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>开始时间</th><th>任务 ID</th><th>产品</th><th>平台 / 市场</th>
                <th>结果</th><th>耗时</th><th>条数</th><th>摘要</th>
              </tr>
            </thead>
            <tbody>${historyRows || `<tr><td colspan="8" class="empty">暂无历史运行</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  }

  function seriesFilters(extra = "") {
    const d = Store.get();
    const product = sessionStorage.getItem("demo-chart-product") || "";
    const platform = sessionStorage.getItem("demo-chart-platform") || "";
    return `
      <div class="toolbar">
        <div class="field">
          <label>产品</label>
          <select id="filter-chart-product">
            <option value="">全部产品</option>
            ${d.products.map((p) => `<option value="${esc(p.id)}" ${product === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>平台</label>
          <select id="filter-chart-platform">
            <option value="">全部平台</option>
            ${d.platforms.map((p) => `<option value="${esc(p.id)}" ${platform === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
          </select>
        </div>
        ${extra}
      </div>`;
  }

  function filteredSeries() {
    const d = Store.get();
    const product = sessionStorage.getItem("demo-chart-product") || "";
    const platform = sessionStorage.getItem("demo-chart-platform") || "";
    return d.series.filter((s) => {
      if (product && s.product_id !== product) return false;
      if (platform && s.platform_id !== platform) return false;
      return true;
    });
  }

  function viewPriceTrend() {
    return `
      <div class="panel">
        <div class="panel-header"><h2>价格趋势（模拟 TDengine 查询）</h2></div>
        ${seriesFilters()}
        <div class="chart-box"><canvas id="chart-price"></canvas></div>
        <p class="muted">展示近 30 日价格；最多绘制 6 条序列。</p>
      </div>`;
  }

  function viewCategoryTrend() {
    const groupBy = sessionStorage.getItem("demo-chart-groupby") || "platform";
    return `
      <div class="panel">
        <div class="panel-header"><h2>分类聚合价格趋势</h2></div>
        ${seriesFilters(`
          <div class="field">
            <label>聚合维度</label>
            <select id="filter-chart-groupby">
              <option value="platform" ${groupBy === "platform" ? "selected" : ""}>按平台</option>
              <option value="market" ${groupBy === "market" ? "selected" : ""}>按市场</option>
            </select>
          </div>`)}
        <div class="chart-box"><canvas id="chart-category"></canvas></div>
        <p class="muted">对筛选范围内的序列按维度求日均价。</p>
      </div>`;
  }

  function isoDateOnly(d) {
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const RELATIVE_RANGES = {
    "7d": { days: 7, label: "近一周" },
    "30d": { days: 30, label: "近一个月" },
    "90d": { days: 90, label: "近三个月" },
    "180d": { days: 180, label: "近半年" },
  };

  function rangeFromRelative(key) {
    const def = RELATIVE_RANGES[key] || RELATIVE_RANGES["30d"];
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (def.days - 1));
    return { from: isoDateOnly(start), to: isoDateOnly(end) };
  }

  function applyRelativeRange(key) {
    const range = rangeFromRelative(key);
    sessionStorage.setItem("demo-detail-relative", key);
    sessionStorage.setItem("demo-detail-from", range.from);
    sessionStorage.setItem("demo-detail-to", range.to);
  }

  function getDetailFilters() {
    let relative = sessionStorage.getItem("demo-detail-relative");
    if (relative == null) {
      applyRelativeRange("30d");
      relative = "30d";
    }
    const defaults = rangeFromRelative(relative === "-" ? "30d" : relative);
    return {
      product: sessionStorage.getItem("demo-detail-product") || "",
      platform: sessionStorage.getItem("demo-detail-platform") || "",
      market: sessionStorage.getItem("demo-detail-market") || "",
      shop: sessionStorage.getItem("demo-detail-shop") || "",
      alert: sessionStorage.getItem("demo-detail-alert") || "",
      relative,
      from: sessionStorage.getItem("demo-detail-from") || defaults.from,
      to: sessionStorage.getItem("demo-detail-to") || defaults.to,
    };
  }

  function getExpandedSeries() {
    try {
      return new Set(JSON.parse(sessionStorage.getItem("demo-detail-expanded") || "[]"));
    } catch {
      return new Set();
    }
  }

  function setExpandedSeries(set) {
    sessionStorage.setItem("demo-detail-expanded", JSON.stringify([...set]));
  }

  function filterPointsByRange(points, from, to) {
    const fromTs = new Date(`${from}T00:00:00`).getTime();
    const toTs = new Date(`${to}T23:59:59`).getTime();
    return points.filter((p) => {
      const t = new Date(p.ts).getTime();
      return t >= fromTs && t <= toTs;
    });
  }

  function summarizePoints(points) {
    if (!points.length) {
      return { latestPrice: "—", latestSold: "—", latestRevenue: "—", avgPrice: "—", sumSold: 0, sumRevenue: 0 };
    }
    const last = points[points.length - 1];
    const avgPrice = Math.round((points.reduce((a, p) => a + p.price, 0) / points.length) * 100) / 100;
    const sumSold = points.reduce((a, p) => a + p.sold, 0);
    const sumRevenue = Math.round(points.reduce((a, p) => a + p.revenue, 0) * 100) / 100;
    return {
      latestPrice: last.price,
      latestSold: last.sold,
      latestRevenue: last.revenue,
      avgPrice,
      sumSold,
      sumRevenue,
    };
  }

  function filteredDetailSeries() {
    const d = Store.get();
    const f = getDetailFilters();
    return d.series.filter((s) => {
      if (f.product && s.product_id !== f.product) return false;
      if (f.platform && s.platform_id !== f.platform) return false;
      if (f.market && s.market_id !== f.market) return false;
      if (f.shop && s.shop_id !== f.shop) return false;
      if (f.alert) {
        const info = seriesAlertInfo(s);
        if (f.alert === "firing" && !info.firing.length) return false;
        if (f.alert === "ruled" && (!info.rules.length || info.firing.length)) return false;
        if (f.alert === "none" && (info.rules.length || info.firing.length)) return false;
      }
      return true;
    });
  }

  function seriesAlertInfo(s) {
    const d = Store.get();
    const rules = (d.alertRules || []).filter((r) => {
      if (!r.enabled) return false;
      if (r.product_id && r.product_id !== s.product_id) return false;
      if (r.platform_id && r.platform_id !== s.platform_id) return false;
      if (r.market_id && r.market_id !== s.market_id) return false;
      if (r.shop_id && r.shop_id !== s.shop_id) return false;
      return true;
    });
    const firing = (d.alertEvents || []).filter((e) => {
      if (e.status !== "firing") return false;
      if (e.product_id && e.product_id !== s.product_id) return false;
      if (e.platform_id && e.platform_id !== s.platform_id) return false;
      if (e.market_id && e.market_id !== s.market_id) return false;
      return true;
    });
    return { rules, firing };
  }

  function alertBadgeHtml(info) {
    if (!info.rules.length && !info.firing.length) {
      return `<span class="badge badge-off">无关联</span>`;
    }
    if (info.firing.length) {
      return `<span class="badge badge-alert-firing" title="${esc(info.firing.map((e) => e.rule_name).join("；"))}">告警中 ${info.firing.length}</span>`;
    }
    return `<span class="badge badge-alert-rule" title="${esc(info.rules.map((r) => r.name).join("；"))}">规则 ${info.rules.length}</span>`;
  }

  function getSummaryFilters() {
    let relative = sessionStorage.getItem("demo-summary-relative");
    if (relative == null) {
      const range = rangeFromRelative("30d");
      sessionStorage.setItem("demo-summary-relative", "30d");
      sessionStorage.setItem("demo-summary-from", range.from);
      sessionStorage.setItem("demo-summary-to", range.to);
      relative = "30d";
    }
    const defaults = rangeFromRelative(relative === "-" ? "30d" : relative);
    return {
      platform: sessionStorage.getItem("demo-summary-platform") || "",
      category: sessionStorage.getItem("demo-summary-category") || "",
      relative,
      from: sessionStorage.getItem("demo-summary-from") || defaults.from,
      to: sessionStorage.getItem("demo-summary-to") || defaults.to,
    };
  }

  function viewCategorySummary() {
    const d = Store.get();
    const f = getSummaryFilters();
    const productById = Object.fromEntries(d.products.map((p) => [p.id, p]));
    const categories = [...new Set(d.products.map((p) => p.category || "其他"))].sort();

    const matchedSeries = d.series.filter((s) => {
      if (f.platform && s.platform_id !== f.platform) return false;
      const cat = productById[s.product_id]?.category || "其他";
      if (f.category && cat !== f.category) return false;
      return true;
    });

    const byCategory = new Map();
    for (const s of matchedSeries) {
      const cat = productById[s.product_id]?.category || "其他";
      if (!byCategory.has(cat)) {
        byCategory.set(cat, {
          category: cat,
          products: new Set(),
          shops: new Set(),
          priceSum: 0,
          priceN: 0,
          sold: 0,
          revenue: 0,
        });
      }
      const bucket = byCategory.get(cat);
      bucket.products.add(s.product_id);
      bucket.shops.add(s.shop_id);
      const pts = filterPointsByRange(s.points, f.from, f.to);
      for (const p of pts) {
        bucket.priceSum += p.price;
        bucket.priceN += 1;
        bucket.sold += p.sold;
        bucket.revenue += p.revenue;
      }
    }

    const rows = [...byCategory.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .map((b) => {
        const avg = b.priceN ? Math.round((b.priceSum / b.priceN) * 100) / 100 : "—";
        const rev = Math.round(b.revenue * 100) / 100;
        return `
        <tr>
          <td><strong>${esc(b.category)}</strong></td>
          <td>${b.products.size}</td>
          <td>${b.shops.size}</td>
          <td>${esc(avg)}</td>
          <td>${esc(b.sold)}</td>
          <td>${esc(rev)}</td>
        </tr>`;
      })
      .join("");

    const productRows = matchedSeries
      .reduce((acc, s) => {
        const key = `${s.product_id}__${Store.productCategory(s.product_id)}`;
        if (!acc.has(key)) {
          acc.set(key, {
            product_id: s.product_id,
            category: Store.productCategory(s.product_id),
            priceSum: 0,
            priceN: 0,
            sold: 0,
            revenue: 0,
            shops: new Set(),
          });
        }
        const b = acc.get(key);
        b.shops.add(s.shop_id);
        for (const p of filterPointsByRange(s.points, f.from, f.to)) {
          b.priceSum += p.price;
          b.priceN += 1;
          b.sold += p.sold;
          b.revenue += p.revenue;
        }
        return acc;
      }, new Map());

    const productTable = [...productRows.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .map((b) => {
        const avg = b.priceN ? Math.round((b.priceSum / b.priceN) * 100) / 100 : "—";
        return `
        <tr>
          <td>${esc(b.category)}</td>
          <td>${esc(Store.productName(b.product_id))}</td>
          <td>${b.shops.size}</td>
          <td>${esc(avg)}</td>
          <td>${esc(b.sold)}</td>
          <td>${esc(Math.round(b.revenue * 100) / 100)}</td>
        </tr>`;
      })
      .join("");

    return `
      <div class="panel">
        <div class="panel-header"><h2>产品分类 · 销量 / 价格汇总</h2></div>
        <p class="muted" style="margin-top:0">按产品分类聚合所选时间范围内的均价、销量合计与销售额合计。</p>
        <div class="toolbar">
          <div class="field">
            <label>分类</label>
            <select id="filter-summary-category">
              <option value="">全部分类</option>
              ${categories.map((c) => `<option value="${esc(c)}" ${f.category === c ? "selected" : ""}>${esc(c)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>平台</label>
            <select id="filter-summary-platform">
              <option value="">全部平台</option>
              ${d.platforms.map((p) => `<option value="${esc(p.id)}" ${f.platform === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>相对时间</label>
            <select id="filter-summary-relative">
              <option value="-" ${f.relative === "-" ? "selected" : ""}>-</option>
              <option value="7d" ${f.relative === "7d" ? "selected" : ""}>近一周</option>
              <option value="30d" ${f.relative === "30d" ? "selected" : ""}>近一个月</option>
              <option value="90d" ${f.relative === "90d" ? "selected" : ""}>近三个月</option>
              <option value="180d" ${f.relative === "180d" ? "selected" : ""}>近半年</option>
            </select>
          </div>
          <div class="field">
            <label>开始日期</label>
            <input type="date" id="filter-summary-from" value="${esc(f.from)}" />
          </div>
          <div class="field">
            <label>结束日期</label>
            <input type="date" id="filter-summary-to" value="${esc(f.to)}" />
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>按分类汇总</h2></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>分类</th><th>产品数</th><th>店铺数</th><th>均价</th><th>销量合计</th><th>销售额合计</th></tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="6" class="empty">无数据</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>分类下产品明细</h2></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>分类</th><th>产品</th><th>店铺数</th><th>均价</th><th>销量合计</th><th>销售额合计</th></tr>
            </thead>
            <tbody>${productTable || `<tr><td colspan="6" class="empty">无数据</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  }

  function viewDetailData() {
    const d = Store.get();
    const f = getDetailFilters();
    const expanded = getExpandedSeries();
    const allForShopOptions = d.series.filter((s) => {
      if (f.product && s.product_id !== f.product) return false;
      if (f.platform && s.platform_id !== f.platform) return false;
      if (f.market && s.market_id !== f.market) return false;
      return true;
    });
    const shops = [...new Map(allForShopOptions.map((s) => [s.shop_id, s])).values()];
    const markets = f.platform ? d.markets.filter((m) => m.platform_id === f.platform) : d.markets;
    const list = filteredDetailSeries();

    const rows = list
      .map((s) => {
        const pts = filterPointsByRange(s.points, f.from, f.to);
        const sum = summarizePoints(pts);
        const open = expanded.has(s.id);
        const alertInfo = seriesAlertInfo(s);
        return `
        <tr class="series-row ${open ? "is-open" : ""} ${alertInfo.firing.length ? "has-alert" : ""}" data-act="toggle-series" data-id="${esc(s.id)}">
          <td class="expand-cell">${open ? "▾" : "▸"}</td>
          <td>${alertBadgeHtml(alertInfo)}</td>
          <td>${esc(Store.productName(s.product_id))}</td>
          <td class="muted">${esc(Store.productCategory(s.product_id))}</td>
          <td>${esc(Store.platformName(s.platform_id))}</td>
          <td>${esc(Store.marketName(s.market_id))}</td>
          <td>${esc(s.shop_name || s.shop_id)}</td>
          <td>${esc(sum.latestPrice)}</td>
          <td>${esc(sum.avgPrice)}</td>
          <td>${esc(sum.sumSold)}</td>
          <td>${esc(sum.sumRevenue)}</td>
          <td class="muted">${pts.length} 天</td>
        </tr>
        ${
          open
            ? `<tr class="series-expand">
          <td colspan="12">
            <div class="expand-panel">
              <div class="expand-meta muted">
                Serie：<code>${esc(s.id)}</code>
                · 区间 ${esc(f.from)} ~ ${esc(f.to)}
                · <a href="${esc(s.listing_url || "#")}" target="_blank" rel="noopener">店铺链接</a>
                ${
                  alertInfo.rules.length
                    ? ` · 关联规则：${alertInfo.rules.map((r) => `<a href="#/alerts">${esc(r.name)}</a>`).join("、")}`
                    : ""
                }
                ${
                  alertInfo.firing.length
                    ? ` · <a href="#/alert-panel">告警中 ${alertInfo.firing.length} 条</a>`
                    : ""
                }
              </div>
              <div class="chart-box chart-box-detail"><canvas id="chart-detail-${esc(s.id)}"></canvas></div>
              <div class="table-wrap" style="margin-top:0.75rem">
                <table>
                  <thead><tr><th>日期</th><th>价格</th><th>销量</th><th>销售额</th></tr></thead>
                  <tbody>
                    ${pts
                      .slice()
                      .reverse()
                      .slice(0, 14)
                      .map(
                        (p) =>
                          `<tr><td>${esc((p.ts || "").slice(0, 10))}</td><td>${esc(p.price)}</td><td>${esc(p.sold)}</td><td>${esc(p.revenue)}</td></tr>`
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
              <p class="muted">上表展示区间内最近 14 天明细；图表为完整选定区间。</p>
            </div>
          </td>
        </tr>`
            : ""
        }`;
      })
      .join("");

    return `
      <div class="panel">
        <div class="panel-header"><h2>详细数据（产品 / 平台 / 市场 / 店铺）</h2></div>
        <p class="muted" style="margin-top:0">点击某一 serie 行展开。告警列：<strong>告警中</strong>（有 firing 事件）/ <strong>规则</strong>（仅关联启用规则）/ <strong>无关联</strong>。</p>
        <div class="toolbar">
          <div class="field">
            <label>产品</label>
            <select id="filter-detail-product">
              <option value="">全部</option>
              ${d.products.map((p) => `<option value="${esc(p.id)}" ${f.product === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>平台</label>
            <select id="filter-detail-platform">
              <option value="">全部</option>
              ${d.platforms.map((p) => `<option value="${esc(p.id)}" ${f.platform === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>市场</label>
            <select id="filter-detail-market">
              <option value="">全部</option>
              ${markets.map((m) => `<option value="${esc(m.id)}" ${f.market === m.id ? "selected" : ""}>${esc(Store.platformName(m.platform_id))} / ${esc(m.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>店铺</label>
            <select id="filter-detail-shop">
              <option value="">全部</option>
              ${shops.map((s) => `<option value="${esc(s.shop_id)}" ${f.shop === s.shop_id ? "selected" : ""}>${esc(s.shop_name)} (${esc(Store.marketName(s.market_id))})</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>告警状态</label>
            <select id="filter-detail-alert">
              <option value="" ${!f.alert ? "selected" : ""}>全部</option>
              <option value="firing" ${f.alert === "firing" ? "selected" : ""}>告警中</option>
              <option value="ruled" ${f.alert === "ruled" ? "selected" : ""}>仅有规则</option>
              <option value="none" ${f.alert === "none" ? "selected" : ""}>无关联</option>
            </select>
          </div>
          <div class="field">
            <label>相对时间</label>
            <select id="filter-detail-relative">
              <option value="-" ${f.relative === "-" ? "selected" : ""}>-</option>
              <option value="7d" ${f.relative === "7d" ? "selected" : ""}>近一周</option>
              <option value="30d" ${f.relative === "30d" ? "selected" : ""}>近一个月</option>
              <option value="90d" ${f.relative === "90d" ? "selected" : ""}>近三个月</option>
              <option value="180d" ${f.relative === "180d" ? "selected" : ""}>近半年</option>
            </select>
          </div>
          <div class="field">
            <label>开始日期</label>
            <input type="date" id="filter-detail-from" value="${esc(f.from)}" />
          </div>
          <div class="field">
            <label>结束日期</label>
            <input type="date" id="filter-detail-to" value="${esc(f.to)}" />
          </div>
        </div>
        <p class="muted">共 ${list.length} 条 serie</p>
        <div class="table-wrap">
          <table class="series-table">
            <thead>
              <tr>
                <th></th><th>告警</th><th>产品</th><th>分类</th><th>平台</th><th>市场</th><th>店铺</th>
                <th>最新价</th><th>均价</th><th>销量合计</th><th>销售额合计</th><th>天数</th>
              </tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="12" class="empty">无匹配数据，请调整筛选</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  }

  function paintCharts(name) {
    const list = filteredSeries().slice(0, 6);
    if (name === "price-trend") {
      Charts.priceTrend("chart-price", list);
    }
    if (name === "category-trend") {
      const groupBy = sessionStorage.getItem("demo-chart-groupby") || "platform";
      Charts.categoryTrend("chart-category", filteredSeries(), groupBy);
    }
    if (name === "detail-data") {
      const f = getDetailFilters();
      const expanded = getExpandedSeries();
      for (const s of filteredDetailSeries()) {
        if (!expanded.has(s.id)) continue;
        const pts = filterPointsByRange(s.points, f.from, f.to);
        Charts.detailMetrics(`chart-detail-${s.id}`, pts);
      }
    }
  }

  /* ---------- Render & events ---------- */

  function render() {
    Charts.destroyAll();
    const name = route();
    setActiveNav(name);
    const content = $("#content");
    const views = {
      overview: viewOverview,
      products: viewProducts,
      platforms: viewPlatforms,
      markets: viewMarkets,
      "alert-panel": viewAlertPanel,
      alerts: viewAlerts,
      tasks: viewTasks,
      "task-status": viewTaskStatus,
      "price-trend": viewPriceTrend,
      "category-trend": viewCategoryTrend,
      "category-summary": viewCategorySummary,
      "detail-data": viewDetailData,
    };
    content.innerHTML = (views[name] || viewOverview)();
    requestAnimationFrame(() => paintCharts(name));
  }

  function onClick(e) {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const id = btn.dataset.id;
    const d = Store.get();

    if (act === "toggle-platform") {
      if (expandedPlatforms.has(id)) expandedPlatforms.delete(id);
      else expandedPlatforms.add(id);
      render();
      return;
    }

    if (act === "toggle-series") {
      const set = getExpandedSeries();
      if (set.has(id)) set.delete(id);
      else set.add(id);
      setExpandedSeries(set);
      render();
      return;
    }

    if (act === "add-product") return productModal(null);
    if (act === "edit-product") return productModal(d.products.find((x) => x.id === id));
    if (act === "del-product") {
      if (!confirm("删除该产品？")) return;
      d.products = d.products.filter((x) => x.id !== id);
      Store.commit();
      render();
      return;
    }

    if (act === "add-platform") return platformModal(null);
    if (act === "edit-platform") return platformModal(d.platforms.find((x) => x.id === id));
    if (act === "del-platform") {
      if (!confirm("删除该平台及其关联市场？")) return;
      d.platforms = d.platforms.filter((x) => x.id !== id);
      d.markets = d.markets.filter((m) => m.platform_id !== id);
      Store.commit();
      render();
      return;
    }

    if (act === "add-market") return marketModal(null, btn.dataset.platform);
    if (act === "edit-market") return marketModal(d.markets.find((x) => x.id === id));
    if (act === "del-market") {
      if (!confirm("删除该市场？")) return;
      d.markets = d.markets.filter((x) => x.id !== id);
      Store.commit();
      render();
      return;
    }

    if (act === "add-alert") return alertModal(null);
    if (act === "edit-alert") return alertModal(d.alertRules.find((x) => x.id === id));
    if (act === "del-alert") {
      if (!confirm("删除该告警规则？")) return;
      d.alertRules = d.alertRules.filter((x) => x.id !== id);
      d.alertEvents = (d.alertEvents || []).filter((e) => e.rule_id !== id);
      Store.commit();
      render();
      return;
    }
    if (act === "handle-alert") {
      const evt = (d.alertEvents || []).find((e) => e.id === id);
      if (!evt) return;
      evt.status = "handled";
      evt.updated_at = new Date().toISOString();
      Store.commit();
      render();
      return;
    }
    if (act === "del-alert-event") {
      if (!confirm("删除该告警事件？")) return;
      d.alertEvents = (d.alertEvents || []).filter((e) => e.id !== id);
      Store.commit();
      render();
      return;
    }
    if (act === "simulate-alert") {
      const rules = d.alertRules.filter((r) => r.enabled);
      const rule = rules[Math.floor(Math.random() * rules.length)] || d.alertRules[0];
      if (!rule) {
        alert("请先创建告警规则");
        return;
      }
      const seriesMatches = (d.series || []).filter(
        (s) => s.platform_id === rule.platform_id && s.product_id === rule.product_id
      );
      const s =
        seriesMatches[Math.floor(Math.random() * seriesMatches.length)] ||
        (d.series || [])[Math.floor(Math.random() * (d.series || []).length)];
      const market = d.markets.find((m) => m.id === s?.market_id) || d.markets[0];
      const value = Math.round(rule.threshold * (1.1 + Math.random() * 0.5) * 10) / 10;
      if (!d.alertEvents) d.alertEvents = [];
      d.alertEvents.unshift({
        id: Store.uid("evt"),
        rule_id: rule.id,
        rule_name: rule.name,
        product_id: rule.product_id,
        platform_id: rule.platform_id,
        market_id: s?.market_id || market?.id || "",
        shop_id: s?.shop_id || "",
        shop_name: s?.shop_name || "",
        listing_url: s?.listing_url || "",
        metric: rule.metric,
        observed_value: value,
        threshold: rule.threshold,
        status: "firing",
        fired_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message: `${METRIC_LABELS[rule.metric] || rule.metric} 观测值 ${value}，阈值 ${rule.threshold}`,
      });
      Store.commit();
      render();
      return;
    }

    if (act === "add-task") return taskModal(null);
    if (act === "edit-task") return taskModal(d.tasks.find((x) => x.id === id));
    if (act === "del-task") {
      if (!confirm("删除该任务？")) return;
      d.tasks = d.tasks.filter((x) => x.id !== id);
      d.taskRuns = (d.taskRuns || []).filter((r) => r.task_id !== id);
      Store.commit();
      render();
      return;
    }
    if (act === "toggle-task") {
      const t = d.tasks.find((x) => x.id === id);
      if (t) {
        t.enabled = !t.enabled;
        Store.commit();
        render();
      }
      return;
    }
    if (act === "run-task") {
      const t = d.tasks.find((x) => x.id === id);
      if (!t) return;
      const runId = Store.uid("run");
      const startedAt = new Date().toISOString();
      t.last_status = "running";
      t.last_message = "正在翻页采集…";
      t.last_run_at = startedAt;
      if (!d.taskRuns) d.taskRuns = [];
      d.taskRuns.unshift({
        id: runId,
        task_id: t.id,
        status: "running",
        started_at: startedAt,
        finished_at: "",
        duration_sec: null,
        listings: null,
        message: "正在翻页采集…",
      });
      Store.commit();
      render();
      setTimeout(() => {
        const ok = Math.random() > 0.2;
        const finishedAt = new Date().toISOString();
        const durationSec = Math.max(1, Math.round((new Date(finishedAt) - new Date(startedAt)) / 1000));
        const listings = ok ? 10 + Math.floor(Math.random() * 40) : 0;
        const message = ok ? `抓取 ${listings} 条店铺快照` : "模拟失败：反爬拦截";
        t.last_status = ok ? "success" : "failed";
        t.last_message = message;
        t.last_run_at = finishedAt;
        const run = (Store.get().taskRuns || []).find((r) => r.id === runId);
        if (run) {
          run.status = ok ? "success" : "failed";
          run.finished_at = finishedAt;
          run.duration_sec = durationSec;
          run.listings = listings;
          run.message = message;
        }
        Store.commit();
        if (route() === "tasks" || route() === "task-status" || route() === "overview") render();
      }, 900);
    }
  }

  function onChange(e) {
    const t = e.target;
    if (t.id === "filter-market-platform") {
      sessionStorage.setItem("demo-market-platform", t.value);
      render();
    }
    if (t.id === "filter-task-status") {
      sessionStorage.setItem("demo-task-status", t.value);
      render();
    }
    if (t.id === "filter-task-run-task") {
      sessionStorage.setItem("demo-task-run-task", t.value);
      render();
    }
    if (t.id === "filter-alert-status") {
      sessionStorage.setItem("demo-alert-status", t.value);
      render();
    }
    if (t.id === "filter-alert-product") {
      sessionStorage.setItem("demo-alert-product", t.value);
      render();
    }
    if (t.id === "filter-alert-platform") {
      sessionStorage.setItem("demo-alert-platform", t.value);
      sessionStorage.setItem("demo-alert-market", "");
      render();
    }
    if (t.id === "filter-alert-market") {
      sessionStorage.setItem("demo-alert-market", t.value);
      render();
    }
    if (t.id === "filter-chart-product") {
      sessionStorage.setItem("demo-chart-product", t.value);
      render();
    }
    if (t.id === "filter-chart-platform") {
      sessionStorage.setItem("demo-chart-platform", t.value);
      render();
    }
    if (t.id === "filter-chart-groupby") {
      sessionStorage.setItem("demo-chart-groupby", t.value);
      render();
    }
    if (t.id === "filter-detail-product") {
      sessionStorage.setItem("demo-detail-product", t.value);
      sessionStorage.setItem("demo-detail-shop", "");
      render();
    }
    if (t.id === "filter-detail-platform") {
      sessionStorage.setItem("demo-detail-platform", t.value);
      sessionStorage.setItem("demo-detail-market", "");
      sessionStorage.setItem("demo-detail-shop", "");
      render();
    }
    if (t.id === "filter-detail-market") {
      sessionStorage.setItem("demo-detail-market", t.value);
      sessionStorage.setItem("demo-detail-shop", "");
      render();
    }
    if (t.id === "filter-detail-shop") {
      sessionStorage.setItem("demo-detail-shop", t.value);
      render();
    }
    if (t.id === "filter-detail-alert") {
      sessionStorage.setItem("demo-detail-alert", t.value);
      render();
    }
    if (t.id === "filter-detail-relative") {
      if (t.value === "-") {
        sessionStorage.setItem("demo-detail-relative", "-");
      } else {
        applyRelativeRange(t.value);
      }
      render();
    }
    if (t.id === "filter-detail-from") {
      sessionStorage.setItem("demo-detail-from", t.value);
      sessionStorage.setItem("demo-detail-relative", "-");
      render();
    }
    if (t.id === "filter-detail-to") {
      sessionStorage.setItem("demo-detail-to", t.value);
      sessionStorage.setItem("demo-detail-relative", "-");
      render();
    }
    if (t.id === "filter-summary-category") {
      sessionStorage.setItem("demo-summary-category", t.value);
      render();
    }
    if (t.id === "filter-summary-platform") {
      sessionStorage.setItem("demo-summary-platform", t.value);
      render();
    }
    if (t.id === "filter-summary-relative") {
      if (t.value === "-") {
        sessionStorage.setItem("demo-summary-relative", "-");
      } else {
        const range = rangeFromRelative(t.value);
        sessionStorage.setItem("demo-summary-relative", t.value);
        sessionStorage.setItem("demo-summary-from", range.from);
        sessionStorage.setItem("demo-summary-to", range.to);
      }
      render();
    }
    if (t.id === "filter-summary-from") {
      sessionStorage.setItem("demo-summary-from", t.value);
      sessionStorage.setItem("demo-summary-relative", "-");
      render();
    }
    if (t.id === "filter-summary-to") {
      sessionStorage.setItem("demo-summary-to", t.value);
      sessionStorage.setItem("demo-summary-relative", "-");
      render();
    }
  }

  function bind() {
    $$(".nav-group").forEach((btn) => {
      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") !== "false";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        const children = $(`.nav-children[data-children="${btn.dataset.group}"]`);
        if (children) children.classList.toggle("hidden", open);
      });
    });

    $("#btn-toggle-sidebar").addEventListener("click", () => {
      $("#sidebar").classList.toggle("collapsed");
    });

    $("#btn-reset-data").addEventListener("click", () => {
      if (!confirm("重置全部演示数据？")) return;
      Store.reset();
      expandedPlatforms = new Set();
      render();
    });

    $("#modal-close").addEventListener("click", closeModal);
    $("#modal-cancel").addEventListener("click", closeModal);
    $("#modal-backdrop").addEventListener("click", (e) => {
      if (e.target.id === "modal-backdrop") closeModal();
    });
    $("#modal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if (!modalSaveHandler) return;
      const ok = modalSaveHandler(formData(e.target));
      if (ok !== false) {
        closeModal();
        render();
      }
    });

    $("#content").addEventListener("click", onClick);
    $("#content").addEventListener("change", onChange);
    window.addEventListener("hashchange", render);
  }

  bind();
  if (!location.hash) location.hash = "#/overview";
  render();
})();
