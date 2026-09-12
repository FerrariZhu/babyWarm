"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { AnalyticsEvent, AnalyticsEventType } from "@/lib/analytics/event";

const VISITOR_ID_KEY = "warmrobot_analytics_visitor_id";

function getVisitorId(): string {
  const existing = window.localStorage.getItem(VISITOR_ID_KEY);
  if (existing) return existing;
  const visitorId = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_ID_KEY, visitorId);
  return visitorId;
}

function analyticsModuleName(element: Element): string | null {
  return element.getAttribute("data-analytics-module");
}

function sendEvent(event: AnalyticsEvent) {
  const body = JSON.stringify(event);
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/events", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}

function track(eventType: AnalyticsEventType, pagePath: string, moduleName: string | null, actionName: string | null) {
  sendEvent({ eventType, pagePath, moduleName, actionName, visitorId: getVisitorId() });
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const pagePathRef = useRef(pathname);

  useEffect(() => {
    pagePathRef.current = pathname;
    track("page_view", pathname, null, null);
    const observedModules = new WeakSet<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || observedModules.has(entry.target)) return;
          const moduleName = analyticsModuleName(entry.target);
          if (!moduleName) return;
          observedModules.add(entry.target);
          track("module_impression", pathname, moduleName, "view");
        });
      },
      { threshold: 0.5 }
    );

    const observeModule = (element: Element) => {
      if (analyticsModuleName(element)) observer.observe(element);
    };
    document.querySelectorAll("[data-analytics-module]").forEach(observeModule);
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          observeModule(node);
          node.querySelectorAll("[data-analytics-module]").forEach(observeModule);
        });
      });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest("a, button, [role=button]");
      const moduleElement = control?.closest("[data-analytics-module]");
      const moduleName = moduleElement ? analyticsModuleName(moduleElement) : null;
      if (!control || !moduleName) return;
      const actionName = control.getAttribute("data-analytics-action") || "interact";
      track("module_click", pagePathRef.current, moduleName, actionName);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
