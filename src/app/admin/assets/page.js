"use client";

import { useEffect, useState } from "react";

export default function AssetsPage() {
  const [assets, setAssets] = useState([]);

  async function loadAssets() {
    const res = await fetch("/api/assets");
    const data = await res.json();

    setAssets(data);
  }

  useEffect(() => {
    loadAssets();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Assets Library
      </h1>

      <div className="grid grid-cols-4 gap-4">
        {assets.map((asset) => (
          <div
            key={asset._id}
            className="border rounded p-3"
          >
            <p className="font-medium">
              {asset.name}
            </p>

            <p className="text-sm text-gray-500">
              {asset.category}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
