import {z} from "zod";
import {conformZodMessage} from "@conform-to/zod";

export const siteSchema = z.object({

    name: z.string().min(1).max(35),
    description: z.string().min(1).max(150),
    subdirectory: z.string().min((1)).max(40)

})

//Articles creatings ZOD schema.
export const PostSchema = z.object({


    title: z.string().min(1).max(100),
    slug: z.string().min(1).max(190),
    coverImage: z.string().min(1),
    smallDescription: z.string().min(1).max(200),
    articleContent: z.string().min(1),

})

//06:34 - async validation

export function SiteCreationSchema(options?: {
  isSubdirectoryUnique: () => Promise<boolean>;
}) {
  return z.object({
    subdirectory: z
      .string()
      .min(1)
      .max(40),
    
    name: z.string().min(1).max(35),
    description: z.string().min(1).max(150),
  });
}
