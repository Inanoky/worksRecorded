import { PromptTemplate } from "@langchain/core/prompts";
import {pull} from "langchain/hub";

const prompt = await pull<PromptTemplate>("hwchase17/react");

console.log(prompt)