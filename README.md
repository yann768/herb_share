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
