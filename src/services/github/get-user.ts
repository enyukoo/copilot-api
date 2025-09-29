import { GITHUB_API_BASE_URL, standardHeaders } from "../../lib/api-config.js"
import { HTTPError } from "../../lib/error.js"
import { state } from "../../lib/state.js"

export async function getGitHubUser() {
  const response = await fetch(`${GITHUB_API_BASE_URL}/user`, {
    headers: {
      authorization: `token ${state.githubToken}`,
      ...standardHeaders(),
    },
  })

  if (!response.ok) throw new HTTPError("Failed to get GitHub user", response)

  return (await response.json()) as GithubUserResponse
}

interface GithubUserResponse {
  login: string
  id: number
  name: string | null
  email: string | null
  avatar_url: string
  html_url: string
  type: string
  company: string | null
  blog: string | null
  location: string | null
  bio: string | null
  public_repos: number
  public_gists: number
  followers: number
  following: number
  created_at: string
  updated_at: string
  private_gists?: number
  total_private_repos?: number
  owned_private_repos?: number
  disk_usage?: number
  collaborators?: number
  two_factor_authentication?: boolean
  plan?: {
    name: string
    space: number
    private_repos: number
    collaborators: number
  }
}
