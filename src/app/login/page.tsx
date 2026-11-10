export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

import { LoginForm } from "./login-form";

export const metadata = {
  title: "登录",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
            PB
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">登录 PBDerp</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            通用型电商 ERP · 商品 / 库存 / 订单 / 采购
          </p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          账号由管理员创建。如需开通，请联系系统管理员。
        </p>
      </div>
    </main>
  );
}