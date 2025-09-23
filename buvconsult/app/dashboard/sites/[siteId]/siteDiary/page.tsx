"use client";



import SiteDiaryCalendar from "@/componentsFrontend/SiteDiaryComponents/Calendar";
import {use} from "react";
import AiWidgetRag from "@/componentsFrontend/AI/RAG/AiWidgetRag";


export default async function Home({params}:
            {params: Promise<{siteId:string}>
            }){

    const {siteId} = use(params)

    



  return (
      <>
      <SiteDiaryCalendar siteId={siteId}/>
       <AiWidgetRag siteId={siteId}/>
      </>
  )
}


