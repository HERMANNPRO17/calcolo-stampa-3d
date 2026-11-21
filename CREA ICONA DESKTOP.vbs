Option Explicit
Dim shell, fso, folder, dest, link
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
dest = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\CalcoloStampa3DIcona"
If Not fso.FolderExists(dest) Then fso.CreateFolder(dest)
fso.CopyFile folder & "\CALCOLO STAMPA 3D.ico", dest & "\CALCOLO STAMPA 3D.ico", True
Set link = shell.CreateShortcut(shell.SpecialFolders("Desktop") & "\CALCOLO STAMPA 3D.lnk")
link.TargetPath = shell.ExpandEnvironmentStrings("%WINDIR%") & "\explorer.exe"
link.Arguments = Chr(34) & folder & "\index.html" & Chr(34)
link.IconLocation = dest & "\CALCOLO STAMPA 3D.ico,0"
link.Description = "CALCOLO STAMPA 3D - copia scaricata 2026.11.21.1"
link.Save
MsgBox "Collegamento CALCOLO STAMPA 3D creato sul desktop.", 64, "CALCOLO STAMPA 3D"