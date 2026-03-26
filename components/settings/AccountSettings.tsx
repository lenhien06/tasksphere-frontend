"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

type SkillType = "BE" | "FE" | "AI"

interface Skill {
  id: string
  name: string
  type: SkillType
}

export default function AccountSettings() {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState("")
  const [skills, setSkills] = useState<Skill[]>([
    { id: "1", name: "Python (BE)", type: "BE" },
    { id: "2", name: "Node.js (BE)", type: "BE" },
    { id: "3", name: "Go.js (BE)", type: "BE" },
    { id: "4", name: "React (FE)", type: "FE" },
    { id: "5", name: "Vue.js (FE)", type: "FE" },
    { id: "6", name: "Wae (FE)", type: "FE" },
    { id: "7", name: "Machine Learning (AI)", type: "AI" },
    { id: "8", name: "Data Science (AI)", type: "AI" },
    { id: "9", name: "NLP (AI)", type: "AI" },
  ])

  const inferSkillType = (name: string): SkillType => {
    const lower = name.toLowerCase()
    if (lower.includes("(be)") || lower.includes("backend") || lower.includes("python") || lower.includes("node") || lower.includes("ruby") || lower.includes("java") || lower.includes("go")) return "BE"
    if (lower.includes("(fe)") || lower.includes("frontend") || lower.includes("react") || lower.includes("vue") || lower.includes("angular") || lower.includes("svelte")) return "FE"
    if (lower.includes("(ai)") || lower.includes("artificial intelligence") || lower.includes("machine learning") || lower.includes("nlp") || lower.includes("deep learning")) return "AI"
    return "BE" // Default
  }

  const addSkill = () => {
    if (!inputValue.trim()) return
    
    // Explicitly add suffix if not present for visual consistency with the screenshot
    let finalName = inputValue.trim()
    const type = inferSkillType(finalName)
    
    if (!finalName.toUpperCase().includes(`(${type})`)) {
        finalName = `${finalName} (${type})`
    }

    const newSkill: Skill = {
      id: Math.random().toString(36).substr(2, 9),
      name: finalName,
      type: type
    }
    setSkills([...skills, newSkill])
    setInputValue("")
  }

  const removeSkill = (id: string) => {
    setSkills(skills.filter(s => s.id !== id))
  }

  const handleSave = () => {
    console.log("Saving skills to backend:", skills)
    // Placeholder for API call
    alert("Skills saved successfully!")
  }

  const getBadgeColor = (type: SkillType) => {
    switch (type) {
      case "BE": return "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
      case "FE": return "bg-green-600 hover:bg-green-700 text-white border-transparent"
      case "AI": return "bg-purple-600 hover:bg-purple-700 text-white border-transparent"
      default: return "bg-gray-600 text-white border-transparent"
    }
  }

  return (
    <Card className="w-full border-none shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-800">
          My Skills (AI Allocation Tags)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Input 
            placeholder="Add Skill" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSkill()}
            className="flex-1 bg-white border-gray-200 rounded-lg h-10 focus-visible:ring-gray-200 focus-visible:border-gray-400"
          />
          <Button 
            onClick={handleSave}
            variant="outline"
            className="border-gray-200 text-gray-700 font-medium px-6 hover:bg-gray-50 rounded-lg h-10"
          >
            Save Skills
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {skills.length === 0 && (
            <p className="text-sm text-gray-400 italic">No skills added yet.</p>
          )}
          {skills.map((skill) => (
            <Badge
              key={skill.id}
              className={cn(
                "pl-3 pr-2 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors cursor-default",
                getBadgeColor(skill.type)
              )}
            >
              {skill.name}
              <X 
                className="w-3.5 h-3.5 cursor-pointer opacity-80 hover:opacity-100 transition-opacity" 
                onClick={() => removeSkill(skill.id)}
              />
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
