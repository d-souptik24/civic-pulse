
import { callGemini } from '../lib/gemini.js';
async function test() {
  try {
    const prompt = 'You are an autonomous civic agent. Draft a formal, professional escalation summary to the municipal authorities regarding a pothole issue.';
    const summary = await callGemini(prompt, [], 20000, 'minimal');
    console.log('Success:', summary);
    process.exit(0);
  } catch (e) {
    console.error('FAILED:', e);
    process.exit(1);
  }
}
test();

