# PBDerp 通用型电商 ERP — 调研与实施方案

> 版本：v0.1（调研定稿）
> 日期：2026-11-10
> 调研方式：GitHub CLI 检索 + 仓库元数据/README/许可证/目录结构核验
> 结论：**自建 TypeScript 模块化单体（Next.js + PostgreSQL + Prisma）**，不直接 fork 任何现有 ERP。
> 复用策略：**复用成熟库与架构模式，复用开源项目的领域模型和流程经验，不复制其代码与许可证风险。**

---

## 1. 结论摘要

### 1.1 最终技术选型

| 层 | 选型 | 理由 |
|---|---|---|
| 全栈框架 | Next.js 16（App Router）+ React 19 + TypeScript strict | 单一代码库、单一部署单元；类型从数据库贯穿到 UI；AI 训练语料最充分，错误提示直接 |
| 数据库 | PostgreSQL 17 | 事务、行锁、`numeric`、`jsonb`、部分索引齐全，适合库存台账与金额计算 |
| ORM | Prisma 7（稳定版，非 8 RC） | schema 可读、迁移明确、类型生成稳定；AI 生成 CRUD 成功率高 |
| 校验 | Zod 4 | 前后端同构校验；错误信息可结构化返回表单 |
| UI | Tailwind CSS 4 + shadcn/ui + lucide-react | 源码级组件，AI 可直接改；无黑盒组件库 |
| 认证 | better-auth（邮箱密码 + Cookie Session） | 成熟的安全实现（密码哈希、会话轮换、CSRF），避免自研认证 |
| 图表 | Recharts | 声明式、AI 熟悉、足够覆盖 ERP 报表 |
| 金额/数量 | PostgreSQL `numeric` + Prisma Decimal | 避免浮点误差；数量 4 位小数、金额 2 位小数 |
| 后台任务 | 先同步执行；P5 引入 pg-boss | 不引入 Redis，降低部署复杂度 |
| 测试 | Vitest + 领域服务单测；后续 Testcontainers 集成测试 | 先保证库存/金额核心算法可测 |

### 1.2 产品定位

**通用型电商 ERP = 电商订单履约中枢 + 进销存 + 轻财务 + 渠道适配层。**

第一版聚焦“一个仓/多仓、商品 SKU、采购入库、销售出库、库存台账、应收应付、权限与审计”的完整闭环；平台对接（淘宝/京东/抖音/Shopify/TikTok Shop 等）通过适配器在 P5 接入，不在第一版硬编码任何平台。

### 1.3 明确不做（第一版）

- 不做完整总账/会计凭证（只做应收、应付、收付款流水；总账在 P6 评估）。
- 不做生产制造/MRP/MES。
- 不做自有商城前台（ERP 是后台；前台通过 API 或渠道适配器对接）。
- 不做多组织结算/多法人合并报表（数据模型预留 `organizationId`，第一版单组织运行）。
- 不做复杂促销引擎/优惠券（订单价格以渠道回传或手工录入为准）。

---

## 2. 调研过程与候选项目评估

### 2.1 检索范围

使用 `gh search repos` / `gh api` 系统检索了以下方向（2026-11-10）：

- `ecommerce erp`、`erp ecommerce open source`、`ecommerce erp language:TypeScript`
- `order management system`、`order management language:TypeScript`
- `inventory management`、`inventory language:TypeScript`
- `headless commerce`、`shopify admin`、`commerce admin panel`
- `跨境电商 ERP`、`进销存`、`电商 订单 库存 系统`、`erp saas`
- `erpnext`、`odoo ecommerce`、`wms warehouse management`
- 对高星候选逐一核验：`license`、`language`、`archived`、`updated_at`、根目录结构、`package.json`、README、架构文档。

### 2.2 候选项目评估矩阵

> Star 数为检索时点数据；许可证以仓库 `LICENSE` 实际内容为准，不以 GitHub 标签为准。

| 项目 | Star | 许可证 | 技术栈 | 领域覆盖 | 结论 |
|---|---:|---|---|---|---|
| **open-mercato/open-mercato** | 1,916 | MIT（core，企业模块另授权） | TypeScript / Next.js / PostgreSQL / MikroORM / Awilix | CRM、商品、销售、仓库、发票、发货、支付、门户、工作流、RBAC、多租户 | **最佳“加速底座”候选；本项目不直接采用，取其模块化/多租户/事件/RBAC 约定** |
| **openlinker-project/openlinker** | 51 | Apache-2.0 | TypeScript / NestJS / React / PostgreSQL | 订单聚合、库存同步、刊登、物流、发票、渠道适配器 | **渠道适配层最佳参考；alpha 阶段，不适合作为 ERP 主底座** |
| **medusajs/medusa** | 37,152 | MIT core + Enterprise License | TypeScript / Node / PostgreSQL | 商品、订单、库存、支付、履约、Admin | 电商核心强，但非 ERP；缺采购/供应商/财务；模块体系重。**仅参考订单/履约模型** |
| **saleor/saleor** | 23,519 | BSD-3-Clause | Python / Django / GraphQL | Headless commerce | 技术栈不匹配；**参考 GraphQL API 与订单模型** |
| **vendurehq/vendure** | 8,573 | GPL-3.0（社区版）/ 商业许可 | TypeScript / NestJS / GraphQL | Headless commerce | **排除**：GPL 传染性不适合通用商业产品 |
| **frappe/erpnext** | 41,138 | GPL-3.0 | Python / Frappe / MariaDB | 完整 ERP：采购、销售、库存、会计、制造 | **领域模型最佳参考**（库存台账、单据状态、库存预留）；**排除代码复用**：GPL + 技术栈 |
| **jishenghua/jshERP** | 4,693 | Apache-2.0 | Java 8 / Spring Boot 2 / Vue 2 / MySQL | 进销存 + 财务 + 零售 + 仓库 + 报表 | **中文中小企业进销存流程最佳参考**；**排除代码复用**：栈老旧、非 AI 友好 |
| **GreaterWMS/GreaterWMS** | 4,447 | Apache-2.0 | Python / Django / Vue | WMS：入库、出库、库存、盘点、ASN | **WMS 流程参考**；范围窄，非电商 ERP |
| **inventree/InvenTree** | 7,837 | MIT | Python / Django / React | 物料、库存、BOM、采购 | **库存流水/批次/库位参考**；非电商订单 |
| **bagisto/bagisto** | 28,354 | MIT | PHP / Laravel | 电商前台 + 多商户 | 技术栈不匹配；**仅参考商品/订单字段** |
| **crbnos/carbon** | 2,815 | AGPL-3.0 + 商业许可 | TypeScript / React Router / PostgreSQL / Rust | 制造 ERP/MES/QMS | **排除**：AGPL；仅参考 Postgres schema/REST/MCP 设计 |
| **bigcapitalhq/bigcapital** | 4,098 | AGPL-3.0 | TypeScript / NestJS / React | 财务会计 | **排除代码复用**；**参考应收应付/报表口径** |
| **zeasin/qihang-cb-erp** | 118 | Apache-2.0 | Java | 跨境 ERP：独立站、Shein | 规模小；**参考跨境订单/平台映射** |
| **salgee/ittim-erp** | 89 | Apache-2.0 | PLpgSQL / Java? | 跨境 ERP：多平台订单、多仓、供应链 | **参考多平台订单聚合流程** |
| **nocobase/nocobase** | 24,881 | Other（低代码平台） | TypeScript / Node | 低代码业务系统 | 不是 ERP 成品；**参考动态字段/低代码配置**，第一版不引入 |
| **ever-co/ever-gauzy** | 8,736 | AGPL-3.0 | TypeScript / NestJS / Angular | ERP/CRM/HRM | **排除**：AGPL + 技术栈重 |

### 2.3 为什么没有“直接使用”任何一个项目

1. **许可证**：ERPNext/Vendure/Carbon/BigCapital/Gauzy 为 GPL/AGPL，直接 fork 会限制商业分发与闭源二次开发；Medusa 核心 MIT 但部分企业能力另授权。
2. **技术栈与 AI 友好度**：ERPNext（Python/Frappe）、jshERP（Java 8/Vue 2）、Saleor（Python/GraphQL）、Bagisto（PHP）均不适合“AI 主导快速迭代”的目标；生成代码的准确率和调试效率明显低于 TypeScript 全栈。
3. **领域不匹配**：Medusa/Vendure/Saleor/Bagisto 是“电商交易平台”，不是“ERP”；缺采购、供应商、库存台账、应收应付。GreaterWMS/InvenTree 是 WMS/物料，不含销售与财务。
4. **成熟度与锁定风险**：Open Mercato 设计理念最契合（AI-native、模块化、多租户），但版本 0.10.x、迭代很快、缺采购模块，且采用 MikroORM/Awilix 自有约定；直接作为产品底座会把团队绑定在一个年轻框架的升级节奏上。OpenLinker 仍为 alpha，且集成以欧洲平台为主。
5. **“简洁易用”约束**：用户明确要求脚手架简洁、错误提示直观。Next.js + Prisma + PostgreSQL 是当前 AI 辅助开发中反馈最直接、资料最充分的组合；引入大型框架会增加隐式约定和排错成本。

### 2.4 最终复用策略

| 复用对象 | 方式 | 具体内容 |
|---|---|---|
| shadcn/ui、lucide-react、Recharts、Tailwind | **直接依赖** | UI 组件、图标、图表、样式系统 |
| better-auth、Zod、Prisma、date-fns、decimal.js | **直接依赖** | 认证、校验、ORM、日期、金额 |
| Open Mercato | **架构参考** | `src/modules/<domain>` 模块边界、`tenant_id/organization_id` 贯穿、领域事件、RBAC、审计日志、API 文档 |
| OpenLinker | **架构参考** | Ports & Adapters：`ChannelAdapter`、`InventoryPort`、`OrderSourcePort`、`ShippingPort`、`InvoicingPort`；连接配置加密、同步任务重试分类 |
| ERPNext | **领域模型参考** | Stock Ledger（只追加流水）、单据状态机、库存预留、采购/销售/收货流程、数量与金额精度 |
| jshERP | **业务流程参考** | 中文中小企业进销存：采购→入库→销售→出库→退货→调拨→盘点→应收应付→报表 |
| InvenTree / GreaterWMS | **库存细节参考** | 库位、批次/序列号（P4）、盘点、ASN/收货、低库存预警 |
| Medusa / Saleor | **订单模型参考** | 订单行、履约单、退款单、支付状态与金额分摊 |

> 代码层面**不复制**上述项目源码；仅复用 MIT/Apache 的库，领域模型用 TypeScript 重新表达。

---

## 3. 总体架构

### 3.1 形态：模块化单体（Modular Monolith）

```
Browser
  │  Server Components / Server Actions / 少量 REST
  ▼
Next.js App (single deployable)
  ├─ app/(auth)           登录
  ├─ app/(dashboard)      后台页面
  ├─ app/api/auth          better-auth
  ├─ app/api/health        健康检查
  └─ modules/
       ├─ auth             会话、权限、组织
       ├─ products         商品/SPU/SKU/类目/品牌
       ├─ partners         客户/供应商
       ├─ warehouse        仓库/库位
       ├─ inventory        库存台账/预留/调拨/盘点
       ├─ sales            销售订单/发货/退货
       ├─ purchase         采购订单/收货
       ├─ finance          收付款/应收应付
       ├─ reporting        仪表盘/报表
       ├─ channels         P5 渠道适配器
       └─ audit            审计日志
  │
  ▼
PostgreSQL（Prisma）
```

选择理由：

- **事务边界清晰**：一次“确认订单 + 预留库存”在一个数据库事务内完成，避免分布式一致性。
- **AI 友好**：模块目录固定、依赖方向固定（modules → lib，不允许 modules 之间随意互引）；AI 只需在指定目录生成 schema/service/actions。
- **可演进**：未来拆服务时，按模块边界拆即可；第一版不引入消息队列/微服务。

### 3.2 目录约定

```
src/
  app/
    (auth)/login/page.tsx
    (dashboard)/layout.tsx
    (dashboard)/page.tsx                 # 仪表盘
    (dashboard)/products/...
    (dashboard)/inventory/...
    (dashboard)/sales/...
    (dashboard)/purchases/...
    (dashboard)/partners/...
    (dashboard)/reports/...
    (dashboard)/settings/...
    api/auth/[...all]/route.ts
    api/health/route.ts
  components/
    ui/                                  # shadcn 生成
    layout/                              # 侧边栏、顶栏、面包屑
    shared/                              # DataTable、PageHeader、StatusBadge、Pagination、FormField
  modules/
    <domain>/
      schema.ts                          # Zod 输入/输出
      queries.ts                         # 只读查询（server-only）
      service.ts                         # 领域写操作（事务）
      actions.ts                         # "use server" 入口：鉴权→校验→调用→审计→revalidate
  lib/
    db.ts                                # Prisma singleton
    auth.ts                              # better-auth 配置
    session.ts                           # requireSession/requirePermission
    permissions.ts                       # 角色→权限矩阵
    money.ts                             # Decimal 工具
    sequence.ts                          # 单号生成（事务内）
    errors.ts                            # AppError/ActionState
    pagination.ts                        # 分页/排序参数
    utils.ts                             # cn 等
prisma/
  schema.prisma
  seed.ts
```

**硬规则**

1. `app/` 只做页面编排和数据展示，不写业务事务。
2. `modules/*/service.ts` 是唯一允许写业务数据的地方；库存变更必须经过 `inventory/service.ts`。
3. `modules/*/actions.ts` 必须依次执行：`requirePermission` → `schema.parse` → `service` → `audit` → `revalidatePath`。
4. 所有业务表带 `organizationId`；所有查询默认按当前组织过滤。
5. 金额/数量一律用 `Decimal`，禁止 `number` 做金额运算。
6. 单据状态只能通过显式 transition 函数修改，禁止在 CRUD 里直接改 `status`。

### 3.3 请求与错误处理

- 表单：`useActionState` + Server Action，返回统一 `ActionState`：
  ```ts
  type ActionState =
    | { ok: true; message?: string; redirectTo?: string }
    | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
  ```
- 页面：Server Component 内查询失败抛出 `AppError`，由 `error.tsx` 展示可读信息；开发环境显示堆栈，生产环境显示错误码。
- 事务失败：`service` 抛出 `AppError("INSUFFICIENT_STOCK", "...")`；actions 转成表单错误。
- 不在客户端吞错；所有 mutation 必须有审计记录。

### 3.4 认证、组织与权限

- better-auth：邮箱 + 密码、HttpOnly Cookie Session；密码默认 scrypt 哈希。
- `User` 扩展字段：`role`、`organizationId`。
- 第一版：一个部署 = 一个组织；`Organization` 表存在，种子数据创建默认组织；所有业务表带 `organizationId`。
- 角色矩阵（第一版）：

| 权限 | ADMIN | MANAGER | SALES | PURCHASER | WAREHOUSE | FINANCE | VIEWER |
|---|---|---|---|---|---|---|---|
| 商品/客户/供应商 读写 | ✅ | ✅ | 客户读写/商品读 | 供应商读写/商品读 | 商品读 | 读 | 读 |
| 库存调整/调拨/盘点 | ✅ | ✅ | — | — | ✅ | — | 读 |
| 销售订单 创建/确认 | ✅ | ✅ | ✅ | — | — | — | 读 |
| 销售出库 | ✅ | ✅ | — | — | ✅ | — | 读 |
| 采购订单/收货 | ✅ | ✅ | — | ✅ | ✅（收货） | — | 读 |
| 收付款 | ✅ | ✅ | — | — | — | ✅ | 读 |
| 用户/角色/组织设置 | ✅ | — | — | — | — | — | — |

- 后续：按 `Member` 表支持一人多组织；权限矩阵可配置化。

### 3.5 审计与单号

- `AuditLog`：`organizationId`、`actorId`、`action`（如 `sales.order.confirm`）、`entityType`、`entityId`、`before`/`after` JSON、`ip`、`userAgent`、`createdAt`。
- `DocumentSequence`：按 `organizationId + type + period` 生成 `SO-2026-0001`、`PO-2026-0001`、`GRN-2026-0001`、`SHP-2026-0001`；在事务内 `UPDATE ... RETURNING`，避免并发重号。
- 审计日志不提供普通编辑/删除入口；仅 ADMIN 可查询。

---

## 4. 领域模型

### 4.1 主数据

- `Organization`：id、name、slug、currency、timezone、createdAt。
- `User`：better-auth 字段 + `role`、`organizationId`。
- `Warehouse`：code、name、address、isDefault、status。
- `WarehouseLocation`：warehouseId、code、name（货架/库位）。
- `Category`：parentId、name、code、sort。
- `Brand`：name、code。
- `Unit`：name、code（件/箱/kg）。
- `Product`（SPU）：code、name、categoryId、brandId、unitId、status、description、imageUrl、tags。
- `ProductVariant`（SKU）：productId、sku、barcode、name、spec（JSON）、purchasePrice、salePrice、reorderPoint、status。
- `Customer`：code、name、contact、phone、email、address、taxNo、creditLimit、status。
- `Supplier`：code、name、contact、phone、email、address、taxNo、status。

### 4.2 库存

- `StockLevel`：organizationId、warehouseId、locationId?、variantId、quantity、reservedQuantity、updatedAt。
  - 唯一键：`(organizationId, warehouseId, locationId, variantId)`。
  - 可用量 = `quantity - reservedQuantity`。
- `StockMovement`（只追加）：
  - `type`: `PURCHASE_RECEIPT | SALES_SHIPMENT | TRANSFER_IN | TRANSFER_OUT | ADJUSTMENT | RETURN_IN | RETURN_OUT | INITIAL`
  - `quantity`: 正数入库/负数出库（统一符号，便于汇总）
  - `unitCost`、`referenceType`、`referenceId`、`note`、`createdById`、`createdAt`
- `StockReservation`：
  - `salesOrderLineId`、`warehouseId`、`variantId`、`quantity`、`status`（ACTIVE/RELEASED/CONSUMED）、`createdAt`。
- `StockTake`（P4）：盘点单 + 盘点行 + 差异调整。

### 4.3 销售

- `SalesOrder`：orderNo、channelId?、externalOrderNo?、customerId、warehouseId、status、currency、subtotal、discountTotal、shippingFee、taxTotal、grandTotal、paidAmount、paymentStatus、orderedAt、confirmedAt、shippedAt、note、createdById。
- `SalesOrderLine`：orderId、variantId、skuSnapshot、nameSnapshot、quantity、unitPrice、discount、taxRate、lineTotal、reservedQuantity、shippedQuantity。
- `Shipment`：shipmentNo、orderId、warehouseId、carrier、trackingNo、status、shippedAt。
- `ShipmentLine`：shipmentId、orderLineId、quantity。
- `SalesReturn`（P5）：returnNo、orderId、status、reason、refundAmount、lines。

状态机：

```
DRAFT ──confirm──> CONFIRMED ──ship──> SHIPPED ──complete──> COMPLETED
  │                    │
  └──cancel──> CANCELLED <──cancel──┘
```

- `confirm`：校验可用库存 → 创建 `StockReservation` → `reservedQuantity += qty`。
- `ship`：`quantity -= qty`、`reservedQuantity -= qty`、reservation → CONSUMED、写 `StockMovement(SALES_SHIPMENT)`、生成 `Shipment`。
- `cancel`：仅 DRAFT / CONFIRMED 可取消；释放预留。

### 4.4 采购

- `PurchaseOrder`：orderNo、supplierId、warehouseId、status、currency、subtotal、taxTotal、grandTotal、paidAmount、paymentStatus、expectedAt、approvedAt、receivedAt、note、createdById。
- `PurchaseOrderLine`：orderId、variantId、skuSnapshot、nameSnapshot、quantity、unitCost、taxRate、lineTotal、receivedQuantity。
- `GoodsReceipt`：receiptNo、orderId、warehouseId、status、receivedAt、note。
- `GoodsReceiptLine`：receiptId、orderLineId、quantity、unitCost。

状态机：

```
DRAFT ──approve──> APPROVED ──order──> ORDERED ──receive──> PARTIALLY_RECEIVED / RECEIVED ──close──> CLOSED
  └──cancel──> CANCELLED
```

- `receive`：校验数量 → 增加 `StockLevel.quantity` → 写 `StockMovement(PURCHASE_RECEIPT)` → 更新行 `receivedQuantity` → 更新单据状态。
- 第一版支持“整单收货”；P4 支持部分收货/多次收货。

### 4.5 轻财务

- `Payment`：direction（IN/OUT）、amount、currency、method、referenceType（SALES_ORDER/PURCHASE_ORDER）、referenceId、paidAt、note、createdById。
- 订单上的 `paidAmount`、`paymentStatus` 由 Payment 汇总回写。
- 报表：应收 = 销售订单 grandTotal - paidAmount；应付 = 采购订单 grandTotal - paidAmount。

### 4.6 渠道（P5）

- `Channel`：type（SHOPIFY/TIKTOK_SHOP/TAOBAO/JD/DOUYIN/CUSTOM）、name、config（加密 JSON）、status、lastSyncAt。
- `ChannelOrder`：channelId、externalOrderNo、salesOrderId、rawPayload、syncStatus、errorMessage。
- `SyncJob`：channelId、type（ORDER_PULL/STOCK_PUSH/PRICE_PUSH）、status、cursor、attempts、lastError。
- 适配器接口（Ports）：
  ```ts
  interface OrderSourcePort { pullOrders(cursor): Promise<ExternalOrder[]> }
  interface InventoryPort { pushStock(items): Promise<PushResult[]> }
  interface ShippingPort { createLabel(order): Promise<Label> }
  interface InvoicingPort { issueInvoice(order): Promise<Invoice> }
  ```
- 第一版只做 `CUSTOM`/CSV 导入和手工订单；真实平台适配器按插件目录落地。

---

## 5. 关键流程与事务规则

### 5.1 销售确认（预留库存）

```
BEGIN
  lock order row (status must be DRAFT)
  for each line:
    SELECT * FROM stock_levels
      WHERE org/warehouse/location/variant = ...
      FOR UPDATE
    IF quantity - reserved_quantity < line.quantity THEN
      ROLLBACK; raise INSUFFICIENT_STOCK(line)
    UPDATE stock_levels SET reserved_quantity = reserved_quantity + qty
    INSERT stock_reservation(status=ACTIVE)
  UPDATE sales_orders SET status=CONFIRMED, confirmed_at=now()
  INSERT audit_log
COMMIT
```

### 5.2 销售出库

```
BEGIN
  lock order row (status must be CONFIRMED)
  for each line:
    lock stock_level row
    IF reserved_quantity < qty THEN raise RESERVATION_MISMATCH
    UPDATE stock_levels
      SET quantity = quantity - qty,
          reserved_quantity = reserved_quantity - qty
    UPDATE stock_reservations SET status=CONSUMED
    INSERT stock_movements(type=SALES_SHIPMENT, quantity=-qty, reference=order)
  INSERT shipments + shipment_lines
  UPDATE sales_orders SET status=SHIPPED, shipped_at=now()
  INSERT audit_log
COMMIT
```

### 5.3 采购收货

```
BEGIN
  lock purchase_order row (status in APPROVED/ORDERED/PARTIALLY_RECEIVED)
  for each line:
    lock stock_level row (create if absent)
    UPDATE stock_levels SET quantity = quantity + receivedQty
    INSERT stock_movements(type=PURCHASE_RECEIPT, quantity=+qty, unitCost)
    UPDATE purchase_order_lines SET received_quantity += qty
  INSERT goods_receipt + lines
  recompute order status: all received ? RECEIVED : PARTIALLY_RECEIVED
  INSERT audit_log
COMMIT
```

### 5.4 调拨 / 调整

- 调拨：同一事务内两条 movement（TRANSFER_OUT/IN），源仓减、目标仓增；数量必须一致。
- 调整：写 `ADJUSTMENT` movement，直接设置或增减；必须填原因；ADMIN/MANAGER/WAREHOUSE 可操作。
- 所有库存变更禁止直接改 `StockLevel` 而不写 `StockMovement`。

### 5.5 并发与一致性

- 所有库存写操作使用 `SELECT ... FOR UPDATE` 行锁；锁顺序固定：先 `StockLevel`，后单据。
- 单号生成在事务内完成，避免并发重号。
- 金额/数量使用 `numeric`；服务层用 `Decimal` 计算，禁止 JS 浮点。
- 所有写操作幂等性：状态机校验 + 唯一约束（如 `shipment_no`、`order_no`）。

---

## 6. 分期实施计划

### P0 — 脚手架与基础设施（本次）

- Next.js 16 + TypeScript strict + Tailwind 4 + shadcn/ui。
- PostgreSQL 数据库、Prisma schema、初始 migration、seed（默认组织 + 管理员 + 演示主数据）。
- better-auth 登录、会话、角色。
- 后台布局：侧边栏、顶栏、面包屑、响应式。
- 仪表盘：GMV、订单数、待发货、低库存、最近订单。
- `pnpm lint` / `pnpm build` 通过。

### P1 — 主数据

- 商品 SPU/SKU、类目、品牌、单位。
- 客户、供应商。
- 仓库、库位。
- 列表（搜索/分页/排序）、新建、编辑、停用。
- 表单校验与错误提示。

### P2 — 库存

- 库存列表（按 SKU/仓库/库位）。
- 库存流水（只追加）。
- 手工入库/出库/调整。
- 仓库调拨。
- 低库存预警。
- 库存服务单测（预留/释放/并发基础用例）。

### P3 — 销售与采购闭环

- 销售订单：创建、编辑草稿、确认（预留）、出库、取消、详情。
- 采购订单：创建、审批、下单、收货、取消、详情。
- 发货单、收货单。
- 收付款记录、应收应付。
- 仪表盘与基础报表联动。

### P4 — 报表、审计、权限细化

- 销售汇总、采购汇总、库存周转、毛利、客户/供应商对账。
- 审计日志查询。
- 用户管理、角色分配、组织设置。
- 盘点单、批次/序列号（按需）。

### P5 — 渠道与自动化

- 渠道适配器框架（Shopify / TikTok Shop / 淘宝 / 京东 / 抖音，按优先级）。
- 订单拉取、库存推送、价格推送、物流面单、发票。
- CSV 导入/导出。
- pg-boss 后台任务：重试、退避、死信、同步任务监控。
- Webhook 接收与签名校验。

### P6 — 生产化

- 集成测试（Testcontainers + PostgreSQL）。
- 备份/恢复、迁移策略、种子数据版本化。
- 可观测性：结构化日志、请求 ID、慢查询、错误上报。
- 安全：速率限制、CSRF、CSP、敏感字段加密、最小权限。
- 部署：Docker Compose / 单机 / 云；健康检查与滚动迁移。

---

## 7. 验收标准（MVP）

1. 管理员可登录；非授权角色看不到/改不了对应模块。
2. 可创建商品、SKU、仓库、库位、客户、供应商。
3. 可创建采购订单 → 审批 → 收货；库存数量与流水正确增加。
4. 可创建销售订单 → 确认；库存可用量减少但实物数量不变；取消可释放。
5. 销售出库后实物数量减少、预留归零、流水正确；发货单生成。
6. 低库存列表按 `available <= reorderPoint` 正确命中。
7. 仪表盘 KPI 与明细一致；金额无浮点误差。
8. 所有写操作有审计日志；单号并发不重复。
9. `pnpm lint`、`pnpm build`、核心单测通过。
10. 新环境按 README 一次启动成功（数据库迁移 + seed）。

---

## 8. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| 范围膨胀（ERP 无边无际） | 长期无法交付 | 严格按 P0–P3 闭环；P5 前不做平台对接；功能进入需过“是否影响订单/库存闭环”判断 |
| 库存并发超卖 | 数据错误、客诉 | 行锁 + 事务 + 可用量校验；P2 加并发测试 |
| 金额精度 | 对账差异 | 全链路 Decimal + `numeric(18,2)`；禁止 number |
| 多租户越权 | 数据泄露 | 所有查询强制 `organizationId`；service 层封装；P4 加 RLS 评估 |
| 框架升级（Next/Prisma） | 构建失败 | 锁定小版本；升级走独立 PR + 全量构建；不追 RC |
| 渠道 API 不稳定 | 同步失败 | 适配器隔离、重试分类、原始 payload 留存、死信队列 |
| AI 生成代码偏离架构 | 维护成本 | `AGENTS.md` + 模块模板 + lint/typecheck/单测门禁；actions/service 分层检查 |
| 开源许可证污染 | 商业风险 | 只依赖 MIT/Apache/BSD；GPL/AGPL 项目仅做阅读参考，不复制代码；依赖许可证扫描 |

---

## 9. 关键决策记录（ADR）

- **ADR-001：模块化单体，而非微服务**。第一版团队小、领域边界仍在演化；单库事务能保证库存/订单一致性。未来按模块拆。
- **ADR-002：Next.js 全栈，而非前后端分离**。减少一套 API/类型同步/部署；Server Actions 覆盖后台 CRUD；对外集成再暴露 REST。
- **ADR-003：Prisma 而非 Drizzle/TypeORM**。schema 可读性和迁移体验最适合 AI 生成；复杂库存操作可用 `$queryRaw` 补足。
- **ADR-004：库存只追加流水 + 余额表**。`StockMovement` 是审计与对账真相，`StockLevel` 是性能缓存；任何余额变更必须伴随流水。
- **ADR-005：单组织默认，数据模型预留多租户**。避免第一版陷入组织切换/计费/隔离复杂度，同时不封死 SaaS 演进。
- **ADR-006：不直接 fork 开源 ERP**。许可证、技术栈、框架锁定三重风险；采用“库复用 + 模式复用”。
- **ADR-007：金额/数量用 Decimal/numeric**。ERP 对账不允许浮点误差。
- **ADR-008：渠道适配器后置**。先把手动订单/库存闭环做扎实，再接平台；适配器按 Ports & Adapters 隔离。

---

## 10. 立即可执行的第一步

1. `pnpm create next-app` 初始化 Next.js 16 + TS + Tailwind。
2. 安装 Prisma 7、better-auth、Zod、shadcn/ui、Recharts、decimal.js。
3. 建库 `pbderp_dev`，写 `prisma/schema.prisma`，执行首次 migration。
4. 实现认证、布局、仪表盘、主数据、库存、销售/采购闭环。
5. 用 seed 数据跑通“采购收货 → 库存增加 → 销售确认 → 出库 → 库存减少”的演示链路。

> 本文档为实施基线；后续变更需在 `docs/adr/` 追加 ADR，不在本文直接改写结论。