import { redirect } from "next/navigation";

/** 品类管理已合并进细类型页（以细类型为底）。 */
export default function CategoriesPage() {
  redirect("/admin/variants");
}
