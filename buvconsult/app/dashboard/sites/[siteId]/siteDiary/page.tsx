"use client";



import SiteDiaryCalendar from "@/components/SiteDiaryComponents/Calendar";
import {use} from "react";

export default function Home({params}:
            {params: Promise<{siteId:string}>
            }){

    const {siteId} = use(params)
  return (
      <>
      <SiteDiaryCalendar siteId={siteId}/>
      </>
  )
}


