// C:\Users\user\MVP\Buvconsult-deploy\buvconsult\app\api\tests\SсhemaUploadTest\route.ts
import { NextRequest, NextResponse } from "next/server";
import { saveSettingsToDB } from "@/app/actions/siteDiaryActions";

export async function POST(req: NextRequest) {


const formData = new FormData();

formData.append("siteId", "db41255a-f460-4f11-9e76-7c1adc583f81")
formData.append("fileUrls", JSON.stringify(["https://utfs.io/f/HPU3nx2LdstJiFF3ZheaQ4ou5mryCiSb8lX6Rq2ZVnkcvDP3"]));


 

  
  await saveSettingsToDB(formData);
  return NextResponse.json({ ok: true });

  
}