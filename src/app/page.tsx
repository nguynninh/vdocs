"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { createDocument } from "@/apis/documents";

export default function Home() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleCreateDocument = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const document = await createDocument();
      router.push(`/document/${document.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <Header />
      <h1>Welcome to the Home Page</h1>
      <p>Please navigate to the login or register page.</p>

      <button
        type="button"
        aria-label="Add"
        disabled={creating}
        onClick={handleCreateDocument}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/10 hover:bg-neutral-50 disabled:opacity-60 dark:bg-neutral-800 dark:ring-white/10 dark:hover:bg-neutral-700"
      >
        <Image
          src="/icons/ic_add.svg"
          alt=""
          width={24}
          height={24}
          className="dark:invert"
        />
      </button>
    </div>
  );
}
