"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewAssetPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [category, setCategory] =
    useState("logo");

  const saveAsset = async () => {
    await fetch("/api/assets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        category,
        fileUrl: "",
      }),
    });

    router.push("/admin/assets");
  };

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">
        New Asset
      </h1>

      <input
        className="w-full border p-2 mb-3"
        placeholder="Asset Name"
        value={name}
        onChange={(e) =>
          setName(e.target.value)
        }
      />

      <select
        className="w-full border p-2 mb-3"
        value={category}
        onChange={(e) =>
          setCategory(e.target.value)
        }
      >
        <option value="logo">Logo</option>
        <option value="icon">Icon</option>
        <option value="background">
          Background
        </option>
        <option value="product-image">
          Product Image
        </option>
        <option value="certification">
          Certification
        </option>
      </select>

      <button
        onClick={saveAsset}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Save Asset
      </button>
    </div>
  );
}
