import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClothingCategory } from "@warmrobot/core";
import type { DbMaterial, DbSizeLabel, DbThickness } from "@/lib/db/types";
import {
  filterMaterialsForCategory,
  filterSizesForCategory,
  filterThicknessesForCategory,
  getBodysuitStyleOptions,
  getCategoryFieldConfig,
  getFitOptionsForCategory,
  getPantLengthOptions,
  type BodysuitStyle,
  type FillType,
  type PantLength,
  type SockHeight,
} from "@/legacy-wardrobe/lib/clothing-enums";
import { type ClothingFitType } from "@/lib/clothing-weight";
import { suggestSizeForCategory, type BabySizeProfile } from "@/lib/suggest-size";

export type ClothingFormState = {
  name: string;
  setName: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  sizeLabel: string;
  setSizeLabel: (value: string) => void;
  materialId: string;
  setMaterialId: (value: string) => void;
  thickness: string;
  setThickness: (value: string) => void;
  fitType: ClothingFitType;
  setFitType: (value: ClothingFitType) => void;
  fillType: FillType | "";
  setFillType: (value: FillType | "") => void;
  bodysuitStyle: BodysuitStyle | "";
  setBodysuitStyle: (value: BodysuitStyle | "") => void;
  pantLength: PantLength | "";
  setPantLength: (value: PantLength | "") => void;
  sockHeight: SockHeight | "";
  setSockHeight: (value: SockHeight | "") => void;
  fieldConfig: ReturnType<typeof getCategoryFieldConfig>;
  filteredMaterials: DbMaterial[];
  filteredSizes: DbSizeLabel[];
  filteredThicknesses: DbThickness[];
  fitOptions: ReturnType<typeof getFitOptionsForCategory>;
  bodysuitStyleOptions: ReturnType<typeof getBodysuitStyleOptions>;
  pantLengthOptions: ReturnType<typeof getPantLengthOptions>;
  markSizeManuallySet: () => void;
};

export function useClothingFormState({
  materials,
  sizes,
  thicknesses,
  babyProfile,
  initialCategory = null,
}: {
  materials: DbMaterial[];
  sizes: DbSizeLabel[];
  thicknesses: DbThickness[];
  babyProfile?: BabySizeProfile;
  initialCategory?: ClothingCategory | null;
}): ClothingFormState {
  const defaultThickness = thicknesses[0]?.code ?? "medium";
  const [name, setName] = useState("");
  const [category, setCategory] = useState(initialCategory ?? "");
  const [sizeLabel, setSizeLabel] = useState("");
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? "");
  const [thickness, setThickness] = useState<string>(defaultThickness);
  const [fitType, setFitType] = useState<ClothingFitType>("regular");
  const [fillType, setFillType] = useState<FillType | "">("");
  const [bodysuitStyle, setBodysuitStyle] = useState<BodysuitStyle | "">("");
  const [pantLength, setPantLength] = useState<PantLength | "">("");
  const [sockHeight, setSockHeight] = useState<SockHeight | "">("");
  const sizeManuallySetRef = useRef(false);

  useEffect(() => {
    if (initialCategory) setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    sizeManuallySetRef.current = false;
  }, [category]);

  const fieldConfig = useMemo(() => getCategoryFieldConfig(category), [category]);
  const filteredMaterials = useMemo(
    () => filterMaterialsForCategory(materials, category),
    [materials, category]
  );
  const filteredSizes = useMemo(
    () => filterSizesForCategory(sizes, category),
    [sizes, category]
  );
  const filteredThicknesses = useMemo(
    () => filterThicknessesForCategory(thicknesses, category),
    [thicknesses, category]
  );
  const fitOptions = useMemo(() => getFitOptionsForCategory(category), [category]);
  const bodysuitStyleOptions = useMemo(
    () => getBodysuitStyleOptions(category),
    [category]
  );
  const pantLengthOptions = useMemo(() => getPantLengthOptions(category), [category]);

  useEffect(() => {
    if (!category) return;

    const config = getCategoryFieldConfig(category);

    if (!config.showThickness) {
      setThickness(config.defaultThickness);
    } else if (!filteredThicknesses.some((row) => row.code === thickness)) {
      setThickness(config.defaultThickness);
    }

    if (!config.showFit) {
      setFitType(config.defaultFit);
    } else if (!config.fitOptions.includes(fitType)) {
      setFitType(config.defaultFit);
    }

    if (!config.showMaterial && filteredMaterials[0]) {
      setMaterialId(filteredMaterials[0].id);
    } else if (
      filteredMaterials.length &&
      !filteredMaterials.some((material) => material.id === materialId)
    ) {
      setMaterialId(filteredMaterials[0].id);
    }

    if (!config.showSize) {
      setSizeLabel("");
    } else if (sizeLabel && !filteredSizes.some((size) => size.code === sizeLabel)) {
      setSizeLabel("");
    }

    if (!config.showFillType) setFillType("");
    if (!config.showBodysuitStyle) setBodysuitStyle("");

    if (config.showPantLength && !pantLength && pantLengthOptions[0]) {
      setPantLength(pantLengthOptions[0].value);
    } else if (!config.showPantLength) {
      setPantLength("");
    }

    if (!config.showSockHeight) setSockHeight("");
  }, [
    category,
    filteredMaterials,
    filteredSizes,
    filteredThicknesses,
    fitType,
    materialId,
    pantLength,
    pantLengthOptions,
    sizeLabel,
    thickness,
  ]);

  useEffect(() => {
    if (!category || !fieldConfig.showSize || filteredSizes.length === 0) return;
    if (sizeManuallySetRef.current) return;
    if (!babyProfile?.birthDate) return;

    const suggestedSize = suggestSizeForCategory(
      category,
      filteredSizes.map((size) => size.code),
      babyProfile
    );
    if (suggestedSize) setSizeLabel(suggestedSize);
  }, [category, babyProfile, fieldConfig.showSize, filteredSizes]);

  const markSizeManuallySet = useCallback(() => {
    sizeManuallySetRef.current = true;
  }, []);

  return {
    name,
    setName,
    category,
    setCategory,
    sizeLabel,
    setSizeLabel,
    materialId,
    setMaterialId,
    thickness,
    setThickness,
    fitType,
    setFitType,
    fillType,
    setFillType,
    bodysuitStyle,
    setBodysuitStyle,
    pantLength,
    setPantLength,
    sockHeight,
    setSockHeight,
    fieldConfig,
    filteredMaterials,
    filteredSizes,
    filteredThicknesses,
    fitOptions,
    bodysuitStyleOptions,
    pantLengthOptions,
    markSizeManuallySet,
  };
}
