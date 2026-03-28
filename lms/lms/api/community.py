import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
def get_posts():
    posts = frappe.get_all("LMS Community Post", fields=[
        "name", "title", "content", "author", "upvotes", "creation"
    ], order_by="upvotes desc, creation desc")
    
    # Add simple comment count
    for post in posts:
        post.comment_count = frappe.db.count("LMS Community Comment", {"post": post.name})
    
    return posts

@frappe.whitelist(allow_guest=True)
def get_post(post_name):
    post = frappe.get_doc("LMS Community Post", post_name)
    post_dict = post.as_dict()
    
    comments = frappe.get_all("LMS Community Comment", filters={
        "post": post_name
    }, fields=[
        "name", "content", "author", "upvotes", "creation"
    ], order_by="upvotes desc, creation asc")
    
    post_dict.comments = comments
    
    user = frappe.session.user
    if user != "Guest":
        user_vote = frappe.db.get_value("LMS Community Vote", {
            "reference_doctype": "LMS Community Post",
            "reference_name": post_name,
            "user": user
        }, "vote_type")
        post_dict.user_vote = user_vote
        
        # also attach user votes for comments
        for comment in post_dict.comments:
            comment.user_vote = frappe.db.get_value("LMS Community Vote", {
                "reference_doctype": "LMS Community Comment",
                "reference_name": comment.name,
                "user": user
            }, "vote_type")
            
    return post_dict

@frappe.whitelist()
def create_post(title, content):
    if frappe.session.user == "Guest":
        frappe.throw(_("Please log in to post."))
        
    post = frappe.get_doc({
        "doctype": "LMS Community Post",
        "title": title,
        "content": content,
        "author": frappe.session.user,
        "upvotes": 0
    })
    post.insert()
    frappe.db.commit()
    return post.name

@frappe.whitelist()
def create_comment(post_name, content):
    if frappe.session.user == "Guest":
        frappe.throw(_("Please log in to comment."))
        
    if not frappe.db.exists("LMS Community Post", post_name):
        frappe.throw(_("Post not found."))
        
    comment = frappe.get_doc({
        "doctype": "LMS Community Comment",
        "post": post_name,
        "content": content,
        "author": frappe.session.user,
        "upvotes": 0
    })
    comment.insert()
    frappe.db.commit()
    return comment.name

@frappe.whitelist()
def vote(reference_doctype, reference_name, vote_type):
    # vote_type should be "Upvote", "Downvote", or "None" (to remove vote)
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Please log in to vote."))
        
    if reference_doctype not in ["LMS Community Post", "LMS Community Comment"]:
        frappe.throw(_("Invalid Document Type"))
        
    if not frappe.db.exists(reference_doctype, reference_name):
        frappe.throw(_("Document not found."))
        
    existing_vote = frappe.get_all("LMS Community Vote", filters={
        "reference_doctype": reference_doctype,
        "reference_name": reference_name,
        "user": user
    }, fields=["name", "vote_type"])
    
    doc = frappe.get_doc(reference_doctype, reference_name)
    
    if existing_vote:
        old_vote_type = existing_vote[0].vote_type
        
        if vote_type == "None" or vote_type == old_vote_type:
            # Remove vote
            frappe.delete_doc("LMS Community Vote", existing_vote[0].name)
            if old_vote_type == "Upvote":
                doc.upvotes -= 1
            else:
                doc.upvotes += 1
        else:
            # Change vote
            frappe.db.set_value("LMS Community Vote", existing_vote[0].name, "vote_type", vote_type)
            if vote_type == "Upvote" and old_vote_type == "Downvote":
                doc.upvotes += 2
            elif vote_type == "Downvote" and old_vote_type == "Upvote":
                doc.upvotes -= 2
    else:
        if vote_type in ["Upvote", "Downvote"]:
            new_vote = frappe.get_doc({
                "doctype": "LMS Community Vote",
                "reference_doctype": reference_doctype,
                "reference_name": reference_name,
                "user": user,
                "vote_type": vote_type
            })
            new_vote.insert()
            if vote_type == "Upvote":
                doc.upvotes += 1
            else:
                doc.upvotes -= 1
                
    doc.save()
    frappe.db.commit()
    return doc.upvotes
