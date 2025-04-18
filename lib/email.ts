// This file contains email notification utilities

export type EmailNotification = {
  to: string
  subject: string
  body: string
}

/**
 * Send an email notification
 * @param notification The email notification to send
 * @returns A promise that resolves to a boolean indicating success
 */
export async function sendEmailNotification(notification: EmailNotification): Promise<boolean> {
  // In a real app, this would send an actual email
  console.log("Sending email notification:", notification)

  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Email sent successfully to:", notification.to)
      resolve(true)
    }, 500)
  })
}

/**
 * Create a welcome notification for a new user
 * @param user The user to create a notification for
 * @returns An email notification object
 */
export function createUserNotification(user: { name: string; email: string }): EmailNotification {
  return {
    to: user.email,
    subject: "Welcome to TaskFlow",
    body: `
      Hello ${user.name},
      
      Your account has been created on TaskFlow. You can now log in using your email address.
      
      Best regards,
      The TaskFlow Team
    `,
  }
}

/**
 * Create an assignment notification for a user
 * @param user The user to notify
 * @param flowTitle The title of the action flow
 * @returns An email notification object
 */
export function assignmentNotification(user: { name: string; email: string }, flowTitle: string): EmailNotification {
  return {
    to: user.email,
    subject: `New Task Assignment: ${flowTitle}`,
    body: `
      Hello ${user.name},
      
      You have been assigned to a new action flow: "${flowTitle}".
      Please log in to your TaskFlow account to view and complete your tasks.
      
      Best regards,
      The TaskFlow Team
    `,
  }
}
