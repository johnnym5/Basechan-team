
'use server';
/**
 * @fileOverview AI Workload Briefing Assistant.
 * Generates concise, professional summaries for staff members based on their current workload.
 */

import { ai, z } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

const MissionBriefingInputSchema = z.object({
  userName: z.string().describe('The name of the user receiving the briefing.'),
  activeTasksCount: z.number().describe('Number of tasks assigned to the user.'),
  urgentTasksCount: z.number().describe('Number of tasks due within 24 hours.'),
  unreadMessagesCount: z.number().describe('Count of unread chat messages.'),
  latestAnnouncement: z.string().optional().describe('The title or content of the most recent announcement.'),
});

export type MissionBriefingInput = z.infer<typeof MissionBriefingInputSchema>;

/**
 * Generates a professional workload briefing.
 */
export async function getMissionBriefing(input: MissionBriefingInput): Promise<string> {
  const { text } = await ai.generate({
    model: googleAI.model('gemini-2.5-flash'),
    prompt: `You are the Basechan Business Analytics Assistant.
    Generate a professional and efficient "Workload Briefing" for ${input.userName}.
    
    CURRENT WORKLOAD DATA:
    - Active Tasks: ${input.activeTasksCount}
    - Urgent Tasks: ${input.urgentTasksCount}
    - Unread Messages: ${input.unreadMessagesCount}
    - Latest Announcement: ${input.latestAnnouncement || 'None'}
    
    INSTRUCTIONS:
    1. Be concise (max 350 characters).
    2. Use standard corporate language like "Tasks," "Schedule," and "Updates."
    3. If urgent tasks exist, emphasize them immediately.
    4. Do not use generic greetings; get straight to the summary.
    5. Maintain a tone of professional efficiency.`,
  });
  
  return text;
}

const missionBriefingFlow = ai.defineFlow(
  {
    name: 'missionBriefingFlow',
    inputSchema: MissionBriefingInputSchema,
    outputSchema: z.string(),
  },
  async (input: MissionBriefingInput) => {
    return await getMissionBriefing(input);
  }
);
