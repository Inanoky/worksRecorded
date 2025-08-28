// C:\Users\user\MVP\Buvconsult-deploy\buvconsult\app\api\tests\route.ts
import { NextRequest, NextResponse } from "next/server";
import { saveInvoiceToDB } from "@/app/actions/actions";

export async function POST(req: NextRequest) {


const formData = new FormData();

formData.append("siteId", "db41255a-f460-4f11-9e76-7c1adc583f81")
formData.append("fileUrls", JSON.stringify(["https://utfs.io/f/HPU3nx2LdstJV3l2hBDFPti24r7JovzAjSqYOb6QWV0MaCk9"]));


 

  
  await saveInvoiceToDB(null as any, formData);
  return NextResponse.json({ ok: true });

  
}