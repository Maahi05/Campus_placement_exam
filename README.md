# Campus Placement Online Examination Portal

An enterprise-grade, full-stack Campus Placement Online Examination & Proctoring Web Application designed for college placement cells and corporate hiring drives.

---

## 🌟 Key Features

1. **Intelligent PDF Question Parser**:
   - Upload any question paper in PDF format.
   - Automatically detects and parses Multiple Choice Questions (MCQs), options (A, B, C, D), section headers, and answer keys.
   - Interactive Question Editor to inspect, modify, add, or delete questions prior to publishing.

2. **Exam Link Generation & Access Control**:
   - Generates unique shareable examination links (e.g. `http://localhost:5000/#exam/TCS-12345`).
   - Configurable access code / passcode to restrict entry to eligible batches.
   - Single-session enforcement prevents duplicate attempts under the same Roll Number.

3. **Candidate Examination Room**:
   - Inspired by modern placement platforms like TCS iON, Mercer Mettl, and HackerEarth.
   - **Synchronized Countdown Timer**: Continuously tracks time and triggers automated submission at 00:00:00.
   - **Real-Time Auto-Save**: Saves answers on every selection. No candidate progress is lost if the window reloads.
   - **Color-Coded Question Palette**:
     - 🟢 **Green**: Answered
     - 🟣 **Purple**: Marked for Review
     - 🟡 **Yellow**: Unanswered (Visited)
     - ⚪ **Gray**: Not Visited
   - Section filtering (Quantitative Aptitude, Logical Reasoning, Technical Core).

4. **Real-World Anti-Cheating & Proctoring Suite**:
   - **Fullscreen Enforcement**: Requires candidate to remain in fullscreen mode throughout the test. Exiting triggers an alert and strike.
   - **Tab-Switch & Blur Detection**: Detects whenever a candidate opens a new tab, switches applications, or minimizes the test window.
   - **Violation Strikes & Auto-Disqualification**: If a student reaches the maximum allowed strikes (e.g. 3 violations), the exam is terminated and auto-submitted.
   - **Security Restraints**: Right-click, text selection, copy-paste shortcuts (`Ctrl+C`, `Ctrl+V`), and developer tools (`F12`, `Ctrl+U`) are disabled.
   - **Webcam Proctoring Monitor**: Displays a live webcam preview in the corner with a recording status indicator.

5. **Placement Officer Dashboard & Analytics**:
   - Real-time candidate roster with live statuses: `in_progress`, `submitted`, `disqualified`.
   - Automated instant grading, percentage calculation, and pass/fail classification.
   - One-Click **Export to CSV**: Download student results for college records.

---

## 🚀 How to Run

### Option 1: One-Click Windows Launcher (Recommended)
Simply **double-click** the file:
```
C:\Users\HP\Desktop\campus-placement-exam-portal\start.bat
```
This automatically launches the server and opens `http://localhost:5000` in your web browser.

### Option 2: Command Line
Open PowerShell or Command Prompt in `C:\Users\HP\Desktop\campus-placement-exam-portal`:

```powershell
npm start
```
Then visit: **http://localhost:5000**

---

## 📝 Testing the PDF Question Paper Upload

A ready-to-test sample placement exam paper is included at:
```
sample-questions/sample_placement_paper.pdf
```
It contains 10 placement questions covering:
- **Section A**: Quantitative Aptitude
- **Section B**: Data Structures & Algorithms
- **Section C**: Database & Core Computing

You can also click the **"Load Sample Placement Paper (10 Qs)"** button inside the exam creator for one-click instant testing!
