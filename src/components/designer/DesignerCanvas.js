"use client";

import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";

export default function DesignerCanvas() {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);

  const [selectedObject, setSelectedObject] = useState(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1000,
      height: 600,
      backgroundColor: "#ffffff",
    });

    fabricCanvasRef.current = canvas;

    canvas.on("selection:created", (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on("selection:updated", (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on("selection:cleared", () => {
      setSelectedObject(null);
    });

    return () => {
      canvas.dispose();
    };
  }, []);

  const addText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const text = new fabric.Textbox("New Text", {
      left: 100,
      top: 100,
      fontSize: 24,
      fill: "black",
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
  };

  const addRect = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

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
  };

  const addCircle = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

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
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();

    if (activeObject) {
      canvas.remove(activeObject);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      setSelectedObject(null);
    }
  };

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: "250px 1fr 300px",
      }}
    >
      {/* Components */}
      <div className="border rounded p-3 bg-white">
        <h3 className="font-bold mb-3">Components</h3>

        <button
          onClick={addText}
          className="w-full mb-2 bg-blue-600 text-white py-2 rounded"
        >
          Text
        </button>

        <button
          onClick={addRect}
          className="w-full mb-2 bg-green-600 text-white py-2 rounded"
        >
          Rectangle
        </button>

        <button
          onClick={addCircle}
          className="w-full mb-2 bg-purple-600 text-white py-2 rounded"
        >
          Circle
        </button>

        <button
          onClick={deleteSelected}
          className="w-full bg-red-600 text-white py-2 rounded"
        >
          Delete
        </button>
      </div>

      {/* Canvas */}
      <div className="border rounded p-4 bg-gray-50 overflow-auto">
        <div
          style={{
            width: "1000px",
            minWidth: "1000px",
          }}
        >
          <canvas
            ref={canvasRef}
            width={1000}
            height={600}
          />
        </div>
      </div>

      {/* Properties */}
      <div className="border rounded p-3 bg-white">
        <h3 className="font-bold mb-3">
          Properties
        </h3>

        {selectedObject ? (
          <>
            <p>Type: {selectedObject.type}</p>

            <p>
              X: {Math.round(selectedObject.left || 0)}
            </p>

            <p>
              Y: {Math.round(selectedObject.top || 0)}
            </p>
          </>
        ) : (
          <p className="text-gray-500">
            Select an object
          </p>
        )}
      </div>
    </div>
  );
}
