"use client";

import { useEffect, useRef } from "react";
import { Canvas, Textbox, Rect, Circle } from "fabric";

export default function DesignerCanvas() {
  const canvasRef = useRef(null);
  const fabricCanvas = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: 1000,
      height: 600,
      backgroundColor: "#ffffff",
    });

    fabricCanvas.current = canvas;

    return () => {
      canvas.dispose();
      fabricCanvas.current = null;
    };
  }, []);

  const addText = () => {
    if (!fabricCanvas.current) return;

    const text = new Textbox("New Text", {
      left: 100,
      top: 100,
      fontSize: 24,
    });

    fabricCanvas.current.add(text);
    fabricCanvas.current.renderAll();
  };

  const addRect = () => {
    if (!fabricCanvas.current) return;

    const rect = new Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 100,
      fill: "#e5e7eb",
      stroke: "#000",
      strokeWidth: 1,
    });

    fabricCanvas.current.add(rect);
    fabricCanvas.current.renderAll();
  };

  const addCircle = () => {
    if (!fabricCanvas.current) return;

    const circle = new Circle({
      left: 100,
      top: 100,
      radius: 50,
      fill: "#dbeafe",
      stroke: "#000",
      strokeWidth: 1,
    });

    fabricCanvas.current.add(circle);
    fabricCanvas.current.renderAll();
  };

  const deleteSelected = () => {
    if (!fabricCanvas.current) return;

    const activeObject = fabricCanvas.current.getActiveObject();

    if (activeObject) {
      fabricCanvas.current.remove(activeObject);
      fabricCanvas.current.discardActiveObject();
      fabricCanvas.current.renderAll();
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={addText}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Add Text
        </button>

        <button
          onClick={addRect}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Rectangle
        </button>

        <button
          onClick={addCircle}
          className="px-4 py-2 bg-purple-600 text-white rounded"
        >
          Circle
        </button>

        <button
          onClick={deleteSelected}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Delete
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={1000}
        height={600}
        className="border border-gray-300 bg-white"
      />
    </div>
  );
}
