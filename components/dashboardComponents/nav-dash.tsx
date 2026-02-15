"use client";
import React, { Suspense } from "react";
import { ModeToggle } from "../globalComponents/themes";
import { AddProduct } from "../productComponents/add-product";
import SearchBar from "../globalComponents/searchbar";
import { useUserContext } from "@/contexts/userContext";
import { usePathname } from "next/navigation";
import { Verify } from "../userComponents/get-verified";
import { Plus } from "lucide-react";
import ProductSearchByName from "../productComponents/search-productby-name";
// import SearchByName from "../globalComponents/searchbar-name";

const NavDash = () => {
  const { verified } = useUserContext();
  const pathname = usePathname();

  const isDashboard = pathname === '/dashboard';

  return (
    <nav className="w-full px-4 py-2 dark:bg-neutral-900 bg-secondary dark:text-white text-primary flex items-center justify-end gap-2 flex-wrap">
      {isDashboard && (
        <>
          <div className="w-full sm:w-auto sm:min-w-[250px] sm:max-w-[300px] flex-1 sm:flex-none">
            <Suspense>
              <SearchBar />
            </Suspense>
          </div>

          {verified ? (
            <>
              <div className="hidden sm:block">
                <AddProduct />
              </div>
              <div className="block sm:hidden">
                <AddProduct />
              </div>
            </>
          ) : (
            <div className="block">
              <Verify />
            </div>
          )}
        </>
      )}

      {/* <div className="flex items-center">
        <ModeToggle />
      </div> */}
    </nav>
  );
};

export default NavDash;
