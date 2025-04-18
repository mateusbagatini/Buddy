/**
 * Create a user using the admin API to bypass rate limits
 */
export async function createUserWithAPI(userData: {
  name: string
  email: string
  password: string
  role: string
  status: string
}) {
  try {
    console.log("Creating user with API route:", userData.email)

    // Create the user in auth
    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to create user via API")
    }

    const data = await response.json()
    console.log("User created successfully via API route")
    return data
  } catch (error) {
    console.error("Error creating user with API:", error)
    throw error
  }
}
