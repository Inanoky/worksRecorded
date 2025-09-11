import {ChatBubble} from "./chat-bubble"
import {Button} from "@/componentsFrontend/ui/button"
import {Input} from "@/componentsFrontend/ui/input"
import {Message} from "ai/react"

export function Chat(){
    const messages: Message[]=[
        {role: "assistant", content: "hey I am your AI", id: "1"},
        {role: "user", content: "hey I am your AI", id: "2"}

    ]

    const sources = ["I am source one", "I am source two"]

    return (

        <div className="rounded-2xl border h-[75vh] flex flex-col juestify-between">
            <div className="px-6 overflow-auto">
                {messages.map(({id, role, content}: Message, index) =>(
                    <ChatBubble
                    key={id}
                    role={role}
                    content={content}
                    sources={role !== "assistant" ? [] : sources}
                    />


                ))}



            </div>


            <form className="gap-4 flex clear-both">

                <Input placeholder={"Type to chat with Ai..."} className="mr-2"/>

                <Button type="submit" className="w-24">
                    Ask
                </Button>

            </form>


        </div>





    )

}