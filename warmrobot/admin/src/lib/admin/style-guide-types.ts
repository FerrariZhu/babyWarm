export type AdminStyleGuide = {
  id: string;
  category_id: string;
  category_code: string;
  title: string;
  subtitle: string | null;
  pros: string;
  cons: string;
  usage_tips: string;
  sort_order: number;
  is_active: boolean;
};

export type CreateStyleGuideInput = {
  category_id: string;
  category_code: string;
  title: string;
  subtitle?: string | null;
  pros?: string;
  cons?: string;
  usage_tips?: string;
  sort_order?: number;
};

export type UpdateStyleGuideInput = {
  id: string;
  title?: string;
  subtitle?: string | null;
  pros?: string;
  cons?: string;
  usage_tips?: string;
  sort_order?: number;
  is_active?: boolean;
};
