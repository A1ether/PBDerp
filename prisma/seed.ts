import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const ADMIN_EMAIL = "admin@pbderp.local";
const ADMIN_PASSWORD = "admin12345";
const DEMO_PASSWORD = "demo12345";

async function ensureUser(input: {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "MANAGER" | "SALES" | "PURCHASER" | "WAREHOUSE" | "FINANCE" | "VIEWER";
  organizationId: string;
}) {
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: input.role,
      organizationId: input.organizationId,
    },
    create: {
      name: input.name,
      email: input.email,
      emailVerified: true,
      role: input.role,
      organizationId: input.organizationId,
    },
  });

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });

  if (!account) {
    await prisma.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: passwordHash,
      },
    });
  } else {
    await prisma.account.update({
      where: { id: account.id },
      data: { password: passwordHash },
    });
  }

  return user;
}

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "default" },
    update: { name: "PBDerp 演示组织" },
    create: {
      name: "PBDerp 演示组织",
      slug: "default",
      currency: "CNY",
      timezone: "Asia/Shanghai",
    },
  });

  await ensureUser({
    name: "系统管理员",
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "ADMIN",
    organizationId: organization.id,
  });

  await ensureUser({
    name: "销售演示",
    email: "sales@pbderp.local",
    password: DEMO_PASSWORD,
    role: "SALES",
    organizationId: organization.id,
  });

  await ensureUser({
    name: "仓库演示",
    email: "warehouse@pbderp.local",
    password: DEMO_PASSWORD,
    role: "WAREHOUSE",
    organizationId: organization.id,
  });

  const categoryApparel = await prisma.category.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: "CAT-01" } },
    update: { name: "服饰" },
    create: { organizationId: organization.id, code: "CAT-01", name: "服饰", sort: 1 },
  });

  const categoryBags = await prisma.category.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: "CAT-02" } },
    update: { name: "箱包" },
    create: { organizationId: organization.id, code: "CAT-02", name: "箱包", sort: 2 },
  });

  const brandOwn = await prisma.brand.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: "BRAND-01" } },
    update: { name: "PBD 自有品牌" },
    create: { organizationId: organization.id, code: "BRAND-01", name: "PBD 自有品牌" },
  });

  const unitPcs = await prisma.unit.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: "PCS" } },
    update: { name: "件" },
    create: { organizationId: organization.id, code: "PCS", name: "件" },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: "WH-001" } },
    update: { name: "华东主仓" },
    create: {
      organizationId: organization.id,
      code: "WH-001",
      name: "华东主仓",
      address: "上海市青浦区示例路 88 号",
      isDefault: true,
    },
  });

  const location = await prisma.warehouseLocation.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: "DEFAULT" } },
    update: { name: "默认库位" },
    create: {
      organizationId: organization.id,
      warehouseId: warehouse.id,
      code: "DEFAULT",
      name: "默认库位",
    },
  });

  const products = [
    {
      code: "P-1001",
      name: "经典圆领 T 恤",
      categoryId: categoryApparel.id,
      variants: [
        { sku: "P-1001-BLK-M", name: "黑色 / M", purchase: "59", sale: "129", reorder: "20", stock: "120" },
        { sku: "P-1001-WHT-L", name: "白色 / L", purchase: "59", sale: "129", reorder: "20", stock: "80" },
      ],
    },
    {
      code: "P-2001",
      name: "轻量连帽外套",
      categoryId: categoryApparel.id,
      variants: [
        { sku: "P-2001-GRY-L", name: "灰色 / L", purchase: "189", sale: "399", reorder: "10", stock: "35" },
      ],
    },
    {
      code: "P-3001",
      name: "帆布托特包",
      categoryId: categoryBags.id,
      variants: [
        { sku: "P-3001-NAT", name: "原色", purchase: "32", sale: "89", reorder: "30", stock: "12" },
      ],
    },
  ];

  for (const item of products) {
    const product = await prisma.product.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: item.code } },
      update: { name: item.name, categoryId: item.categoryId },
      create: {
        organizationId: organization.id,
        code: item.code,
        name: item.name,
        categoryId: item.categoryId,
        brandId: brandOwn.id,
        unitId: unitPcs.id,
        status: "ACTIVE",
      },
    });

    for (const variant of item.variants) {
      const created = await prisma.productVariant.upsert({
        where: { organizationId_sku: { organizationId: organization.id, sku: variant.sku } },
        update: {
          name: variant.name,
          purchasePrice: variant.purchase,
          salePrice: variant.sale,
          reorderPoint: variant.reorder,
        },
        create: {
          organizationId: organization.id,
          productId: product.id,
          sku: variant.sku,
          name: variant.name,
          purchasePrice: variant.purchase,
          salePrice: variant.sale,
          reorderPoint: variant.reorder,
          status: "ACTIVE",
        },
      });

      const level = await prisma.stockLevel.upsert({
        where: {
          warehouseId_locationId_variantId: {
            warehouseId: warehouse.id,
            locationId: location.id,
            variantId: created.id,
          },
        },
        update: {},
        create: {
          organizationId: organization.id,
          warehouseId: warehouse.id,
          locationId: location.id,
          variantId: created.id,
          quantity: variant.stock,
        },
      });

      const existingMovement = await prisma.stockMovement.findFirst({
        where: { organizationId: organization.id, variantId: created.id, referenceType: "SEED" },
      });

      if (!existingMovement) {
        await prisma.stockMovement.create({
          data: {
            organizationId: organization.id,
            warehouseId: warehouse.id,
            locationId: location.id,
            variantId: created.id,
            type: "INITIAL",
            quantity: variant.stock,
            unitCost: variant.purchase,
            balanceAfter: level.quantity,
            referenceType: "SEED",
            referenceId: "INITIAL-STOCK",
            note: "演示期初库存",
          },
        });
      }
    }
  }

  const customer = await prisma.customer.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: "C-0001" } },
    update: { name: "上海星野贸易" },
    create: {
      organizationId: organization.id,
      code: "C-0001",
      name: "上海星野贸易",
      contact: "林女士",
      phone: "13800000001",
      email: "buyer@example.com",
      address: "上海市静安区示例路 1 号",
      creditLimit: "50000",
    },
  });

  await prisma.customer.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: "C-0002" } },
    update: { name: "杭州云集电商" },
    create: {
      organizationId: organization.id,
      code: "C-0002",
      name: "杭州云集电商",
      contact: "周先生",
      phone: "13800000002",
      address: "杭州市余杭区示例街 2 号",
      creditLimit: "30000",
    },
  });

  await prisma.supplier.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: "S-0001" } },
    update: { name: "广州服饰工厂" },
    create: {
      organizationId: organization.id,
      code: "S-0001",
      name: "广州服饰工厂",
      contact: "陈厂长",
      phone: "13800000003",
      address: "广州市白云区示例工业园",
    },
  });

  await prisma.supplier.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: "S-0002" } },
    update: { name: "义乌箱包供应链" },
    create: {
      organizationId: organization.id,
      code: "S-0002",
      name: "义乌箱包供应链",
      contact: "吴经理",
      phone: "13800000004",
      address: "义乌市国际商贸城",
    },
  });

  const demoOrderNo = "SO-DEMO-0001";
  const existingDemo = await prisma.salesOrder.findFirst({
    where: { organizationId: organization.id, orderNo: demoOrderNo },
  });

  if (!existingDemo) {
    const variant = await prisma.productVariant.findFirst({
      where: { organizationId: organization.id, sku: "P-1001-BLK-M" },
    });
    if (variant) {
      const quantity = new Prisma.Decimal(2);
      const unitPrice = variant.salePrice;
      const lineTotal = quantity.times(unitPrice).toDecimalPlaces(2);
      await prisma.salesOrder.create({
        data: {
          organizationId: organization.id,
          orderNo: demoOrderNo,
          customerId: customer.id,
          warehouseId: warehouse.id,
          status: "DRAFT",
          subtotal: lineTotal,
          grandTotal: lineTotal,
          note: "演示草稿订单，可在页面确认并出库。",
          lines: {
            create: {
              organizationId: organization.id,
              variantId: variant.id,
              skuSnapshot: variant.sku,
              nameSnapshot: `经典圆领 T 恤 · ${variant.name}`,
              quantity,
              unitPrice,
              lineTotal,
            },
          },
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Sales demo: sales@pbderp.local / ${DEMO_PASSWORD}`);
  console.log(`Warehouse demo: warehouse@pbderp.local / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });