
'use server';
/**
 * @fileOverview AI Mission Briefing Agent.
 * Generates concise, tactical summaries for staff members based on their current workload.
 */

import { ai, z } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

const MissionBriefingInputSchema = z.object({
  userName: z.string().describe('The name of the user receiving the briefing.'),
  activeTasksCount: z.number().describe('Number of tasks assigned to the user.'),
  urgentTasksCount: z.number().describe('Number of tasks due within 24 hours.'),
  unreadMessagesCount: z.number().describe('Count of unread chat transmissions.'),
  latestAnnouncement: z.string().optional().describe('The title or content of the most recent broadcast.'),
});

export type MissionBriefingInput = z.infer<typeof MissionBriefingInputSchema>;

/**
 * Generates a tactical AI mission briefing.
 */
export async function getMissionBriefing(input: MissionBriefingInput): Promise<string> {
  const { text } = await ai.generate({
    model: googleAI.model('gemini-2.5-flash'),
    prompt: `You are the Basechan Staff Tactical Intelligence Agent. 
    Generate a high-velocity, professional, and slightly futuristic "Mission Briefing" for ${input.userName}.
    
    CURRENT OPERATIONAL DATA:
    - Active Objectives: ${input.activeTasksCount}
    - Critical Deadlines: ${input.urgentTasksCount}
    - Unread Transmissions: ${input.unreadMessagesCount}
    - Latest Broadcoast: ${input.latestAnnouncement || 'None'}
    
    INSTRUCTIONS:
    1. Be concise (max 350 characters).
    2. Use tactical language like "Objectives," "Node," "Deploy," and "Transmission."
    3. If urgent tasks exist, emphasize them immediately.
    4. Do not use generic greetings; get straight to the operational summary.
    5. Maintain a tone of professional urgency and efficiency.`,
  });
  
  return text;
}

const missionBriefingFlow = ai.defineFlow(
  {
    name: 'missionBriefingFlow',
    inputSchema: MissionBriefingInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    return await getMissionBriefing(input);
  }
);
