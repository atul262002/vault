// "use client";
// import { useSearchParams } from "next/navigation";
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
// import { Products } from "@prisma/client";
// import Image from "next/image";
// import { Button } from "../ui/button";
// import { useUser } from "@clerk/nextjs";
// import Link from "next/link";

// const ViewProducts = () => {
//   const searchParams = useSearchParams();
//   const { user } = useUser()
//   const productId = searchParams.get("productId");
//   const [product, setProduct] = useState<Products | null>(null);
//   const [open, setOpen] = useState(false);

//   useEffect(() => {
//     const script = document.createElement("script");
//     script.src = "https://checkout.razorpay.com/v1/checkout.js";
//     script.async = true;
//     script.onload = () => console.log("Razorpay script loaded successfully");
//     document.body.appendChild(script);
//   }, []);

//   async function handlePurchase(amount: number) {
//     try {
//       const response = await axios.post("/api/razorpay/create-order", {
//         amount: amount,
//         currency: "INR",
//         product: [
//           {
//             ...product
//           }
//         ]
//       });

//       if (response.status === 200) {
//         const { id, currency, amount } = response.data;
//         const options = {
//           key: "rzp_live_RHmP474HgZJvtk",
//           amount: product?.price * 100,
//           currency: currency,
//           name: "VAULT",
//           description: product?.name,
//           order_id: id,
//           handler: function (response: any) {
//             alert(`Payment Successful! Payment ID: ${response.razorpay_payment_id}`);
//           },
//           prefill: {
//             name: user?.firstName,
//             email: user?.emailAddresses[0].emailAddress,
//           },
//           theme: {
//             color: "#3399cc",
//           },
//         };

//         const razorpay = new (window as any).Razorpay(options);
//         razorpay.open();
//       }
//     } catch (error) {
//       console.error("Error in creating payments:", error);
//     }
//   }


//   useEffect(() => {
//     async function fetchProduct() {
//       if (productId) {
//         try {
//           const response = await axios.post("/api/product/get-product", { productId });
//           if (response.status === 200) {
//             setProduct(response.data.result);
//             setOpen(true);
//           }
//         } catch (error) {
//           console.error("Error fetching product:", error);
//         }
//       } else {
//         setOpen(false);
//       }
//     }
//     fetchProduct();
//   }, [productId]);

//   return (
//     <>
//       {productId && (
//         <Dialog open={open} onOpenChange={setOpen}>
//           <DialogContent>
//             <DialogTitle>Product Details</DialogTitle>
//             {product ? (
//               <div className="space-y-4">
//                 <div className="w-full flex justify-center">
//                   <Image
//                     src={product.imageUrl}
//                     alt={product.name}
//                     width={300}
//                     height={200}
//                     className="rounded-lg shadow-md"
//                   />
//                 </div>
//                 <div className="flex items-center mx-auto justify-center">
//                   <Button variant={'default'} onClick={() => handlePurchase(product.price)} className="flex items-center justify-center mx-auto">Purchase</Button>
//                   <Link className="flex items-center justify-center mx-auto" href={`/chats/${product.sellerId}`}>
//                     <Button >Chat</Button>
//                   </Link>
//                 </div>
//                 <h2 className="text-2xl font-bold text-gray-800">{product.name}</h2>
//                 <p className="text-lg text-green-600 font-semibold">
//                   Price: ₹{product.price.toFixed(2)}
//                 </p>
//                 <p className="text-gray-600">{product.description}</p>
//                 <p className="text-gray-500">
//                   <span className="font-semibold">Refund Period:</span> {product.refundPeriod}
//                 </p>
//                 <p className="text-gray-500">
//                   <span className="font-semibold">Seller ID:</span> {product.sellerId}
//                 </p>
//                 <p className="text-gray-500">
//                   <span className="font-semibold">Category ID:</span> {product.categoryId}
//                 </p>
//                 <p className="text-gray-400 text-sm">
//                   <span className="font-semibold">Created At:</span> {new Date(product.createdAt).toLocaleString()}
//                 </p>
//               </div>
//             ) : (
//               <p className="text-gray-500">Loading...</p>
//             )}
//           </DialogContent>
//         </Dialog>
//       )}
//     </>
//   );
// };

// export default ViewProducts;




// "use client";
// import { useSearchParams, useRouter } from "next/navigation";
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
// import { Products } from "@prisma/client";
// import Image from "next/image";
// import { Button } from "../ui/button";
// import { useUser } from "@clerk/nextjs";
// import { Loader2 } from "lucide-react";

// const ViewProducts = () => {
//   const searchParams = useSearchParams();
//   const router = useRouter();
//   const { user } = useUser();
//   const productId = searchParams.get("productId");
//   const [product, setProduct] = useState<Products | null>(null);
//   const [open, setOpen] = useState(false);
//   const [isRazorpayLoading, setIsRazorpayLoading] = useState(false);
//   const [isRazorpayReady, setIsRazorpayReady] = useState(false);
//   const [isChatLoading, setIsChatLoading] = useState(false);

//   useEffect(() => {
//     // Check if Razorpay is already loaded
//     if ((window as any).Razorpay) {
//       setIsRazorpayReady(true);
//       return;
//     }

//     const script = document.createElement("script");
//     script.src = "https://checkout.razorpay.com/v1/checkout.js";
//     script.async = true;
//     script.onload = () => {
//       console.log("Razorpay script loaded successfully");
//       setIsRazorpayReady(true);
//     };
//     script.onerror = () => {
//       console.error("Failed to load Razorpay script");
//       setIsRazorpayReady(false);
//     };
//     document.body.appendChild(script);

//     return () => {
//       // Cleanup if needed
//     };
//   }, []);

//   async function handlePurchase(amount: number) {
//     if (!isRazorpayReady) {
//       alert("Payment system is loading. Please wait a moment and try again.");
//       return;
//     }

//     setIsRazorpayLoading(true);

//     try {
//       const response = await axios.post("/api/razorpay/create-order", {
//         amount: amount,
//         currency: "INR",
//         product: [{ ...product }],
//       });

//       if (response.status === 200) {
//         const { id, currency } = response.data;

//         const options = {
//           key: "rzp_live_RHmP474HgZJvtk",
//           amount: product?.price ? product.price * 100 : 0,
//           currency: currency,
//           name: "VAULT",
//           description: product?.name || "",
//           order_id: id,
//           handler: function (response: any) {
//             setIsRazorpayLoading(false);
//             alert(`Payment Successful! Payment ID: ${response.razorpay_payment_id}`);
//           },
//           prefill: {
//             name: user?.firstName || "",
//             email: user?.emailAddresses[0].emailAddress || "",
//           },
//           theme: {
//             color: "#3399cc",
//           },
//           modal: {
//             ondismiss: function() {
//               setIsRazorpayLoading(false);
//             },
//             confirm_close: true,
//             animation: true,
//           }
//         };

//         const razorpay = new (window as any).Razorpay(options);

//         // Wait longer for Razorpay modal to be fully interactive
//         setTimeout(() => {
//           setIsRazorpayLoading(false);
//         }, 1500);

//         // Open modal
//         razorpay.open();
//       }
//     } catch (error) {
//       console.error("Error in creating payments:", error);
//       setIsRazorpayLoading(false);
//       alert("Failed to initiate payment. Please try again.");
//     }
//   }

//   useEffect(() => {
//     async function fetchProduct() {
//       if (productId) {
//         try {
//           const response = await axios.post("/api/product/get-product", { productId });
//           if (response.status === 200) {
//             setProduct(response.data.result);
//             setOpen(true);
//           }
//         } catch (error) {
//           console.error("Error fetching product:", error);
//         }
//       } else {
//         setOpen(false);
//       }
//     }
//     fetchProduct();
//   }, [productId]);

//   const handleChat = async (sellerId: string) => {
//     setIsChatLoading(true);
//     try {
//       // First, fetch the current user
//       const userRes = await fetch("/api/user/get-user");
//       if (!userRes.ok) {
//         alert("Failed to get user information");
//         setIsChatLoading(false);
//         return;
//       }

//       const userData = await userRes.json();
//       const currentUserId = userData.id;

//       // Then create or find conversation
//       const conversationRes = await fetch('/api/conversations', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ 
//           participantIds: [currentUserId, sellerId] 
//         }),
//       });

//       if (!conversationRes.ok) {
//         alert("Failed to start conversation");
//         setIsChatLoading(false);
//         return;
//       }

//       const conversation = await conversationRes.json();

//       // Navigate to the conversation
//       router.push(`/conversations/${conversation.id}/${sellerId}`);

//     } catch (error) {
//       console.error("Error starting chat:", error);
//       alert("Failed to start chat. Please try again.");
//       setIsChatLoading(false);
//     }
//   };

//   return (
//     <>
//       {productId && (
//         <Dialog open={open} onOpenChange={setOpen}>
//           <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
//             <DialogTitle className="text-2xl font-bold">Product Details</DialogTitle>
//             {product ? (
//               <div className="space-y-6 mt-4">
//                 <div className="w-full flex justify-center bg-gray-50 rounded-lg p-4">
//                   <div className="relative w-full max-w-md h-64">
//                     <Image
//                       src={product.imageUrl}
//                       alt={product.name}
//                       fill
//                       className="rounded-lg shadow-md object-contain"
//                     />
//                   </div>
//                 </div>

//                 <div className="border-t pt-4">
//                   <h2 className="text-2xl font-bold text-gray-800 mb-2">
//                     {product.name}
//                   </h2>
//                   <p className="text-3xl text-green-600 font-bold mb-4">
//                     ₹{product.price.toFixed(2)}
//                   </p>
//                 </div>

//                 <div className="flex items-center gap-4">
//                   <Button
//                     variant="default"
//                     onClick={() => handlePurchase(product.price)}
//                     disabled={isRazorpayLoading || !isRazorpayReady}
//                     className="flex-1"
//                   >
//                     {isRazorpayLoading ? (
//                       <>
//                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                         Opening Payment...
//                       </>
//                     ) : !isRazorpayReady ? (
//                       <>
//                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                         Loading Payment...
//                       </>
//                     ) : (
//                       "Purchase Now"
//                     )}
//                   </Button>
//                   <Button 
//                     variant="outline" 
//                     className="flex-1 w-full" 
//                     onClick={() => handleChat(product.sellerId)}
//                     disabled={isChatLoading}
//                   >
//                     {isChatLoading ? (
//                       <>
//                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                         Creating Chat...
//                       </>
//                     ) : (
//                       "Chat with Seller"
//                     )}
//                   </Button>
//                 </div>

//                 <div className="bg-gray-50 rounded-lg p-4 space-y-3">
//                   <p className="text-gray-700 leading-relaxed">
//                     {product.description}
//                   </p>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div className="bg-blue-50 rounded-lg p-4">
//                     <p className="text-sm text-gray-600 mb-1">Refund Period</p>
//                     <p className="font-semibold text-gray-800">
//                       {product.refundPeriod}
//                     </p>
//                   </div>
//                   <div className="bg-purple-50 rounded-lg p-4">
//                     <p className="text-sm text-gray-600 mb-1">Category</p>
//                     <p className="font-semibold text-gray-800">
//                       {product.categoryId}
//                     </p>
//                   </div>
//                 </div>

//                 <div className="bg-gray-50 rounded-lg p-4">
//                   <p className="text-sm text-gray-600 mb-2">Seller Information</p>
//                   <p className="font-semibold text-gray-800">
//                     Seller ID: {product.sellerId}
//                   </p>
//                 </div>

//                 <div className="text-center pt-4 border-t">
//                   <p className="text-gray-400 text-xs">
//                     Listed on {new Date(product.createdAt).toLocaleDateString('en-IN', {
//                       year: 'numeric',
//                       month: 'long',
//                       day: 'numeric'
//                     })}
//                   </p>
//                 </div>
//               </div>
//             ) : (
//               <div className="flex flex-col items-center justify-center py-12">
//                 <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
//                 <p className="text-gray-500">Loading product details...</p>
//               </div>
//             )}
//           </DialogContent>
//         </Dialog>
//       )}
//     </>
//   );
// };

// export default ViewProducts;



"use client";
import React, { ChangeEventHandler, useEffect, useState } from "react";
import { Input } from "../ui/input";
import { Search, Loader2 } from "lucide-react";
import axios from "axios";
import Image from "next/image";
import { Products } from "@prisma/client";
import { Button } from "../ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useUser } from "@clerk/nextjs";

const ProductSearchByName = () => {
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounce<string>(searchValue, 500);
  const [products, setProducts] = useState<Products[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Products | null>(null);
  const [isRazorpayLoading, setIsRazorpayLoading] = useState(false);
  const [isRazorpayReady, setIsRazorpayReady] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const { user } = useUser();

  const onChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setSearchValue(e.target.value);
  };

  useEffect(() => {
    const fetchByName = async () => {
      if (!debouncedSearch.trim()) {
        setProducts([]);
        return;
      }

      try {
        const response = await axios.post("/api/product/get-product-by-name", {
          name: debouncedSearch,
        });

        if (response.status === 200) {
          setProducts(response.data.result);
        }
      } catch (error) {
        console.error("Error fetching products by name:", error);
      }
    };

    fetchByName();
  }, [debouncedSearch]);

  useEffect(() => {
    if ((window as any).Razorpay) {
      setIsRazorpayReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      console.log("Razorpay script loaded");
      setIsRazorpayReady(true);
    };
    script.onerror = () => {
      console.error("Failed to load Razorpay script");
      setIsRazorpayReady(false);
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  async function handlePurchase(product: Products) {
    if (!isRazorpayReady) {
      alert("Payment system is loading. Please wait a moment and try again.");
      return;
    }

    setIsRazorpayLoading(true);

    // CRITICAL FIX: Close the dialog before opening Razorpay
    setSelectedProduct(null);

    // Add a small delay to ensure dialog closes before Razorpay opens
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const response = await axios.post("/api/razorpay/create-order", {
        amount: product.price,
        currency: "INR",
        product: [{ ...product }],
      });

      if (response.status === 200) {
        const { id, amount, currency } = response.data;

        const options = {
          key: "rzp_live_RHmP474HgZJvtk",
          amount: amount,
          currency: currency,
          name: "VAULT",
          description: product.name,
          order_id: id,
          handler: function (res: any) {
            setIsRazorpayLoading(false);
            alert(`Payment successful! Payment ID: ${res.razorpay_payment_id}`);
            verifyPayment(res);
          },
          prefill: {
            name: user?.firstName || user?.fullName || "",
            email: user?.emailAddresses[0].emailAddress || "",
            contact: user?.phoneNumbers?.[0]?.phoneNumber || "9999999999",
          },
          notes: {
            product_id: product.id,
            product_name: product.name,
          },
          theme: {
            color: "#3399cc",
          },
          modal: {
            ondismiss: function () {
              setIsRazorpayLoading(false);
            },
            confirm_close: true,
            animation: true,
            backdropclose: false,
            escape: true,
          },
          config: {
            display: {
              blocks: {
                banks: {
                  name: 'Pay using UPI',
                  instruments: [
                    {
                      method: 'upi'
                    },
                  ],
                },
              },
              sequence: ['block.banks'],
              preferences: {
                show_default_blocks: true,
              },
            },
          },
        };

        const razorpay = new (window as any).Razorpay(options);

        razorpay.on('payment.failed', function (response: any) {
          setIsRazorpayLoading(false);
          alert(`Payment failed: ${response.error.description}`);
        });

        razorpay.open();

        setTimeout(() => {
          setIsRazorpayLoading(false);
        }, 800);
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      setIsRazorpayLoading(false);
      alert("Failed to initiate payment. Please try again.");
    }
  }

  const verifyPayment = async (paymentData: any) => {
    try {
      const response = await axios.post("/api/razorpay/verify-payment", {
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      });

      if (response.status === 200) {
        console.log("Payment verified successfully");
      }
    } catch (error) {
      console.error("Payment verification failed:", error);
    }
  };

  const handleChat = async (sellerId: string) => {
    setIsChatLoading(true);
    try {
      const userRes = await fetch("/api/user/get-user");
      if (!userRes.ok) {
        alert("Failed to get user information");
        setIsChatLoading(false);
        return;
      }

      const userData = await userRes.json();
      const currentUserId = userData.id;

      const conversationRes = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: [currentUserId, sellerId]
        }),
      });

      if (!conversationRes.ok) {
        alert("Failed to start conversation");
        setIsChatLoading(false);
        return;
      }

      const conversation = await conversationRes.json();
      window.location.href = `/conversations/${conversation.id}/${sellerId}`;

    } catch (error) {
      console.error("Error starting chat:", error);
      alert("Failed to start chat. Please try again.");
      setIsChatLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="relative mb-8 max-w-md mx-auto">
        <Search className="absolute h-4 w-4 left-4 text-muted-foreground top-3.5" />
        <Input
          placeholder="Search products by name"
          className="pl-10 bg-primary/10 h-12"
          onChange={onChange}
          value={searchValue}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <div
            onClick={() => setSelectedProduct(product)}
            key={product.id}
            className="border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer bg-white"
          >
            <div className="relative h-48 w-full bg-gray-100">
              <Image
                src={product.imageUrl || product.image || ""}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-semibold line-clamp-2 min-h-[3.5rem]">
                {product.name}
              </h2>
              <p className="text-green-600 font-bold text-xl mt-2">
                ₹{product.price.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {product.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {searchValue && products.length === 0 && (
        <div className="text-center mt-12">
          <p className="text-gray-500 text-lg">No products found.</p>
          <p className="text-gray-400 text-sm mt-2">Try searching with different keywords</p>
        </div>
      )}

      {selectedProduct && (
        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="text-2xl font-bold">Product Details</DialogTitle>
            <div className="space-y-6 mt-4">
              <div className="w-full flex justify-center bg-gray-50 rounded-lg p-4">
                <div className="relative w-full max-w-md h-64">
                  <Image
                    src={selectedProduct.imageUrl || selectedProduct.image || ""}
                    alt={selectedProduct.name}
                    fill
                    className="rounded-lg shadow-md object-contain"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {selectedProduct.name}
                </h2>
                <div className="bg-gray-50 p-3 rounded-md mb-4 space-y-1">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Product Price:</span>
                    <span>₹{selectedProduct.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Platform Fee (5%):</span>
                    <span>₹{(selectedProduct.price * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between items-center font-bold text-lg text-green-600">
                    <span>Total to Pay:</span>
                    <span>₹{(selectedProduct.price * 1.05).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {selectedProduct.isSold ? (
                  <Button
                    variant="ghost"
                    disabled
                    className="flex-1 w-full bg-red-100 text-red-600 font-bold border border-red-200"
                  >
                    Sold Out
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePurchase(selectedProduct)}
                    disabled={isRazorpayLoading || !isRazorpayReady}
                    className="flex-1 w-full"
                  >
                    {isRazorpayLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Opening Payment...
                      </>
                    ) : !isRazorpayReady ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading Payment...
                      </>
                    ) : (
                      "Purchase Now"
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1 w-full"
                  onClick={() => handleChat(selectedProduct.sellerId)}
                  disabled={isChatLoading}
                >
                  {isChatLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Chat...
                    </>
                  ) : (
                    "Chat with Seller"
                  )}
                </Button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  {selectedProduct.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Refund Period</p>
                  <p className="font-semibold text-gray-800">
                    {selectedProduct.refundPeriod}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Category</p>
                  <p className="font-semibold text-gray-800">
                    {selectedProduct.categoryId}
                  </p>
                </div>
              </div>

              <div className="text-center pt-4 border-t">
                <p className="text-gray-400 text-xs">
                  Listed on {new Date(selectedProduct.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ProductSearchByName;