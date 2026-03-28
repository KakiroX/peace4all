import json
import sys

prompt_template = """
You are an expert course creator. Given the following lesson content, generate a quiz with {num_questions} multiple-choice questions.
Return the output STRICTLY as a JSON list of objects. Do not include markdown formatting like ```json or ```.
Each object must have:
- "question": (string) The question text
- "options": (list of exactly 4 strings) The 4 possible options
- "correct_option_index": (int) The index (0 to 3) of the correct option
- "explanation": (string) A brief explanation of why the correct option is correct.

Lesson Content:
{content}
"""

def test_prompt(content, num_questions=3):
    try:
        import google.generativeai as genai
        import os
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print("No GEMINI_API_KEY found, skipping actual API call, printing prompt.")
            print("----- PROMPT -----")
            print(prompt_template.format(num_questions=num_questions, content=content))
            return

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-pro-latest')
        prompt = prompt_template.format(num_questions=num_questions, content=content)
        print("Calling Gemini API...")
        response = model.generate_content(prompt)
        print("----- RESPONSE -----")
        print(response.text)
        print("--------------------")
        
        # Test JSON parsing
        try:
            data = json.loads(response.text)
            print(f"Successfully parsed JSON. Number of questions: {len(data)}")
            for q in data:
                print(f"- {q['question']}")
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON: {e}")
            
    except ImportError:
        print("google.generativeai not installed")

if __name__ == "__main__":
    sample_lesson = "The mitochondria is the powerhouse of the cell. It generates most of the chemical energy needed to power the cell's biochemical reactions."
    test_prompt(sample_lesson)
