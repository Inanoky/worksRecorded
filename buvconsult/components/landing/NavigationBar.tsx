"use client"
import * as React from "react"
import Link from "next/link"
import { CircleCheckIcon, CircleHelpIcon, CircleIcon } from "lucide-react"
import { useIsMobile } from "@/lib/utils/hooks/use-mobile"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import Image from 'next/image'
import { useState } from "react"
import Invoices from "@/public/frontend/features/Invoices.png"
import Whatsapp from "@/public/frontend/features/Whatsapp.png"
import Documents from "@/public/frontend/features/Documents.png"



const IMAGES = {

  Whatsapp,
  Invoices,
  Documents
} as const;


const features = {

  Whatsapp : "Site records",
  Invoices : "Invoices",
  Documents : "Documents",
  Timesheets : "Timesheets",
  Analytics : "Analytics"

}

const featuresText = {


  Whatsapp : "Use whatsapp for site activity reporting",
  Invoices : "Digitalized automatically",
  Documents : "Used as a contexed for AI",
  Timesheets : "Worker report via voice message",
  Analytics : "AI assisted"

}


const featuresDescription = {


  Whatsapp : "Use custom Whatsapp channel for reporting with voice/text",
  Invoices : "Invoices are automatically uploaded and parsed",
  Documents : "All project documentation in one place",
  Timesheets : "Workers clock in/out via whatsapp chat",
  Analytics : "Get live custom analytics"
}




export function NavigationMenuDemo() {

  const [selectedFeature, setSelectedFeature] = useState("Whatsapp")
  const [stateUrl, setStateUrl] = useState("")

  const isMobile = useIsMobile()



  return (
    <NavigationMenu viewport={isMobile}>
      <NavigationMenuList className="flex-wrap">
        <NavigationMenuItem>
          <NavigationMenuTrigger
          
        
          
          >Data</NavigationMenuTrigger>
          <NavigationMenuContent  className="md:-translate-x-60 md:-translate-y-1" >
            <ul className="grid gap-2 md:w-[400px] lg:w-[550px] lg:h-[400px] ">
            

  


              <ListItem
               href="/Landing/SiteDiary" 
               title={features["Whatsapp"]}
               onMouseEnter={() => setSelectedFeature("Whatsapp")}             
              onFocus={() => setSelectedFeature("Whatsapp")}          
               
                              >
                {featuresDescription["Whatsapp"]}
              </ListItem>


              <ListItem 
              href="/Landing/Invoices" 
               title={features["Invoices"]}
              onMouseEnter={() => setSelectedFeature("Invoices")}             
              onFocus={() => setSelectedFeature("Invoices")} 
              
              
              >
               {featuresDescription["Invoices"]}
              </ListItem>




              <ListItem 
                 href="/Landing/Documents"           
                title={features["Documents"]}
                onMouseEnter={() => setSelectedFeature("Documents")}             
                onFocus={() => setSelectedFeature("Documents")} 
                
              
              >
                {featuresDescription["Documents"]}
              </ListItem>


              <ListItem 
              
              href="/Landing/Timesheets"              
                title={features["Timesheets"]}
                onMouseEnter={() => setSelectedFeature("Timesheets")}             
                onFocus={() => setSelectedFeature("Timesheets")} 
                
              
              >
              {featuresDescription["Timesheets"]}
              </ListItem>





              
              <ListItem 
              
                href="/Landing/Analytics"            
                title={features["Analytics"]}
                onMouseEnter={() => setSelectedFeature("Analytics")}             
                onFocus={() => setSelectedFeature("Analytics")} 
                
              
              >
               {featuresDescription["Analytics"]}
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
       
        <NavigationMenuItem
        >
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link
            className="text-2xl"
            
            
            href="/Landing/Custom">Custom solutions</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem
        >
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link
            className="text-2xl"
            
            
            href="/Landing/Pricing">Pricing</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
       
        
       
        <NavigationMenuItem
        >
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link
            className="text-2xl"
            
            
            href="/Landing/About">About</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
       
        
      </NavigationMenuList>
      
    </NavigationMenu>
  )
}
function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link href={href}>
          <div className="text-lg leading-none font-large font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-3 text-l leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}
