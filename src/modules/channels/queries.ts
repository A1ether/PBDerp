import "server-only";

import { prisma } from "@/lib/db";

export async function listChannels(organizationId: string) {
  return prisma.channel.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { orders: true } } },
  });
}

export async function getChannel(organizationId: string, id: string) {
  const channel = await prisma.channel.findFirst({
    where: { id, organizationId },
    include: {
      _count: { select: { orders: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { salesOrder: { select: { orderNo: true } } },
      },
    },
  });
  return channel;
}

export async function countChannels(organizationId: string) {
  return prisma.channel.count({ where: { organizationId } });
}