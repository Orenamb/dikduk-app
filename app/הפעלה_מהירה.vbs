Dim shell, fso, appPath
Set shell = CreateObject("WScript.Shell")
Set fso   = CreateObject("Scripting.FileSystemObject")

' תיקיית app היא התיקייה של קובץ ה-vbs
appPath = fso.GetParentFolderName(WScript.ScriptFullName)

' הפעל npm run dev בחלון מוסתר לחלוטין (0 = SW_HIDE)
shell.Run "cmd /c cd /d """ & appPath & """ && npm run dev", 0, False

' המתן 3 שניות ופתח דפדפן
WScript.Sleep 3000
shell.Run "http://localhost:5173"
