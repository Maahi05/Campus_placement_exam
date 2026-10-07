from fpdf import FPDF
import os

class PlacementPaperPDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(30, 58, 138)
        self.cell(0, 10, 'CAMPUS PLACEMENT ASSESSMENT 2026', align='C', new_x="LMARGIN", new_y="NEXT")
        self.set_font('Helvetica', 'I', 11)
        self.set_text_color(100, 116, 139)
        self.cell(0, 6, 'National College of Engineering & Technology - Training & Placement Cell', align='C', new_x="LMARGIN", new_y="NEXT")
        self.set_font('Helvetica', '', 10)
        self.set_text_color(71, 85, 105)
        self.cell(0, 6, 'Duration: 30 Minutes | Total Marks: 10 | Negative Marking: 0.25', align='C', new_x="LMARGIN", new_y="NEXT")
        self.ln(3)
        self.set_draw_color(203, 213, 225)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f'Page {self.page_no()} | Confidential Campus Placement Question Paper', align='C')

pdf = PlacementPaperPDF()
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=15)

questions = [
    {
        "num": 1,
        "section": "SECTION A: QUANTITATIVE APTITUDE",
        "text": "A train running at 54 km/hr crosses a platform 150 meters long in 20 seconds. What is the length of the train in meters?",
        "options": ["(A) 120 meters", "(B) 150 meters", "(C) 180 meters", "(D) 200 meters"],
        "ans": "B",
        "exp": "Speed = 54 * (5/18) = 15 m/s. Distance in 20s = 15 * 20 = 300m. Train length = 300 - 150 = 150 meters."
    },
    {
        "num": 2,
        "section": "SECTION A: QUANTITATIVE APTITUDE",
        "text": "If 12 men can complete a project in 15 days, how many men are needed to complete the same project in 10 days?",
        "options": ["(A) 16 men", "(B) 18 men", "(C) 20 men", "(D) 22 men"],
        "ans": "B",
        "exp": "M1 * D1 = M2 * D2 => 12 * 15 = M2 * 10 => 180 = 10 * M2 => M2 = 18."
    },
    {
        "num": 3,
        "section": "SECTION A: QUANTITATIVE APTITUDE",
        "text": "Find the missing number in the sequence: 4, 9, 19, 39, 79, ?",
        "options": ["(A) 149", "(B) 159", "(C) 169", "(D) 179"],
        "ans": "B",
        "exp": "Pattern: (* 2 + 1). 4*2+1=9, 9*2+1=19, 19*2+1=39, 39*2+1=79, 79*2+1=159."
    },
    {
        "num": 4,
        "section": "SECTION B: DATA STRUCTURES & ALGORITHMS",
        "text": "What is the worst-case time complexity of searching an element in a balanced Binary Search Tree (AVL Tree)?",
        "options": ["(A) O(1)", "(B) O(log n)", "(C) O(n)", "(D) O(n log n)"],
        "ans": "B",
        "exp": "A balanced BST maintains height of O(log n), so search is O(log n) even in worst case."
    },
    {
        "num": 5,
        "section": "SECTION B: DATA STRUCTURES & ALGORITHMS",
        "text": "Which data structure is primarily used to implement Breadth-First Search (BFS) graph traversal?",
        "options": ["(A) Stack", "(B) Priority Queue", "(C) Queue", "(D) Hash Table"],
        "ans": "C",
        "exp": "BFS processes nodes level by level using FIFO order, which is implemented with a Queue."
    },
    {
        "num": 6,
        "section": "SECTION B: DATA STRUCTURES & ALGORITHMS",
        "text": "What is the auxiliary space complexity of standard in-place Quicksort algorithm?",
        "options": ["(A) O(1)", "(B) O(log n)", "(C) O(n)", "(D) O(n^2)"],
        "ans": "B",
        "exp": "Due to recursive call stack on partition, auxiliary space is O(log n) on average."
    },
    {
        "num": 7,
        "section": "SECTION B: DATA STRUCTURES & ALGORITHMS",
        "text": "In a max-heap of n elements, what is the time complexity to insert a new element?",
        "options": ["(A) O(1)", "(B) O(log n)", "(C) O(n)", "(D) O(n log n)"],
        "ans": "B",
        "exp": "Inserting an element appends to bottom and heapifies up along the tree height, taking O(log n)."
    },
    {
        "num": 8,
        "section": "SECTION C: DATABASE & CORE COMPUTING",
        "text": "Which normal form eliminates partial functional dependency on the primary key?",
        "options": ["(A) First Normal Form (1NF)", "(B) Second Normal Form (2NF)", "(C) Third Normal Form (3NF)", "(D) Boyce-Codd Normal Form (BCNF)"],
        "ans": "B",
        "exp": "2NF requires 1NF and no non-prime attribute should be functionally dependent on part of candidate key."
    },
    {
        "num": 9,
        "section": "SECTION C: DATABASE & CORE COMPUTING",
        "text": "Which HTTP status code corresponds to 'Unauthorized' access?",
        "options": ["(A) 400", "(B) 401", "(C) 403", "(D) 404"],
        "ans": "B",
        "exp": "401 stands for Unauthorized (unauthenticated), whereas 403 is Forbidden."
    },
    {
        "num": 10,
        "section": "SECTION C: DATABASE & CORE COMPUTING",
        "text": "Which of the following ACID properties ensures that database transactions are safely persisted even in case of power failure?",
        "options": ["(A) Atomicity", "(B) Consistency", "(C) Isolation", "(D) Durability"],
        "ans": "D",
        "exp": "Durability guarantees that once a transaction commits, it remains committed even after crash or power failure."
    }
]

current_section = ""
for q in questions:
    if q["section"] != current_section:
        current_section = q["section"]
        pdf.ln(3)
        pdf.set_font('Helvetica', 'B', 11)
        pdf.set_text_color(37, 99, 235)
        pdf.cell(0, 7, current_section, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_text_color(15, 23, 42)
    pdf.multi_cell(0, 5, f"{q['num']}. {q['text']}")
    pdf.ln(1)

    pdf.set_font('Helvetica', '', 9.5)
    pdf.set_text_color(51, 65, 85)
    for opt in q["options"]:
        pdf.cell(0, 5, f"   {opt}", new_x="LMARGIN", new_y="NEXT")
    
    # Inline Answer & explanation
    pdf.set_font('Helvetica', 'I', 8.5)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 4.5, f"   Answer: {q['ans']} | {q['exp']}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

pdf.ln(5)
pdf.set_font('Helvetica', 'B', 11)
pdf.set_text_color(30, 58, 138)
pdf.cell(0, 6, "ANSWER KEY SUMMARY:", new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(71, 85, 105)
key_line = "  ".join([f"{q['num']}: {q['ans']}" for q in questions])
pdf.cell(0, 5, key_line, new_x="LMARGIN", new_y="NEXT")

output_path = os.path.join(os.path.dirname(__file__), 'sample_placement_paper.pdf')
pdf.output(output_path)
print(f"Successfully generated sample placement paper at: {output_path}")
