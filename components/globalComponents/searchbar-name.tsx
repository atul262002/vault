// "use client";
// import React, { ChangeEventHandler, useEffect, useState } from "react";
// import { Input } from "../ui/input";
// import { Search } from "lucide-react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useDebounce } from "@/hooks/use-debounce";
// import queryString from "query-string";

// const SearchByName = () => {
//   const router = useRouter();
//   const params = useSearchParams();

//   const initialName = params.get("name") || "";
//   const [value, setValue] = useState(initialName);
//   const debouncedValue = useDebounce<string>(value, 500);

//   const onChange: ChangeEventHandler<HTMLInputElement> = (e) => {
//     setValue(e.target.value);
//   };

//   useEffect(() => {
//     const query = {
//       name: debouncedValue,
//     };

//     const url = queryString.stringifyUrl(
//       {
//         url: window.location.pathname,
//         query,
//       },
//       { skipEmptyString: true, skipNull: true }
//     );

//     router.push(url);
//   }, [debouncedValue, router]);

//   return (
//     <div className="relative w-full">
//       <Search className="absolute h-4 w-4 left-4 text-muted-foreground top-3" />
//       <Input
//         placeholder="Search by product name"
//         className="pl-10 bg-primary/10"
//         onChange={onChange}
//         value={value}
//       />
//     </div>
//   );
// };

// export default SearchByName;
