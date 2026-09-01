/** Per-category variant axis specs — shared by generator and admin UI. */
import type { ClothingCategory } from "./types";
import type {
  BodysuitStyle,
  DownFillLevel,
  FillType,
  FitType,
  GarmentThickness,
  HatKind,
  Material,
  PantLength,
  ShoeThickness,
  SockHeight,
} from "./variant-axis-types";

export type VariantAxisSpec = {
  materials: Material[] | null;
  fillTypes: FillType[] | null;
  thicknesses: GarmentThickness[];
  fitTypes: FitType[];
  bodysuitStyles: BodysuitStyle[] | null;
  pantLengths: PantLength[] | null;
  sockHeights: SockHeight[] | null;
  hatKinds: HatKind[] | null;
};

const COTTON_MODAL_POLY: Material[] = ["cotton", "modal", "polyester"];
const COTTON_POLY: Material[] = ["cotton", "polyester"];
const COTTON_POLY_FLEECE: Material[] = ["cotton", "polyester", "fleece"];
const COTTON_POLY_WOOL: Material[] = ["cotton", "polyester", "wool"];
const COTTON_FLEECE_POLY_WOOL: Material[] = ["cotton", "fleece", "polyester", "wool"];
const COTTON_ACRYLIC_POLY_WOOL: Material[] = ["cotton", "acrylic", "polyester", "wool"];
const COTTON_FLEECE_POLY: Material[] = ["cotton", "fleece", "polyester"];

const THIN_ONLY: GarmentThickness[] = ["thin"];
const ALL_THICKNESS: GarmentThickness[] = ["thin", "medium", "thick"];
const DOWN_FILL_LEVELS: DownFillLevel[] = ["lightweight", "regular_fill", "extreme_cold"];
const SNEAKER_THICK: ShoeThickness[] = ["standard", "breathable"];
const LINED_SHOE_THICK: ShoeThickness[] = ["standard", "fleece_lined"];
const REGULAR_ONLY: FitType[] = ["regular"];
const STANDARD_WIDE: FitType[] = ["regular", "loose"];
const SLIM_STANDARD: FitType[] = ["slim", "regular"];
const SLIM_STANDARD_WIDE: FitType[] = ["slim", "regular", "loose"];

export const CATEGORY_VARIANT_SPECS: Record<ClothingCategory, VariantAxisSpec> = {
  bodysuit_short: {
    materials: COTTON_MODAL_POLY,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: REGULAR_ONLY,
    bodysuitStyles: ["triangle", "long_leg"],
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  bodysuit_long: {
    materials: COTTON_MODAL_POLY,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: REGULAR_ONLY,
    bodysuitStyles: ["triangle", "long_leg"],
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  tshirt_short: {
    materials: COTTON_POLY,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: STANDARD_WIDE,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  tshirt_long: {
    materials: COTTON_POLY,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: STANDARD_WIDE,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  thermal_top: {
    materials: COTTON_POLY,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: SLIM_STANDARD,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  sweater: {
    materials: COTTON_ACRYLIC_POLY_WOOL,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: SLIM_STANDARD_WIDE,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  fleece_top: {
    materials: COTTON_FLEECE_POLY,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: STANDARD_WIDE,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  vest: {
    materials: COTTON_FLEECE_POLY_WOOL,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: STANDARD_WIDE,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  vest_down: {
    materials: ["down"],
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: STANDARD_WIDE,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  outer_uv: {
    materials: COTTON_POLY,
    fillTypes: null,
    thicknesses: THIN_ONLY,
    fitTypes: REGULAR_ONLY,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  outer_shell: {
    materials: COTTON_FLEECE_POLY_WOOL,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: STANDARD_WIDE,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  outer_cotton: {
    materials: COTTON_POLY,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: STANDARD_WIDE,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  outer_down: {
    materials: ["down"],
    fillTypes: null,
    thicknesses: DOWN_FILL_LEVELS,
    fitTypes: STANDARD_WIDE,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  long_johns: {
    materials: COTTON_POLY,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: SLIM_STANDARD,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  pants_short: {
    materials: COTTON_POLY,
    fillTypes: null,
    thicknesses: THIN_ONLY,
    fitTypes: REGULAR_ONLY,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  pants_mid: {
    materials: COTTON_POLY,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: STANDARD_WIDE,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  pants_long: {
    materials: COTTON_POLY_FLEECE,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: STANDARD_WIDE,
    bodysuitStyles: null,
    pantLengths: ["nine_tenth", "full_length"],
    sockHeights: null,
    hatKinds: null,
  },
  shoes_sandal: {
    materials: null,
    fillTypes: null,
    thicknesses: [],
    fitTypes: REGULAR_ONLY,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  shoes_sneaker: {
    materials: null,
    fillTypes: null,
    thicknesses: SNEAKER_THICK,
    fitTypes: REGULAR_ONLY,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  shoes_leather: {
    materials: null,
    fillTypes: null,
    thicknesses: LINED_SHOE_THICK,
    fitTypes: REGULAR_ONLY,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  shoes_boot: {
    materials: null,
    fillTypes: null,
    thicknesses: LINED_SHOE_THICK,
    fitTypes: REGULAR_ONLY,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  hat: {
    materials: null,
    fillTypes: null,
    thicknesses: [],
    fitTypes: REGULAR_ONLY,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: ["sun", "everyday", "warm"],
  },
  scarf: {
    materials: COTTON_FLEECE_POLY_WOOL,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: REGULAR_ONLY,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  gloves: {
    materials: COTTON_FLEECE_POLY_WOOL,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: REGULAR_ONLY,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
  socks: {
    materials: COTTON_POLY,
    fillTypes: null,
    thicknesses: ALL_THICKNESS,
    fitTypes: REGULAR_ONLY,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: ["no_show", "ankle", "mid_calf", "over_calf"],
    hatKinds: null,
  },
  other: {
    materials: null,
    fillTypes: null,
    thicknesses: [],
    fitTypes: REGULAR_ONLY,
    bodysuitStyles: null,
    pantLengths: null,
    sockHeights: null,
    hatKinds: null,
  },
};
