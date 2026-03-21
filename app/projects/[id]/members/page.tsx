"use client";

import React from "react";
import { useParams } from "next/navigation";

export default function MembersPage() {
  const { id } = useParams();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Project Members</h1>
      <p className="text-slate-600">Project ID: {id}</p>
      <div className="mt-8 p-12 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
        <p className="text-lg font-medium italic">"Members management coming soon..."</p>
      </div>
    </div>
  );
}
