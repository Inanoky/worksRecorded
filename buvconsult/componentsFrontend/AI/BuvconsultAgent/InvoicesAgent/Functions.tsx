  //C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\componentsFrontend\AI\BuvconsultAgent\InvoicesAgent\Functions.tsx      
import { prisma } from "@/app/utils/db";


const incorrect_SQL_query = `SELECT * FROM invoices LIMIT 5;`;
const correct_SQL_query = `SELECT * FROM  public."InvoiceItems" LIMIT 5;`;
        
        
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
 

const toCHeck = "postgreSQL_query\":\"SELECT COUNT(*) AS total_items, SUM(sum) AS total_cost, AVG(sum) AS avg_item_cost, MIN(sum) AS min_item_cost, MAX(sum) AS max_item_cost FROM \\\"InvoiceItems\\\" WHERE \\\"siteId\\\" = '48f39d7c-9d7f-4c6e-bb12-b20a8d7e7315'";

const nuked = nukeBackslashes(toCHeck)
console.log(nuked)