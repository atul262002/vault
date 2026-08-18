"use client";
import React from "react";
import { AddProduct } from "../productComponents/add-product";
import { useUserContext } from "@/contexts/userContext";
import { usePathname } from "next/navigation";
import { Verify } from "../userComponents/get-verified";

const NavDash = () => {
  const { verified } = useUserContext();
  const pathname = usePathname();

  const isDashboard = pathname === '/dashboard';

  return (
    <nav className="w-full px-4 py-2 dark:bg-neutral-900 bg-secondary dark:text-white text-primary flex items-center justify-end gap-2 flex-wrap">
      {isDashboard && (
        <>
          {verified ? (
            <AddProduct />
          ) : (
            <div className="block">
              <Verify />
            </div>
          )}
        </>
      )}
    </nav>
  );
};

export default NavDash;
