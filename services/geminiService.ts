import { GoogleGenAI } from "@google/genai";
import { ScheduleResult, Employee, ShiftType } from "../types";

// NOTE: API Key is expected in process.env.API_KEY
const apiKey = process.env.API_KEY || ""; 
// In a real deployed app, we'd handle the missing key gracefully. 
// For this task, we assume it exists as per instructions.

const ai = new GoogleGenAI({ apiKey });

export async function analyzeSchedule(scheduleResult: ScheduleResult, employees: Employee[]) {
  if (!apiKey) {
    return "API Key is missing. Cannot perform AI analysis.";
  }

  const model = "gemini-2.5-flash"; // Using Flash for speed/cost effectiveness for analysis
  
  // Summarize the schedule for the prompt
  const summary = scheduleResult.schedule.map(d => {
    return `Day ${d.dayOfMonth} (${d.isSpecialHoliday ? 'SPECIAL' : 'Normal'}): ${d.assignments.map(a => {
        const emp = employees.find(e => e.id === a.employeeId);
        return `${emp?.name} [${a.shiftType}${a.isSpecialException ? '-EXCEPT' : ''}]`;
    }).join(', ')}`;
  }).join('\n');

  const prompt = `
    Analyze the following monthly shift schedule for a medical team.
    
    Constraints Checklist:
    1. Did anyone work consecutive days illegally? (Note: Shift C on Special Holiday followed by Shift B next day is the ONLY allowed exception).
    2. Are there any fairness issues? (e.g., someone working too many weekends).
    3. Is the distribution of "Exception" shifts (Special Holiday C -> B) reasonable?

    Schedule Summary:
    ${summary}

    Please provide a concise, bulleted report on the schedule's quality and any potential burnout risks.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to connect to AI for analysis.";
  }
}
