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
link.Arguments = "https://hermannpro17.github.io/calcolo-stampa-3d/"
link.IconLocation = dest & "\CALCOLO STAMPA 3D.ico,0"
link.Description = "CALCOLO STAMPA 3D"
link.Save
MsgBox "Collegamento CALCOLO STAMPA 3D creato sul desktop.", 64, "CALCOLO STAMPA 3D"