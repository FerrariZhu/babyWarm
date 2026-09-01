/** Garment variant attribute axes — shared by generator and copy rules. */

export type Material =
  | "cotton"
  | "modal"
  | "acrylic"
  | "polyester"
  | "wool"
  | "fleece"
  | "down";

export type FillType = "cotton_wadding" | "polyester_fill";
export type Thickness = "thin" | "medium" | "thick";
/** Shoe lining / season tier (stored in `thickness`). */
export type ShoeThickness = "standard" | "breathable" | "fleece_lined";
/** Down jacket fill tier (stored in `thickness`). */
export type DownFillLevel = "lightweight" | "regular_fill" | "extreme_cold";
export type GarmentThickness = Thickness | ShoeThickness | DownFillLevel;
export type FitType = "slim" | "regular" | "loose";
export type BodysuitStyle = "triangle" | "brief" | "long_leg";
export type PantLength = "nine_tenth" | "full_length";
export type SockHeight = "no_show" | "ankle" | "mid_calf" | "over_calf";
export type HatKind = "sun" | "everyday" | "warm";
