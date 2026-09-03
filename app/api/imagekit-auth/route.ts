import ImageKit from "imagekit"
import { NextRequest, NextResponse } from "next/server";

export async function GET(request:NextRequest) {
  const imagekit = new ImageKit({
    publicKey: process.env.NEXT_PUBLIC_PUBLIC_KEY!,
    privateKey: process.env.PRIVATE_KEY!,
    urlEndpoint: process.env.NEXT_PUBLIC_URL_ENDPOINT!,
  });
  return NextResponse.json(imagekit.getAuthenticationParameters());
}
