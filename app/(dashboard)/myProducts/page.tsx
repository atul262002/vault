// "use client";
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { Products } from "@prisma/client";

// const MyProducts = () => {
//     const [products, setProducts] = useState<Products[]>([]);

//     useEffect(() => {
//         async function fetchProducts() {
//             try {
//                 const response = await axios.get("/api/product/my-products");
//                 if (response.status === 200) {
//                     setProducts(response.data.result);
//                     console.log(products)
//                 }
//             } catch (error) {
//                 console.log("Error while fetching products", error);
//             }
//         }
//         fetchProducts();
//     }, []);

//     return (
//         <div className="container mx-auto p-6">
//             <h2 className="text-2xl font-semibold mb-4">My Products</h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                 {products.map((product) => (
//                     <div key={product.id} id={`product-${product.id}`} className="bg-secondary shadow-md rounded-lg overflow-hidden border">
//                         <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover" />
//                         <div className="p-4">
//                             <span className="text-sm">{product.id}</span>
//                             <h3 className="text-xl font-bold">{product.name}</h3>
//                             <p className="text-gray-600 text-sm mt-1">{product.description}</p>
//                             <p className="text-lg font-semibold text-primary mt-2">₹{product.price}</p>
//                             <p className="text-sm text-gray-500 mt-1">Refund Period: {product.refundPeriod} days</p>
//                         </div>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// };

// export default MyProducts;




"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Products } from "@prisma/client";
import { Trash2 } from "lucide-react";

const MyProducts = () => {
  const [products, setProducts] = useState<Products[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const response = await axios.get("/api/product/my-products");
      if (response.status === 200) {
        setProducts(response.data.result);
      }
    } catch (error) {
      console.error("Error while fetching products", error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (productId: string) => {
    // Confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to delete this product? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setDeletingId(productId);
      const response = await axios.delete("/api/product/delete", {
        data: { productId },
      });

      if (response.status === 200) {
        // Remove the deleted product from state
        setProducts((prevProducts) =>
          prevProducts.filter((product) => product.id !== productId)
        );
        alert("Product deleted successfully!");
      }
    } catch (error: any) {
      console.error("Error deleting product:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to delete product";
      alert(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Products</h1>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            You haven't added any products yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="border rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow"
            >
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-48 object-cover rounded-md mb-4"
              />
              
              <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
              
              <p className="text-gray-600 mb-3 line-clamp-2">
                {product.description}
              </p>
              
              <div className="space-y-2 mb-4">
                <p className="text-2xl font-bold text-green-600">
                  ₹{product.price}
                </p>
                <p className="text-sm text-gray-500">
                  Refund Period: {product.refundPeriod} days
                </p>
                <p className="text-sm text-gray-500">
                  Estimated Time: {product.estimatedTime}
                </p>
              </div>

              <button
                onClick={() => handleDelete(product.id)}
                disabled={deletingId === product.id}
                className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                <Trash2 size={18} />
                {deletingId === product.id ? "Deleting..." : "Delete Product"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyProducts;