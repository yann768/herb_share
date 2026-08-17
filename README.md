# 霍格沃茨互助站

面向移动端的草药、烹饪和换卡互助工具。

- `index.html`：统一互助首页、跨分类搜索、需求匹配和个人中心
- `herb.html`：草药发布与详情
- `cook.html`：烹饪发布与详情
- `trade.html`：换卡发布与详情

使用静态网站服务直接发布仓库根目录即可。

## 部署前配置

1. 在 Supabase SQL Editor 执行 `supabase-migration.sql`。
2. 在 Authentication → Sign In / Providers 的通用设置中启用 Allow anonymous sign-ins。
3. 确认三个帖子表没有遗留的宽松 RLS policy。

网站支持小程序传入 `source=miniprogram&action=publish`，并通过 `items`、`dish`、`want`、`offers`、`rarity` 等参数预填发布表单。

正式跨端导入使用 `scene`：小程序云函数以 service role 创建 20 分钟有效的临时记录，网站通过 `consume_web_import` 原子消费一次。重新执行迁移 SQL 后，还需部署小程序的 `createWebImport` 云函数并配置其 `SUPABASE_SERVICE_ROLE_KEY` 环境变量。

网站反向入口由 `syncMiniProgramEntries` 云函数维护。该函数生成小程序首页码与 URL Link，上传公开码图并更新 `mini_program_entries`；网站所有页面统一展示该首页入口。具体环境变量和运行方法见该云函数目录的 README。

“我的收藏”支持粘贴藏宝阁角色商品链接导入。首次部署需在仓库根目录执行：

```sh
supabase functions deploy cbg-collection-import --project-ref ygslzwiznvcfujonvblq
```

该函数只提取藏宝阁展示资料中的装饰配置 ID；网页在用户确认后将匹配结果合并到浏览器本地收藏。

小程序码统一使用首页码。网页优先读取 Supabase `mini_program_entries` 中的 `home` 记录；也可以直接将首页小程序码命名为 `miniprogram-code.png`，放在网站根目录（与 `index.html` 同级）作为备用图片。
