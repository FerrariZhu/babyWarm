"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClothingCategory } from "@warmrobot/core";
import {
  CLOTHING_CATEGORY_GROUPS,
  getCategoryGroup,
  normalizeCategoryCode,
  type CategoryGroupCode,
} from "@/lib/clothing-categories";

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="category-picker-check" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CategoryPicker({ initialCategory }: { initialCategory: string | null }) {
  const router = useRouter();
  const selectedCode = normalizeCategoryCode(initialCategory);

  const defaultGroup =
    (selectedCode ? getCategoryGroup(selectedCode)?.code : null) ??
    CLOTHING_CATEGORY_GROUPS[0].code;

  const [activeGroup, setActiveGroup] = useState<CategoryGroupCode>(defaultGroup);

  const activeItems = useMemo(
    () => CLOTHING_CATEGORY_GROUPS.find((g) => g.code === activeGroup)?.items ?? [],
    [activeGroup]
  );

  function handleSelect(code: ClothingCategory) {
    router.push(`/add?category=${code}`);
  }

  return (
    <div className="category-picker-screen">
      <header className="category-picker-header">
        <Link href="/add" className="category-picker-back" aria-label="返回">
          <BackIcon />
        </Link>
        <h1 className="category-picker-title">选择类别</h1>
        <div className="category-picker-header-spacer" aria-hidden />
      </header>

      <div className="category-picker-body">
        <nav className="category-picker-groups" aria-label="一级分类">
          {CLOTHING_CATEGORY_GROUPS.map((group) => {
            const isActive = group.code === activeGroup;
            return (
              <button
                key={group.code}
                type="button"
                onClick={() => setActiveGroup(group.code)}
                className={`category-picker-group-btn${isActive ? " is-active" : ""}`}
              >
                {group.label}
              </button>
            );
          })}
        </nav>

        <div className="category-picker-items" aria-label="二级分类">
          {activeItems.map((item) => {
            const isSelected = selectedCode === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelect(item.code)}
                className={`category-picker-item-btn${isSelected ? " is-selected" : ""}`}
              >
                <span>{item.label}</span>
                {isSelected && <CheckIcon />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
