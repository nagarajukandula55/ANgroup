"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, Textbox, Rect, Circle } from "fabric";

export default function DesignerCanvas() {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = new Canvas(canvasRef.current, {
      width: 1000,
      height: 600,
      backgroundColor: "#ffffff",
    });

    fabricRef.current = canvas;
    setReady(true);

    return () => {
      canvas.dispose();
    };
  }, []);

  const addText = () => {
    const text = new Textbox("New Text", {
      left: 100,
      top: 100,
      fontSize: 24,
    });

    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
  };

  const addRectangle = () => {
    const rect = new Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 100,
    });

    fabricRef.current.add(rect);
  };

  const addCircle = () => {
    const circle = new Circle({
      left: 100,
      top: 100,
      radius: 50,
    });

    fabricRef.current.add(circle);
  };

  const deleteSelected = () => {
    const active = fabricRef.current.getActiveObject();

    if (active) {
      fabricRef.current.remove(active);
    }
  };

  return (
    <div>
      {ready && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={addText}
            className="bg-blue-600 text-white px-3 py-2 rounded"
          >
            Add Text
          </button>

          <button
            onClick={addRectangle}
            className="bg-green-600 text-white px-3 py-2 rounded"
          >
            Rectangle
          </button>

          <button
            onClick={addCircle}
            className="bg-purple-600 text-white px-3 py-2 rounded"
          >
            Circle
          </button>

          <button
            onClick={deleteSelected}
            className="bg-red-600 text-white px-3 py-2 rounded"
          >
            Delete
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="border border-gray-300"
      />
    </div>
  );
}
