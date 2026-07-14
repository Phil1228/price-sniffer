# Amazon Singapore (amazon_sg) 抓取教程

流程与 [SHOPEE_SG.md](SHOPEE_SG.md) / [TAOBAO_CN.md](TAOBAO_CN.md) 相同：

1. **普通 Chrome 人工登录**（无 Playwright、无 CDP）
2. **CDP 自动搜索**（搜索栏输入，不拼 URL）

- 市场 ID：`amazon_sg`
- 平台 ID：`amazon`
- 首页：https://www.amazon.sg
- CDP 端口：**9224**
- Profile：`data/browser_profiles/amazon_amazon_sg`

---

## 一、配置 auth（可选但推荐）

`config/auth.yaml` 参考 `config/auth.example.yaml`：

```yaml
  - id: amazon_amazon_sg_default
    platform_id: amazon
    market_id: amazon_sg
    username: "你的亚马逊邮箱"
    login_url: https://www.amazon.sg/ap/signin
    browser_profile_path: data/browser_profiles/amazon_amazon_sg
    storage_state_path: data/sessions/amazon_amazon_sg.json
    enabled: true
```

---

## 二、首次登录

```bash
source .venv/bin/activate
price-sniffer login --platform amazon --market amazon_sg --reset-profile  # 可选

./scripts/chrome_login_amazon.sh
# → amazon.sg → Sign in → OTP/captcha → Cmd+Q

price-sniffer session save --platform amazon --market amazon_sg
price-sniffer session status
```

---

## 三、日常一键抓取

```bash
./scripts/scrape_cdp_amazon.sh
```

---

## 四、captcha 时分步抓取

**终端 1：**

```bash
PLATFORM=amazon CDP_PORT=9224 ./scripts/chrome_cdp.sh amazon_sg
# 手动打开 https://www.amazon.sg，完成验证
```

**终端 2：**

```bash
price-sniffer scrape --product tank_g --market amazon_sg --platform amazon --headed \
  --manual-nav --auto-search --no-auto-home \
  --cdp-url http://127.0.0.1:9224
```

---

## 五、命令速查

| 目的 | 命令 |
|------|------|
| 人工登录 | `./scripts/chrome_login_amazon.sh` |
| 保存 session | `price-sniffer session save --platform amazon --market amazon_sg` |
| 一键抓取 | `./scripts/scrape_cdp_amazon.sh` |
| CDP Chrome | `PLATFORM=amazon CDP_PORT=9224 ./scripts/chrome_cdp.sh amazon_sg` |

---

## 六、与其他平台端口

| 平台 | 端口 |
|------|------|
| Shopee SG | 9222 |
| Taobao | 9223 |
| Amazon SG | 9224 |
