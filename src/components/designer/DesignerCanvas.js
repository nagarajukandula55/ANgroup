"use client";

import { useEffect, useRef } from "react";
import { fabric } from "fabric";

export default function DesignerCanvas() {

const canvasRef = useRef();

useEffect(() => {

const canvas = new fabric.Canvas("label-canvas",{
backgroundColor:"#fff"
});

return ()=>{
canvas.dispose();
};

},[]);

return (
<canvas
id="label-canvas"
width={800}
height={500}
/>
);
}
