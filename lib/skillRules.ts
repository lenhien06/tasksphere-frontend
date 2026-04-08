const TESTING_SKILL_KEYWORDS = [
    "qa",
    "testing",
    "quality assurance",
    "test engineer",
    "tester",
    "qc",
]

const DEVELOPMENT_SKILL_KEYWORDS = [
    "development",
    "developer",
    "software engineer",
    "software developer",
    "frontend developer",
    "backend developer",
    "fullstack developer",
    "full-stack developer",
    "web developer",
    "mobile developer",
]

const normalizeSkill = (skill: string) => skill.trim().toLowerCase()

const includesKeyword = (skill: string, keywords: string[]) =>
    keywords.some((keyword) => skill.includes(keyword))

export const canonicalizeSkills = (skills: string[] | null | undefined): string[] => {
    if (!skills || skills.length === 0) return []

    const canonical = new Set<string>()

    for (const rawSkill of skills) {
        const normalized = normalizeSkill(rawSkill ?? "")
        if (!normalized) continue

        if (includesKeyword(normalized, TESTING_SKILL_KEYWORDS)) {
            canonical.add("Testing")
            continue
        }

        if (includesKeyword(normalized, DEVELOPMENT_SKILL_KEYWORDS)) {
            canonical.add("Development")
            continue
        }

        canonical.add(rawSkill.trim())
    }

    return Array.from(canonical)
}

export const hasTestingSkill = (skills: string[] | null | undefined): boolean =>
    canonicalizeSkills(skills).some((skill) => normalizeSkill(skill) === "testing")

export const hasDevelopmentSkill = (skills: string[] | null | undefined): boolean =>
    canonicalizeSkills(skills).some((skill) => normalizeSkill(skill) === "development")
