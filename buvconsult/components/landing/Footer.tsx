import {Card, CardHeader, CardFooter, CardTitle, CardDescription, CardAction, CardContent} from '@/components/ui/card'
 


export function Footer () {




return (

<>

        <div className="grid grid-cols-4 p-15 gap-5">
       
            <div className=" space-y-6 mt-6 text-base leading-snug \">

          
                    
                  <p>SIA "BUVCONSULT"</p>  

                  <div className = "text-muted-foreground space-y-2">
                  <p>
                    LV40203643527, 23.04.2025
                  </p>
                  <p>      Rīga, Brīvības iela 91–22, LV-1001<br /></p>
                  <p>
                        <a href="https://www.buvconsult.com" className="underline">buvconsult.com</a>
                  </p>
                    
                <p>

                        All rights reserved  
                </p>
            
            </div>
             
           
            </div>
             <div className=" space-y-4 mt-6 text-base leading-snug ">


                     <h1>
                        Data
                   </h1>

                    <p>
                        <a href="https://www.buvconsult.com/Landing/SiteDiary" className="underline text-muted-foreground">Site diary</a>
                    </p>
                    <p>
                        <a href="https://www.buvconsult.com/Landing/Invoices" className="underline text-muted-foreground">Invoices</a>
                    </p>
                    <p>
                        <a href="https://www.buvconsult.com/Landing/Documents" className="underline text-muted-foreground">Documents</a>
                    </p>
                    <p>
                        <a href="https://www.buvconsult.com/Landing/Timesheets" className="underline text-muted-foreground">Timesheets</a>
                    </p>
                    <p>
                        <a href="https://www.buvconsult.com/Landing/Analytics" className="underline text-muted-foreground">Analytics</a>
                    </p>


             </div>
              <div className=" space-y-4 mt-6 text-base leading-snug ">

                    
                     <p>
                        Features
                    </p>
                    <div className='space-y-4 text-muted-foreground'>
                    <p>
                        <a href="https://www.buvconsult.com/Landin/Custom" className="underline">Custom Digital Solution</a>
                    </p>
                    <p>
                        <a href="https://www.buvconsult.com" className="underline">Pricing</a>
                    </p>
                    <p>
                        <a href="https://www.buvconsult.com" className="underline">About</a>
                    </p>
                        </div>


             </div>
              <div>

                                            <Card className='h-full'>
                        <CardHeader>
                            <CardTitle>Contact</CardTitle>
                            <CardDescription>
                                <h4 className="text-3xl">
                                            Buv<span className="text-primary">consult</span>
                                        </h4>
                                </CardDescription>
                            <CardAction>Contact us anytime!</CardAction>
                        </CardHeader>
                        <CardContent>
                            <p>tel. +37124885690</p>
                        </CardContent>
                        <CardFooter>
                            <p>hello@buvconsult.com</p>
                        </CardFooter>
                        </Card>

              </div>




        </div>

</>

)


}