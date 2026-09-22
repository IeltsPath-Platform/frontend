export const AI_WRITING_FEEDBACK = {
  prompt: "Some people think remote work is beneficial for society, while others believe it has more negative effects.",
  original:
    "Remote work has become common and it gives workers more freedom. However, some people feel isolated and companies can find it difficult to communicate with their teams.",
  revised:
    "Remote work has become increasingly common, offering employees greater autonomy over their routines. Nevertheless, it can also create social isolation and make spontaneous collaboration more difficult for teams.",
  lineFeedback: [
    { source: "has become common", note: "Use a more precise trend phrase: ‘has become increasingly common’." },
    { source: "more freedom", note: "‘Greater autonomy’ is more formal and specific for an academic essay." },
    { source: "feel isolated", note: "Name the effect directly: ‘create social isolation’." },
  ],
  vocabulary: ["greater autonomy", "spontaneous collaboration", "social isolation", "work-life boundaries"],
  rubric: [
    { criterion: "Task response", band: 6.5, note: "Clear position; develop both consequences with examples." },
    { criterion: "Coherence & cohesion", band: 6.5, note: "Paragraph links are clear; add a sharper topic sentence." },
    { criterion: "Lexical resource", band: 6.5, note: "Good control; replace general words with precise academic phrases." },
    { criterion: "Grammar range & accuracy", band: 6.5, note: "Accurate simple clauses; vary complex sentence structures." },
  ],
}
