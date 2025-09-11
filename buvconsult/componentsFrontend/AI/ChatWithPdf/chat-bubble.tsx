import Balancer from "react-wrap-balancer"
import {Message} from "ai/react"
import ReactMarkdown from "react-markdown"
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/componentsFrontend/ui/card";
import {Accordion, AccordionItem, AccordionTrigger, AccordionContent} from "@/componentsFrontend/ui/accordion";
import {formattedSourceText} from "@/componentsFrontend/AI/ChatWithPdf/utils";


const wrappedText = (text: string) =>
 text.split("\n").map((line, i) => (
    <span key={i}>
      {line}
      <br />
    </span>
  ));

interface ChatBubbleProps extends Partial<Message>{
    sources: string[]
}

export function ChatBubble({
                               role = "assistant",
                               content,
                               sources,
                           }: ChatBubbleProps){
    if (!content) {
        return null;
    }

    const wrappedMessage = wrappedText (content)
    const formattedMessage = wrappedText(content)


    return (
    <div>
      <Card className="mb-2">
        <CardHeader>
          <CardTitle
            className={
              role != "assistant"
                ? "text-amber-500 dark:text-amber-200"
                : "text-blue-500 dark:text-blue-200"
            }
          >
            {role == "assistant" ? "AI" : "You"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <Balancer>{wrappedMessage}</Balancer>
        </CardContent>
        <CardFooter>
          <CardDescription className="w-full">
            {sources && sources.length ? (
              <Accordion type="single" collapsible className="w-full">
                {sources.map((source, index) => (
                  <AccordionItem value={`source-${index}`} key={index}>
                    <AccordionTrigger>{`Source ${index + 1}`}</AccordionTrigger>
                    <AccordionContent>
                      <ReactMarkdown>
                          {formattedSourceText(source)}
                        </ReactMarkdown>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <></>
            )}
          </CardDescription>
        </CardFooter>
      </Card>
    </div>
  );
}