# Shopee Singapore (sea_sg) 抓取教程

本文说明如何用 **price-sniffer** 抓取 Shopee 新加坡站商品数据。推荐方案与 Shopee 反爬策略一致：

1. **普通 Chrome 人工登录**（无 Playwright、无 CDP）
2. **CDP Chrome 自动搜索**（只模拟搜索栏输入，不拼 URL）

---

## 一、环境准备（一次性）

```bash
cd price-sniffer
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pip install websocket-client
```

确认 `config/auth.yaml` 里 **sea_sg** 账号已启用：

```yaml
  - id: shopee_sea_sg_default
    platform_id: shopee
    market_id: sea_sg
    username: "你的邮箱"
    login_url: https://shopee.sg/buyer/login
    storage_state_path: data/sessions/shopee_sea_sg.json
    enabled: true
```

产品关键词在 `config/products.yaml`（当前为 `mvave tank-g`、`mvave Annblackbox`）。

---

## 二、首次登录（普通 Chrome，无自动化）

**必须先做这一步**，否则 CDP 打开首页容易触发 captcha。

```bash
# 1. 若之前被风控，先重置 profile（会清空该市场登录态）
price-sniffer login --platform shopee --market sea_sg --reset-profile

# 2. 打开普通 Chrome（无 CDP）
./scripts/chrome_login.sh sea_sg
```

在弹出的 Chrome 里：

1. 地址栏打开 **https://shopee.sg**
2. 点击 **Login**，输入账号密码
3. 完成 OTP / captcha（如有）
4. 确认能正常浏览、已是登录状态
5. **Cmd+Q 完全退出 Chrome**（不是只关窗口）

保存 session：

```bash
price-sniffer session save --platform shopee --market sea_sg
price-sniffer session status
```

应看到 `shopee/sea_sg` 状态为 **OK**。

---

## 三、日常抓取（推荐：一键）

抓取前请 **Cmd+Q 退出所有 Chrome**（避免普通 Chrome 占用 profile）。

```bash
source .venv/bin/activate
./scripts/scrape_cdp.sh
```

脚本会自动：

1. 启动带 CDP 的 Chrome（profile：`data/browser_profiles/shopee_sea_sg`）
2. 打开 Shopee 首页
3. 在搜索栏逐字输入每个关键词并点击搜索
4. 解析结果写入 CSV
5. 成功后关闭 Chrome

成功时终端类似：

```
Parsed 15 listings for query 'mvave tank-g'
Saved N listings for series tank_g:sea_sg:shopee
Chrome closed via CDP
```

查看数据：

```bash
price-sniffer dashboard
# 浏览器打开 http://127.0.0.1:8080
```

---

## 四、分步抓取（captcha 时常用）

若一键脚本在 **auto-home** 时出现 captcha（`scene=crawler_item`），用两步法：**人工先打开首页，再让程序只负责搜索**。

**终端 1 — 启动 CDP Chrome：**

```bash
./scripts/chrome_cdp.sh sea_sg
```

在 Chrome 里 **手动**：

1. 地址栏输入 `https://shopee.sg` 回车（不要用程序自动跳转）
2. 若出现 captcha，在浏览器里完成验证
3. 确认首页已登录、能看到搜索框

**终端 2 — 抓取（跳过 auto-home）：**

```bash
source .venv/bin/activate
price-sniffer scrape --product tank_g --market sea_sg --platform shopee --headed \
  --manual-nav --auto-search --no-auto-home \
  --cdp-url http://127.0.0.1:9222
```

说明：

- `--no-auto-home`：不再用 CDP `Page.navigate` 打开首页（避免再次触发 captcha）
- `--auto-search`：仍自动在搜索栏输入并点击搜索

---

## 五、常见问题

### 1. `Search bar not found` / captcha 页面

**原因**：当前 tab 在 captcha 页，没有搜索框。

**处理**：

- 用上面 **第四节分步抓取**，或
- 在 captcha 出现时于 Chrome 内手动完成验证，程序会等待最多 5 分钟再继续（新版已支持）
- 仍失败则：`--reset-profile` → 重新 `./scripts/chrome_login.sh` → `session save`

### 2. `Chrome CDP did not become ready`

**原因**：已有 Chrome 在跑，但未开 CDP 端口。

**处理**：**Cmd+Q** 退出所有 Chrome，再运行 `./scripts/scrape_cdp.sh`。

### 3. `CDP websocket 403`

**处理**：用项目自带脚本启动 Chrome（已带 `--remote-allow-origins=*`），不要自己开 Chrome。

### 4. 脚本卡住很久才有输出

首次会等 CDP 端口最多约 45 秒，属正常；现在会打印 `Checking http://127.0.0.1:9222 ...` 进度。

### 5. 登录过期

```bash
price-sniffer session status   # 若 EXPIRED
./scripts/chrome_login.sh sea_sg
# 重新登录后 Cmd+Q
price-sniffer session save --platform shopee --market sea_sg
```

### 6. 不要用粘贴搜索 URL

不要粘贴 `https://shopee.sg/search?keyword=...`，容易触发 Loading Issue / captcha。只用 **搜索栏** 或程序的 **auto-search**。

---

## 六、命令速查

| 目的 | 命令 |
|------|------|
| 人工登录 | `./scripts/chrome_login.sh sea_sg` |
| 保存 cookie | `price-sniffer session save --platform shopee --market sea_sg` |
| 检查 session | `price-sniffer session status` |
| 一键抓取 | `./scripts/scrape_cdp.sh` |
| 仅启动 CDP Chrome | `./scripts/chrome_cdp.sh sea_sg` |
| 手动首页 + 自动搜索 | `price-sniffer scrape ... --no-auto-home --auto-search --cdp-url http://127.0.0.1:9222` |
| 看面板 | `price-sniffer dashboard` |
| 重置 profile | `price-sniffer login --platform shopee --market sea_sg --reset-profile` |

---

## 七、数据文件位置

| 路径 | 内容 |
|------|------|
| `data/listings_latest.csv` | 最新汇总 |
| `data/snapshots/<日期>/` | 按次快照 |
| `data/browser_profiles/shopee_sea_sg/` | Chrome 登录态 |
| `data/debug/` | 失败时的 HTML 调试文件 |

---

## 八、推荐工作流（总结）

```
首次:
  reset-profile (可选) → chrome_login.sh → 手动登录 → Cmd+Q → session save

每次抓取:
  Cmd+Q 关 Chrome → ./scripts/scrape_cdp.sh → dashboard 查看

若 captcha:
  chrome_cdp.sh → 手动打开 shopee.sg → scrape --no-auto-home --auto-search
```
