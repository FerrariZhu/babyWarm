export type AdminVariant = {
  id: string;
  category_id: string | null;
  category_code: string;
  material: string | null;
  fill_type: string | null;
  thickness: string | null;
  fit_type: string | null;
  bodysuit_style: string | null;
  pant_length: string | null;
  sock_height: string | null;
  hat_kind?: string | null;
  warmth_value: number;
  admin_label: string;
  consumer_label: string;
  consumer_label_en: string;
  consumer_tags: string[];
  pros: string;
  cons: string;
  usage_tips: string;
  is_active: boolean;
  sort_order: number;
};

export type UpdateVariantInput = {
  id: string;
  consumer_label?: string;
  consumer_label_en?: string;
  material?: string | null;
  fill_type?: string | null;
  thickness?: string | null;
  fit_type?: string | null;
  bodysuit_style?: string | null;
  pant_length?: string | null;
  sock_height?: string | null;
  pros?: string;
  usage_tips?: string;
  warmth_value?: number;
  is_active?: boolean;
};

export type CreateVariantInput = {
  category_id: string;
  category_code: string;
  consumer_label: string;
  consumer_label_en: string;
  material?: string | null;
  fill_type?: string | null;
  thickness?: string | null;
  fit_type?: string | null;
  bodysuit_style?: string | null;
  pant_length?: string | null;
  sock_height?: string | null;
  warmth_value: number;
  is_active?: boolean;
};
