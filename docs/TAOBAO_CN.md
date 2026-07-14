# 淘宝中国站 (cn_cn) 抓取教程

本文说明如何用 **price-sniffer** 抓取淘宝商品数据。流程与 Shopee SG 相同：

1. **普通 Chrome 人工登录**（无 Playwright、无 CDP）
2. **CDP Chrome 自动搜索**（只模拟搜索栏输入，不拼 URL）

产品与 Shopee 共用 `config/products.yaml`（当前关键词：`mvave tank-g`、`mvave Annblackbox`）。

> Shopee 新加坡教程见 [SHOPEE_SG.md](SHOPEE_SG.md)，两套流程互不影响；淘宝使用 **独立 profile** 和 **CDP 端口 9223**。

---

## 一、环境准备（一次性）

若已为 Shopee 配好环境，只需确认淘宝账号配置：

```bash
cd price-sniffer
source .venv/bin/activate
```

在 `config/auth.yaml` 增加并启用 **cn_cn** 账号（可参考 `config/auth.example.yaml`）：

```yaml
  - id: taobao_cn_cn_default
    platform_id: taobao
    market_id: cn_cn
    username: "你的淘宝账号"
    login_url: https://login.taobao.com/member/login.jhtml
    browser_profile_path: data/browser_profiles/taobao_cn_cn
    storage_state_path: data/sessions/taobao_cn_cn.json
    enabled: true
```

---

## 二、首次登录（普通 Chrome，无自动化）

**必须先做这一步**。登录阶段不要开 CDP，否则滑块验证更难通过。

```bash
# 1. 若之前被风控，先重置 profile
price-sniffer login --platform taobao --market cn_cn --reset-profile

# 2. 打开普通 Chrome（无 CDP）
./scripts/chrome_login_taobao.sh
```

在弹出的 Chrome 里：

1. 地址栏打开 **https://www.taobao.com**
2. 点击 **登录**，用手机号 / 密码或扫码登录
3. 完成 **滑块验证**（如有）
4. 确认能正常浏览、已是登录状态
5. **Cmd+Q 完全退出 Chrome**

保存 session：

```bash
price-sniffer session save --platform taobao --market cn_cn
price-sniffer session status
```

应看到 `taobao/cn_cn` 状态为 **OK**。

---

## 三、日常抓取（推荐：一键）

抓取前请 **Cmd+Q 退出所有 Chrome**。

淘宝默认 CDP 端口为 **9223**（与 Shopee 的 9222 分开，可同时保留两套 profile）。

```bash
source .venv/bin/activate
./scripts/scrape_cdp_taobao.sh
```

脚本会自动：

1. 启动带 CDP 的 Chrome（profile：`data/browser_profiles/taobao_cn_cn`，端口 `9223`）
2. 打开淘宝首页
3. 在搜索框（`#q`）逐字输入每个关键词并点击搜索
4. 解析 `item.taobao.com` / `detail.tmall.com` 链接写入 CSV
5. 成功后关闭 Chrome

成功时终端类似：

```
Parsed N listings for query 'mvave tank-g'
Saved N listings for series tank_g:cn_cn:taobao
Chrome closed via CDP
```

查看数据（与 Shopee 同一张表，按 platform / market 筛选）：

```bash
price-sniffer dashboard
# 浏览器打开 http://127.0.0.1:8080
```

---

## 四、分步抓取（滑块 / 登录验证时常用）

若一键脚本在 **auto-home** 时出现滑块或跳转登录页，用两步法：**人工先打开首页，再让程序只负责搜索**。

**终端 1 — 启动 CDP Chrome（淘宝端口）：**

```bash
PLATFORM=taobao CDP_PORT=9223 ./scripts/chrome_cdp.sh cn_cn
```

在 Chrome 里 **手动**：

1. 地址栏输入 `https://www.taobao.com` 回车（不要用程序自动跳转）
2. 完成滑块 / 登录验证
3. 确认首页已登录、能看到搜索框（`#q`）

**终端 2 — 抓取（跳过 auto-home）：**

```bash
source .venv/bin/activate
price-sniffer scrape --product tank_g --market cn_cn --platform taobao --headed \
  --manual-nav --auto-search --no-auto-home \
  --cdp-url http://127.0.0.1:9223
```

说明：

- `--no-auto-home`：不用 CDP `Page.navigate` 打开首页
- `--auto-search`：仍自动在搜索框输入并点击「搜索」
- `--cdp-url` 必须是 **9223**（淘宝脚本默认端口）

---

## 五、与 Shopee SG 的差异

| 项目 | Shopee SG | 淘宝 cn_cn |
|------|-----------|------------|
| 市场 ID | `sea_sg` | `cn_cn` |
| 平台 ID | `shopee` | `taobao` |
| 登录脚本 | `./scripts/chrome_login.sh sea_sg` | `./scripts/chrome_login_taobao.sh` |
| 一键抓取 | `./scripts/scrape_cdp.sh` | `./scripts/scrape_cdp_taobao.sh` |
| CDP 端口 | `9222` | `9223` |
| Profile 目录 | `data/browser_profiles/shopee_sea_sg` | `data/browser_profiles/taobao_cn_cn` |
| 首页 | https://shopee.sg | https://www.taobao.com |
| 验证 | OTP / captcha | 滑块 / 短信 / 扫码 |

两套可同时安装；抓取前关掉 Chrome，再跑对应脚本即可。

---

## 六、常见问题

### 1. `Taobao search bar not found` / 登录或验证页

**原因**：当前 tab 不在淘宝首页，没有 `#q` 搜索框。

**处理**：

- 用 **第四节分步抓取**（`--no-auto-home`）
- 在 Chrome 内手动完成滑块后再跑 scrape
- 仍失败：`--reset-profile` → 重新 `chrome_login_taobao.sh` → `session save`

### 2. `Chrome CDP did not become ready`（9223）

**原因**：9223 被占用，或普通 Chrome 占用了 profile。

**处理**：**Cmd+Q** 退出所有 Chrome；确认没有另一个淘宝 CDP 实例后再运行 `./scripts/scrape_cdp_taobao.sh`。

### 3. 和 Shopee 同时抓

可以，但 **不要同时跑两个 scrape 脚本**。顺序示例：

```bash
./scripts/scrape_cdp.sh          # Shopee，端口 9222
./scripts/scrape_cdp_taobao.sh   # 淘宝，端口 9223
```

### 4. 登录过期

```bash
price-sniffer session status
./scripts/chrome_login_taobao.sh
# 重新登录后 Cmd+Q
price-sniffer session save --platform taobao --market cn_cn
```

### 5. 不要用粘贴搜索 URL

不要粘贴 `https://s.taobao.com/search?q=...` 这类链接。只用 **搜索框** 或程序的 **auto-search**。

### 6. 未配置 auth 账号

```bash
price-sniffer scrape ... --platform taobao --market cn_cn
# 若 auth 未启用，可能无法通过 session 检查；请先在 auth.yaml 启用 taobao cn_cn
```

---

## 七、命令速查

| 目的 | 命令 |
|------|------|
| 人工登录 | `./scripts/chrome_login_taobao.sh` |
| 保存 cookie | `price-sniffer session save --platform taobao --market cn_cn` |
| 检查 session | `price-sniffer session status` |
| 一键抓取 | `./scripts/scrape_cdp_taobao.sh` |
| 仅启动 CDP Chrome | `PLATFORM=taobao CDP_PORT=9223 ./scripts/chrome_cdp.sh cn_cn` |
| 手动首页 + 自动搜索 | `price-sniffer scrape ... --platform taobao --market cn_cn --no-auto-home --auto-search --cdp-url http://127.0.0.1:9223` |
| 看面板 | `price-sniffer dashboard` |
| 重置 profile | `price-sniffer login --platform taobao --market cn_cn --reset-profile` |
| CLI 引导登录 | `price-sniffer login --platform taobao --market cn_cn` |

---

## 八、数据文件位置

| 路径 | 内容 |
|------|------|
| `data/listings_latest.csv` | 最新汇总（含 shopee + taobao） |
| `data/snapshots/<日期>/` | 按次快照 |
| `data/browser_profiles/taobao_cn_cn/` | 淘宝 Chrome 登录态 |
| `data/sessions/taobao_cn_cn.json` | cookie 快照（定时任务用） |
| `data/debug/` | 失败时的 HTML（如 `auto_home_block.html`） |

---

## 九、推荐工作流（总结）

```
首次:
  reset-profile (可选) → chrome_login_taobao.sh → 手动登录 → Cmd+Q → session save

每次抓取:
  Cmd+Q 关 Chrome → ./scripts/scrape_cdp_taobao.sh → dashboard 查看

若滑块/验证:
  PLATFORM=taobao CDP_PORT=9223 chrome_cdp.sh cn_cn
  → 手动打开 taobao.com → scrape --no-auto-home --auto-search --cdp-url http://127.0.0.1:9223
```
