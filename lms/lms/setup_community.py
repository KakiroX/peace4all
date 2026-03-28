import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def create_doctypes():
    print("Creating LMS Community Post...")
    if not frappe.db.exists("DocType", "LMS Community Post"):
        post = frappe.get_doc({
            "doctype": "DocType",
            "name": "LMS Community Post",
            "module": "Lms",
            "custom": 1,
            "naming_rule": "Expression",
            "autoname": "format:POST-{#####}",
            "fields": [
                {"fieldname": "title", "label": "Title", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
                {"fieldname": "content", "label": "Content", "fieldtype": "Text Editor", "reqd": 1},
                {"fieldname": "author", "label": "Author", "fieldtype": "Link", "options": "User", "reqd": 1, "in_list_view": 1},
                {"fieldname": "upvotes", "label": "Upvotes", "fieldtype": "Int", "default": "0", "in_list_view": 1},
            ],
            "permissions": [
                {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "LMS Student", "read": 1, "write": 1, "create": 1},
                {"role": "Guest", "read": 1}
            ]
        })
        post.insert()
        print("LMS Community Post created.")
    else:
        print("LMS Community Post already exists.")

    print("Creating LMS Community Comment...")
    if not frappe.db.exists("DocType", "LMS Community Comment"):
        comment = frappe.get_doc({
            "doctype": "DocType",
            "name": "LMS Community Comment",
            "module": "Lms",
            "custom": 1,
            "naming_rule": "Expression",
            "autoname": "format:CMMT-{#####}",
            "fields": [
                {"fieldname": "post", "label": "Post", "fieldtype": "Link", "options": "LMS Community Post", "reqd": 1, "in_list_view": 1},
                {"fieldname": "content", "label": "Content", "fieldtype": "Text Editor", "reqd": 1},
                {"fieldname": "author", "label": "Author", "fieldtype": "Link", "options": "User", "reqd": 1, "in_list_view": 1},
                {"fieldname": "upvotes", "label": "Upvotes", "fieldtype": "Int", "default": "0", "in_list_view": 1},
            ],
            "permissions": [
                {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "LMS Student", "read": 1, "write": 1, "create": 1},
                {"role": "Guest", "read": 1}
            ]
        })
        comment.insert()
        print("LMS Community Comment created.")
    else:
        print("LMS Community Comment already exists.")

    print("Creating LMS Community Vote...")
    if not frappe.db.exists("DocType", "LMS Community Vote"):
        vote = frappe.get_doc({
            "doctype": "DocType",
            "name": "LMS Community Vote",
            "module": "Lms",
            "custom": 1,
            "naming_rule": "Expression",
            "autoname": "format:VOTE-{#####}",
            "fields": [
                {"fieldname": "reference_doctype", "label": "Reference DocType", "fieldtype": "Link", "options": "DocType", "reqd": 1},
                {"fieldname": "reference_name", "label": "Reference Name", "fieldtype": "Dynamic Link", "options": "reference_doctype", "reqd": 1},
                {"fieldname": "user", "label": "User", "fieldtype": "Link", "options": "User", "reqd": 1},
                {"fieldname": "vote_type", "label": "Vote Type", "fieldtype": "Select", "options": "Upvote\nDownvote", "reqd": 1},
            ],
            "permissions": [
                {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "LMS Student", "read": 1, "write": 1, "create": 1}
            ]
        })
        vote.insert()
        print("LMS Community Vote created.")
    print("LMS Community Vote already exists.")

    frappe.db.commit()
    print("Doctype setup complete.")

if __name__ == "__main__":
    frappe.init(site="lms.localhost")
    frappe.connect()
    create_doctypes()
