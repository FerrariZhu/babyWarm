"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const INTRO_STORAGE_KEY = "warmrobot:first-launch-intro:v2";

export function FirstLaunchIntro() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const skipButtonRef = useRef<HTMLButtonElement | null>(null);

  const finishIntro = useCallback(() => {
    window.localStorage.setItem(INTRO_STORAGE_KEY, "seen");
    videoRef.current?.pause();
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem(INTRO_STORAGE_KEY) !== "seen") {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const previousOverflow = document.documentElement.style.overflow;
    const loginPage = document.querySelector<HTMLElement>(".login-page");
    document.documentElement.style.overflow = "hidden";
    loginPage?.setAttribute("inert", "");
    skipButtonRef.current?.focus();

    return () => {
      document.documentElement.style.overflow = previousOverflow;
      loginPage?.removeAttribute("inert");
    };
  }, [isVisible]);

  async function enableSound() {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = false;
      setIsMuted(false);
      await video.play();
    } catch {
      video.muted = true;
      setIsMuted(true);
    }
  }

  if (!isVisible) return null;

  return (
    <section
      aria-label="暖宝宝介绍"
      aria-modal="true"
      className="first-launch-intro"
      role="dialog"
    >
      <video
        ref={videoRef}
        aria-label="暖宝宝启动视频"
        autoPlay
        className="intro-video"
        muted={isMuted}
        onEnded={finishIntro}
        onError={finishIntro}
        playsInline
        preload="auto"
        src="/animations/warmbaby-first-launch-v2.mp4"
      />

      <div className="intro-controls">
        {isMuted ? (
          <button type="button" className="intro-sound-button" onClick={enableSound}>
            打开声音
          </button>
        ) : (
          <span className="intro-sound-status">声音已开启</span>
        )}
        <button ref={skipButtonRef} type="button" className="intro-skip-button" onClick={finishIntro}>跳过</button>
      </div>
    </section>
  );
}
