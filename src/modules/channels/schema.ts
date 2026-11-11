import { z } from "zod";

export const channelTypes = ["CUSTOM", "SHOPIFY", "TIKTOK_SHOP", "TAOBAO", "JD", "DOUYIN"] as const;

export const createChannelSchema = z.object({
  name: z.string().trim().min(1, "渠道名称不能为空").max(100),
  code: z.string().trim().min(1, "渠道编码不能为空").max(64),
  type: z.enum(channelTypes),
});

export const importOrdersSchema = z.object({
  channelId: z.string().min(1),
  csv: z.string().trim().min(10, "请粘贴订单 CSV 内容"),
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type ImportOrdersInput = z.infer<typeof importOrdersSchema>;