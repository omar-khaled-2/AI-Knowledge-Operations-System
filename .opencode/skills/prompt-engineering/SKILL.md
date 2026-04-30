---
name: prompt-engineering
description: Best practices for writing effective prompts for any LLM. Use when the user asks for help crafting prompts, improving prompt quality, wants prompt engineering tips, or needs to optimize instructions for AI models.
---

# Prompt Engineering

Apply these evidence-based patterns to improve prompt effectiveness across any language model.

## Core Rules

### 1. Put instructions first, separate from context
Use delimiters (`###`, `"""`, XML tags) to separate instructions from context.

**Less effective:**
```
Summarize the text below as bullet points.

{text input here}
```

**Better:**
```
Summarize the text below as bullet points.

Text: """
{text input here}
"""
```

### 2. Be specific and detailed
Define context, outcome, length, format, style, and constraints explicitly.

**Less effective:** `Write a poem about OpenAI.`  
**Better:** `Write a short inspiring poem about OpenAI's DALL-E launch in the style of {famous poet}.`

### 3. Show the desired output format
Provide examples of the expected structure.

**Less effective:** `Extract entities: company names, people, topics, themes.`  
**Better:**
```
Extract entities from the text.

Desired format:
Company names: <comma_separated_list>
People names: <comma_separated_list>
Specific topics: <comma_separated_list>
General themes: <comma_separated_list>

Text: {text}
```

### 4. Use zero-shot first, then few-shot, then structured/fine-tuned approaches
- **Zero-shot**: Direct instruction with no examples.
- **Few-shot**: 2-5 examples of input-output pairs before the actual request.
- **Structured**: System prompts, schemas, or tool definitions when precision is critical.

### 5. Reduce fluff and imprecision
**Less effective:** `The description should be fairly short, a few sentences only.`  
**Better:** `Use a 3-5 sentence paragraph to describe this product.`

### 6. Say what to do, not just what not to do
**Less effective:** `DO NOT ask for username or password. DO NOT repeat.`  
**Better:** `Diagnose the problem and suggest a solution. If account credentials are needed, refer the user to www.samplewebsite.com/help/faq instead of asking for PII.`

### 7. Use leading words for code generation
Hint at the starting pattern to nudge the model toward the right syntax.

**Less effective:**
```
# Write a Python function that converts miles to kilometers
```

**Better:**
```
# Write a Python function that converts miles to kilometers

import
```

## Model-Agnostic Enhancements

### System / Instruction Framing
- Start with a role definition when it helps (`You are an expert ...`).
- Use numbered steps for multi-part tasks.
- Repeat critical constraints at the end if adherence is low.

### Generate Anything Pattern
When you need a tailored prompt for a specific task, describe:
1. The exact task or transformation.
2. The expected output type (code, prose, structured data).
3. Any constraints (length, tone, format).

Then ask the model to generate the optimal prompt for that task. Review and refine the generated prompt before using it.

### Chain of Thought
For complex reasoning tasks, add `Let's think step by step.` or explicitly request intermediate reasoning before the final answer.

### Self-Correction Loop
When output quality matters, ask the model to:
1. Produce a draft.
2. Review it against the constraints.
3. Produce a final, corrected version.
