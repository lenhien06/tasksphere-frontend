const TESTING_SKILL_KEYWORDS = [
    "qa",
    "testing",
    "quality assurance",
    "test engineer",
    "tester",
    "qc",
]

const normalizeSkill = (skill: string) => skill.trim().toLowerCase()

export const hasTestingSkill = (skills: string[] | null | undefined): boolean => {
    if (!skills || skills.length === 0) return false
    const normalized = skills.map(normalizeSkill)
    return normalized.some((skill) =>
        TESTING_SKILL_KEYWORDS.some((keyword) => skill.includes(keyword))
    )
}
