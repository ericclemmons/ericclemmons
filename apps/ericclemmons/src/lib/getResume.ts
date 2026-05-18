const RESUME_URL =
  'https://gist.githubusercontent.com/ericclemmons/66431faefc349ce95fd6b83a249442e3/raw/resume.json'

interface ResumeWork {
  name: string
  position: string
  startDate: string
  endDate?: string
  summary: string
  highlights: string[]
}

interface ResumeProject {
  name: string
  url: string
  description: string
  highlights?: string[]
}

interface ResumeSkill {
  name: string
  keywords: string[]
}

interface ResumeReference {
  name: string
  reference: string
}

export interface Resume {
  basics: {
    name: string
    label: string
    summary: string
    location: { city: string; region: string }
    profiles: { network: string; username: string; url: string }[]
  }
  work: ResumeWork[]
  education: { institution: string; area: string; studyType: string; endDate: string }[]
  skills: ResumeSkill[]
  projects: ResumeProject[]
  references: ResumeReference[]
}

export async function getResume(): Promise<Resume> {
  const res = await fetch(RESUME_URL)

  if (!res.ok) {
    throw new Error(`Failed to fetch resume: ${res.status}`)
  }

  return res.json() as Promise<Resume>
}
