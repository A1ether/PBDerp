# PBDerp · 通用型电商 ERP

一个面向中小电商团队的通用型 ERP 后台：**商品 / 多仓库存 / 销售订单履约 / 采购收货 / 轻财务 / 权限审计**。  
技术选型以「AI 辅助开发友好」为第一原则：单语言 TypeScript、单部署单元、强类型贯穿数据库到 UI。

> 前置调研、候选开源项目评估、技术选型与复用策略见 [`docs/00-research-and-plan.md`](docs/00-research-and-plan.md)。

## 已实现（MVP / P0–P3）

- 登录、会话、角色权限（7 种角色）
- 仪表盘：今日销售、待出库、低库存、库存价值、应收应付、7 天趋势
- 商品 SPU + 多 SKU、类目/品牌/单位、补货点
- 仓库 + 库位管理
- 客户 / 供应商管理
- **库存台账**：余额表 + 只追加流水 + 行锁防超卖
- 库存调整（入库/出库/盘点）、仓库调拨、低库存预警
- **销售订单**：草稿 → 确认预留 → 部分/全部出库 → 完成/取消；发货单
- **采购订单**：草稿 → 审批 → 下单 → 部分/全部收货；收货单
- **销售退货**：创建退货单 → 退货入库 → 退款流水；可退数量按已出库 - 已退货计算
- **库存盘点**：仓库快照 → 实盘录入 → 差异调整流水
- 收付款登记、应收应付、销售趋势/畅销 SKU 报表
- 用户管理、角色调整、审计日志
- seed 演示数据：商品、仓库、库存、客户、供应商、草稿订单

## 技术栈

| 层 | 选型 |
|---|---|
| 全栈 | Next.js 16（App Router）+ React 19 + TypeScript strict |
| 数据库 | PostgreSQL 17 |
| ORM | Prisma 7（`prisma-client` generator + `@prisma/adapter-pg`） |
| 校验 | Zod 4 |
| UI | Tailwind CSS 4 + shadcn/ui（Base UI） |
| 认证 | better-auth（邮箱密码 + Cookie Session） |
| 金额 | `decimal.js` + PostgreSQL `numeric` |
| 图表 | Recharts |
| 测试 | Vitest |

## 快速开始

### 1. 前置条件

- Node.js 24+（本机已验证 Node 26）
- pnpm 10+（仓库使用 pnpm 12）
- PostgreSQL 15+

### 2. 建库与配置

```bash
createdb pbderp_dev
cp .env.example .env
# 编辑 .env：DATABASE_URL、BETTER_AUTH_SECRET（openssl rand -hex 32）
```

`.env` 示例：

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/pbderp_dev?schema=public"
BETTER_AUTH_SECRET="<openssl rand -hex 32>"
BETTER_AUTH_URL="http://localhost:4477"
NEXT_PUBLIC_APP_URL="http://localhost:4477"
NEXT_PUBLIC_APP_NAME="PBDerp"
```

### 3. 安装、迁移、种子、启动

```bash
pnpm install
pnpm prisma migrate deploy   # 或 pnpm prisma migrate dev
pnpm seed
pnpm dev
```

打开 <http://localhost:4477>，使用 seed 输出的账号登录：

| 角色 | 邮箱 | 密码 |
|---|---|---|
| 管理员 | `admin@pbderp.local` | `admin12345` |
| 销售 | `sales@pbderp.local` | `demo12345` |
| 仓库 | `warehouse@pbderp.local` | `demo12345` |

> 生产环境请立即修改默认密码，并在 `prisma/seed.ts` 中替换演示账号。

## 本机目录说明（重要）

本机真实项目目录为 `/Users/a1ether/DevSpace/PBD/pbderp-real`，同级的 `PBDerp` 是指向它的软链接。  
这样处理是为了规避 Next.js 16.4.5 在旧目录路径上出现的构建期 prerender 缓存缺陷（`/_global-error` 的 `useContext` 空指针）；通过 `PBDerp` 访问、开发、构建均正常。  
如重建目录，请保持软链接，或直接使用新的目录名重新 `pnpm install` / 迁移数据库。

## 常用命令

```bash
pnpm dev             # 开发服务器（Turbopack）
pnpm build           # 生产构建（默认 Turbopack）
pnpm typecheck       # tsc --noEmit
pnpm lint            # ESLint
pnpm test            # Vitest 单元测试
pnpm prisma studio   # 数据库可视化
pnpm prisma migrate dev --name <name>
pnpm seed
```

> 若本机 `pnpm` 被 mise shim 干扰，可直接使用 `./node_modules/.bin/next`、`./node_modules/.bin/vitest`、`./node_modules/.bin/prisma`。

## 业务闭环

```
采购：DRAFT → APPROVED → ORDERED → RECEIVED
                 └── receive: 库存 +，写 PURCHASE_RECEIPT 流水，生成 GRN

销售：DRAFT → CONFIRMED → SHIPPED → COMPLETED
         └── confirm: 可用量校验 → 预留（reserved +）
         └── ship:    quantity -，reserved -，写 SALES_SHIPMENT 流水，生成 SHP

库存：StockLevel（余额） + StockMovement（只追加流水）
      所有变更在事务内 SELECT ... FOR UPDATE，禁止绕过 service 直接改余额
```

## 目录结构

```
src/
  app/
    login/
    (dashboard)/...        # 仪表盘、商品、库存、销售、采购、伙伴、财务、报表、设置
    api/auth/[...all]      # better-auth
  components/
    ui/                    # shadcn/ui
    layout/                # 侧边栏、顶栏、移动导航
    shared/                # ActionForm、分页、状态徽章、明细编辑器、图表
  modules/
    products|warehouses|partners|inventory|sales|purchases|finance|reporting|settings
      schema.ts            # Zod 输入
      queries.ts           # 只读查询（server-only）
      service.ts           # 事务写入 + 审计
      actions.ts           # "use server" 入口：鉴权 → 校验 → service → revalidate
  lib/
    db.ts auth.ts session.ts permissions.ts money.ts sequence.ts audit.ts ...
prisma/
  schema.prisma
  seed.ts
  migrations/
docs/
  00-research-and-plan.md
```

## 关键设计

- **模块化单体**：一个 Next.js 应用、一个 PostgreSQL；库存与订单在同一事务内一致。
- **多租户预留**：所有业务表带 `organizationId`；第一版单组织运行，后续可扩展。
- **库存只追加流水**：`StockMovement` 是审计真相，`StockLevel` 是余额缓存；每次余额变更必须写流水。
- **并发安全**：库存操作在事务内 `SELECT ... FOR UPDATE`；单号用 `INSERT ... ON CONFLICT DO UPDATE` 生成。
- **金额精度**：全链路 `Decimal`/`numeric`，禁止 JS 浮点做金额运算。
- **AI 友好**：固定模块目录、service/actions 分层、统一 `ActionState` 错误、`AGENTS.md` 约束。
- **部分履约**：出库/收货按行录入数量；状态自动在部分与全部之间切换。
- **退货与盘点**：退货入库回补库存并生成退款流水；盘点按实盘数调整并记流水。

## 尚未实现（后续阶段）

- 平台渠道适配（Shopify / TikTok Shop / 淘宝 / 京东 / 抖音）：P5
- CSV 导入导出、Webhook、pg-boss 后台任务：P5
- 采购退货、收货后取消、批次/序列号：后续
- 多组织切换、组织级 RLS、计费：P6
- 完整总账/会计凭证：只做轻财务，不做复式记账

## 调研与复用说明

本项目**没有直接 fork 任何开源 ERP**。选型与许可证评估见 `docs/00-research-and-plan.md`。核心结论：

- 代码依赖只用 MIT / Apache-2.0 / BSD 类库（Next、Prisma、better-auth、shadcn、Zod 等）。
- 领域模型参考 ERPNext（库存台账/单据状态）、jshERP（进销存流程）、Open Mercato（模块/多租户/RBAC 约定）、OpenLinker（渠道 Ports & Adapters）。
- 明确排除 GPL/AGPL 项目作为代码底座（Vendure、Carbon、BigCapital、ERPNext 等）。