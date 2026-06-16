"use client";

import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import AssetLibrary from "./AssetLibrary";


export default function DesignerCanvas({
    labelWidth,
    labelHeight,
  }) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);

  const [textValue, setTextValue] = useState("");
  const [fontSize, setFontSize] = useState(24);
  const [fillColor, setFillColor] = useState("#000000");

  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);

  const [selectedObject, setSelectedObject] = useState(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1000,
      height: 600,
      backgroundColor: "#d1d5db",
    });

    fabricCanvasRef.current = canvas;

    const labelRect = new fabric.Rect({
      left: 50,
      top: 50,
      width: labelWidth * 4,
      height: labelHeight * 4,
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    
    canvas.add(labelRect);
    canvas.sendObjectToBack(labelRect);

    const updateSelectedObject = (obj) => {
      setSelectedObject(obj);

      setPosX(Math.round(obj.left || 0));
      setPosY(Math.round(obj.top || 0));
    
      if (!obj) return;
    
      if (obj.type === "textbox") {
        setTextValue(obj.text || "");
        setFontSize(obj.fontSize || 24);
        setFillColor(obj.fill || "#000000");
      }
    };
    
    canvas.on("selection:created", (e) => {
      updateSelectedObject(e.selected?.[0] || null);
    });
    
    canvas.on("selection:updated", (e) => {
      updateSelectedObject(e.selected?.[0] || null);
    });
    
    canvas.on("selection:cleared", () => {
      setSelectedObject(null);
    });

    return () => {
      canvas.dispose();
    };
  }, []);

  const updateX = (value) => {
    setPosX(value);
  
    if (!selectedObject) return;
  
    selectedObject.set("left", Number(value));
    fabricCanvasRef.current.requestRenderAll();
  };
  
  const updateY = (value) => {
    setPosY(value);
  
    if (!selectedObject) return;
  
    selectedObject.set("top", Number(value));
    fabricCanvasRef.current.requestRenderAll();
  };

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

const addAssetImage = async (asset) => {
      const canvas = fabricCanvasRef.current;
    
      if (!canvas) return;
    
      fabric.Image.fromURL(
        asset.fileUrl,
        (img) => {
          img.scaleToWidth(150);
    
          canvas.add(img);
    
          canvas.setActiveObject(img);
    
          canvas.requestRenderAll();
        },
        {
          crossOrigin: "anonymous",
        }
      );
    };

  const updateText = (value) => {
    setTextValue(value);
  
    if (!selectedObject) return;
  
    selectedObject.set("text", value);
    fabricCanvasRef.current.requestRenderAll();
  };
  
  const updateFontSize = (value) => {
    setFontSize(value);
  
    if (!selectedObject) return;
  
    selectedObject.set("fontSize", Number(value));
    fabricCanvasRef.current.requestRenderAll();
  };
  
  const updateColor = (value) => {
    setFillColor(value);
  
    if (!selectedObject) return;
  
    selectedObject.set("fill", value);
    fabricCanvasRef.current.requestRenderAll();
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

    <div className="border rounded p-3 bg-white">
      <AssetLibrary
        onSelect={addAssetImage}
      />
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
              <p className="mb-3">
                Type: {selectedObject.type}
              </p>
        
              {selectedObject.type === "textbox" && (
                <>
                  <label className="block text-sm mb-1">
                    Text
                  </label>
        
                  <input
                    type="text"
                    value={textValue}
                    onChange={(e) => updateText(e.target.value)}
                    className="w-full border rounded px-2 py-1 mb-3"
                  />
        
                  <label className="block text-sm mb-1">
                    Font Size
                  </label>
        
                  <input
                    type="number"
                    value={fontSize}
                    onChange={(e) => updateFontSize(e.target.value)}
                    className="w-full border rounded px-2 py-1 mb-3"
                  />
        
                  <label className="block text-sm mb-1">
                    Color
                  </label>
        
                  <input
                    type="color"
                    value={fillColor}
                    onChange={(e) => updateColor(e.target.value)}
                    className="w-full h-10"
                  />

                  <label className="block text-sm mt-3 mb-1">
                    X Position
                  </label>
                  
                  <input
                    type="number"
                    value={posX}
                    onChange={(e) => updateX(e.target.value)}
                    className="w-full border rounded px-2 py-1 mb-3"
                  />
                  
                  <label className="block text-sm mb-1">
                    Y Position
                  </label>
                  
                  <input
                    type="number"
                    value={posY}
                    onChange={(e) => updateY(e.target.value)}
                    className="w-full border rounded px-2 py-1"
                  />
                </>
              )}
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
