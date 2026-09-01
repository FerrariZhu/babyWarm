import { listAdminVariants } from "./actions";
import { listAdminCategories } from "@/app/admin/categories/actions";
import { CategoryVariantAdmin } from "@/components/category-variant-admin";

type Props = {
  searchParams: Promise<{ category?: string }>;
};

export default async function VariantsPage({ searchParams }: Props) {
  const { category: categoryCode } = await searchParams;

  const [variantsResult, categoriesResult] = await Promise.all([
    listAdminVariants(),
    listAdminCategories(),
  ]);

  if (!variantsResult.ok) {
    return (
      <div className="rounded-xl border border-error/30 bg-error-container/40 p-6">
        <h1 className="font-headline-md mb-2 text-on-error-container">无法加载细类型</h1>
        <p className="font-body-md text-on-error-container">{variantsResult.error}</p>
        <p className="font-body-md mt-3 text-on-error-container/80">
          请确认已应用 migration 20240101000025_garment_variants.sql
          与 20240101000032_variant_consumer_label_en.sql。
        </p>
      </div>
    );
  }

  if (!categoriesResult.ok) {
    return (
      <div className="rounded-xl border border-error/30 bg-error-container/40 p-6">
        <h1 className="font-headline-md mb-2 text-on-error-container">无法加载品类</h1>
        <p className="font-body-md text-on-error-container">{categoriesResult.error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="font-headline-lg text-on-background">品类与细类型</h1>
        <p className="font-body-md mt-1 text-text-soft">
          按品类配置细类型：类型名称、英文名、材料、版型与文案；C 端特征线由材料/版型等属性自动推导。
        </p>
      </div>

      <CategoryVariantAdmin
        categories={categoriesResult.data}
        variants={variantsResult.data}
        selectedCategoryCode={categoryCode}
      />
    </div>
  );
}
