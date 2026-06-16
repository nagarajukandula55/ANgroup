"use client";

import { useEffect, useRef } from "react";
import { Canvas } from "fabric";

export default function DesignerCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = new Canvas(ref.current, {
      width: 800,
      height: 500,
      backgroundColor: "#fff",
    });

    return () => canvas.dispose();
  }, []);

  return <canvas ref={ref} />;
}
