"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewBusinessPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    legalName: "",
    brandName: "",
    industry: "",
    type: "",
    email: "",
    phone: "",
    website: "",
    gstNumber: "",
    pan: "",
  });

  function handleChange(e: any) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function createBusiness() {
    const res = await fetch(
      "/api/businesses/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      }
    );

    const data = await res.json();

    if (data.success) {
      alert("Business Created");

      router.push(
        `/businesses/${data.business._id}`
      );
    } else {
      alert(data.message);
    }
  }

  return (
    <div className="p-10 text-white bg-[#07111f] min-h-screen">
      <h1 className="text-3xl font-bold">
        Create Business
      </h1>

      <div className="grid grid-cols-2 gap-4 mt-6">
        {Object.keys(form).map((key) => (
          <input
            key={key}
            name={key}
            placeholder={key}
            onChange={handleChange}
            className="p-3 bg-black border border-white/20"
          />
        ))}
      </div>

      <button
        onClick={createBusiness}
        className="mt-6 bg-cyan-500 px-6 py-3 text-black font-bold"
      >
        Create Business
      </button>
    </div>
  );
}
