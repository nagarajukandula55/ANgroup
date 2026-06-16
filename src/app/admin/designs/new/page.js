"use client";

import { useState } from "react";

export default function NewDesign() {

const [name,setName] = useState("");
const [width,setWidth] = useState(100);
const [height,setHeight] = useState(50);

return (
<div>

<h1>Create Design</h1>

<input
placeholder="Design Name"
value={name}
onChange={(e)=>setName(e.target.value)}
/>

<input
type="number"
value={width}
onChange={(e)=>setWidth(e.target.value)}
/>

<input
type="number"
value={height}
onChange={(e)=>setHeight(e.target.value)}
/>

<button>
Create Canvas
</button>

</div>
);
}
