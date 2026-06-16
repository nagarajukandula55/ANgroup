"use client";

import { useEffect, useRef } from "react";
import * as fabric from "fabric";

export default function DesignerCanvas() {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1000,
      height: 600,
      backgroundColor: "#ffffff",
    });

    fabricCanvasRef.current = canvas;

    console.log("Canvas Initialized");

    return () => {
      canvas.dispose();
    };
  }, []);

  const addText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    console.log("Add Text");

    const text = new fabric.Textbox("New Text", {
      left: 100,
      top: 100,
      fontSize: 24,
      fill: "black",
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();

    console.log(canvas.getObjects());
  };

  const addRect = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    console.log("Add Rectangle");

    const rect = new fabric.Rect({
      left: 150,
      top: 150,
      width: 200,
      height: 100,
      fill: "#dbeafe",
      stroke: "#000",
      strokeWidth: 1,
    });

    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.requestRenderAll();

    console.log(canvas.getObjects());
  };

  const addCircle = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    console.log("Add Circle");

    const circle = new fabric.Circle({
      left: 200,
      top: 200,
      radius: 50,
      fill: "#dcfce7",
      stroke: "#000",
      strokeWidth: 1,
    });

    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.requestRenderAll();

    console.log(canvas.getObjects());
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();

    if (activeObject) {
      canvas.remove(activeObject);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
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

      <div className="overflow-auto border rounded bg-gray-100 p-4">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
