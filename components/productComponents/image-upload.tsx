// import React from "react";
// import { ImageKitProvider, IKUpload } from "imagekitio-next";
// import axios from "axios"
// const publicKey = process.env.NEXT_PUBLIC_PUBLIC_KEY!;
// const urlEndpoint = process.env.NEXT_PUBLIC_URL_ENDPOINT!;

// interface ImageUploadProps {
//   value: string;
//   onChange: (url: string) => void; 
// }

// const authenticator = async () => {
//   try {
//     const response = await axios.get("/api/imagekit-auth");

//     if (!response.data) {
//       throw new Error(`Request failed with status ${response.status}`);
//     }

//     const { signature, expire, token } = response.data;
//     return { signature, expire, token };
//   } catch (error: any) {
//     throw new Error(`Authentication request failed: ${error.message}`);
//   }
// };

// const ImageUpload = ({ value, onChange }: ImageUploadProps) => {
//   const onError = (err: any) => {
//     console.error("Upload Error:", err);
//   };

//   const onSuccess = (res: any) => {
//     console.log("Upload Success:", res);
//     if (res?.url) {
//       onChange(res.url); 
//     }
//   };

//   return (
//     <div>
//       <ImageKitProvider urlEndpoint={urlEndpoint} publicKey={publicKey}>
//         <IKUpload onError={onError} onSuccess={onSuccess} multiple={true} folder="/vault" authenticator={authenticator} />
//       </ImageKitProvider>
//       {value && <img src={value} className="w-50 h-50 flex items-center rounded-lg m-4 border-2 border-dotted border-secondary-foreground justify-center mx-auto" />}
//     </div>
//   );
// };

// export default ImageUpload;


import React from "react";
import { ImageKitProvider, IKUpload } from "imagekitio-next";
import axios from "axios";

const publicKey = process.env.NEXT_PUBLIC_PUBLIC_KEY!;
const urlEndpoint = process.env.NEXT_PUBLIC_URL_ENDPOINT!;

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onUploadStart?: () => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: () => void;
}

const authenticator = async () => {
  try {
    const response = await axios.get("/api/imagekit-auth");
    if (!response.data) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const { signature, expire, token } = response.data;
    return { signature, expire, token };
  } catch (error: any) {
    throw new Error(`Authentication request failed: ${error.message}`);
  }
};

const ImageUpload = ({ 
  value, 
  onChange, 
  onUploadStart, 
  onUploadProgress, 
  onUploadComplete 
}: ImageUploadProps) => {
  
  const onError = (err: any) => {
    console.error("Upload Error:", err);
    onUploadComplete?.();
  };

  const onSuccess = (res: any) => {
    console.log("Upload Success:", res);
    if (res?.url) {
      onChange(res.url);
    }
    onUploadProgress?.(100);
    onUploadComplete?.();
  };

  const handleUploadStart = (evt: any) => {
    console.log("Upload started");
    onUploadStart?.();
    onUploadProgress?.(10);
  };

  const handleUploadProgress = (evt: any) => {
    if (evt.lengthComputable) {
      const percentComplete = Math.round((evt.loaded / evt.total) * 100);
      console.log(`Upload progress: ${percentComplete}%`);
      onUploadProgress?.(percentComplete);
    }
  };

  return (
    <div className="space-y-4">
      <ImageKitProvider urlEndpoint={urlEndpoint} publicKey={publicKey}>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary transition-colors">
          <IKUpload
            onError={onError}
            onSuccess={onSuccess}
            onUploadStart={handleUploadStart}
            onUploadProgress={handleUploadProgress}
            multiple={false}
            folder="/vault"
            authenticator={authenticator}
            className="w-full"
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          />
        </div>
      </ImageKitProvider>
      {value && (
        <div className="flex justify-center">
          <img
            src={value}
            alt="Uploaded preview"
            className="w-48 h-48 object-cover rounded-lg border-2 border-dotted border-secondary-foreground"
          />
        </div>
      )}
    </div>
  );
};

export default ImageUpload;