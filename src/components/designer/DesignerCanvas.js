"use client";

import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import AssetLibrary from "./AssetLibrary";

export default function DesignerCanvas({
  labelWidth,
  labelHeight,
  designId = null,
  initialCanvas = null,
}) {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);

  const [selectedObject, setSelectedObject] = useState(null);

  const [textValue, setTextValue] = useState("");
  const [fontSize, setFontSize] = useState(24);
  const [fillColor, setFillColor] = useState("#000000");

  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);

  /* ================= INIT CANVAS ================= */
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1000,
      height: 600,
      backgroundColor: "#e5e7eb",
    });

    fabricRef.current = canvas;

    // Label boundary
    const labelRect = new fabric.Rect({
      left: 50,
      top: 50,
      width: labelWidth * 4,
      height: labelHeight * 4,
      fill: "#ffffff",
      stroke: "#000",
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });

    canvas.add(labelRect);
    canvas.sendObjectToBack(labelRect);

    /* selection handler */
    const onSelect = (obj) => {
      if (!obj) return;

      setSelectedObject(obj);

      setPosX(Math.round(obj.left || 0));
      setPosY(Math.round(obj.top || 0));

      if (obj.type === "textbox") {
        setTextValue(obj.text || "");
        setFontSize(obj.fontSize || 24);
        setFillColor(obj.fill || "#000");
      }
    };

    canvas.on("selection:created", (e) => onSelect(e.selected?.[0]));
    canvas.on("selection:updated", (e) => onSelect(e.selected?.[0]));
    canvas.on("selection:cleared", () => setSelectedObject(null));

    return () => canvas.dispose();
  }, [labelWidth, labelHeight]);

  /* ================= LOAD EXISTING DESIGN ================= */
  useEffect(() => {
    if (!fabricRef.current || !initialCanvas) return;

    fabricRef.current.loadFromJSON(initialCanvas, () => {
      fabricRef.current.requestRenderAll();
    });
  }, [initialCanvas]);

  /* ================= HELPERS ================= */
  const canvas = () => fabricRef.current;

  /* ================= OBJECT CONTROLS ================= */
  const updateX = (v) => {
    setPosX(v);
    if (!selectedObject) return;
    selectedObject.set("left", Number(v));
    canvas().requestRenderAll();
  };

  const updateY = (v) => {
    setPosY(v);
    if (!selectedObject) return;
    selectedObject.set("top", Number(v));
    canvas().requestRenderAll();
  };

  const updateText = (v) => {
    setTextValue(v);
    if (!selectedObject) return;
    selectedObject.set("text", v);
    canvas().requestRenderAll();
  };

  const updateFont = (v) => {
    setFontSize(v);
    if (!selectedObject) return;
    selectedObject.set("fontSize", Number(v));
    canvas().requestRenderAll();
  };

  const updateColor = (v) => {
    setFillColor(v);
    if (!selectedObject) return;
    selectedObject.set("fill", v);
    canvas().requestRenderAll();
  };

  /* ================= ADD ELEMENTS ================= */
  const addText = () => {
    const obj = new fabric.Textbox("Text", {
      left: 100,
      top: 100,
      fontSize: 24,
      fill: "#000",
    });

    canvas().add(obj);
    canvas().setActiveObject(obj);
    canvas().requestRenderAll();
  };

  const addRect = () => {
    const obj = new fabric.Rect({
      left: 120,
      top: 120,
      width: 200,
      height: 100,
      fill: "#dbeafe",
    });

    canvas().add(obj);
    canvas().setActiveObject(obj);
    canvas().requestRenderAll();
  };

  const addCircle = () => {
    const obj = new fabric.Circle({
      left: 150,
      top: 150,
      radius: 50,
      fill: "#dcfce7",
    });

    canvas().add(obj);
    canvas().setActiveObject(obj);
    canvas().requestRenderAll();
  };

  const deleteSelected = () => {
    const c = canvas();
    const active = c.getActiveObject();

    if (active) {
      c.remove(active);
      c.discardActiveObject();
      c.requestRenderAll();
      setSelectedObject(null);
    }
  };

  /* ================= ASSETS ================= */
  const addAssetImage = async (asset) => {
    const c = canvas();
    if (!c) return;

    const img = await fabric.Image.fromURL(asset.fileUrl);

    img.scaleToWidth(150);
    c.add(img);
    c.setActiveObject(img);
    c.requestRenderAll();
  };

  /* ================= SAVE / UPDATE ================= */
  const saveDesign = async () => {
    const c = canvas();
    if (!c) return;

    const payload = {
      name: "Untitled Design",
      width: labelWidth,
      height: labelHeight,
      canvasJson: c.toJSON(),
      thumbnail: c.toDataURL({ multiplier: 0.5 }),
    };

    const url = designId
      ? `/api/designs/${designId}`
      : "/api/designs";

    const method = designId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Save failed");
      return;
    }

    alert("Design saved successfully");
  };

  /* ================= UI ================= */
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "250px 1fr 300px" }}
    >
      {/* LEFT PANEL */}
      <div className="border p-3 bg-white rounded">
        <button onClick={addText} className="btn">Text</button>
        <button onClick={addRect} className="btn">Rect</button>
        <button onClick={addCircle} className="btn">Circle</button>
        <button onClick={deleteSelected} className="btn-red">Delete</button>
        <button onClick={saveDesign} className="btn-blue mt-2">
          Save
        </button>
      </div>

      {/* ASSETS */}
      <div className="border p-3 bg-white rounded">
        <AssetLibrary onSelect={addAssetImage} />
      </div>

      {/* CANVAS */}
      <div className="border p-4 bg-gray-50 rounded overflow-auto">
        <canvas ref={canvasRef} width={1000} height={600} />
      </div>

      {/* PROPERTIES */}
      <div className="border p-3 bg-white rounded">
        <h3 className="font-bold mb-3">Properties</h3>

        {!selectedObject ? (
          <p className="text-gray-500">Select object</p>
        ) : (
          <>
            <p>Type: {selectedObject.type}</p>

            {selectedObject.type === "textbox" && (
              <>
                <input value={textValue} onChange={(e) => updateText(e.target.value)} />
                <input type="number" value={fontSize} onChange={(e) => updateFont(e.target.value)} />
                <input type="color" value={fillColor} onChange={(e) => updateColor(e.target.value)} />
              </>
            )}

            <input type="number" value={posX} onChange={(e) => updateX(e.target.value)} />
            <input type="number" value={posY} onChange={(e) => updateY(e.target.value)} />
          </>
        )}
      </div>
    </div>
  );
}
