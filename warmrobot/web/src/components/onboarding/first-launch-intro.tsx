"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

const INTRO_STORAGE_KEY = "warmrobot:first-launch-intro:v1";
const INTRO_DURATION_MS = 12_000;
const INTRO_AUDIO_SRC = "/animations/warmbaby-intro-v1.wav";

const INTRO_LINES = [
  "嗨，我是暖暖！",
  "暖宝宝会看现在的天气，告诉你今天该穿些什么。",
  "出门带伞、防晒，也会提醒你。每天看一眼，穿得刚刚好！",
] as const;

export function FirstLaunchIntro() {
  const [isVisible, setIsVisible] = useState(false);
  const [phase, setPhase] = useState(0);
  const [soundNeedsTap, setSoundNeedsTap] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const skipButtonRef = useRef<HTMLButtonElement | null>(null);

  const finishIntro = useCallback(() => {
    window.localStorage.setItem(INTRO_STORAGE_KEY, "seen");
    audioRef.current?.pause();
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem(INTRO_STORAGE_KEY) !== "seen") {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const audio = new Audio(INTRO_AUDIO_SRC);
    audio.preload = "auto";
    audioRef.current = audio;

    void audio.play().catch(() => setSoundNeedsTap(true));
    const phaseTwoTimer = window.setTimeout(() => setPhase(1), 2_500);
    const phaseThreeTimer = window.setTimeout(() => setPhase(2), 6_200);
    const finishTimer = window.setTimeout(finishIntro, INTRO_DURATION_MS);

    const previousOverflow = document.documentElement.style.overflow;
    const loginPage = document.querySelector<HTMLElement>(".login-page");
    document.documentElement.style.overflow = "hidden";
    loginPage?.setAttribute("inert", "");
    skipButtonRef.current?.focus();

    return () => {
      window.clearTimeout(phaseTwoTimer);
      window.clearTimeout(phaseThreeTimer);
      window.clearTimeout(finishTimer);
      document.documentElement.style.overflow = previousOverflow;
      loginPage?.removeAttribute("inert");
      audio.pause();
      audioRef.current = null;
    };
  }, [finishIntro, isVisible]);

  async function enableSound() {
    try {
      await audioRef.current?.play();
      setSoundNeedsTap(false);
    } catch {
      setSoundNeedsTap(true);
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
      <div className="intro-scene" aria-hidden="true">
        <Image
          alt=""
          className="intro-scene-art"
          fill
          priority
          sizes="(max-width: 719px) 100vw, 480px"
          src="/animations/onboarding-boy-keyframe-v1.png"
        />
        <div className="intro-morning-light" />
        <Image width={72} height={72} className="intro-weather-icon intro-sun" src="/illustrations/pencil-system/weather/weather-clear-day.png" alt="" />
        <Image width={72} height={72} className="intro-weather-icon intro-cloud" src="/illustrations/pencil-system/weather/weather-cloudy.png" alt="" />
        <Image width={72} height={72} className="intro-garment-icon intro-shirt" src="/illustrations/pencil-system/garments/garment_tshirt_long.png" alt="" />
        <Image width={72} height={72} className="intro-garment-icon intro-jacket" src="/illustrations/pencil-system/garments/garment_outer_shell.png" alt="" />
        <Image width={72} height={72} className="intro-garment-icon intro-umbrella" src="/illustrations/pencil-system/weather/tip-umbrella.png" alt="" />
      </div>

      <div className="intro-controls">
        {soundNeedsTap ? (
          <button type="button" className="intro-sound-button" onClick={enableSound}>
            打开声音
          </button>
        ) : (
          <span className="intro-sound-status">声音已开启</span>
        )}
        <button ref={skipButtonRef} type="button" className="intro-skip-button" onClick={finishIntro}>跳过</button>
      </div>

      <div className="intro-copy" aria-live="polite">
        <p key={phase}>{INTRO_LINES[phase]}</p>
      </div>
      <p className="sr-only">{INTRO_LINES.join("")}</p>
      <div className="intro-progress" aria-hidden="true"><span /></div>
    </section>
  );
}
