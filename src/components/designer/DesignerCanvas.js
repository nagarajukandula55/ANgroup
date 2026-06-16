"use client";

import { useEffect, useRef } from "react";
import { Canvas, Textbox } from "fabric";

export default function DesignerCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const fabricCanvas = new Canvas(canvasRef.current, {
      width: 900,
      height: 500,
      backgroundColor: "#ffffff",
    });

    const title = new Textbox("Double click to edit text", {
      left: 100,
      top: 100,
      fontSize: 24,
    });

    fabricCanvas.add(title);

    return () => {
      fabricCanvas.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="border border-gray-300"
    />
  );
}
