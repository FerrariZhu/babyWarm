import { listAdminUsers } from "./actions";
import { UserInfoTable } from "@/components/user-info-table";

export default async function UsersPage() {
  const result = await listAdminUsers();

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-error/30 bg-error-container/40 p-6">
        <h1 className="font-headline-md mb-2 text-on-error-container">无法加载用户</h1>
        <p className="font-body-md text-on-error-container">{result.error}</p>
        <p className="font-body-md mt-3 text-on-error-container/80">
          请确认已配置 ADMIN_EMAILS、SUPABASE_SERVICE_ROLE_KEY，并已应用 migration
          20240101000022_admin_user_info_records.sql。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="font-headline-lg text-on-background">用户信息</h1>
        <p className="font-body-md mt-1 text-text-soft">
          读取 C 端 Supabase 真实数据；可编辑账号补充信息并保存，或手动新建无 C 端账号的用户记录。展开详情可查看该用户保存的穿衣记录。
        </p>
      </div>
      <UserInfoTable initialUsers={result.data} />
    </div>
  );
}
