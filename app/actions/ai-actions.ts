"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize the Google Generative AI with the API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")

export async function generateAIResponse(message: string) {
  try {
    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    // The prompt includes context about the application
    const prompt = `You are a helpful assistant for a task management application. 
    You can help users understand their tasks, provide guidance on completing them, 
    and answer questions about the platform. 
    
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
