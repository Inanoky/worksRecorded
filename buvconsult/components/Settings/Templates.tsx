"use client";

import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TemplateCardProps {
  fileUrl: string; // direct link to your Excel template
}

export function TemplateCard({ fileUrl }: TemplateCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Project Schema for Download</CardTitle>
        <CardDescription>Please download and fill in the template with works</CardDescription>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-32 pr-4">
          <div className="flex items-center justify-between gap-2 border rounded-md p-2 mb-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="text-green-600 w-5 h-5" />
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                Project schema template
              </span>
            </div>
            <div>
              <Button asChild variant="secondary" size="sm">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  Download
                </a>
              </Button>
            </div>
          </div>
        </ScrollArea>
      </CardContent>

    
    </Card>
  );
}
