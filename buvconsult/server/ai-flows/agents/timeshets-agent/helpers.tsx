  //C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\componentsFrontend\AI\BuvconsultAgent\InvoicesAgent\Functions.tsx      
import { prisma } from "@/app/utils/db";



        
        
export const SQLexecute = async (state) => {                
            
                    
                
                    try {                             
                        const result = await prisma.$queryRawUnsafe(state);                          
                        return {
                            result
                        };
                    } catch (e) {
                        
                        return {
                            
                            result:  `SQL Error: ${e.message}`,
                        };
                    }
                };

export function nukeBackslashes(s: string) {
  return (s ?? "").replace(/\\/g, "");
}
 

