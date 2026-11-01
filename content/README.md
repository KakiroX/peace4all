# Content guide

All study material lives here. There are two kinds of file:

- `subjects/<subject>.ts`: the syllabus (units → topics). Topic ids are what questions point to.
- `questions/<subject>.json`: the question bank, a JSON array.

Subjects: `physics-hl`, `math-aa-hl`, `chem-sl`, `bm-sl`.

Run `npm run validate:content` after any change. It checks ids, topics, answers and LaTeX pitfalls, and it runs in CI too.

## Question format

Every question has:

| Field | Required | Notes |
| --- | --- | --- |
| `id` | ✓ | Unique, e.g. `phys-m23-tz1-p1-q05` |
| `subject` | ✓ | Must match the file |
| `topic` | ✓ | A topic `id` from the syllabus file, e.g. `A.1`, `S1.4`, `3.5`, `calc-int` |
| `type` | ✓ | `mcq`, `numeric` or `written` |
| `difficulty` | ✓ | `1` easy, `2` medium, `3` hard |
| `marks` | ✓ | Positive integer |
| `prompt` | ✓ | Markdown + LaTeX |
| `explanation` | | Worked solution shown after answering |
| `paper` | | `P1`, `P2`, `P3` |
| `calculator` | | `false` shows a "No calculator" badge |
| `source` | | e.g. `M23 TZ1 P2 Q4` or `Sample` |
| `tags` | | Free-form strings |

Type-specific fields:

```jsonc
// Multiple choice: answer is the 0-based index of the correct option
{ "type": "mcq", "options": ["$1.2$ m", "$3.7$ m", "$7.3$ m", "$14.7$ m"], "answer": 2 }

// Numeric: auto-marked. Relative tolerance defaults per subject
// (physics/chem 2%, math 0.5%, BM 1%); override with tolerance or absTolerance.
{ "type": "numeric", "answer": 3000, "units": "N", "tolerance": 0.02 }

// Written: the student self-marks against the markscheme
{ "type": "written", "markscheme": "Shifts right ✓\n\nFewer moles of gas on the right ✓" }
```

## Writing maths

- Inline `$...$`, display `$$...$$` (KaTeX). In JSON, backslashes are doubled: `"$\\dfrac{1}{2}$"`.
- **Currency goes outside math**: write `\\$500` (renders as $500). Never put `\$` inside `$...$`, because it ends the math early. The validator catches this.
- Multi-part questions: put parts in the prompt (`**(a)** … **[2]**`) and use a `written` question whose `marks` is the total.
- Images: put files in `public/content/<subject>/` and reference them with `![diagram](/content/physics-hl/fig1.png)`.

## Sending material

Past papers, markschemes, question banks, notes: PDFs, images or text all work. Each question is converted into the format above, tagged with its syllabus topic and difficulty, and checked by the validator. The `"source": "Sample"` placeholders get replaced.
