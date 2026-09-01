import { redirect } from "next/navigation";

export default function LegacyCategoriesRedirect() {
  redirect("/admin/categories");
}
