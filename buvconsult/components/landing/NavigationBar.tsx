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
  Invoices : "Invoices are automatically uploaded and parsed, get all line items extracted. Categorization in seconds for custom analysis",
  Documents : "All project documentation in one place, ask AI to compare invoices to contract, legal checks, technical questions and more",
  Timesheets : "Workers clock in/out via whatsapp chat, before clocking out AI ask to describe what has been acomplished today ",
  Analytics : "Get live custom analytics (cost per m2, perfomance last week, non-conformities, additional works, delays..."
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
          <NavigationMenuContent>
            <ul className="grid gap-2 md:w-[400px] lg:w-[700px] lg:h-[650px] lg:grid-cols-[.75fr_1fr]">
              <li className="row-span-5">
                <NavigationMenuLink asChild>
                  <a
                    className="from-muted to-muted flex h-full w-full flex-col justify-end rounded-md bg-linear-to-b p-4 no-underline outline-hidden transition-all duration-200 select-none focus:shadow-md md:p-6"
                    href="/"
                  >
                    <Image
                    className="rounded-md"
                    width={500}
                    height={500}
                    alt="Feature"

                    

                    src={IMAGES[selectedFeature]}
                    
                    />
                    <div className="mb-2 text-lg font-medium sm:mt-4">
                      {features[selectedFeature]}
                    </div>
                    <p className="text-muted-foreground text-sm leading-tight">
                      {featuresText[selectedFeature]}
                    </p>
                  </a>
                </NavigationMenuLink>
              </li>

  


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
        <NavigationMenuItem className="hidden md:block">
          <NavigationMenuTrigger>About</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[300px] gap-4">
              <li>
                <NavigationMenuLink asChild>
                  <Link href="#">
                    <div className="font-medium">Components</div>
                    <div className="text-muted-foreground">
                      Browse all components in the library.
                    </div>
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link href="#">
                    <div className="font-medium">Documentation</div>
                    <div className="text-muted-foreground">
                      Learn how to use the library.
                    </div>
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link href="#">
                    <div className="font-medium">Blog</div>
                    <div className="text-muted-foreground">
                      Read our latest blog posts.
                    </div>
                  </Link>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        
       
        <NavigationMenuItem
        >
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link
            className="text-2xl"
            
            
            href="/docs">Pricing</Link>
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
          <div className="text-xl leading-none font-large font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-3 text-lg leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}
