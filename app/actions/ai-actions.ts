"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase-server"

// Initialize the Google Generative AI with the API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")

export async function generateAIResponse(message: string, userId: string) {
  try {
    // Get user-specific data
    const supabase = createClient()

    // Fetch user's action flows
    const { data: actionFlows } = await supabase
      .from("action_flows")
      .select("id, title, description, deadline, status")
      .eq("user_id", userId)
      .limit(5)

    // Fetch user's tasks
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, description, completed, deadline")
      .eq("user_id", userId)
      .limit(10)

    // Fetch library items that might be relevant
    const { data: libraryItems } = await supabase.from("library_items").select("*").limit(10)

    // Fetch FAQs
    const { data: faqs } = await supabase.from("faqs").select("question, answer").eq("is_published", true).limit(10)

    // Create a knowledge base from the fetched data
    const knowledgeBase = {
      actionFlows: actionFlows || [],
      tasks: tasks || [],
      libraryItems: libraryItems || [],
      faqs: faqs || [],
      appInfo: {
        name: "TaskFlow",
        description: "A task management application that helps users organize their workflows and tasks.",
        features: [
          "Action flows for organizing multi-step processes",
          "Task tracking with deadlines",
          "File uploads for task documentation",
          "Messaging system for communication",
          "Approval workflows for tasks that need verification",
        ],
      },
    }

    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    // The prompt includes context about the application and user data
    const prompt = `You are a helpful assistant for a task management application called TaskFlow. 
   You can help users understand their tasks, provide guidance on completing them, 
   and answer questions about the platform.
   
   Here is some information about the user and the application:
   
   APPLICATION INFO:
   ${JSON.stringify(knowledgeBase.appInfo, null, 2)}
   
   USER'S ACTION FLOWS:
   ${JSON.stringify(knowledgeBase.actionFlows, null, 2)}
   
   USER'S TASKS:
   ${JSON.stringify(knowledgeBase.tasks, null, 2)}
   
   LIBRARY RESOURCES:
   ${JSON.stringify(knowledgeBase.libraryItems, null, 2)}

   FREQUENTLY ASKED QUESTIONS:
   ${JSON.stringify(knowledgeBase.faqs, null, 2)}
   
   When answering:
   1. If the user asks about their tasks or action flows, refer to the data provided above.
   2. If the user asks how to use a feature, explain it based on the application info.
   3. If the user asks for help with a specific task, provide guidance based on the task details.
   4. If the user asks a question that is answered in the FAQ, use the answer from the FAQ.
   5. If you don't have specific information, provide general guidance based on task management best practices.
   
   User message: ${message}`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    return { success: true, text }
  } catch (error) {
    console.error("Error generating AI response:", error)
    return {
      success: false,
      text: "Sorry, I couldn't process your request. Please try again later.",
    }
  }
}
