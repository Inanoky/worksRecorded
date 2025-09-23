


import { getSiteDiarySchema } from "./siteDiaryActions";


export async function getLocationsWorksFromSiteSchema(siteId: string, type: 'Location' | 'Work') {
        

const schema = await getSiteDiarySchema({siteId});

  function extractLocationNames(schema) {
    return schema.filter(node => node.type === "Location").map(node => node.name);

    }
  function extractWorkNames(schema) {
    const worksSet = new Set();
    function walk(node) {
        if (node.type === "Work") worksSet.add(node.name);
        node.children?.forEach(walk);
    }
    schema.forEach(walk);
    return Array.from(worksSet);
    }

    if (type === 'Location'){
        return extractLocationNames(schema);
    } else {    
        return extractWorkNames(schema);

                
              


}}


// console.log(await getLocationsWorksFromSiteSchema("ae7d5575-da8c-46a7-b406-5c24771a2b47", 'Location'));
// console.log(await getLocationsWorksFromSiteSchema("ae7d5575-da8c-46a7-b406-5c24771a2b47", 'Work'));