# 京东中国站 (cn_cn) 抓取教程

本文说明如何用 **price-sniffer** 抓取京东商品数据。流程与淘宝、Shopee 相同：

1. **普通 Chrome 人工登录**（无 Playwright、无 CDP）
2. **CDP Chrome 自动搜索**（只模拟搜索栏输入，不拼 URL）

产品与 Shopee、淘宝共用 `config/products.yaml`（当前关键词：`mvave tank-g`、`mvave Annblackbox`）。

> Shopee 新加坡教程见 [SHOPEE_SG.md](SHOPEE_SG.md)，淘宝教程见 [TAOBAO_CN.md](TAOBAO_CN.md)。京东使用 **独立 profile** 和 **CDP 端口 9225**。

---

## 一、环境准备（一次性）

```bash
cd price-sniffer
source .venv/bin/activate
```

在 `config/auth.yaml` 增加并启用 **cn_cn** 京东账号（可参考 `config/auth.example.yaml`）：

```yaml
  - id: jd_cn_cn_default
    platform_id: jd
    market_id: cn_cn
    username: "你的京东账号"
    login_url: https://passport.jd.com/new/login.aspx
    browser_profile_path: data/browser_profiles/jd_cn_cn
    storage_state_path: data/sessions/jd_cn_cn.json
    enabled: true
```

---

## 二、首次登录（普通 Chrome，无自动化）

**必须先做这一步**。登录阶段不要开 CDP，否则滑块验证更难通过。

```bash
# 1. 若之前被风控，先重置 profile
price-sniffer login --platform jd --market cn_cn --reset-profile

# 2. 打开普通 Chrome（无 CDP）
./scripts/chrome_login_jd.sh
```

在弹出的 Chrome 里：

1. 地址栏打开 **https://www.jd.com**
2. 点击 **你好，请登录**，用手机号 / 密码或扫码登录
3. 完成 **滑块验证**（如有）
4. 确认能正常浏览、已是登录状态
5. **Cmd+Q 完全退出 Chrome**

保存 session：

```bash
price-sniffer session save --platform jd --market cn_cn
price-sniffer session status
```

应看到 `jd/cn_cn` 状态为 **OK**。

---

## 三、日常抓取（推荐：一键）

抓取前请 **Cmd+Q 退出所有 Chrome**。

京东默认 CDP 端口为 **9225**（与 Shopee 9222、淘宝 9223、Amazon 9224 分开）。

```bash
source .venv/bin/activate
./scripts/scrape_cdp_jd.sh
```

脚本会自动：

1. 启动带 CDP 的 Chrome（profile：`data/browser_profiles/jd_cn_cn`）
2. 自动打开京东首页（`--auto-home`）
3. 依次在搜索栏输入 `config/products.yaml` 中的关键词并点击搜索
4. 从 DOM 解析商品列表并保存
5. 完成后自动关闭 Chrome

---

## 四、分步操作（调试用）

### 4.1 手动打开 CDP Chrome

```bash
./scripts/chrome_cdp.sh cn_cn
# 或
PLATFORM=jd ./scripts/chrome_cdp.sh cn_cn
```

在 Chrome 中手动打开 https://www.jd.com，确认已登录。

### 4.2 只自动搜索（不自动打开首页）

若自动打开首页容易触发验证，可先手动打开首页，再：

```bash
price-sniffer scrape --product tank_g --market cn_cn --platform jd \
  --headed --manual-nav --auto-search --no-auto-home \
  --cdp-url http://127.0.0.1:9225
```

### 4.3 完整自动流程

```bash
price-sniffer scrape --product tank_g --market cn_cn --platform jd \
  --headed --manual-nav --auto-search \
  --cdp-url http://127.0.0.1:9225
```

---

## 五、常用命令

| 操作 | 命令 |
|------|------|
| 检查登录态 | `price-sniffer session status` |
| 重新登录 | `./scripts/chrome_login_jd.sh` → Cmd+Q → `session save` |
| 重置 profile | `price-sniffer login --platform jd --market cn_cn --reset-profile` |
| 一键抓取 | `./scripts/scrape_cdp_jd.sh` |
| 指定产品 | `./scripts/scrape_cdp_jd.sh cn_cn tank_g` |
| 保留 Chrome（调试） | `price-sniffer scrape ... --keep-browser` |

---

## 六、故障排查

### 搜索栏未清空 / 关键词连在一起

与 Shopee、淘宝相同，脚本会用 JS 清空搜索框；若仍异常，先手动打开首页再 `--no-auto-home`。

### 触发滑块 / 安全验证

1. 用 `./scripts/chrome_login_jd.sh` 重新登录（不要用 CDP 登录）
2. 抓取时加 `--no-auto-home`，在 CDP Chrome 里手动打开首页并通过验证
3. 降低抓取频率

### 0 条结果

检查 `data/debug/empty_cn_cn_*.html` 保存的页面 HTML，确认是否在搜索结果页、商品卡片是否加载完成。

### session 过期

```bash
price-sniffer session status   # 若 EXPIRED
./scripts/chrome_login_jd.sh
price-sniffer session save --platform jd --market cn_cn
```

---

## 七、端口与 profile 对照

| 平台 | CDP 端口 | Profile 目录 |
|------|----------|--------------|
| Shopee SG | 9222 | `data/browser_profiles/shopee_sea_sg` |
| Taobao CN | 9223 | `data/browser_profiles/taobao_cn_cn` |
| Amazon SG | 9224 | `data/browser_profiles/amazon_amazon_sg` |
| **京东 CN** | **9225** | **`data/browser_profiles/jd_cn_cn`** |

可同时保留多套 profile，互不干扰。
