import {Card, CardHeader, CardFooter, CardTitle, CardDescription, CardAction, CardContent} from '@/components/ui/card'
 


export function Footer () {




return (

<>

        <div className="grid grid-cols-4 p-15 gap-5">
       
            <div className=" space-y-6 mt-6 text-base leading-snug text-muted-foreground">

          
                    
                  <p>SIA "BUVCONSULT"</p>  
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
             <div className=" space-y-6 mt-6 text-base leading-snug text-muted-foreground">

                    <p>
                        <a href="https://www.buvconsult.com" className="underline">buvconsult.com</a>
                    </p>
                    <p>
                        <a href="https://www.buvconsult.com" className="underline">buvconsult.com</a>
                    </p>
                    <p>
                        <a href="https://www.buvconsult.com" className="underline">buvconsult.com</a>
                    </p>
                    <p>
                        <a href="https://www.buvconsult.com" className="underline">buvconsult.com</a>
                    </p>
                    <p>
                        <a href="https://www.buvconsult.com" className="underline">buvconsult.com</a>
                    </p>


             </div>
              <div className=" space-y-6 mt-6 text-base leading-snug text-muted-foreground">

                    <p>
                        <a href="https://www.buvconsult.com" className="underline">buvconsult.com</a>
                    </p>
                    <p>
                        <a href="https://www.buvconsult.com" className="underline">buvconsult.com</a>
                    </p>
                    <p>
                        <a href="https://www.buvconsult.com" className="underline">buvconsult.com</a>
                    </p>
                    <p>
                        <a href="https://www.buvconsult.com" className="underline">buvconsult.com</a>
                    </p>
                    <p>
                        <a href="https://www.buvconsult.com" className="underline">buvconsult.com</a>
                    </p>


             </div>
              <div>

                                            <Card className='h-full'>
                        <CardHeader>
                            <CardTitle>Contact</CardTitle>
                            <CardDescription>BUVCONSULT</CardDescription>
                            <CardAction>Card Action</CardAction>
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