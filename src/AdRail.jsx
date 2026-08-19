import { useEffect, useRef } from "react";
import { CONFIG } from "./config";

// ─── Right-hand rail: Google AdSense (top ~2/3) + visitor map (bottom) ───────
// Both widgets are injected at runtime from CONFIG; with no IDs configured the
// rail renders neutral placeholders so the layout is stable either way.

const railStyle = {
  flex: "0 0 33.3333%",
  minWidth: 0,
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "#0C101E",
  borderLeft: "1px solid #252D42",
  fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
  overflow: "hidden",
};

const labelStyle = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 1.5,
  color: "#374151",
  padding: "8px 12px 4px",
  userSelect: "none",
  flexShrink: 0,
};

function Placeholder({ children }) {
  return (
    <div
      style={{
        flex: 1,
        margin: "4px 12px 12px",
        border: "1px dashed #252D42",
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "#374151",
        fontSize: 11,
        lineHeight: 1.7,
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}

function AdSenseUnit() {
  const insRef = useRef(null);

  useEffect(() => {
    if (!CONFIG.adsenseClient || !CONFIG.adsenseSlot) return;
    // Load the AdSense loader once per page
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CONFIG.adsenseClient}`;
    if (!document.querySelector(`script[src="${src}"]`)) {
      const s = document.createElement("script");
      s.async = true;
      s.src = src;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense not ready / blocked — placeholder area simply stays empty
    }
  }, []);

  if (!CONFIG.adsenseClient || !CONFIG.adsenseSlot) {
    return (
      <Placeholder>
        Ad space
        <br />
        Set adsenseClient + adsenseSlot in src/config.js
      </Placeholder>
    );
  }

  return (
    <div style={{ flex: 1, margin: "4px 12px 12px", minHeight: 0, overflow: "hidden" }}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height: "100%" }}
        data-ad-client={CONFIG.adsenseClient}
        data-ad-slot={CONFIG.adsenseSlot}
        data-ad-format="auto"
        data-full-width-responsive="false"
      />
    </div>
  );
}

function VisitorMap() {
  const boxRef = useRef(null);

  useEffect(() => {
    if (!CONFIG.visitorMapSrc || !boxRef.current) return;
    // MapMyVisitors / ClustrMaps render their canvas where the script sits
    const s = document.createElement("script");
    s.type = "text/javascript";
    s.id = "mapmyvisitors";
    s.src = CONFIG.visitorMapSrc;
    boxRef.current.appendChild(s);
    return () => {
      if (boxRef.current) boxRef.current.innerHTML = "";
    };
  }, []);

  if (!CONFIG.visitorMapSrc) {
    return (
      <Placeholder>
        Visitor map
        <br />
        Set visitorMapSrc in src/config.js
      </Placeholder>
    );
  }

  return (
    <div
      ref={boxRef}
      style={{
        flex: 1,
        margin: "4px 12px 12px",
        minHeight: 0,
        overflow: "hidden",
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    />
  );
}

export default function AdRail() {
  return (
    <aside style={railStyle}>
      <div style={{ flex: "1 1 62%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={labelStyle}>SPONSORED</div>
        <AdSenseUnit />
      </div>
      <div
        style={{
          flex: "1 1 38%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          borderTop: "1px solid #252D42",
        }}
      >
        <div style={labelStyle}>VISITORS AROUND THE WORLD</div>
        <VisitorMap />
      </div>
    </aside>
  );
}
