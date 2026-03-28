import frappe
from frappe import _
import json
import os

try:
    import google.generativeai as genai
except ImportError:
    genai = None

@frappe.whitelist()
def generate_quiz_for_lesson(lesson_name, num_questions=3):
    if not genai:
        frappe.throw(_("google-generativeai library is not installed. Please install it to use this feature."))

    # Get API key from .env variables or Frappe config
    api_key = os.environ.get("GEMINI_API_KEY") or frappe.conf.get("gemini_api_key")
    if not api_key:
        frappe.throw(_("Please configure GEMINI_API_KEY in your .env file or site_config.json."))

    lesson = frappe.get_doc("Course Lesson", lesson_name)
    if not lesson.body and not lesson.content:
        frappe.throw(_("Lesson has no content to generate a quiz from."))

    lesson_content = lesson.body or lesson.content

    genai.configure(api_key=api_key)
    # Using gemini-1.5-pro since it is the current standard for complex tasks, or gemini-1.5-flash
    model = genai.GenerativeModel('gemini-1.5-pro-latest')

    prompt = f"""
You are an expert course creator. Given the following lesson content, generate a quiz with {num_questions} multiple-choice questions.
Return the output STRICTLY as a JSON list of objects.
Each object must have:
- "question": (string) The question text
- "options": (list of exactly 4 strings) The 4 possible options
- "correct_option_index": (int) The index (0 to 3) of the correct option
- "explanation": (string) A brief explanation of why the correct option is correct.

Lesson Content:
{lesson_content}
"""

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        quiz_data = json.loads(response.text.strip())
        
        # Create Quiz
        quiz_title = f"Quiz for {lesson.title}"
        
        # Avoid duplicate titles
        existing_quiz = frappe.db.exists("LMS Quiz", quiz_title)
        if existing_quiz:
            import time
            quiz_title = f"{quiz_title} {int(time.time())}"
            
        quiz = frappe.get_doc({
            "doctype": "LMS Quiz",
            "title": quiz_title,
            "passing_percentage": 50,
            "total_marks": len(quiz_data),
            "lesson": lesson.name,
            "course": lesson.course,
            "show_answers": 1
        })
        
        # Create questions
        for item in quiz_data:
            q_doc = frappe.get_doc({
                "doctype": "LMS Question",
                "question": item.get("question"),
                "type": "Choices",
                "option_1": item.get("options")[0],
                "option_2": item.get("options")[1],
                "option_3": item.get("options")[2],
                "option_4": item.get("options")[3],
                "is_correct_1": 1 if item.get("correct_option_index") == 0 else 0,
                "is_correct_2": 1 if item.get("correct_option_index") == 1 else 0,
                "is_correct_3": 1 if item.get("correct_option_index") == 2 else 0,
                "is_correct_4": 1 if item.get("correct_option_index") == 3 else 0,
                "explanation_1": item.get("explanation") if item.get("correct_option_index") == 0 else "",
                "explanation_2": item.get("explanation") if item.get("correct_option_index") == 1 else "",
                "explanation_3": item.get("explanation") if item.get("correct_option_index") == 2 else "",
                "explanation_4": item.get("explanation") if item.get("correct_option_index") == 3 else ""
            })
            q_doc.insert(ignore_permissions=True)
            
            quiz.append("questions", {
                "question": q_doc.name,
                "marks": 1
            })
            
        quiz.insert(ignore_permissions=True)
        
        # Update lesson with the quiz ID
        frappe.db.set_value("Course Lesson", lesson.name, "quiz_id", quiz.name)
        
        return {
            "status": "success",
            "quiz_name": quiz.name,
            "message": _("Quiz generated successfully!")
        }

    except Exception as e:
        frappe.log_error(title="Quiz Generation Error", message=frappe.get_traceback())
        frappe.throw(_("Error generating quiz: {0}").format(str(e)))
