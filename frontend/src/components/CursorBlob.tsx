"use client";

import { useEffect, useRef } from "react";

export default function CursorBlob() {
  const blobRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    document.documentElement.classList.add("custom-cursor");

    let mx = -200, my = -200;
    let bx = -200, by = -200;
    let pbx = bx, pby = by;
    let raf: number;
    let isHovering = false;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mx - 3}px, ${my - 3}px)`;
      }
    };

    const tick = () => {
      const lerpFactor = isHovering ? 0.06 : 0.1;
      bx += (mx - bx) * lerpFactor;
      by += (my - by) * lerpFactor;

      const vx = bx - pbx;
      const vy = by - pby;
      const speed = Math.hypot(vx, vy);
      const angle = speed > 0.4 ? Math.atan2(vy, vx) * (180 / Math.PI) : 0;
      const scaleX = isHovering ? 1.6 : 1 + Math.min(speed * 0.055, 0.45);
      const scaleY = isHovering ? 1.6 : 1 - Math.min(speed * 0.03, 0.22);

      pbx = bx;
      pby = by;

      if (blobRef.current) {
        const size = isHovering ? 56 : 40;
        const offset = size / 2;
        blobRef.current.style.transform = `translate(${bx - offset}px, ${by - offset}px) rotate(${angle}deg) scaleX(${scaleX}) scaleY(${scaleY})`;
        blobRef.current.style.width = `${size}px`;
        blobRef.current.style.height = `${size}px`;
      }

      raf = requestAnimationFrame(tick);
    };

    const onEnter = () => { isHovering = true; };
    const onLeave = () => { isHovering = false; };

    document.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);

    const attach = () => {
      document.querySelectorAll("a, button, [role=button], input, textarea, select").forEach((el) => {
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
      });
    };
    attach();

    const mo = new MutationObserver(attach);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.documentElement.classList.remove("custom-cursor");
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      mo.disconnect();
    };
  }, []);

  return (
    <>
      <div
        ref={blobRef}
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "rgba(79,110,247,0.13)",
          border: "1px solid rgba(79,110,247,0.38)",
          backdropFilter: "blur(6px)",
          pointerEvents: "none",
          zIndex: 9998,
          willChange: "transform, width, height",
          transition: "width 200ms ease, height 200ms ease, background 200ms ease",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#fff",
          pointerEvents: "none",
          zIndex: 9999,
          willChange: "transform",
        }}
      />
    </>
  );
}
