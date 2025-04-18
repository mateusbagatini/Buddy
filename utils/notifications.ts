// This is a mock email notification service
// In a real application, this would connect to an email service provider

export type EmailNotification = {
  to: string
  subject: string
  body: string
}

export function sendEmailNotification(notification: EmailNotification): Promise<boolean> {
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
